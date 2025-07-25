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

// Visual effects
let cameraShake = { active: false, intensity: 0, timer: 0 };
let projectileTrails = [];

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

// Draw enhanced castle at the end of the path
function drawBase() {
  const end = gridToPixel(gameState.path[gameState.path.length - 1]);
  ctx.save();
  ctx.translate(end.x, end.y);

  // Add castle glow
  ctx.shadowColor = baseHitAnim.active ? "#e94560" : "#4a90e2";
  ctx.shadowBlur = baseHitAnim.active ? 20 : 10;

  // Draw castle wall with gradient
  const wallGrad = ctx.createLinearGradient(
    -GRID_SIZE * 0.7,
    -GRID_SIZE * 0.7,
    GRID_SIZE * 0.7,
    GRID_SIZE * 0.7
  );
  wallGrad.addColorStop(0, "#d5d5d5");
  wallGrad.addColorStop(0.5, "#b0b0b0");
  wallGrad.addColorStop(1, "#8a8a8a");
  ctx.fillStyle = wallGrad;
  ctx.strokeStyle = baseHitAnim.active ? "#e94560" : "#666";
  ctx.lineWidth = baseHitAnim.active ? 6 : 4;
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
  // Draw animated flag/banner
  ctx.save();
  const flagWave = Math.sin(Date.now() / 200) * 2;
  ctx.beginPath();
  ctx.moveTo(0, -GRID_SIZE * 0.95);
  ctx.lineTo(GRID_SIZE * 0.18 + flagWave, -GRID_SIZE * 1.15);
  ctx.lineTo(flagWave, -GRID_SIZE * 1.15);
  ctx.closePath();

  const flagGrad = ctx.createLinearGradient(
    0,
    -GRID_SIZE * 1.15,
    GRID_SIZE * 0.18,
    -GRID_SIZE * 1.15
  );
  flagGrad.addColorStop(0, "#e94560");
  flagGrad.addColorStop(1, "#c0392b");
  ctx.fillStyle = flagGrad;
  ctx.globalAlpha = 0.9;
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
  // Enhanced damage effect
  if (baseHitAnim.active) {
    ctx.save();
    const damageIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 60);
    ctx.lineWidth = 12;
    ctx.strokeStyle = `rgba(233,69,96,${damageIntensity})`;
    ctx.shadowColor = "#e94560";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, GRID_SIZE * 0.8, 0, Math.PI * 2);
    ctx.stroke();

    // Add sparks
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Date.now() / 100;
      const sparkX = Math.cos(angle) * GRID_SIZE * 0.9;
      const sparkY = Math.sin(angle) * GRID_SIZE * 0.9;
      ctx.fillStyle = `rgba(255, 255, 255, ${damageIntensity})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// Draw enhanced screen flash overlay
function drawScreenFlash() {
  if (screenFlash.active) {
    ctx.save();
    const intensity = Math.min(0.6, screenFlash.timer * 3);
    const pulse = Math.sin(Date.now() / 50) * 0.1 + 0.9;

    // Create radial gradient for dramatic effect
    const flashGrad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height)
    );
    flashGrad.addColorStop(0, `rgba(233, 69, 96, ${intensity * pulse})`);
    flashGrad.addColorStop(0.7, `rgba(233, 69, 96, ${intensity * 0.3})`);
    flashGrad.addColorStop(1, "rgba(233, 69, 96, 0)");

    ctx.fillStyle = flashGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (window.soundSystem) window.soundSystem.playSound("place");
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
      if (window.soundSystem) window.soundSystem.playSound("life");
      const end = gridToPixel(gameState.path[gameState.path.length - 1]);
      gameState.enemies.splice(i, 1);
      gameState.lives--;

      // Visual effects for life lost
      baseHitAnim.active = true;
      baseHitAnim.timer = 0.5;
      screenFlash.active = true;
      screenFlash.timer = 0.3;
      cameraShake.active = true;
      cameraShake.intensity = 8;
      cameraShake.timer = 0.4;

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

        // Create explosion effect
        if (window.particleSystem) {
          window.particleSystem.createExplosion(
            projectile.targetX,
            projectile.targetY,
            "#ff6b35",
            12
          );
        }

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
          if (window.soundSystem) window.soundSystem.playSound("hit");

          // Create hit particles
          if (window.particleSystem) {
            window.particleSystem.createHit(enemy.x, enemy.y, enemy.color);
          }

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

  // Animate camera shake
  if (cameraShake.active) {
    cameraShake.timer -= deltaTime / 1000;
    cameraShake.intensity *= 0.95;
    if (cameraShake.timer <= 0) {
      cameraShake.active = false;
      cameraShake.intensity = 0;
    }
  }

  // Update particles
  if (window.particleSystem) {
    window.particleSystem.update(deltaTime);
  }

  // Update projectile trails
  for (let i = projectileTrails.length - 1; i >= 0; i--) {
    const trail = projectileTrails[i];
    trail.life -= deltaTime / 1000;
    if (trail.life <= 0) {
      projectileTrails.splice(i, 1);
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
  if (window.soundSystem) window.soundSystem.playSound("shoot");

  // Create muzzle flash
  const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  if (window.particleSystem) {
    window.particleSystem.createMuzzleFlash(tower.x, tower.y, angle);
  }

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
      if (window.soundSystem) window.soundSystem.playSound("hit");

      // Create hit particles
      if (window.particleSystem) {
        window.particleSystem.createHit(enemy.x, enemy.y, enemy.color);
      }

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

  // Create gold pickup effect
  if (window.particleSystem) {
    window.particleSystem.createGoldEffect(enemy.x, enemy.y);
  }

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
  ctx.save();

  // Apply camera shake
  if (cameraShake.active) {
    const shakeX = (Math.random() - 0.5) * cameraShake.intensity;
    const shakeY = (Math.random() - 0.5) * cameraShake.intensity;
    ctx.translate(shakeX, shakeY);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPath();
  drawBase();

  // Draw projectile trails
  drawProjectileTrails();

  for (const tower of gameState.towers) {
    const target = findTarget(tower);
    let angle = 0;
    if (target) {
      angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    }
    drawTower(tower, angle);

    // Draw range indicator for selected tower
    if (gameState.selectedTowerType && target) {
      drawRangeIndicator(tower);
    }
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

  // Draw particles
  if (window.particleSystem) {
    window.particleSystem.draw(ctx);
  }

  ctx.restore();

  drawScreenFlash();
}

// Draw tower
function drawTower(tower, facingAngle = 0, context = ctx) {
  context.save();
  context.translate(tower.x, tower.y);
  context.rotate(facingAngle);

  // Add glow effect for all towers
  context.shadowColor = tower.color;
  context.shadowBlur = 8;

  switch (tower.type) {
    case "basicTower":
      // Base
      const gradient1 = context.createRadialGradient(0, 0, 0, 0, 0, 15);
      gradient1.addColorStop(0, tower.color);
      gradient1.addColorStop(1, "#2e7d32");
      context.fillStyle = gradient1;
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#1b5e20";
      context.stroke();

      // Inner core
      context.shadowBlur = 4;
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 7, 0, Math.PI * 2);
      context.fill();

      // Barrel with gradient
      context.save();
      context.rotate(0);
      const barrelGrad = context.createLinearGradient(0, -3, 0, 3);
      barrelGrad.addColorStop(0, "#333");
      barrelGrad.addColorStop(0.5, "#222");
      barrelGrad.addColorStop(1, "#111");
      context.fillStyle = barrelGrad;
      context.fillRect(0, -3, 15, 6);
      context.strokeStyle = "#000";
      context.lineWidth = 1;
      context.strokeRect(0, -3, 15, 6);
      context.restore();
      break;
    case "sniperTower":
      // Base with gradient
      const gradient2 = context.createRadialGradient(0, 0, 0, 0, 0, 13);
      gradient2.addColorStop(0, tower.color);
      gradient2.addColorStop(1, "#0D47A1");
      context.fillStyle = gradient2;
      context.beginPath();
      context.arc(0, 0, 13, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#0D47A1";
      context.stroke();

      // Long barrel with metallic effect
      context.save();
      context.rotate(0);
      const sniperBarrel = context.createLinearGradient(0, -3, 0, 3);
      sniperBarrel.addColorStop(0, "#1565c0");
      sniperBarrel.addColorStop(0.5, "#0D47A1");
      sniperBarrel.addColorStop(1, "#0a3d91");
      context.fillStyle = sniperBarrel;
      context.fillRect(0, -3, 22, 6);

      // Barrel highlights
      context.fillStyle = "rgba(255,255,255,0.3)";
      context.fillRect(0, -2, 22, 1);
      context.restore();

      // Scope
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#0D47A1";
      context.lineWidth = 1;
      context.stroke();
      break;
    case "aoeTower":
      // Pulsing base
      const pulseIntensity = 0.8 + 0.2 * Math.sin(Date.now() / 200);
      const gradient3 = context.createRadialGradient(0, 0, 0, 0, 0, 15);
      gradient3.addColorStop(0, `rgba(255, 152, 0, ${pulseIntensity})`);
      gradient3.addColorStop(1, "#E65100");
      context.fillStyle = gradient3;
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#E65100";
      context.stroke();

      // Animated radiating lines
      context.strokeStyle = `rgba(255, 255, 255, ${pulseIntensity})`;
      context.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        context.save();
        context.rotate((Math.PI / 4) * i + Date.now() / 1000);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -15);
        context.stroke();
        context.restore();
      }

      // Glowing center
      context.shadowBlur = 10;
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(0, 0, 6, 0, Math.PI * 2);
      context.fill();
      break;
    case "slowTower":
      // Icy base with frost effect
      const gradient4 = context.createRadialGradient(0, 0, 0, 0, 0, 15);
      gradient4.addColorStop(0, "#4dd0e1");
      gradient4.addColorStop(1, "#0097a7");
      context.fillStyle = gradient4;
      context.beginPath();
      context.arc(0, 0, 15, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#0097a7";
      context.stroke();

      // Rotating snowflake
      const rotation = Date.now() / 1000;
      context.strokeStyle = "rgba(255, 255, 255, 0.9)";
      context.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        context.save();
        context.rotate((Math.PI / 3) * i + rotation);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -12);
        context.stroke();
        // Add small branches
        context.beginPath();
        context.moveTo(0, -8);
        context.lineTo(-2, -6);
        context.moveTo(0, -8);
        context.lineTo(2, -6);
        context.stroke();
        context.restore();
      }

      // Glowing center
      context.shadowBlur = 8;
      context.fillStyle = "#e1f5fe";
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();

      // Frost barrel
      context.save();
      context.rotate(0);
      context.shadowBlur = 4;
      const barrelGrad2 = context.createLinearGradient(0, -3, 0, 3);
      barrelGrad2.addColorStop(0, "#4dd0e1");
      barrelGrad2.addColorStop(1, "#0097a7");
      context.fillStyle = barrelGrad2;
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

  // Reset shadow
  context.shadowBlur = 0;
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

  // Add glow effect
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 6;

  switch (enemy.color) {
    case "#e74c3c": // basic - Armored Soldier
      // Body gradient
      const basicGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.size);
      basicGrad.addColorStop(0, "#ff6b6b");
      basicGrad.addColorStop(1, "#e74c3c");
      ctx.fillStyle = basicGrad;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();

      // Armor plating
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Helmet
      ctx.fillStyle = "#34495e";
      ctx.beginPath();
      ctx.arc(0, -3, enemy.size * 0.8, Math.PI, 0);
      ctx.fill();

      // Visor
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-8, -8, 16, 4);

      // Eyes glow
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ff4757";
      ctx.beginPath();
      ctx.arc(-4, -6, 1.5, 0, Math.PI * 2);
      ctx.arc(4, -6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "#f1c40f": // fast - Lightning Scout
      // Electric aura
      const time = Date.now() / 100;
      ctx.shadowBlur = 10 + 5 * Math.sin(time);

      // Body with electric gradient
      const fastGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.size);
      fastGrad.addColorStop(0, "#fff");
      fastGrad.addColorStop(0.3, "#f1c40f");
      fastGrad.addColorStop(1, "#d4ac0d");
      ctx.fillStyle = fastGrad;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.size);
      ctx.lineTo(enemy.size, enemy.size);
      ctx.lineTo(-enemy.size, enemy.size);
      ctx.closePath();
      ctx.fill();

      // Lightning bolts
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 3 + time / 10);
        ctx.beginPath();
        ctx.moveTo(0, -enemy.size * 0.3);
        ctx.lineTo(3, -enemy.size * 0.6);
        ctx.lineTo(-2, -enemy.size * 0.8);
        ctx.lineTo(4, -enemy.size);
        ctx.stroke();
        ctx.restore();
      }

      // Core
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "#8e44ad": // tank - Heavy Mech
      // Metallic body with gradient
      const tankGrad = ctx.createLinearGradient(
        -enemy.size,
        -enemy.size,
        enemy.size,
        enemy.size
      );
      tankGrad.addColorStop(0, "#a569bd");
      tankGrad.addColorStop(0.5, "#8e44ad");
      tankGrad.addColorStop(1, "#6c3483");
      ctx.fillStyle = tankGrad;
      ctx.fillRect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2);

      // Armor plating
      ctx.strokeStyle = "#5b2c87";
      ctx.lineWidth = 3;
      ctx.strokeRect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2);

      // Hydraulic pistons
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-enemy.size * 0.8, -enemy.size * 0.3, 4, enemy.size * 0.6);
      ctx.fillRect(
        enemy.size * 0.8 - 4,
        -enemy.size * 0.3,
        4,
        enemy.size * 0.6
      );

      // Glowing core
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Warning lights
      const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 71, 87, ${pulse})`;
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
      break;
    case "#c0392b": // boss - Demon Lord
      const bossTime = Date.now() / 150;

      // Pulsing aura
      ctx.shadowBlur = 20 + 10 * Math.sin(bossTime);
      ctx.shadowColor = "#ff4757";

      // Main body with dark gradient
      const bossGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.size);
      bossGrad.addColorStop(0, "#2c2c54");
      bossGrad.addColorStop(0.7, "#c0392b");
      bossGrad.addColorStop(1, "#7f1d1d");
      ctx.fillStyle = bossGrad;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();

      // Demonic spikes
      ctx.fillStyle = "#7f1d1d";
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 8);
        ctx.beginPath();
        ctx.moveTo(0, -enemy.size);
        ctx.lineTo(-3, -enemy.size - 8);
        ctx.lineTo(3, -enemy.size - 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Glowing crown
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(-12, -enemy.size - 2);
      ctx.lineTo(-6, -enemy.size - 15);
      ctx.lineTo(0, -enemy.size - 5);
      ctx.lineTo(6, -enemy.size - 15);
      ctx.lineTo(12, -enemy.size - 2);
      ctx.closePath();
      ctx.fill();

      // Crown gems (animated)
      const gemPulse = Math.sin(bossTime * 2) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(33, 150, 243, ${gemPulse})`;
      ctx.beginPath();
      ctx.arc(-6, -enemy.size - 10, 2, 0, Math.PI * 2);
      ctx.arc(0, -enemy.size - 12, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -enemy.size - 10, 2, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ff4757";
      ctx.beginPath();
      ctx.arc(-8, -5, 3, 0, Math.PI * 2);
      ctx.arc(8, -5, 3, 0, Math.PI * 2);
      ctx.fill();

      // Menacing grin
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 8, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Fangs
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(-4, 8);
      ctx.lineTo(-2, 12);
      ctx.lineTo(-6, 10);
      ctx.moveTo(4, 8);
      ctx.lineTo(2, 12);
      ctx.lineTo(6, 10);
      ctx.fill();
      break;
    default:
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Enhanced health bar
  const healthPercentage = enemy.currentHealth / enemy.maxHealth;
  const healthBarWidth = enemy.size * 2.2;
  const healthBarHeight = 5;
  const barY = enemy.y - enemy.size - 12;

  // Health bar background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(
    enemy.x - healthBarWidth / 2 - 1,
    barY - 1,
    healthBarWidth + 2,
    healthBarHeight + 2
  );

  // Health bar fill with gradient
  const healthGrad = ctx.createLinearGradient(
    enemy.x - healthBarWidth / 2,
    0,
    enemy.x + healthBarWidth / 2,
    0
  );
  if (healthPercentage > 0.6) {
    healthGrad.addColorStop(0, "#2ecc71");
    healthGrad.addColorStop(1, "#27ae60");
  } else if (healthPercentage > 0.3) {
    healthGrad.addColorStop(0, "#f39c12");
    healthGrad.addColorStop(1, "#e67e22");
  } else {
    healthGrad.addColorStop(0, "#e74c3c");
    healthGrad.addColorStop(1, "#c0392b");
  }

  ctx.fillStyle = healthGrad;
  ctx.fillRect(
    enemy.x - healthBarWidth / 2,
    barY,
    healthBarWidth * healthPercentage,
    healthBarHeight
  );

  // Health bar glow
  if (healthPercentage < 0.3) {
    ctx.save();
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      enemy.x - healthBarWidth / 2,
      barY,
      healthBarWidth * healthPercentage,
      healthBarHeight
    );
    ctx.restore();
  }
}

// Draw projectile trails
function drawProjectileTrails() {
  for (const trail of projectileTrails) {
    const alpha = trail.life / trail.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = trail.color;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Draw range indicator
function drawRangeIndicator(tower) {
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = tower.color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Draw projectile with enhanced effects
function drawProjectile(projectile) {
  // Add trail effect
  projectileTrails.push({
    x: projectile.x,
    y: projectile.y,
    size: projectile.size * 0.8,
    color: projectile.color,
    life: 0.3,
    maxLife: 0.3,
  });

  // Draw projectile with glow effect
  ctx.save();

  // Glow effect
  ctx.shadowColor = projectile.color;
  ctx.shadowBlur = 10;

  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright core
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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
  if (!gameState.lastFrameTime) gameState.lastFrameTime = timestamp;
  const deltaTime = timestamp - gameState.lastFrameTime;
  gameState.lastFrameTime = timestamp;
  if (!window.isPaused) {
    update(deltaTime);
  }
  draw();
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

// Fix pause/resume and sound: ensure DOM is ready
window.addEventListener("DOMContentLoaded", function () {
  // PAUSE/RESUME
  window.isPaused = false;
  const pauseBtn = document.getElementById("pauseBtn");
  if (pauseBtn) {
    pauseBtn.onclick = function () {
      window.isPaused = !window.isPaused;
      pauseBtn.textContent = window.isPaused ? "Resume" : "Pause";
    };
  }
  // SOUND TOGGLE
  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.onclick = function () {
      if (window.soundSystem) {
        const enabled = window.soundSystem.toggle();
        soundToggle.textContent = `Sound: ${enabled ? "ON" : "OFF"}`;
      }
    };
  }
});
