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

const hudRoom = document.getElementById("hudRoom");
const hudLives = document.getElementById("hudLives");
const hudScore = document.getElementById("hudScore");
const hudHighScore = document.getElementById("hudHighScore");

let inputRef = null;
let lastInputTimestamp = 0;

let score = 0;
let lives = 3;
let highScore = Number(localStorage.getItem("pacmanHighScore")) || 0;

function updateHUD() {
  hudScore.textContent = score;
  hudHighScore.textContent = highScore;

  hudLives.innerHTML = "";

  for (let i = 0; i < lives; i++) {
    const life = document.createElement("div");
    life.className = "life-icon";
    hudLives.appendChild(life);
  }
}

function updateScore(points) {
  score += points;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("pacmanHighScore", highScore);
  }

  roomStatus.textContent = "Score: " + score;
  updateHUD();
}

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
  hudRoom.textContent = room;

  inputRef.on("value", (snap) => {
    const data = snap.val();

    if (!data || !data.action) return;
    if (data.t && data.t === lastInputTimestamp) return;

    if (data.t) lastInputTimestamp = data.t;

    setQueuedDirection(data.action);
  });
}

connectBtn.addEventListener("click", connectRoom);

/* ==========================
   CANVAS & ASSETS
========================== */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD_COLS = 66;
const WORLD_ROWS = 40;
const PLAYABLE_ROWS = 37;

const ASPECT_RATIO = WORLD_COLS / WORLD_ROWS;
const SPEED_CELLS_PER_SECOND = 8;
const GHOST_RESPAWN_DELAY = 3;

let TILE_SIZE = 0;

const mapTexture = new Image();
mapTexture.src = "Images/BGS/bg-map.png";

mapTexture.onload = () => {
  console.log("BG loaded:", mapTexture.src, mapTexture.width, mapTexture.height);
};

mapTexture.onerror = () => {
  console.error("BG failed:", mapTexture.src);
};

const bigDotTexture = new Image();
bigDotTexture.src = "Images/sprites/BIG DOT.png";

const pacmanSprites = [];

["PACMAN 1.png", "PACMAN 2.png", "PACMAN 3.png"].forEach((name) => {
  const img = new Image();
  img.src = `Images/sprites/${name}`;
  pacmanSprites.push(img);
});

const deathSprites = [];

for (let i = 1; i <= 11; i++) {
  const img = new Image();
  img.src = `Images/sprites/PACMAN DEAD ${i}.png`;
  deathSprites.push(img);
}

const ghostSprites = {
  up: [],
  down: [],
  left: [],
  right: []
};

function loadGhostFrames(direction, fileA, fileB) {
  const imgA = new Image();
  imgA.src = `Images/sprites/${fileA}`;

  const imgB = new Image();
  imgB.src = `Images/sprites/${fileB}`;

  ghostSprites[direction].push(imgB, imgA);
}

loadGhostFrames("up", "RED UP A.png", "RED UP B.png");
loadGhostFrames("down", "RED DOWN A.png", "RED DOWN B.png");
loadGhostFrames("left", "RED LEFT A.png", "RED LEFT B.png");
loadGhostFrames("right", "RED RIGHT A.png", "RED RIGHT B.png");

const vulnerableSprites = [];

[
  "VULNERABLE A.png",
  "VULNERABLE B.png",
  "VULNERABLE C.png",
  "VULNERABLE D.png"
].forEach((name) => {
  const img = new Image();
  img.src = `Images/sprites/${name}`;
  vulnerableSprites.push(img);
});

/* ==========================
   PIXEL PERFECT RESIZE
========================== */
function resizeCanvas() {
  const maxWidth = window.innerWidth;
  const maxHeight = window.innerHeight;

  TILE_SIZE = Math.floor(
    Math.min(
      maxWidth / WORLD_COLS,
      maxHeight / WORLD_ROWS
    )
  );

  canvas.width = TILE_SIZE * WORLD_COLS;
  canvas.height = TILE_SIZE * WORLD_ROWS;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ==========================
   MAP DATA
   37 playable rows.
   Canvas has 40 rows.
   Last 3 rows are for HUD/info board.
========================== */
const layoutStr = `
222222222222222222111111111111111111111111111111222222222222222222
222222222222222222D0000000000000110000000000000B222222222222222222
222222222222222222110111101111101101101111111011222222222222222222
222222222222222222210111101111101101101111111012222222222222222222
222222222222222222210111101111101101101100000012222222222222222222
222222222222222222210111101111101101101101111012222222222222222222
222222222222222222210000000000000001101101111012222222222222222222
222222222222222222110111101111101101101101111011222222222222222222
222222222222222222C0011110111110110110000111100A222222222222222222
222222222222222222110111101111101101111101111011222222222222222222
222222222222222222210111101111101101111101111012222222222222222222
222222222222222222210000000000001100000000000012222222222222222222
222222222222222222210111111101111111101111111012222222222222222222
222222222222222222210111111101111111101111111012222222222222222222
222222222222222222210113000000000000000000311012222222222222222222
222222222222222222210110111111101101111111011012222222222222222222
222222222222222222210110111111101101111111011012222222222222222222
222222222222222222210000000000001100000000000012222222222222222222
1D122221C122222222211111111101111111101111111112222222221A122221B1
101111110111111111111111111101111111101111111111111111111011111101
100000000000000000110000000022222422220000000011000000000000000001
101111111011011110110111101121111111121101111011011111110110111101
101111111011011110000111101121111111121101111000011111110110111101
101111111011011110110111101121111111121101111011011111110110111101
101111111011011110110111101121111111121101111011011111110110111101
100000000000000000110000000022222522220000000011000000000000000001
101101111111011110110111101111101101111101111011011011111110111101
101101111111011110110111101111101101111101111011011011111110111101
101101111111011113000111101111101101111101111000311011111110111101
101101111111011110110111101111101101111101111011011011111110111101
100000000000000000110000000000000000000000000011000000000000000001
101101111111011110110111101111011110111101111011011011111110111101
101101111111011110110111101111011110111101111011011011111110111101
131101111111011110110111101111011110111101111011011011111110111131
101101111111011110110111101111011110111101111011011011111110111101
100000000000000000000000031111000000111130000000000000000000000001
111111111111111111111111111111111111111111111111111111111111111111
`.trim();

const mapData = layoutStr.split("\n").map((line) => line.trim().split(""));

/* ==========================
   MAP HELPERS
========================== */
function findTile(marker) {
  for (let r = 0; r < mapData.length; r++) {
    for (let c = 0; c < mapData[r].length; c++) {
      if (mapData[r][c] === marker) {
        return { c, r };
      }
    }
  }

  return null;
}

const ghostSpawn = findTile("4") || { c: 33, r: 20 };
const pacmanSpawn = findTile("5") || { c: 33, r: 25 };

/* ==========================
   DOTS
========================== */
let dots = [];

function initDots() {
  dots = [];

  for (let r = 0; r < mapData.length; r++) {
    for (let c = 0; c < mapData[r].length; c++) {
      const tile = mapData[r][c];

      if (tile === "0") {
        dots.push({ c, r, active: true, isBig: false });
      } else if (tile === "3") {
        dots.push({ c, r, active: true, isBig: true });
      }
    }
  }
}

initDots();

/* ==========================
   ENTITIES
========================== */
const player = {
  col: pacmanSpawn.c,
  row: pacmanSpawn.r,
  visualX: pacmanSpawn.c,
  visualY: pacmanSpawn.r,

  dx: 0,
  dy: 0,
  nextDx: 0,
  nextDy: 0,

  angle: 0,
  moving: false,
  animTimer: 0,
  currentFrame: 1,

  isDead: false,
  deathPhase: 0,
  pauseTimer: 0,
  deathTimer: 0,
  postDeathTimer: 0
};

const ghost = {
  col: ghostSpawn.c,
  row: ghostSpawn.r,
  visualX: ghostSpawn.c,
  visualY: ghostSpawn.r,

  dx: 0,
  dy: 0,
  nextDx: 1,
  nextDy: 0,

  direction: "right",
  moving: false,
  animTimer: 0,

  isVulnerable: false,
  vulnerableTimer: 0,
  vulnerableDuration: 8,

  isEaten: false,
  respawnTimer: 0,

  originalPos: {
    col: ghostSpawn.c,
    row: ghostSpawn.r
  }
};

/* ==========================
   VULNERABLE MODE
========================== */
function activateGhostVulnerable() {
  if (ghost.isEaten) return;

  ghost.isVulnerable = true;
  ghost.vulnerableTimer = ghost.vulnerableDuration;
  ghost.animTimer = 0;
}

function eatGhost() {
  updateScore(200);

  ghost.isVulnerable = false;
  ghost.vulnerableTimer = 0;

  ghost.isEaten = true;
  ghost.respawnTimer = GHOST_RESPAWN_DELAY;

  ghost.moving = false;
  ghost.dx = 0;
  ghost.dy = 0;
  ghost.nextDx = 0;
  ghost.nextDy = 0;
}

function respawnGhost() {
  const spawn = findTile("4") || ghost.originalPos;

  ghost.col = spawn.c;
  ghost.row = spawn.r;
  ghost.visualX = spawn.c;
  ghost.visualY = spawn.r;

  ghost.dx = 0;
  ghost.dy = 0;
  ghost.nextDx = 1;
  ghost.nextDy = 0;

  ghost.direction = "right";
  ghost.moving = false;
  ghost.animTimer = 0;

  ghost.isVulnerable = false;
  ghost.vulnerableTimer = 0;

  ghost.isEaten = false;
  ghost.respawnTimer = 0;
}

/* ==========================
   RESET
========================== */
function resetRound() {
  player.isDead = false;

  player.col = pacmanSpawn.c;
  player.row = pacmanSpawn.r;
  player.visualX = pacmanSpawn.c;
  player.visualY = pacmanSpawn.r;

  player.dx = 0;
  player.dy = 0;
  player.nextDx = 0;
  player.nextDy = 0;

  player.angle = 0;
  player.moving = false;
  player.animTimer = 0;
  player.currentFrame = 1;

  player.deathPhase = 0;
  player.pauseTimer = 0;
  player.deathTimer = 0;
  player.postDeathTimer = 0;

  respawnGhost();
}

function resetGame() {
  score = 0;
  lives = 3;

  initDots();
  resetRound();

  roomStatus.textContent = "Restarting...";
  updateHUD();
}

/* ==========================
   DOT EATING
========================== */
function eatDotAt(col, row) {
  const dot = dots.find((d) => d.active && d.c === col && d.r === row);

  if (!dot) return;

  dot.active = false;

  if (dot.isBig) {
    updateScore(50);
    activateGhostVulnerable();
  } else {
    updateScore(10);
  }
}

/* ==========================
   PORTALS & LOGIC
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

function updateEntityDirection(ent, isPlayer) {
  if (isPlayer) {
    if (ent.dx === 1) ent.angle = 0;
    else if (ent.dx === -1) ent.angle = Math.PI;
    else if (ent.dy === 1) ent.angle = Math.PI / 2;
    else if (ent.dy === -1) ent.angle = -Math.PI / 2;
  } else {
    if (ent.dx === 1) ent.direction = "right";
    else if (ent.dx === -1) ent.direction = "left";
    else if (ent.dy === 1) ent.direction = "down";
    else if (ent.dy === -1) ent.direction = "up";
  }
}

function teleport(ent, targetTile, c, r) {
  const pair = portalCoords[targetTile]?.find((p) => p.c !== c || p.r !== r);

  if (!pair) return;

  ent.col = pair.c;
  ent.row = pair.r;

  ent.visualX = pair.c;
  ent.visualY = pair.r;

  if (targetTile === "C" || targetTile === "D") {
    if (ent.dy === -1) {
      ent.dx = 1;
      ent.dy = 0;
    } else if (ent.dx === -1) {
      ent.dx = 0;
      ent.dy = 1;
    }
  } else {
    if (ent.dy === -1) {
      ent.dx = -1;
      ent.dy = 0;
    } else if (ent.dx === 1) {
      ent.dx = 0;
      ent.dy = 1;
    }
  }

  ent.nextDx = ent.dx;
  ent.nextDy = ent.dy;

  updateEntityDirection(ent, ent === player);

  ent.moving = true;

  if (ent === player) {
    eatDotAt(ent.col, ent.row);
  }
}

function isWalkable(c, r) {
  if (r < 0 || r >= PLAYABLE_ROWS || c < 0 || c >= mapData[r].length) {
    return false;
  }

  const tile = mapData[r][c];

  return (
    tile === "0" ||
    tile === "2" ||
    tile === "3" ||
    tile === "4" ||
    tile === "5" ||
    /[A-D]/.test(tile)
  );
}

function checkCollisions() {
  if (player.isDead) return;
  if (ghost.isEaten) return;

  const dist = Math.hypot(
    player.visualX - ghost.visualX,
    player.visualY - ghost.visualY
  );

  if (dist < 0.6) {
    if (ghost.isVulnerable) {
      eatGhost();
      return;
    }

    player.isDead = true;

    player.moving = false;
    ghost.moving = false;

    player.deathPhase = 0;
    player.pauseTimer = 0;
    player.deathTimer = 0;
    player.postDeathTimer = 0;
  }
}

/* ==========================
   INPUT HANDLING
========================== */
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (["w", "arrowup", "s", "arrowdown", "a", "arrowleft", "d", "arrowright"].includes(key)) {
    if (key === "w" || key === "arrowup") {
      setQueuedDirection("up");
    } else if (key === "s" || key === "arrowdown") {
      setQueuedDirection("down");
    } else if (key === "a" || key === "arrowleft") {
      setQueuedDirection("left");
    } else if (key === "d" || key === "arrowright") {
      setQueuedDirection("right");
    }
  }
});

/* ==========================
   GHOST AI
========================== */
function isGhostAtTileCenter() {
  return (
    Math.abs(ghost.visualX - ghost.col) < 0.05 &&
    Math.abs(ghost.visualY - ghost.row) < 0.05
  );
}

function getValidGhostDirections() {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  return directions.filter((dir) => {
    return isWalkable(ghost.col + dir.dx, ghost.row + dir.dy);
  });
}

function isIntersection() {
  const validDirections = getValidGhostDirections();

  if (validDirections.length >= 3) return true;

  const canTurnVertical = validDirections.some((d) => d.dy !== 0);
  const canTurnHorizontal = validDirections.some((d) => d.dx !== 0);

  return canTurnVertical && canTurnHorizontal;
}

function chooseGhostAIDirection() {
  if (ghost.isEaten) return;
  if (!isGhostAtTileCenter()) return;

  const validDirections = getValidGhostDirections();

  if (validDirections.length === 0) {
    ghost.nextDx = 0;
    ghost.nextDy = 0;
    ghost.moving = false;
    return;
  }

  if (!ghost.moving || (ghost.dx === 0 && ghost.dy === 0)) {
    const choice = validDirections[Math.floor(Math.random() * validDirections.length)];
    ghost.nextDx = choice.dx;
    ghost.nextDy = choice.dy;
    return;
  }

  const currentStillValid = validDirections.some((dir) => {
    return dir.dx === ghost.dx && dir.dy === ghost.dy;
  });

  if (!currentStillValid || isIntersection()) {
    const opposite = {
      dx: -ghost.dx,
      dy: -ghost.dy
    };

    let options = validDirections.filter((dir) => {
      return !(dir.dx === opposite.dx && dir.dy === opposite.dy);
    });

    if (options.length === 0) {
      options = validDirections;
    }

    const choice = options[Math.floor(Math.random() * options.length)];

    ghost.nextDx = choice.dx;
    ghost.nextDy = choice.dy;
  }
}

/* ==========================
   ENGINE
========================== */
function updateEntity(ent, dt, isPlayer) {
  if (!isPlayer && ent.isEaten) return;

  const speed = (!isPlayer && ent.isVulnerable)
    ? SPEED_CELLS_PER_SECOND * 0.75
    : SPEED_CELLS_PER_SECOND;

  if (ent.moving || (!isPlayer && ent.isVulnerable)) {
    ent.animTimer += dt * 15;
  }

  if (
    Math.abs(ent.visualX - ent.col) < 0.3 &&
    Math.abs(ent.visualY - ent.row) < 0.3
  ) {
    if (ent.nextDx !== 0 || ent.nextDy !== 0) {
      if (isWalkable(ent.col + ent.nextDx, ent.row + ent.nextDy)) {
        ent.visualX = ent.col;
        ent.visualY = ent.row;

        ent.dx = ent.nextDx;
        ent.dy = ent.nextDy;

        ent.nextDx = 0;
        ent.nextDy = 0;

        ent.moving = true;

        updateEntityDirection(ent, isPlayer);
      }
    }
  }

  if (ent.moving) {
    ent.visualX += ent.dx * speed * dt;
    ent.visualY += ent.dy * speed * dt;

    if (!isWalkable(ent.col + ent.dx, ent.row + ent.dy)) {
      if (
        (ent.dx === 1 && ent.visualX > ent.col) ||
        (ent.dx === -1 && ent.visualX < ent.col) ||
        (ent.dy === 1 && ent.visualY > ent.row) ||
        (ent.dy === -1 && ent.visualY < ent.row)
      ) {
        ent.visualX = ent.col;
        ent.visualY = ent.row;
        ent.moving = false;
      }
    }

    if (ent.dx > 0 && ent.visualX >= ent.col + 1) {
      ent.col++;
      ent.visualX = ent.col;
    } else if (ent.dx < 0 && ent.visualX <= ent.col - 1) {
      ent.col--;
      ent.visualX = ent.col;
    } else if (ent.dy > 0 && ent.visualY >= ent.row + 1) {
      ent.row++;
      ent.visualY = ent.row;
    } else if (ent.dy < 0 && ent.visualY <= ent.row - 1) {
      ent.row--;
      ent.visualY = ent.row;
    } else {
      return;
    }

    const tile = mapData[ent.row][ent.col];

    if (/[A-D]/.test(tile)) {
      teleport(ent, tile, ent.col, ent.row);
    } else if (isPlayer) {
      eatDotAt(ent.col, ent.row);
    }
  }
}

let lastFrameTime = 0;

function update(time) {
  const dt = (time - lastFrameTime) / 1000;
  lastFrameTime = time;

  if (!player.isDead) {
    if (ghost.isEaten) {
      ghost.respawnTimer -= dt;

      if (ghost.respawnTimer <= 0) {
        respawnGhost();
      }
    }

    if (ghost.isVulnerable && !ghost.isEaten) {
      ghost.vulnerableTimer -= dt;

      if (ghost.vulnerableTimer <= 0) {
        ghost.isVulnerable = false;
        ghost.vulnerableTimer = 0;
      }
    }

    updateEntity(player, dt, true);

    chooseGhostAIDirection();
    updateEntity(ghost, dt, false);

    checkCollisions();

    if (player.moving) {
      const seq = [0, 1, 2, 1];
      player.currentFrame = seq[Math.floor(player.animTimer) % seq.length];
    } else {
      player.currentFrame = 1;
    }
  } else {
    if (player.deathPhase === 0) {
      player.pauseTimer += dt;

      if (player.pauseTimer >= 1.0) {
        player.deathPhase = 1;
      }
    } else if (player.deathPhase === 1) {
      player.deathTimer += dt * 10;

      if (Math.floor(player.deathTimer) >= deathSprites.length) {
        player.deathPhase = 2;
      }
    } else if (player.deathPhase === 2) {
      player.postDeathTimer += dt;

      if (player.postDeathTimer >= 1.0) {
        lives -= 1;

        if (lives > 0) {
          resetRound();
        } else {
          resetGame();
        }

        updateHUD();
      }
    }
  }

  draw();
  requestAnimationFrame(update);
}

/* ==========================
   DRAW
========================== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;

  if (mapTexture.complete && mapTexture.naturalWidth > 0) {
    ctx.drawImage(
      mapTexture,
      0,
      0,
      canvas.width,
      TILE_SIZE * PLAYABLE_ROWS
    );
  }

  for (const dot of dots) {
    if (!dot.active) continue;

    const x = dot.c * TILE_SIZE + TILE_SIZE / 2;
    const y = dot.r * TILE_SIZE + TILE_SIZE / 2;

    if (dot.isBig && bigDotTexture.complete && bigDotTexture.naturalWidth > 0) {
      const size = TILE_SIZE * 0.7;

      ctx.drawImage(
        bigDotTexture,
        x - size / 2,
        y - size / 2,
        size,
        size
      );
    } else if (!dot.isBig) {
      ctx.fillStyle = "#FFFF00";

      const size = TILE_SIZE * 0.2;

      ctx.fillRect(
        x - size / 2,
        y - size / 2,
        size,
        size
      );
    }
  }

  if (player.isDead) {
    if (player.deathPhase === 0) {
      drawPacman();
      drawGhost();
    } else if (player.deathPhase === 1) {
      const frame = Math.floor(player.deathTimer);

      if (frame < deathSprites.length) {
        const dSprite = deathSprites[frame];

        if (dSprite.complete && dSprite.naturalWidth > 0) {
          ctx.drawImage(
            dSprite,
            player.visualX * TILE_SIZE,
            player.visualY * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
          );
        }
      }
    }
  } else {
    drawPacman();
    drawGhost();
  }
}

function drawPacman() {
  const pSprite = pacmanSprites[player.currentFrame];

  if (pSprite && pSprite.complete && pSprite.naturalWidth > 0) {
    ctx.save();

    ctx.translate(
      player.visualX * TILE_SIZE + TILE_SIZE / 2,
      player.visualY * TILE_SIZE + TILE_SIZE / 2
    );

    ctx.rotate(player.angle);

    ctx.drawImage(
      pSprite,
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE
    );

    ctx.restore();
  }
}

function drawGhost() {
  if (ghost.isEaten) return;

  if (ghost.isVulnerable) {
    const safeLength = vulnerableSprites.length || 1;
    const frameIndex = Math.floor(ghost.animTimer / 4) % safeLength;

    let sprite = vulnerableSprites[frameIndex];

    if (!sprite || !sprite.complete || sprite.naturalWidth === 0) {
      sprite = vulnerableSprites.find((img) => img && img.complete && img.naturalWidth > 0);
    }

    if (sprite) {
      ctx.drawImage(
        sprite,
        ghost.visualX * TILE_SIZE,
        ghost.visualY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }

    return;
  }

  const gGroup = ghostSprites[ghost.direction];

  if (gGroup.length > 0) {
    const gFrame = Math.floor(ghost.animTimer) % gGroup.length;
    const gSprite = gGroup[gFrame];

    if (gSprite && gSprite.complete && gSprite.naturalWidth > 0) {
      ctx.drawImage(
        gSprite,
        ghost.visualX * TILE_SIZE,
        ghost.visualY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

/* ==========================
   START
========================== */
eatDotAt(player.col, player.row);
updateHUD();
requestAnimationFrame(update);
