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
    damage: 10,
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
    damage: 30,
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
    damage: 15,
    fireRate: 0.8, // shots per second
    projectileSpeed: 3,
    color: "#FF9800",
    projectileColor: "#E65100",
    aoe: true,
    aoeRadius: 30,
    lastShot: 0,
  },
};

// Enemy types
const enemyTypes = {
  basic: {
    health: 30,
    speed: 1,
    size: 15,
    color: "#e74c3c",
    reward: 5,
  },
  fast: {
    health: 15,
    speed: 2,
    size: 10,
    color: "#f1c40f",
    reward: 8,
  },
  tank: {
    health: 80,
    speed: 0.5,
    size: 20,
    color: "#8e44ad",
    reward: 15,
  },
  boss: {
    health: 200,
    speed: 0.7,
    size: 25,
    color: "#c0392b",
    reward: 50,
  },
};

// Create the game path
function createPath() {
  // Define path waypoints (x, y)
  gameState.path = [
    { x: 0, y: 100 },
    { x: 150, y: 100 },
    { x: 150, y: 250 },
    { x: 300, y: 250 },
    { x: 300, y: 100 },
    { x: 450, y: 100 },
    { x: 450, y: 350 },
    { x: 600, y: 350 },
    { x: 600, y: 200 },
    { x: 800, y: 200 },
  ];
}

// Draw the game path
function drawPath() {
  ctx.beginPath();
  ctx.moveTo(gameState.path[0].x, gameState.path[0].y);

  for (let i = 1; i < gameState.path.length; i++) {
    ctx.lineTo(gameState.path[i].x, gameState.path[i].y);
  }

  ctx.strokeStyle = "#e94560";
  ctx.lineWidth = 30;
  ctx.stroke();

  // Draw path border
  ctx.beginPath();
  ctx.moveTo(gameState.path[0].x, gameState.path[0].y);

  for (let i = 1; i < gameState.path.length; i++) {
    ctx.lineTo(gameState.path[i].x, gameState.path[i].y);
  }

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 32;
  ctx.globalAlpha = 0.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
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
    } else {
      gameState.gameSpeed = 1;
      speedToggleButton.textContent = "Speed: x1";
    }
  });

  // Start game loop
  requestAnimationFrame(gameLoop);
}

// Place tower at position
function placeTower(x, y) {
  // Check if position is valid (not on path)
  if (isOnPath(x, y, 20)) {
    displayMessage("Can't place tower on the path!");
    return;
  }

  // Check if tower overlaps with existing tower
  if (isTowerOverlap(x, y)) {
    displayMessage("Can't place tower on another tower!");
    return;
  }

  const towerType = gameState.selectedTowerType;
  const towerConfig = getTowerConfig(towerType);
  const towerCost = towerConfig.cost;

  if (gameState.gold >= towerCost) {
    // Create new tower
    const tower = {
      x,
      y,
      type: towerType,
      ...towerConfig,
      lastShot: 0,
    };

    gameState.towers.push(tower);
    gameState.gold -= towerCost;
    updateUI();
    displayMessage(`${towerType} placed!`);
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

  // Determine enemy type based on wave and random chance
  const rand = Math.random();

  if (gameState.wave >= 10 && rand < 0.1) {
    enemyType = "boss";
  } else if (gameState.wave >= 5 && rand < 0.3) {
    enemyType = "tank";
  } else if (rand < 0.4) {
    enemyType = "fast";
  } else {
    enemyType = "basic";
  }

  // Scale health based on wave
  const healthMultiplier = 1 + (gameState.wave - 1) * 0.2;

  const enemy = {
    x: gameState.path[0].x,
    y: gameState.path[0].y,
    ...enemyTypes[enemyType],
    currentHealth: enemyTypes[enemyType].health * healthMultiplier,
    maxHealth: enemyTypes[enemyType].health * healthMultiplier,
    pathIndex: 0,
    progress: 0,
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

      if (gameState.lives <= 0) {
        gameOver(false);
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
}

// Move enemy along the path
function moveEnemy(enemy, deltaTime) {
  const speedFactor = enemy.speed * (deltaTime / 1000) * gameState.gameSpeed;

  // Current path segment
  const currentPoint = gameState.path[enemy.pathIndex];
  const nextPoint = gameState.path[enemy.pathIndex + 1];

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

    // If there are more segments
    if (enemy.pathIndex < gameState.path.length - 1) {
      // Continue to next segment
      moveEnemy(enemy, 0);
    } else {
      // Position at end of path
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
  };

  gameState.projectiles.push(projectile);
}

// Move projectile
function moveProjectile(projectile, deltaTime) {
  const dx = projectile.targetX - projectile.x;
  const dy = projectile.targetY - projectile.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize direction
  const vx = dx / distance;
  const vy = dy / distance;

  // Move projectile
  const speedFactor = projectile.speed * (deltaTime / 1000) * 60;
  projectile.x += vx * speedFactor;
  projectile.y += vy * speedFactor;
}

// Apply AOE damage
function applyAoeDamage(projectile) {
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    const dx = enemy.x - projectile.targetX;
    const dy = enemy.y - projectile.targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= projectile.aoeRadius) {
      // Apply damage with falloff based on distance
      const falloff = 1 - distance / projectile.aoeRadius;
      const damage = projectile.damage * falloff;

      enemy.currentHealth -= damage;

      // Check if enemy is defeated
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

  if (isWin) {
    displayMessage(
      `Victory! You've completed all waves! Final score: ${gameState.score}`
    );
  } else {
    displayMessage(
      `Game Over! You've been defeated at wave ${gameState.wave}. Final score: ${gameState.score}`
    );
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
  updateUI();
  startWaveButton.textContent = "Start Wave";
  towerOptions.forEach((opt) => opt.classList.remove("selected"));
  displayMessage(
    "Select a tower and place it on the map. Then start the wave!"
  );
}

// Draw game elements
function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background grid
  drawGrid();

  // Draw path
  drawPath();

  // Draw towers
  for (const tower of gameState.towers) {
    drawTower(tower);
  }

  // Draw tower range for selected tower
  if (gameState.selectedTowerType) {
    drawTowerPlacement();
  }

  // Draw enemies
  for (const enemy of gameState.enemies) {
    drawEnemy(enemy);
  }

  // Draw projectiles
  for (const projectile of gameState.projectiles) {
    drawProjectile(projectile);
  }
}

// Draw background grid
function drawGrid() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Draw tower
function drawTower(tower) {
  // Draw tower base
  ctx.fillStyle = tower.color;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
  ctx.fill();

  // Draw tower top
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 8, 0, Math.PI * 2);
  ctx.fill();

  // Draw tower range (if debugging)
  // ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  // ctx.beginPath();
  // ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  // ctx.stroke();
}

// Draw tower placement preview
function drawTowerPlacement() {
  const rect = canvas.getBoundingClientRect();
  const mouseX = lastMouseX - rect.left;
  const mouseY = lastMouseY - rect.top;

  if (
    mouseX >= 0 &&
    mouseX <= canvas.width &&
    mouseY >= 0 &&
    mouseY <= canvas.height
  ) {
    const towerConfig = getTowerConfig(gameState.selectedTowerType);

    // Check if placement is valid
    const isValid =
      !isOnPath(mouseX, mouseY, 20) && !isTowerOverlap(mouseX, mouseY);

    // Draw tower range
    ctx.strokeStyle = isValid
      ? "rgba(255, 255, 255, 0.3)"
      : "rgba(255, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, towerConfig.range, 0, Math.PI * 2);
    ctx.stroke();

    // Draw tower
    ctx.fillStyle = isValid ? towerConfig.color : "rgba(255, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw enemy
function drawEnemy(enemy) {
  // Draw enemy body
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
  ctx.fill();

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
