// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game elements
const towerOptions = document.querySelectorAll(".tower-option");
const startWaveButton = document.getElementById("startWave");
const speedToggleButton = document.getElementById("speedToggle");
const livesElement = document.getElementById("lives");
const goldElement = document.getElementById("gold");
const waveElement = document.getElementById("wave");
const scoreElement = document.getElementById("score");
const gameMessage = document.getElementById("gameMessage");

// Game state
const gameState = {
  lives: 10,
  gold: 100,
  wave: 0,
  score: 0,
  isWaveActive: false,
  selectedTower: null,
  selectedTowerType: null,
  gameSpeed: 1,
  towers: [],
  enemies: [],
  projectiles: [],
  lastFrameTime: 0,
  enemySpawnTimer: 0,
  enemiesThisWave: 0,
  enemiesSpawned: 0,
  enemiesDefeated: 0,
  gameOver: false,
  path: [],
};

// Tower types
const towerTypes = {
  basicTower: {
    cost: 50,
    range: 100,
    damage: 12, // 10 * 1.2
    fireRate: 1, // shots per second
    projectileSpeed: 5,
    color: "#4CAF50",
    projectileColor: "#2E7D32",
    aoe: false,
    lastShot: 0,
  },
  sniperTower: {
    cost: 100,
    range: 200,
    damage: 36, // 30 * 1.2
    fireRate: 0.5, // shots per second
    projectileSpeed: 10,
    color: "#2196F3",
    projectileColor: "#0D47A1",
    aoe: false,
    lastShot: 0,
  },
  aoeTower: {
    cost: 150,
    range: 80,
    damage: 18, // 15 * 1.2
    fireRate: 0.8, // shots per second
    projectileSpeed: 3,
    color: "#FF9800",
    projectileColor: "#E65100",
    aoe: true,
    aoeRadius: 30,
    lastShot: 0,
  },
  slowTower: {
    cost: 120,
    range: 120,
    damage: 0,
    fireRate: 0.7, // shots per second
    projectileSpeed: 6,
    color: "#00bcd4",
    projectileColor: "#0097a7",
    aoe: false,
    slowAmount: 0.5, // 50% slow
    slowDuration: 2000, // ms
    lastShot: 0,
  },
};

// Enemy types
const enemyTypes = {
  basic: {
    health: 30,
    speed: 20,
    size: 15,
    color: "#e74c3c",
    reward: 5,
  },
  fast: {
    health: 15,
    speed: 25,
    size: 10,
    color: "#f1c40f",
    reward: 8,
  },
  tank: {
    health: 80,
    speed: 10,
    size: 15,
    color: "#8e44ad",
    reward: 15,
  },
  boss: {
    health: 200,
    speed: 10, // Increased from 0.7
    size: 25,
    color: "#c0392b",
    reward: 50,
  },
};

// 1. Define grid parameters
const GRID_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 12;

// Add at the top:
let backgroundCache = null;
let backgroundCacheWidth = 0;
let backgroundCacheHeight = 0;

// Add to game state for base hit animation and screen flash
let baseHitAnim = { active: false, timer: 0 };
let screenFlash = { active: false, timer: 0 };

// Add high score to game state
let highScore = parseInt(localStorage.getItem("td_highscore") || "0", 10);

// Helper: Get selected layout from window.selectedLayout
function getSelectedLayout() {
  return window.selectedLayout || "classic";
}
// 2. Redesign the path with a winding shape and support multiple layouts
function createPath() {
  const layout = getSelectedLayout();
  if (layout === "classic") {
    gameState.path = [
      { x: 0, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 8 },
      { x: 12, y: 8 },
      { x: 12, y: 4 },
      { x: 16, y: 4 },
      { x: 16, y: 10 },
      { x: 19, y: 10 },
    ];
  } else if (layout === "zigzag") {
    gameState.path = [
      { x: 0, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 8 },
      { x: 8, y: 8 },
      { x: 8, y: 2 },
      { x: 12, y: 2 },
      { x: 12, y: 8 },
      { x: 16, y: 8 },
      { x: 16, y: 4 },
      { x: 19, y: 4 },
    ];
  } else if (layout === "spiral") {
    gameState.path = [
      { x: 0, y: 1 },
      { x: 18, y: 1 },
      { x: 18, y: 10 },
      { x: 1, y: 10 },
      { x: 1, y: 3 },
      { x: 16, y: 3 },
      { x: 16, y: 8 },
      { x: 3, y: 8 },
      { x: 3, y: 5 },
      { x: 14, y: 5 },
      { x: 14, y: 6 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
      { x: 13, y: 7 },
      { x: 13, y: 7 },
    ];
  } else if (layout === "sbend") {
    gameState.path = [
      { x: 0, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 8 },
      { x: 13, y: 8 },
      { x: 13, y: 2 },
      { x: 19, y: 2 },
    ];
  } else {
    // fallback
    gameState.path = [
      { x: 0, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 8 },
      { x: 12, y: 8 },
      { x: 12, y: 4 },
      { x: 16, y: 4 },
      { x: 16, y: 10 },
      { x: 19, y: 10 },
    ];
  }
}

// 3. Helper: Convert grid cell to pixel center
function gridToPixel(cell) {
  return {
    x: cell.x * GRID_SIZE + GRID_SIZE / 2,
    y: cell.y * GRID_SIZE + GRID_SIZE / 2,
  };
}

// Update drawBackground to use a darker gray
function drawBackground() {
  if (
    !backgroundCache ||
    backgroundCacheWidth !== canvas.width ||
    backgroundCacheHeight !== canvas.height
  ) {
    backgroundCacheWidth = canvas.width;
    backgroundCacheHeight = canvas.height;
    backgroundCache = document.createElement("canvas");
    backgroundCache.width = canvas.width;
    backgroundCache.height = canvas.height;
    const bctx = backgroundCache.getContext("2d");
    // Darker gray gradient
    const grayPattern = bctx.createLinearGradient(
      0,
      0,
      0,
      backgroundCache.height
    );
    grayPattern.addColorStop(0, "#888");
    grayPattern.addColorStop(1, "#444");
    bctx.fillStyle = grayPattern;
    bctx.fillRect(0, 0, backgroundCache.width, backgroundCache.height);
    // Stones (randomized for beauty)
    for (let i = 0; i < 40; i++) {
      bctx.save();
      bctx.globalAlpha = 0.15;
      bctx.fillStyle = "#bbb";
      const x = Math.random() * backgroundCache.width;
      const y = Math.random() * backgroundCache.height;
      bctx.beginPath();
      bctx.ellipse(
        x,
        y,
        8 + Math.random() * 8,
        5 + Math.random() * 5,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      bctx.fill();
      bctx.restore();
    }
  }
  ctx.drawImage(backgroundCache, 0, 0);
}

// 5. Draw the path with a gradient and border
function drawPath() {
  if (gameState.path.length < 2) return;
  // Build the path as a single shape
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Path fill (light color)
  ctx.beginPath();
  const start = gridToPixel(gameState.path[0]);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < gameState.path.length; i++) {
    const p = gridToPixel(gameState.path[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = "#f5e6c8";
  ctx.lineWidth = GRID_SIZE * 0.8;
  ctx.stroke();
  // Path border (red)
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < gameState.path.length; i++) {
    const p = gridToPixel(gameState.path[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = "#e94560";
  ctx.lineWidth = GRID_SIZE * 0.5;
  ctx.stroke();
  ctx.restore();
}

// Draw a castle gate at the end of the path
function drawBase() {
  const end = gridToPixel(gameState.path[gameState.path.length - 1]);
  ctx.save();
  ctx.translate(end.x, end.y);
  // Draw castle wall
  ctx.fillStyle = "#b0b0b0";
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-GRID_SIZE * 0.7, GRID_SIZE * 0.7);
  ctx.lineTo(-GRID_SIZE * 0.7, -GRID_SIZE * 0.7);
  ctx.lineTo(GRID_SIZE * 0.7, -GRID_SIZE * 0.7);
  ctx.lineTo(GRID_SIZE * 0.7, GRID_SIZE * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Brick pattern
  ctx.save();
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  for (let y = -0.7; y < 0.7; y += 0.13) {
    ctx.beginPath();
    ctx.moveTo(-GRID_SIZE * 0.7, GRID_SIZE * y);
    ctx.lineTo(GRID_SIZE * 0.7, GRID_SIZE * y);
    ctx.stroke();
    // Offset bricks every other row
    for (
      let x = -0.7 + (Math.abs(y * 100) % 2 ? 0.065 : 0);
      x < 0.7;
      x += 0.13
    ) {
      ctx.beginPath();
      ctx.moveTo(GRID_SIZE * x, GRID_SIZE * y);
      ctx.lineTo(GRID_SIZE * (x + 0.065), GRID_SIZE * y);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Draw battlements
  ctx.fillStyle = "#888";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(
      i * GRID_SIZE * 0.28 - GRID_SIZE * 0.09,
      -GRID_SIZE * 0.7 - GRID_SIZE * 0.13,
      GRID_SIZE * 0.18,
      GRID_SIZE * 0.13
    );
  }
  // Draw flag/banner
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -GRID_SIZE * 0.95);
  ctx.lineTo(GRID_SIZE * 0.18, -GRID_SIZE * 1.15);
  ctx.lineTo(0, -GRID_SIZE * 1.15);
  ctx.closePath();
  ctx.fillStyle = "#e94560";
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#b5835d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -GRID_SIZE * 0.7);
  ctx.lineTo(0, -GRID_SIZE * 1.15);
  ctx.stroke();
  ctx.restore();
  // Draw window above the gate arch
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -GRID_SIZE * 0.45, GRID_SIZE * 0.22, Math.PI, 0, false);
  ctx.lineTo(GRID_SIZE * 0.22, -GRID_SIZE * 0.45);
  ctx.lineTo(-GRID_SIZE * 0.22, -GRID_SIZE * 0.45);
  ctx.closePath();
  ctx.fillStyle = "#2196f3";
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#1565c0";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Draw gate arch
  ctx.beginPath();
  ctx.arc(0, GRID_SIZE * 0.7, GRID_SIZE * 0.35, Math.PI, 0, false);
  ctx.lineTo(GRID_SIZE * 0.35, GRID_SIZE * 0.7);
  ctx.lineTo(-GRID_SIZE * 0.35, GRID_SIZE * 0.7);
  ctx.closePath();
  ctx.fillStyle = baseHitAnim.active ? "#e94560" : "#5d4037";
  ctx.globalAlpha = baseHitAnim.active ? 0.8 : 1;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Wood grain on the gate
  ctx.save();
  ctx.strokeStyle = "#3e2723";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID_SIZE * 0.18, GRID_SIZE * 0.7);
    ctx.lineTo(i * GRID_SIZE * 0.18, GRID_SIZE * 0.7 - GRID_SIZE * 0.35);
    ctx.stroke();
    // Wood grain
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      i * GRID_SIZE * 0.18,
      GRID_SIZE * 0.7 - GRID_SIZE * 0.18,
      GRID_SIZE * 0.08,
      Math.PI * 0.2,
      Math.PI * 1.8
    );
    ctx.stroke();
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2;
  }
  ctx.restore();
  // Flashing thick red border when hit
  if (baseHitAnim.active) {
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = `rgba(233,69,96,${
      0.7 + 0.3 * Math.sin(Date.now() / 80)
    })`;
    ctx.beginPath();
    ctx.arc(0, GRID_SIZE * 0.35, GRID_SIZE * 0.48, Math.PI, 0, false);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// Draw a red screen flash overlay
function drawScreenFlash() {
  if (screenFlash.active) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, screenFlash.timer * 2.5);
    ctx.fillStyle = "#e94560";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// 6. Draw the grid and highlight valid slots
function drawGridOverlay() {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      // Check if cell is on or near the path (expanded radius)
      let onPath = false;
      for (let i = 0; i < gameState.path.length - 1; i++) {
        const a = gameState.path[i];
        const b = gameState.path[i + 1];
        const px = x + 0.5,
          py = y + 0.5;
        const ax = a.x,
          ay = a.y,
          bx = b.x,
          by = b.y;
        const t =
          ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) /
          ((bx - ax) ** 2 + (by - ay) ** 2);
        const closestX = ax + t * (bx - ax);
        const closestY = ay + t * (by - ay);
        const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
        if (dist < 0.7) onPath = true; // slightly larger radius
      }
      if (onPath) continue;
      // Check if cell is occupied
      let occupied = false;
      for (const tower of gameState.towers) {
        const cell = pixelToGrid({ x: tower.x, y: tower.y });
        if (cell.x === x && cell.y === y) occupied = true;
      }
      ctx.save();
      ctx.lineWidth = 1;
      if (occupied) {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.fillStyle = "rgba(255,255,255,0.08)";
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.fillStyle = "rgba(255,255,255,0.04)";
      }
      ctx.beginPath();
      ctx.rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

// 7. Helper: Convert pixel to grid cell
function pixelToGrid(pos) {
  return {
    x: Math.floor(pos.x / GRID_SIZE),
    y: Math.floor(pos.y / GRID_SIZE),
  };
}

// Initialize the game
function initGame() {
  createPath();
  drawPath();
  displayMessage(
    "Select a tower and place it on the map. Then start the wave!"
  );

  // Tower selection
  towerOptions.forEach((option) => {
    option.addEventListener("click", () => {
      if (gameState.gameOver) return;

      const towerType = option.id;
      const towerCost = parseInt(option.dataset.cost);

      // Deselect if already selected
      if (gameState.selectedTowerType === towerType) {
        gameState.selectedTowerType = null;
        towerOptions.forEach((opt) => opt.classList.remove("selected"));
        displayMessage("Tower selection cleared.");
        return;
      }

      if (gameState.gold >= towerCost) {
        gameState.selectedTowerType = towerType;

        // Update selected tower UI
        towerOptions.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");

        displayMessage(`Selected ${towerType}. Click on the map to place it.`);
      } else {
        displayMessage(`Not enough gold! You need ${towerCost} gold.`);
      }
    });
  });

  // Canvas click for tower placement
  canvas.addEventListener("click", (e) => {
    if (gameState.gameOver || !gameState.selectedTowerType) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    placeTower(x, y);
  });

  // Start wave button
  startWaveButton.addEventListener("click", () => {
    if (gameState.gameOver) {
      // Restart game
      resetGame();
      return;
    }

    if (!gameState.isWaveActive) {
      startWave();
    } else {
      displayMessage("Wave already in progress!");
    }
  });

  // Speed toggle button
  speedToggleButton.addEventListener("click", () => {
    if (gameState.gameSpeed === 1) {
      gameState.gameSpeed = 2;
      speedToggleButton.textContent = "Speed: x2";
    } else if (gameState.gameSpeed === 2) {
      gameState.gameSpeed = 4;
      speedToggleButton.textContent = "Speed: x4";
    } else {
      gameState.gameSpeed = 1;
      speedToggleButton.textContent = "Speed: x1";
    }
  });

  // Start game loop
  requestAnimationFrame(gameLoop);
}

// Refactor: Use a helper to check if a cell is on the path (pixel-based, matches visual)
function isCellOnPath(cell) {
  const center = gridToPixel(cell);
  for (let i = 0; i < gameState.path.length - 1; i++) {
    const a = gameState.path[i];
    const b = gameState.path[i + 1];
    const ax = gridToPixel(a).x,
      ay = gridToPixel(a).y,
      bx = gridToPixel(b).x,
      by = gridToPixel(b).y;
    const px = center.x,
      py = center.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) /
          ((bx - ax) ** 2 + (by - ay) ** 2)
      )
    );
    const closestX = ax + t * (bx - ax);
    const closestY = ay + t * (by - ay);
    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    if (dist < GRID_SIZE * 0.4) return true;
  }
  return false;
}

// Use isCellOnPath in placeTower
function placeTower(x, y) {
  const cell = pixelToGrid({ x, y });
  let onPath = isCellOnPath(cell);
  // Check if cell is occupied
  let occupied = false;
  for (const tower of gameState.towers) {
    const tcell = pixelToGrid({ x: tower.x, y: tower.y });
    if (tcell.x === cell.x && tcell.y === cell.y) occupied = true;
  }
  if (onPath) {
    displayMessage("Can't place tower on the path!");
    return;
  }
  if (occupied) {
    displayMessage("Can't place tower on another tower!");
    return;
  }
  const towerType = gameState.selectedTowerType;
  const towerConfig = getTowerConfig(towerType);
  const towerCost = towerConfig.cost;
  if (gameState.gold >= towerCost) {
    const center = gridToPixel(cell);
    const tower = {
      x: center.x,
      y: center.y,
      type: towerType,
      ...towerConfig,
      lastShot: 0,
    };
    gameState.towers.push(tower);
    gameState.gold -= towerCost;
    updateUI();
    displayMessage(`${towerType} placed!`);
    gameState.selectedTowerType = null;
    towerOptions.forEach((opt) => opt.classList.remove("selected"));
  } else {
    displayMessage(`Not enough gold! You need ${towerCost} gold.`);
  }
}

// Check if position is on path
function isOnPath(x, y, buffer = 0) {
  for (let i = 0; i < gameState.path.length - 1; i++) {
    const p1 = gameState.path[i];
    const p2 = gameState.path[i + 1];

    // Check if points are on a horizontal or vertical line
    if (p1.x === p2.x) {
      // Vertical line
      const minY = Math.min(p1.y, p2.y) - buffer;
      const maxY = Math.max(p1.y, p2.y) + buffer;

      if (
        x >= p1.x - 15 - buffer &&
        x <= p1.x + 15 + buffer &&
        y >= minY &&
        y <= maxY
      ) {
        return true;
      }
    } else {
      // Horizontal line
      const minX = Math.min(p1.x, p2.x) - buffer;
      const maxX = Math.max(p1.x, p2.x) + buffer;

      if (
        y >= p1.y - 15 - buffer &&
        y <= p1.y + 15 + buffer &&
        x >= minX &&
        x <= maxX
      ) {
        return true;
      }
    }
  }

  return false;
}

// Check if tower overlaps with existing tower
function isTowerOverlap(x, y) {
  for (const tower of gameState.towers) {
    const distance = Math.sqrt((tower.x - x) ** 2 + (tower.y - y) ** 2);
    if (distance < 30) {
      return true;
    }
  }
  return false;
}

// Get tower configuration
function getTowerConfig(towerType) {
  switch (towerType) {
    case "basicTower":
      return towerTypes.basicTower;
    case "sniperTower":
      return towerTypes.sniperTower;
    case "aoeTower":
      return towerTypes.aoeTower;
    case "slowTower":
      return towerTypes.slowTower;
    default:
      return towerTypes.basicTower;
  }
}

// Start a new wave
function startWave() {
  gameState.wave++;
  gameState.isWaveActive = true;
  gameState.enemiesThisWave = gameState.wave * 5;
  gameState.enemiesSpawned = 0;
  gameState.enemiesDefeated = 0;
  gameState.enemySpawnTimer = 0;

  updateUI();
  displayMessage(`Wave ${gameState.wave} started!`);
  startWaveButton.disabled = true;
}

// Spawn an enemy
function spawnEnemy() {
  let enemyType;
  // On every 5th wave, add a boss as the first enemy, then spawn others as normal
  if (gameState.wave % 5 === 0 && gameState.enemiesSpawned === 0) {
    enemyType = "boss";
  } else {
    // Determine enemy type based on wave and random chance
    const rand = Math.random();
    if (gameState.wave >= 5 && rand < 0.3) {
      enemyType = "tank";
    } else if (rand < 0.4) {
      enemyType = "fast";
    } else {
      enemyType = "basic";
    }
  }

  // Scale health based on wave
  const healthMultiplier = 1 + (gameState.wave - 1) * 0.1;

  const enemy = {
    x: gameState.path[0].x,
    y: gameState.path[0].y,
    ...enemyTypes[enemyType],
    currentHealth: enemyTypes[enemyType].health * healthMultiplier,
    maxHealth: enemyTypes[enemyType].health * healthMultiplier,
    pathIndex: 0,
    progress: 0,
    slowUntil: 0, // New property for slow effect
    slowAmount: 0, // New property for slow effect
  };

  gameState.enemies.push(enemy);
  gameState.enemiesSpawned++;
}

// Update game state
function update(deltaTime) {
  if (gameState.gameOver) {
    startWaveButton.textContent = "Restart Game";
    startWaveButton.disabled = false;
    return;
  }

  // Spawn enemies
  if (
    gameState.isWaveActive &&
    gameState.enemiesSpawned < gameState.enemiesThisWave
  ) {
    gameState.enemySpawnTimer += deltaTime;

    // Spawn an enemy every second (adjusted by game speed)
    if (gameState.enemySpawnTimer >= 1000 / gameState.gameSpeed) {
      spawnEnemy();
      gameState.enemySpawnTimer = 0;
    }
  }

  // Update enemies
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    moveEnemy(enemy, deltaTime);

    // Check if enemy reached the end
    if (enemy.pathIndex >= gameState.path.length - 1) {
      gameState.enemies.splice(i, 1);
      gameState.lives--;
      updateUI();

      if (gameState.lives <= 0 && !gameState.gameOver) {
        gameOver(false);
        return; // Stop further update processing
      }
    }
  }

  // Update towers
  for (const tower of gameState.towers) {
    tower.lastShot += deltaTime;

    // Check if tower can shoot
    if (tower.lastShot >= 1000 / tower.fireRate) {
      const target = findTarget(tower);

      if (target) {
        shoot(tower, target);
        tower.lastShot = 0;
      }
    }
  }

  // Update projectiles
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const projectile = gameState.projectiles[i];
    moveProjectile(projectile, deltaTime);

    // Check for collision with enemies
    if (projectile.aoe) {
      // For AOE projectiles, check if reached target position
      const dx = projectile.targetX - projectile.x;
      const dy = projectile.targetY - projectile.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) {
        // Apply AOE damage
        applyAoeDamage(projectile);
        gameState.projectiles.splice(i, 1);
      }
    } else {
      // For direct projectiles, check collision with target
      for (let j = gameState.enemies.length - 1; j >= 0; j--) {
        const enemy = gameState.enemies[j];
        const dx = enemy.x - projectile.x;
        const dy = enemy.y - projectile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.size) {
          // Apply damage
          enemy.currentHealth -= projectile.damage;
          // Apply slow if slowTower
          if (
            projectile.towerType === "slowTower" &&
            projectile.slowAmount > 0
          ) {
            enemy.slowUntil = Date.now() + projectile.slowDuration;
            enemy.slowAmount = projectile.slowAmount;
          }
          // Check if enemy is defeated
          if (enemy.currentHealth <= 0) {
            defeatEnemy(enemy, j);
          }

          gameState.projectiles.splice(i, 1);
          break;
        }
      }
    }

    // Remove projectiles that go off screen
    if (
      projectile.x < 0 ||
      projectile.x > canvas.width ||
      projectile.y < 0 ||
      projectile.y > canvas.height
    ) {
      gameState.projectiles.splice(i, 1);
    }
  }

  // Check if wave is complete
  if (
    gameState.isWaveActive &&
    gameState.enemiesSpawned >= gameState.enemiesThisWave &&
    gameState.enemies.length === 0
  ) {
    completeWave();
  }

  // Animate base hit
  if (baseHitAnim.active) {
    baseHitAnim.timer -= deltaTime / 1000;
    if (baseHitAnim.timer <= 0) {
      baseHitAnim.active = false;
      baseHitAnim.timer = 0;
    }
  }
  // Animate screen flash
  if (screenFlash.active) {
    screenFlash.timer -= deltaTime / 1000;
    if (screenFlash.timer <= 0) {
      screenFlash.active = false;
      screenFlash.timer = 0;
    }
  }
}

// Fix moveEnemy to use gridToPixel for waypoints
function moveEnemy(enemy, deltaTime) {
  let speed = enemy.speed;
  if (enemy.slowUntil && Date.now() < enemy.slowUntil) {
    speed = enemy.speed * (1 - (enemy.slowAmount || 0));
  } else {
    enemy.slowUntil = 0;
    enemy.slowAmount = 0;
  }
  const speedFactor = speed * (deltaTime / 1000) * gameState.gameSpeed;
  // Use gridToPixel for path
  const currentPoint = gridToPixel(gameState.path[enemy.pathIndex]);
  const nextPoint = gridToPixel(gameState.path[enemy.pathIndex + 1]);
  // Calculate direction and distance
  const dx = nextPoint.x - currentPoint.x;
  const dy = nextPoint.y - currentPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  // Update progress along current path segment
  enemy.progress += speedFactor;
  // If reached end of segment, move to next segment
  if (enemy.progress >= distance) {
    enemy.progress -= distance;
    enemy.pathIndex++;
    if (enemy.pathIndex < gameState.path.length - 1) {
      moveEnemy(enemy, 0);
    } else {
      enemy.x = nextPoint.x;
      enemy.y = nextPoint.y;
    }
  } else {
    // Update position along current segment
    const ratio = enemy.progress / distance;
    enemy.x = currentPoint.x + dx * ratio;
    enemy.y = currentPoint.y + dy * ratio;
  }
}

// Find target for tower
function findTarget(tower) {
  let target = null;
  let furthestProgress = -1;

  for (const enemy of gameState.enemies) {
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= tower.range) {
      // Target the enemy that's furthest along the path
      if (
        enemy.pathIndex > furthestProgress ||
        (enemy.pathIndex === furthestProgress &&
          enemy.progress > (target ? target.progress : 0))
      ) {
        target = enemy;
        furthestProgress = enemy.pathIndex;
      }
    }
  }

  return target;
}

// Tower shoots at target
function shoot(tower, target) {
  const projectile = {
    x: tower.x,
    y: tower.y,
    targetX: target.x,
    targetY: target.y,
    speed: tower.projectileSpeed * gameState.gameSpeed,
    damage: tower.damage,
    color: tower.projectileColor,
    size: tower.aoe ? 6 : 4,
    aoe: tower.aoe,
    aoeRadius: tower.aoeRadius || 0,
    slowAmount: tower.slowAmount || 0,
    slowDuration: tower.slowDuration || 0,
    towerType: tower.type,
    targetEnemy: target,
  };
  gameState.projectiles.push(projectile);
}

// Move projectile
function moveProjectile(projectile, deltaTime) {
  const dx = projectile.targetX - projectile.x;
  const dy = projectile.targetY - projectile.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const vx = dx / distance;
  const vy = dy / distance;
  const speedFactor = projectile.speed * (deltaTime / 1000) * 60;
  projectile.x += vx * speedFactor;
  projectile.y += vy * speedFactor;
}

// 1. Fix AoE damage: all enemies in radius take full damage (no falloff)
function applyAoeDamage(projectile) {
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    const dx = enemy.x - projectile.targetX;
    const dy = enemy.y - projectile.targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= projectile.aoeRadius) {
      enemy.currentHealth -= projectile.damage; // No falloff
      if (enemy.currentHealth <= 0) {
        defeatEnemy(enemy, i);
      }
    }
  }
}

// Handle enemy defeat
function defeatEnemy(enemy, index) {
  gameState.gold += enemy.reward;
  gameState.score += enemy.reward;
  gameState.enemiesDefeated++;
  gameState.enemies.splice(index, 1);
  updateUI();
}

// Complete wave
function completeWave() {
  gameState.isWaveActive = false;
  gameState.gold += gameState.wave * 10; // Bonus gold
  updateUI();
  displayMessage(
    `Wave ${gameState.wave} completed! +${gameState.wave * 10} gold bonus!`
  );
  startWaveButton.disabled = false;
}

// Game over
function gameOver(isWin) {
  gameState.gameOver = true;
  let message;
  if (gameState.score > highScore) {
    highScore = gameState.score;
    localStorage.setItem("td_highscore", highScore);
    message = `New High Score! ${highScore}\n`;
  } else {
    message = "";
  }
  if (isWin) {
    message += `Victory! You've completed all waves! Final score: ${gameState.score}`;
  } else {
    message += `You've been defeated at wave ${gameState.wave}. Final score: ${gameState.score}`;
  }
  if (window.showGameOverModal) {
    window.showGameOverModal(message);
  } else {
    displayMessage(message);
  }
}

// Reset game
function resetGame() {
  // Reset game state
  gameState.lives = 10;
  gameState.gold = 100;
  gameState.wave = 0;
  gameState.score = 0;
  gameState.isWaveActive = false;
  gameState.selectedTower = null;
  gameState.selectedTowerType = null;
  gameState.towers = [];
  gameState.enemies = [];
  gameState.projectiles = [];
  gameState.gameOver = false;
  // Reset UI
  createPath();
  updateUI();
  startWaveButton.textContent = "Start Wave";
  towerOptions.forEach((opt) => opt.classList.remove("selected"));
  displayMessage(
    "Select a tower and place it on the map. Then start the wave!"
  );
}

// 9. Update draw() to use new background, path, and grid
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPath();
  drawBase();
  // No drawGridOverlay();
  for (const tower of gameState.towers) {
    const target = findTarget(tower);
    let angle = 0;
    if (target) {
      angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    }
    drawTower(tower, angle);
  }
  if (gameState.selectedTowerType) {
    drawTowerPlacement();
  }
  for (const enemy of gameState.enemies) {
    drawEnemy(enemy);
  }
  for (const projectile of gameState.projectiles) {
    drawProjectile(projectile);
  }
  drawScreenFlash();
}

// Draw tower
function drawTower(tower, facingAngle = 0, context = ctx) {
  context.save();
  context.translate(tower.x, tower.y);
  context.rotate(facingAngle);
  switch (tower.type) {
    case "basicTower":
      context.fillStyle = tower.color;
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#222";
      context.stroke();
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 7, 0, Math.PI * 2);
      context.fill();
      // Add a barrel
      context.save();
      context.rotate(0);
      context.fillStyle = "#222";
      context.fillRect(0, -3, 15, 6);
      context.restore();
      break;
    case "sniperTower":
      context.fillStyle = tower.color;
      context.beginPath();
      context.arc(0, 0, 13, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#0D47A1";
      context.stroke();
      // Barrel
      context.save();
      context.rotate(0);
      context.fillStyle = "#0D47A1";
      context.fillRect(0, -3, 22, 6);
      context.restore();
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 6, 0, Math.PI * 2);
      context.fill();
      break;
    case "aoeTower":
      context.fillStyle = tower.color;
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#E65100";
      context.stroke();
      // Radiating lines
      context.strokeStyle = "#fff";
      for (let i = 0; i < 8; i++) {
        context.save();
        context.rotate((Math.PI / 4) * i);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -15);
        context.stroke();
        context.restore();
      }
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 6, 0, Math.PI * 2);
      context.fill();
      break;
    case "slowTower":
      context.fillStyle = tower.color;
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#0097a7";
      context.stroke();
      // Snowflake/star
      context.strokeStyle = "#fff";
      for (let i = 0; i < 6; i++) {
        context.save();
        context.rotate((Math.PI / 3) * i);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -12);
        context.stroke();
        context.restore();
      }
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();
      // Add a barrel
      context.save();
      context.rotate(0);
      context.fillStyle = "#0097a7";
      context.fillRect(0, -3, 13, 6);
      context.restore();
      break;
    default:
      context.fillStyle = "#888";
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      break;
  }
  context.restore();
}

// 10. Update drawTowerPlacement to snap to grid and highlight valid slot
function drawTowerPlacement() {
  const rect = canvas.getBoundingClientRect();
  const mouseX = lastMouseX - rect.left;
  const mouseY = lastMouseY - rect.top;
  const cell = pixelToGrid({ x: mouseX, y: mouseY });
  const center = gridToPixel(cell);
  let onPath = isCellOnPath(cell);
  let occupied = false;
  for (const tower of gameState.towers) {
    const tcell = pixelToGrid({ x: tower.x, y: tower.y });
    if (tcell.x === cell.x && tcell.y === cell.y) occupied = true;
  }
  // Draw range indicator
  const towerConfig = getTowerConfig(gameState.selectedTowerType);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(center.x, center.y, towerConfig.range, 0, Math.PI * 2);
  ctx.fillStyle = onPath || occupied ? "#e94560" : "#2196f3";
  ctx.fill();
  ctx.restore();
  // Draw tower preview
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.translate(center.x, center.y);
  drawTower(
    { ...towerConfig, x: 0, y: 0, type: gameState.selectedTowerType },
    0
  );
  ctx.restore();
  // Highlight cell only
  ctx.save();
  ctx.lineWidth = 3;
  if (onPath || occupied) {
    ctx.strokeStyle = "rgba(233,69,96,0.7)";
  } else {
    ctx.strokeStyle = "rgba(46,204,113,0.7)";
  }
  ctx.strokeRect(cell.x * GRID_SIZE, cell.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
  ctx.restore();
}

// Draw enemy
function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  switch (enemy.color) {
    case "#e74c3c": // basic
      // Red circle with black outline
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#222";
      ctx.stroke();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-4, -3, 2, 0, Math.PI * 2);
      ctx.arc(4, -3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(-4, -3, 1, 0, Math.PI * 2);
      ctx.arc(4, -3, 1, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 3, 4, 0, Math.PI);
      ctx.stroke();
      break;
    case "#f1c40f": // fast
      // Yellow triangle
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.size);
      ctx.lineTo(enemy.size, enemy.size);
      ctx.lineTo(-enemy.size, enemy.size);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#b7950b";
      ctx.stroke();
      // Stripes
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * enemy.size * 0.5, enemy.size * 0.5);
        ctx.lineTo(i * enemy.size * 0.2, -enemy.size * 0.7);
        ctx.stroke();
      }
      break;
    case "#8e44ad": // tank
      // Purple square with border
      ctx.fillStyle = enemy.color;
      ctx.fillRect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2);
      // Rivets
      ctx.fillStyle = "#fff";
      for (let i = -1; i <= 1; i += 2) {
        for (let j = -1; j <= 1; j += 2) {
          ctx.beginPath();
          ctx.arc(
            i * enemy.size * 0.7,
            j * enemy.size * 0.7,
            2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      // Bolts
      ctx.fillStyle = "#b7950b";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * enemy.size * 0.7, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, i * enemy.size * 0.7, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hatch
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "#c0392b": // boss
      // Large red circle with crown
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffd700";
      ctx.stroke();
      // Crown
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(-10, -enemy.size - 2);
      ctx.lineTo(-5, -enemy.size - 12);
      ctx.lineTo(0, -enemy.size - 2);
      ctx.lineTo(5, -enemy.size - 12);
      ctx.lineTo(10, -enemy.size - 2);
      ctx.closePath();
      ctx.fill();
      // Crown jewels
      ctx.fillStyle = "#2196F3";
      ctx.beginPath();
      ctx.arc(-5, -enemy.size - 8, 1.5, 0, Math.PI * 2);
      ctx.arc(0, -enemy.size - 11, 1.5, 0, Math.PI * 2);
      ctx.arc(5, -enemy.size - 8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Face
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-6, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(-6, -3, 1.2, 0, Math.PI * 2);
      ctx.arc(6, -3, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 6, 6, 0, Math.PI);
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
  // Draw health bar
  const healthPercentage = enemy.currentHealth / enemy.maxHealth;
  const healthBarWidth = enemy.size * 2;
  const healthBarHeight = 4;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(
    enemy.x - healthBarWidth / 2,
    enemy.y - enemy.size - 8,
    healthBarWidth,
    healthBarHeight
  );
  ctx.fillStyle =
    healthPercentage > 0.5
      ? "#2ecc71"
      : healthPercentage > 0.25
      ? "#f39c12"
      : "#e74c3c";
  ctx.fillRect(
    enemy.x - healthBarWidth / 2,
    enemy.y - enemy.size - 8,
    healthBarWidth * healthPercentage,
    healthBarHeight
  );
}

// Draw projectile
function drawProjectile(projectile) {
  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
  ctx.fill();
}

// Update UI elements
function updateUI() {
  livesElement.textContent = gameState.lives;
  goldElement.textContent = gameState.gold;
  waveElement.textContent = gameState.wave;
  scoreElement.textContent = gameState.score;
  // Show high score if element exists
  const highScoreElement = document.getElementById("highscore");
  if (highScoreElement) {
    highScoreElement.textContent = highScore;
  }
}

// Display message
function displayMessage(message) {
  gameMessage.textContent = message;
}

// Track mouse position for tower placement
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

// Add a resize event to clear the cache if the canvas size changes
window.addEventListener("resize", () => {
  backgroundCache = null;
});

// Listen for layout changes and update the path and redraw
window.addEventListener("DOMContentLoaded", function () {
  const layoutSelect = document.getElementById("layoutSelect");
  if (layoutSelect) {
    layoutSelect.addEventListener("change", function () {
      createPath();
      draw();
    });
  }
  const layoutSelectModal = document.getElementById("layoutSelectModal");
  if (layoutSelectModal) {
    layoutSelectModal.addEventListener("change", function () {
      createPath();
      draw();
    });
  }
});

// Game loop
function gameLoop(timestamp) {
  // Calculate delta time
  const deltaTime = timestamp - gameState.lastFrameTime;
  gameState.lastFrameTime = timestamp;

  // Update game state
  update(deltaTime);

  // Draw game
  draw();

  // Continue game loop
  requestAnimationFrame(gameLoop);
}

// Initialize game when page loads
window.addEventListener("load", initGame);

// 4. Expose a function to render a tower to a canvas for the buying window
window.renderTowerPreview = function (canvas, towerType) {
  const ctx2 = canvas.getContext("2d");
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  const towerConfig = getTowerConfig(towerType);
  // Center in canvas, face right
  ctx2.save();
  ctx2.translate(canvas.width / 2, canvas.height / 2);
  drawTower({ ...towerConfig, x: 0, y: 0, type: towerType }, 0, ctx2);
  ctx2.restore();
};
