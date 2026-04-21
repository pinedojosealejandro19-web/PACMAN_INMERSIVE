// ======================================================
// SCREEN / WORLD CONFIG
// ======================================================
const WORLD_COLS = 66;
const WORLD_ROWS = 37;
const ASPECT_RATIO = WORLD_COLS / WORLD_ROWS;
let speedCeldasPorSegundo = 8;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  let width = window.innerWidth;
  let height = window.innerWidth / ASPECT_RATIO;

  if (height > window.innerHeight) {
    height = window.innerHeight;
    width = window.innerHeight * ASPECT_RATIO;
  }

  canvas.width = width;
  canvas.height = height;
  window.TILE_SIZE = canvas.width / WORLD_COLS;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ======================================================
// FIREBASE RECEIVER
// ======================================================
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

let inputRef = null;
let lastInputTimestamp = 0;

const roomInputEl = document.getElementById("roomInput");
const connectRoomBtn = document.getElementById("connectRoomBtn");
const roomStatusEl = document.getElementById("roomStatus");

function connectRoom() {
  const room = (roomInputEl.value.trim() || "ABCD").toUpperCase();

  if (inputRef) inputRef.off();

  roomStatusEl.textContent = `Listening: ${room}`;

  inputRef = db.ref("rooms/" + room + "/input");
  inputRef.on("value", (snap) => {
    const data = snap.val();
    if (!data) return;

    // Avoid reprocessing identical event timestamps
    if (data.t && data.t === lastInputTimestamp) return;
    if (data.t) lastInputTimestamp = data.t;

    handleRemoteAction(data.action);
  });
}

connectRoomBtn.addEventListener("click", connectRoom);

// optional: press Enter in room input
roomInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") connectRoom();
});

// ======================================================
// RESOURCES
// ======================================================
const mapTexture = new Image();
mapTexture.src = "Images/BGS/BG OBSTACLES.png";

const pacmanSprites = [];
const spriteNames = ["PACMAN 1.png", "PACMAN 2.png", "PACMAN 3.png"];

spriteNames.forEach((name) => {
  const img = new Image();
  img.src = `Images/sprites/${name}`;
  pacmanSprites.push(img);
});

// ======================================================
// PLAYER
// ======================================================
const player = {
  col: 33,
  row: 25,
  visualX: 33,
  visualY: 25,
  dx: 0,
  dy: 0,
  nextDx: 0,
  nextDy: 0,
  angle: 0,
  moving: false,
  animTimer: 0,
  currentFrame: 0
};

// ======================================================
// MAP / COLLISION
// ======================================================
const layoutStr = `
000000000000000000011111111111111111111111111110000000000000000000
0000000000000000000D00000000000011000000000000B0000000000000000000
000000000000000000010111101111101101101111111010000000000000000000
000000000000000000010111101111101101101111111010000000000000000000
000000000000000000010111101111101101101100000010000000000000000000
000000000000000000010111101111101101101101111010000000000000000000
000000000000000000010000000000000001101101111010000000000000000000
000000000000000000010111101111101101101101111010000000000000000000
0000000000000000000C01111011111011011000011110A0000000000000000000
000000000000000000010111101111101101111101111010000000000000000000
000000000000000000010111101111101101111101111010000000000000000000
000000000000000000010000000000001100000000000010000000000000000000
000000000000000000010111111101111111101111111010000000000000000000
000000000000000000010111111101111111101111111010000000000000000000
000000000000000000010110000000000000000000011010000000000000000000
000000000000000000010110111111101101111111011010000000000000000000
000000000000000000010110111111101101111111011010000000000000000000
000000000000000000010000000000001100000000000010000000000000000000
000000000000000000011111111101111111101111111110000000000000000000
1D111111C111111111111111111101111111101111111111111111111A111111B1
100000000000000000110000000000000000000000000011000000000000000001
101111111011011110110111101101111111101101111011011111110110111101
101111111011011110000111101101111111101101111000011111110110111101
101111111011011110110111101101111111101101111011011111110110111101
101111111011011110110111101101111111101101111011011111110110111101
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

const mapData = layoutStr.split("\n").map(line => line.trim().split(""));

// ======================================================
// PORTALS
// ======================================================
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

function teleport(targetTile, c, r) {
  const pair = portalCoords[targetTile].find(p => p.c !== c || p.r !== r);

  if (pair) {
    player.col = pair.c;
    player.row = pair.r;
    player.visualX = pair.c;
    player.visualY = pair.r;
    player.nextDx = 0;
    player.nextDy = 0;

    if (targetTile === "C" || targetTile === "D") {
      if (player.dy === -1) {
        player.dx = 1;
        player.dy = 0;
      } else if (player.dx === -1) {
        player.dx = 0;
        player.dy = 1;
      }
    } else if (targetTile === "A" || targetTile === "B") {
      if (player.dy === -1) {
        player.dx = -1;
        player.dy = 0;
      } else if (player.dx === 1) {
        player.dx = 0;
        player.dy = 1;
      }
    }
  }
}

// ======================================================
// INPUT
// ======================================================
function queueMove(dx, dy) {
  player.nextDx = dx;
  player.nextDy = dy;
}

function handleRemoteAction(action) {
  if (!action) return;

  if (action === "up") {
    queueMove(0, -1);
  } else if (action === "down") {
    queueMove(0, 1);
  } else if (action === "left") {
    queueMove(-1, 0);
  } else if (action === "right") {
    queueMove(1, 0);
  } else if (action === "start") {
    roomStatusEl.textContent = "START pressed";
  } else if (action === "select") {
    roomStatusEl.textContent = "SELECT pressed";
  } else if (action === "a") {
    roomStatusEl.textContent = "A pressed";
  } else if (action === "b") {
    roomStatusEl.textContent = "B pressed";
  } else if (action === "connected") {
    roomStatusEl.textContent = "Controller connected";
  }
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "w" || k === "arrowup") {
    queueMove(0, -1);
  } else if (k === "s" || k === "arrowdown") {
    queueMove(0, 1);
  } else if (k === "a" || k === "arrowleft") {
    queueMove(-1, 0);
  } else if (k === "d" || k === "arrowright") {
    queueMove(1, 0);
  }
});

// ======================================================
// GAME LOOP
// ======================================================
let lastTime = 0;

function update(time) {
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  // animation
  if (player.moving) {
    player.animTimer += deltaTime * 15;
    const frameSequence = [0, 1, 2, 1];
    player.currentFrame = frameSequence[Math.floor(player.animTimer) % frameSequence.length];
  } else {
    player.currentFrame = 1;
  }

  // turn
  if (player.nextDx !== 0 || player.nextDy !== 0) {
    if (
      Math.abs(player.visualX - player.col) < 0.3 &&
      Math.abs(player.visualY - player.row) < 0.3
    ) {
      const tc = player.col + player.nextDx;
      const tr = player.row + player.nextDy;

      if (mapData[tr] && mapData[tr][tc] !== "1") {
        player.visualX = player.col;
        player.visualY = player.row;
        player.dx = player.nextDx;
        player.dy = player.nextDy;
        player.nextDx = 0;
        player.nextDy = 0;
        player.moving = true;
      }
    }
  }

  // move
  if (player.moving) {
    player.visualX += player.dx * speedCeldasPorSegundo * deltaTime;
    player.visualY += player.dy * speedCeldasPorSegundo * deltaTime;

    const nextC = player.col + player.dx;
    const nextR = player.row + player.dy;

    if (mapData[nextR] && mapData[nextR][nextC] === "1") {
      if (player.dx === 1 && player.visualX > player.col) player.visualX = player.col;
      if (player.dx === -1 && player.visualX < player.col) player.visualX = player.col;
      if (player.dy === 1 && player.visualY > player.row) player.visualY = player.row;
      if (player.dy === -1 && player.visualY < player.row) player.visualY = player.row;

      if (player.visualX === player.col && player.visualY === player.row) {
        player.moving = false;
      }
    }

    if (player.dx > 0 && player.visualX >= player.col + 1) {
      player.col++;
      const t = mapData[player.row][player.col];
      if (/[A-D]/.test(t)) teleport(t, player.col, player.row);
    } else if (player.dx < 0 && player.visualX <= player.col - 1) {
      player.col--;
      const t = mapData[player.row][player.col];
      if (/[A-D]/.test(t)) teleport(t, player.col, player.row);
    } else if (player.dy > 0 && player.visualY >= player.row + 1) {
      player.row++;
      const t = mapData[player.row][player.col];
      if (/[A-D]/.test(t)) teleport(t, player.col, player.row);
    } else if (player.dy < 0 && player.visualY <= player.row - 1) {
      player.row--;
      const t = mapData[player.row][player.col];
      if (/[A-D]/.test(t)) teleport(t, player.col, player.row);
    }
  }

  updateAngle();
  draw();
  requestAnimationFrame(update);
}

function updateAngle() {
  if (player.dx === 1) player.angle = 0;
  else if (player.dx === -1) player.angle = Math.PI;
  else if (player.dy === 1) player.angle = Math.PI / 2;
  else if (player.dy === -1) player.angle = -Math.PI / 2;
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  if (mapTexture.complete) {
    ctx.drawImage(mapTexture, 0, 0, canvas.width, canvas.height);
  }

  const drawX = player.visualX * TILE_SIZE + TILE_SIZE / 2;
  const drawY = player.visualY * TILE_SIZE + TILE_SIZE / 2;

  const currentSprite = pacmanSprites[player.currentFrame];

  if (currentSprite && currentSprite.complete) {
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(player.angle);
    ctx.drawImage(currentSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }
}

requestAnimationFrame(update);