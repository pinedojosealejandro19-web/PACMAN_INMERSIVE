/* ==========================
   FIREBASE CONFIG
========================== */
const firebaseConfig = {
  apiKey: "AIzaSyAjUTUVx401HS9qrTmzab27nUiLvvMkfxQ",
  authDomain: "pacman-86c4e.firebaseapp.com",
  databaseURL: "https://pacman-86c4e-default-rtdb.firebaseio.com",
  projectId: "pacman-86c4e",
  storageBucket: "pacman-86c4e.firebasestorage.app",
  messagingSenderId: "1044337774275",
  appId: "1:1044337774275:web:362fcd603a473c04e95c76"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

/* ==========================
   ROOM & HUD
========================== */
const roomInput = document.getElementById("roomInput");
const connectBtn = document.getElementById("connectRoomBtn");
const roomStatus = document.getElementById("roomStatus");

let inputRef = null;
let lastInputTimestamp = 0;
let score = 0;

function setQueuedDirection(action) {
  if (action === "up") {
    player.nextDx = 0;
    player.nextDy = -1;
  } else if (action === "down") {
    player.nextDx = 0;
    player.nextDy = 1;
  } else if (action === "left") {
    player.nextDx = -1;
    player.nextDy = 0;
  } else if (action === "right") {
    player.nextDx = 1;
    player.nextDy = 0;
  }
}

function connectRoom() {
  const room = (roomInput.value.trim() || "ABCD").toUpperCase();
  if (inputRef) inputRef.off();
  inputRef = db.ref("rooms/" + room + "/input");
  roomStatus.textContent = "Connected: " + room;

  inputRef.on("value", (snap) => {
    const data = snap.val();
    if (!data || !data.action) return;
    if (data.t && data.t === lastInputTimestamp) return;
    if (data.t) lastInputTimestamp = data.t;
    setQueuedDirection(data.action);
  });
}

connectBtn.addEventListener("click", connectRoom);
roomInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") connectRoom();
});

/* ==========================
   CANVAS & ASSETS
========================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD_COLS = 66;
const WORLD_ROWS = 37;
const ASPECT_RATIO = WORLD_COLS / WORLD_ROWS;
const SPEED_CELLS_PER_SECOND = 8;
let TILE_SIZE = 0;

const mapTexture = new Image();
mapTexture.src = "Images/BGS/BG OBSTACLES.png";

const pacmanSprites = [];
["PACMAN 1.png", "PACMAN 2.png", "PACMAN 3.png"].forEach((name) => {
  const img = new Image();
  img.src = `Images/sprites/${name}`;
  pacmanSprites.push(img);
});

function resizeCanvas() {
  let width = window.innerWidth;
  let height = window.innerWidth / ASPECT_RATIO;
  if (height > window.innerHeight) {
    height = window.innerHeight;
    width = window.innerHeight * ASPECT_RATIO;
  }
  canvas.width = width;
  canvas.height = height;
  TILE_SIZE = canvas.width / WORLD_COLS;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ==========================
   MAP DATA
========================== */
const layoutStr = `
222222222222222222211111111111111111111111111112222222222222222222
2222222222222222222D00000000000011000000000000B2222222222222222222
222222222222222222210111101111101101101111111012222222222222222222
222222222222222222210111101111101101101111111012222222222222222222
222222222222222222210111101111101101101100000012222222222222222222
222222222222222222210111101111101101101101111012222222222222222222
222222222222222222210000000000000001101101111012222222222222222222
222222222222222222210111101111101101101101111012222222222222222222
2222222222222222222C01111011111011011000011110A2222222222222222222
222222222222222222210111101111101101111101111012222222222222222222
222222222222222222210111101111101101111101111012222222222222222222
222222222222222222210000000000001100000000000012222222222222222222
222222222222222222210111111101111111101111111012222222222222222222
222222222222222222210111111101111111101111111012222222222222222222
222222222222222222210110000000000000000000011012222222222222222222
222222222222222222210110111111101101111111011012222222222222222222
222222222222222222210110111111101101111111011012222222222222222222
222222222222222222210000000000001100000000000012222222222222222222
222222222222222222211111111101111111101111111112222222222222222222
1D111111C111111111111111111101111111101111111111111111111A111111B1
100000000000000000110000000000000000000000000011000000000000000001
101111111011011110110111101101111111101101111011011111111110111101
101111111011011110000111101101111111101101111000011111111110111101
101111111011011110110111101101111111101101111011011111111110111101
101111111011011110110111101101111111101101111011011111111110111101
100000000000000000110000000000000000000000000011000000000000000001
101101111111011110110111101111101101111101111011011011111110111101
101101111111011110110111101111101101111101111011011011111110111101
101101111111011110000111101111101101111101111000011011111110111101
101101111111011110110111101111101101111101111011011011111110111101
100000000000000000110000000000000000000000000011000000000000000001
101101111111011110110111101111011110111101111011011011111110111101
101101111111011110110111101111011110111101111011011011111110111101
101101111111011110110111101111011110111101111011011011111110111101
101101111111011110110111101111011110111101111011011011111110111101
100000000000000000000000001111000000111100000000000000000000000001
111111111111111111111111111111111111111111111111111111111111111111
`.trim();

const mapData = layoutStr.split("\n").map((line) => line.trim().split(""));

/* ==========================
   DOTS
========================== */
let dots = [];
function initDots() {
  dots = [];
  for (let r = 0; r < mapData.length; r++) {
    for (let c = 0; c < mapData[r].length; c++) {
      if (mapData[r][c] === "0") {
        dots.push({ c, r, active: true });
      }
    }
  }
}
initDots();

function eatDotAt(col, row) {
  const dot = dots.find((d) => d.active && d.c === col && d.r === row);
  if (!dot) return;
  dot.active = false;
  score += 10;
  roomStatus.textContent = "Score: " + score;
}

/* ==========================
   PLAYER
========================== */
const player = {
  col: 33, row: 25, visualX: 33, visualY: 25,
  dx: 0, dy: 0, nextDx: 0, nextDy: 0,
  angle: 0, moving: false, animTimer: 0, currentFrame: 1
};

function updateAngle() {
  if (player.dx === 1) player.angle = 0;
  else if (player.dx === -1) player.angle = Math.PI;
  else if (player.dy === 1) player.angle = Math.PI / 2;
  else if (player.dy === -1) player.angle = -Math.PI / 2;
}

/* ==========================
   PORTALS
========================== */
const portalCoords = {};
for (let r = 0; r < mapData.length; r++) {
  for (let c = 0; c < mapData[r].length; c++) {
    const char = mapData[r][c];
    if (/[A-D]/.test(char)) {
      if (!portalCoords[char]) portalCoords[char] = [];
      portalCoords[char].push({ c, r });
    }
  }
}

function applyPortalDirection(targetTile) {
  if (targetTile === "C" || targetTile === "D") {
    if (player.dy === -1) { player.dx = 1; player.dy = 0; }
    else if (player.dx === -1) { player.dx = 0; player.dy = 1; }
  } else if (targetTile === "A" || targetTile === "B") {
    if (player.dy === -1) { player.dx = -1; player.dy = 0; }
    else if (player.dx === 1) { player.dx = 0; player.dy = 1; }
  }
}

function teleport(targetTile, c, r) {
  const pair = portalCoords[targetTile]?.find((p) => p.c !== c || p.r !== r);
  if (!pair) return;
  player.col = pair.c; player.row = pair.r;
  player.visualX = pair.c; player.visualY = pair.r;
  player.nextDx = 0; player.nextDy = 0;
  applyPortalDirection(targetTile);
  updateAngle();
  player.moving = true;
  eatDotAt(player.col, player.row);
}

/* ==========================
   HELPERS
========================== */
function isInsideMap(c, r) {
  return r >= 0 && r < mapData.length && c >= 0 && c < mapData[r].length;
}

function isWalkable(c, r) {
  if (!isInsideMap(c, r)) return false;
  const tile = mapData[r][c];
  return tile !== "1" && tile !== "2";
}

function isCenteredOnTile() {
  return Math.abs(player.visualX - player.col) < 0.3 && Math.abs(player.visualY - player.row) < 0.3;
}

function snapToCurrentTile() {
  player.visualX = player.col;
  player.visualY = player.row;
}

function tryApplyQueuedTurn() {
  if (player.nextDx === 0 && player.nextDy === 0) return;
  if (!isCenteredOnTile()) return;
  const targetC = player.col + player.nextDx;
  const targetR = player.row + player.nextDy;
  if (isWalkable(targetC, targetR)) {
    snapToCurrentTile();
    player.dx = player.nextDx; player.dy = player.nextDy;
    player.nextDx = 0; player.nextDy = 0;
    player.moving = true;
    updateAngle();
  }
}

function tryAdvanceTile() {
  if (player.dx > 0 && player.visualX >= player.col + 1) { player.col++; player.visualX = player.col; }
  else if (player.dx < 0 && player.visualX <= player.col - 1) { player.col--; player.visualX = player.col; }
  else if (player.dy > 0 && player.visualY >= player.row + 1) { player.row++; player.visualY = player.row; }
  else if (player.dy < 0 && player.visualY <= player.row - 1) { player.row--; player.visualY = player.row; }
  else { return; }

  const tile = mapData[player.row][player.col];
  if (/[A-D]/.test(tile)) teleport(tile, player.col, player.row);
  else eatDotAt(player.col, player.row);
}

function handleWallCollision() {
  const nextC = player.col + player.dx;
  const nextR = player.row + player.dy;
  if (isWalkable(nextC, nextR)) return;
  if (player.dx === 1 && player.visualX > player.col) player.visualX = player.col;
  if (player.dx === -1 && player.visualX < player.col) player.visualX = player.col;
  if (player.dy === 1 && player.visualY > player.row) player.visualY = player.row;
  if (player.dy === -1 && player.visualY < player.row) player.visualY = player.row;
  if (player.visualX === player.col && player.visualY === player.row) player.moving = false;
}

/* ==========================
   KEYBOARD INPUT
========================== */
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "w" || key === "arrowup") setQueuedDirection("up");
  else if (key === "s" || key === "arrowdown") setQueuedDirection("down");
  else if (key === "a" || key === "arrowleft") setQueuedDirection("left");
  else if (key === "d" || key === "arrowright") setQueuedDirection("right");
});

/* ==========================
   GAME LOOP
========================== */
let lastFrameTime = 0;
function update(time) {
  const deltaTime = (time - lastFrameTime) / 1000;
  lastFrameTime = time;
  if (player.moving) {
    player.animTimer += deltaTime * 15;
    const seq = [0, 1, 2, 1];
    player.currentFrame = seq[Math.floor(player.animTimer) % seq.length];
  } else { player.currentFrame = 1; }
  tryApplyQueuedTurn();
  if (player.moving) {
    player.visualX += player.dx * SPEED_CELLS_PER_SECOND * deltaTime;
    player.visualY += player.dy * SPEED_CELLS_PER_SECOND * deltaTime;
    handleWallCollision();
    tryAdvanceTile();
  }
  updateAngle();
  draw();
  requestAnimationFrame(update);
}

/* ==========================
   DRAW (MODIFIED FOR SQUARE DOTS)
========================== */
function drawDots() {
  ctx.fillStyle = "#FFFF00"; // Classic Yellow

  for (const dot of dots) {
    if (!dot.active) continue;

    // Square calculation
    const dotSize = TILE_SIZE * 0.2; 
    const x = dot.c * TILE_SIZE + (TILE_SIZE / 2) - (dotSize / 2);
    const y = dot.r * TILE_SIZE + (TILE_SIZE / 2) - (dotSize / 2);

    ctx.fillRect(x, y, dotSize, dotSize);
  }
}

function drawPlayer() {
  const sprite = pacmanSprites[player.currentFrame];
  if (!(sprite && sprite.complete)) return;
  const drawX = player.visualX * TILE_SIZE + TILE_SIZE / 2;
  const drawY = player.visualY * TILE_SIZE + TILE_SIZE / 2;
  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(player.angle);
  ctx.drawImage(sprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  if (mapTexture.complete) {
    ctx.drawImage(mapTexture, 0, 0, canvas.width, canvas.height);
  }
  drawDots();
  drawPlayer();
}

eatDotAt(player.col, player.row);
requestAnimationFrame(update);
