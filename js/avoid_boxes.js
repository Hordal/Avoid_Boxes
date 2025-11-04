// ========================================
// DOM 요소
// ========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Screens
const startScreen = document.getElementById("start-screen");
const playerSelectScreen = document.getElementById("player-select-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const nextPlayerScreen = document.getElementById("next-player-screen");

// Buttons
const soloModeButton = document.getElementById("solo-mode-button");
const versusModeButton = document.getElementById("versus-mode-button");
const backToMainMenuButton = document.getElementById("back-to-main-menu");
const restartButton = document.getElementById("restart-button");
const mainMenuButton = document.getElementById("main-menu-button");
const nextPlayerButton = document.getElementById("next-player-button");
const playerCountButtons = document.querySelectorAll(".player-count-button");

// Display
const gameOverTitle = document.getElementById("game-over-title");
const scoreDisplay = document.getElementById("score-display");
const highScoreDisplay = document.getElementById("high-score");
const nextPlayerText = document.getElementById("next-player-text");
const gameControls = document.getElementById('game-controls');
const pauseButton = document.getElementById('pause-button');
const resumeButton = document.getElementById('resume-button');
const resetButton = document.getElementById('reset-button');

// ========================================
// 게임 상태 관리 변수
// ========================================
let player;
let obstacles = [];
let gameRunning = false;
let isPaused = false;
let startTime;
let elapsedTime = 0;
let frameCount = 0;

// 멀티플레이어 관련 변수
let gameMode = 'solo'; // 'solo' or 'versus'
let numberOfPlayers = 1;
let currentPlayerIndex = 0;
let playerScores = [];
let localHighScore = 0;
let difficultyFactor = 1;

let playerSprite = new Image();
let spriteLoaded = false;
let items = [];
let particles = [];
let animationFrameId = null;

// ========================================
// 플레이어 설정
// ========================================
function initializePlayer() {
    player = {
        x: canvas.width / 2 - 20, // Adjust for new size
        y: canvas.height - 60,
        width: 40, // SVG width
        height: 40, // SVG height
        speed: 7,
        lives: 3,
        isInvincible: false
    };
}

// ========================================
// 키보드 입력 처리
// ========================================
let keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function movePlayer() {
    if (!gameRunning || isPaused) return;

    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;

    // 경계 처리
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

// ========================================
// 그리기 함수
// ========================================
function drawPlayer() {
    // Flashing effect when invincible
    if (player.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
        return; // Skip drawing every other frame to flash
    }

    if (spriteLoaded) {
        ctx.drawImage(playerSprite, player.x, player.y, player.width, player.height);
    } else {
        // Fallback drawing in case sprite fails to load
        ctx.fillStyle = "cyan";
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawObstacles() {
    obstacles.forEach(ob => {
        ctx.fillStyle = "#FF7F7F"; // A slightly different red
        ctx.save();
        ctx.translate(ob.x, ob.y);
        ctx.rotate(ob.angle);

        ctx.beginPath();
        ctx.moveTo(ob.points[0].x, ob.points[0].y);
        for (let i = 1; i < ob.points.length; i++) {
            ctx.lineTo(ob.points[i].x, ob.points[i].y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        if (!isPaused) {
            ob.y += ob.speed;
            ob.angle += ob.rotationSpeed;
        }
    });
}

function drawUI() {
    if (!isPaused) {
        elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    }
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    
    // Draw Time
    ctx.textAlign = "left";
    ctx.fillText(`생존 시간: ${elapsedTime}초`, 10, 30);

    // Draw Lives
    ctx.textAlign = "right";
    let livesText = '';
    for (let i = 0; i < player.lives; i++) {
        livesText += '❤️';
    }
    ctx.fillText(livesText, canvas.width - 10, 30);

    // Draw Player Turn in Versus Mode
    if (gameMode === 'versus') {
        ctx.textAlign = "center";
    }
}

function drawGameInstructions() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("게임 일시정지", canvas.width / 2, canvas.height / 2 - 150);

    let yPos = canvas.height / 2 - 80;

    ctx.font = "20px Arial";
    ctx.fillText("조작법:", canvas.width / 2, yPos);
    yPos += 30;
    ctx.fillText("W, A, S, D 또는 방향키: 플레이어 이동", canvas.width / 2, yPos);
    yPos += 60;

    ctx.fillText("아이템 설명:", canvas.width / 2, yPos);
    yPos += 30;
    ctx.font = "16px Arial";

    ctx.fillStyle = "gold";
    ctx.fillText("골드 원 - 무적: 5초간 장애물에 부딪혀도 생명이 줄어들지 않습니다.", canvas.width / 2, yPos);
    yPos += 25;

    ctx.fillStyle = "lightblue";
    ctx.fillText("하늘색 원 - 장애물 감속: 3초간 모든 장애물의 속도가 절반으로 줄어듭니다.", canvas.width / 2, yPos);
    yPos += 25;

    ctx.fillStyle = "purple";
    ctx.fillText("보라색 원 - 플레이어 감속: 3초간 플레이어의 이동 속도가 절반으로 줄어듭니다.", canvas.width / 2, yPos);
    yPos += 25;

    ctx.fillStyle = "lime";
    ctx.fillText("라임색 원 - 랜덤 텔레포트: 플레이어가 화면 내 무작위 위치로 순간 이동합니다.", canvas.width / 2, yPos);
    yPos += 25;

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("계속하려면 '재시작' 버튼을 누르세요.", canvas.width / 2, yPos + 50);
}const itemTypes = {
    "invincibility": { color: "gold", name: "무적", description: "5초간 무적" },
    "slow_obstacle": { color: "lightblue", name: "장애물 감속", description: "3초간 장애물 감속" },
    "slow_player": { color: "purple", name: "플레이어 감속", description: "3초간 플레이어 감속" },
    "random_teleport": { color: "lime", name: "랜덤 텔레포트", description: "무작위 위치로 이동" }
};

function drawItems() {
    items.forEach(item => {
        const itemInfo = itemTypes[item.type];
        ctx.fillStyle = itemInfo.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.stroke();

        // 아이템 이름과 설명 표시
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(itemInfo.name, item.x, item.y - item.radius - 15);
        ctx.font = "10px Arial";
        ctx.fillText(itemInfo.description, item.x, item.y - item.radius - 5);

        if (!isPaused) {
            item.y += item.speed;
        }
    });
}

function drawParticles() {
    particles.forEach((p, index) => {
        if (!isPaused) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
        }
        if (p.alpha <= 0) {
            particles.splice(index, 1);
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
    });
}

// ========================================
// 게임 로직
// ========================================
function generateObstacle() {
    const size = 20 + Math.random() * 25;
    const x = Math.random() * (canvas.width - size) + size / 2;
    
    const points = [];
    const sides = 5 + Math.floor(Math.random() * 5); // 5 to 9 sides
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const radius = size / 2 * (0.8 + Math.random() * 0.4); // Jagged edges
        points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }

    obstacles.push({
        x: x,
        y: 0 - size,
        width: size, // Bounding box for collision
        height: size, // Bounding box for collision
        speed: (2 + Math.random() * 3) * difficultyFactor,
        points: points,
        angle: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05
    });
}

function generateItem() {
    // Generate items less frequently than obstacles
    if (frameCount % 120 === 0 && Math.random() > 0.5) { // Roughly every 2-4 seconds
        const x = Math.random() * (canvas.width - 24) + 12;
        const type = Math.random();
        let itemData;

        if (type < 0.3) { // 30% chance for Invincibility
            itemData = { type: "invincibility" };
        } else if (type < 0.6) { // 30% chance for Slow Obstacles
            itemData = { type: "slow_obstacle" };
        } else if (type < 0.8) { // 20% chance for Slow Player
            itemData = { type: "slow_player" };
        } else { // 20% chance for Random Teleport
            itemData = { type: "random_teleport" };
        }

        items.push({
            x: x,
            y: 0,
            radius: 12,
            speed: 3,
            type: itemData.type,
        });
    }
}

function createParticle(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            size: Math.random() * 4 + 2,
            color: color,
            alpha: 1
        });
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkPlayerItemCollision(player, item) {
    // Find the closest point on the rectangle to the center of the circle
    let closestX = Math.max(player.x, Math.min(item.x, player.x + player.width));
    let closestY = Math.max(player.y, Math.min(item.y, player.y + player.height));

    // Calculate the distance between the circle's center and this closest point
    let distanceX = item.x - closestX;
    let distanceY = item.y - closestY;
    let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    // If the distance is less than the circle's radius squared, a collision has occurred
    return distanceSquared < (item.radius * item.radius);
}


// ========================================
// 화면 및 게임 흐름 관리
// ========================================
function showScreen(screenId) {
    [startScreen, playerSelectScreen, gameOverScreen, nextPlayerScreen].forEach(screen => {
        screen.style.display = screen.id === screenId ? 'flex' : 'none';
    });

    if (screenId === 'none' && gameMode === 'solo') {
        gameControls.style.display = 'block';
    } else {
        gameControls.style.display = 'none';
    }
}

function startGame(mode) {
    gameMode = mode;
    if (mode === 'solo') {
        numberOfPlayers = 1;
        currentPlayerIndex = 0;
        startPlayerTurn();
    } else {
        showScreen('player-select-screen');
    }
}

function startVersusGame(playerCount) {
    numberOfPlayers = playerCount;
    currentPlayerIndex = 0;
    playerScores = Array(numberOfPlayers).fill(0);
    startPlayerTurn();
}

function startPlayerTurn() {
    showScreen('none'); // 모든 오버레이 숨기기
    initializePlayer();
    obstacles = [];
    items = [];
    particles = [];
    gameRunning = true;
    isPaused = false;
    startTime = Date.now();
    elapsedTime = 0;
    frameCount = 0;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    update();
}

function handleGameOver() {
    gameRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    gameControls.style.display = 'none';
    playerScores[currentPlayerIndex] = parseFloat(elapsedTime);

    if (gameMode === 'solo') {
        updateHighScore(playerScores[0]);
        showFinalResults();
    } else {
        currentPlayerIndex++;
        if (currentPlayerIndex < numberOfPlayers) {
            nextPlayerText.textContent = `Player ${currentPlayerIndex + 1}의 차례입니다.`;
            showScreen('next-player-screen');
        } else {
            updateHighScore(Math.max(...playerScores));
            showFinalResults();
        }
    }
}

function showFinalResults() {
    scoreDisplay.innerHTML = '';
    let winnerIndex = -1;
    if (gameMode === 'versus') {
        const maxScore = Math.max(...playerScores);
        winnerIndex = playerScores.indexOf(maxScore);
        gameOverTitle.textContent = `Player ${winnerIndex + 1} 승리!`;

        playerScores.forEach((score, index) => {
            const scoreElement = document.createElement('div');
            scoreElement.textContent = `Player ${index + 1}: ${score.toFixed(1)}초`;
            if (index === winnerIndex) {
                scoreElement.classList.add('winner');
            }
            scoreDisplay.appendChild(scoreElement);
        });
    } else {
        gameOverTitle.textContent = 'Game Over';
        const scoreElement = document.createElement('div');
        scoreElement.textContent = `생존 시간: ${playerScores[0].toFixed(1)}초`;
        scoreDisplay.appendChild(scoreElement);
    }
    
    highScoreDisplay.textContent = localHighScore.toFixed(1);
    showScreen('game-over-screen');
}

function updateHighScore(score) {
    if (score > localHighScore) {
        localHighScore = score;
        localStorage.setItem('avoidBoxHighScore', localHighScore);
    }
}

function loadHighScore() {
    localHighScore = parseFloat(localStorage.getItem('avoidBoxHighScore')) || 0;
}

// ========================================
// 메인 게임 루프
// ========================================
function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    movePlayer();
    drawPlayer();
    drawObstacles();
    drawItems();
    drawParticles();
    drawUI();

    if (isPaused) {
        drawGameInstructions();
        animationFrameId = requestAnimationFrame(update);
        return;
    }

    if (!isPaused) {
        difficultyFactor = 1 + Math.floor(elapsedTime / 10) * 0.1; // Increase difficulty every 10 seconds

        // Obstacle Collision
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const ob = obstacles[i];
            if (checkCollision(player, ob)) {
                if (!player.isInvincible) {
                    player.lives--;
                    createParticle(ob.x, ob.y, "#FF7F7F");
                    obstacles.splice(i, 1);

                    if (player.lives <= 0) {
                        handleGameOver();
                        return; // Exit update loop
                    } else {
                        player.isInvincible = true;
                        setTimeout(() => { player.isInvincible = false; }, 2000);
                    }
                }
            }
        }

        // Item Collision
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (checkPlayerItemCollision(player, item)) {
                const itemInfo = itemTypes[item.type];
                createParticle(item.x, item.y, itemInfo.color);
                
                // Apply item effect
                switch (item.type) {
                    case "invincibility":
                        player.isInvincible = true;
                        setTimeout(() => { player.isInvincible = false; }, 5000); // 5 seconds
                        break;
                    case "slow_obstacle":
                        obstacles.forEach(ob => ob.speed *= 0.5);
                        setTimeout(() => {
                            obstacles.forEach(ob => ob.speed *= 2);
                        }, 3000); // 3 seconds
                        break;
                    case "slow_player":
                        player.speed *= 0.5;
                        setTimeout(() => { player.speed *= 2; }, 3000); // 3 seconds
                        break;
                    case "random_teleport":
                        player.x = Math.random() * (canvas.width - player.width);
                        player.y = Math.random() * (canvas.height - player.height);
                        break;
                }
                
                items.splice(i, 1);
            }
        }

        // Filter off-screen objects
        obstacles = obstacles.filter(ob => ob.y < canvas.height + ob.height);
        items = items.filter(item => item.y < canvas.height + item.radius);

        // Generate new objects
        frameCount++;
        if (frameCount % 30 === 0) { // Obstacle generation rate
            generateObstacle();
        }
        generateItem(); // Item generation is handled inside the function
    }

    animationFrameId = requestAnimationFrame(update);
}

// ========================================
// 이벤트 리스너 설정
// ========================================
window.addEventListener('DOMContentLoaded', () => {
    loadHighScore();
    playerSprite.src = "spaceship.svg";
    playerSprite.onload = () => {
        spriteLoaded = true;
        showScreen('start-screen');
    };
    playerSprite.onerror = () => {
        console.error("Spaceship sprite failed to load. Using fallback shape.");
        showScreen('start-screen'); // Show start screen even if sprite fails
    };
});

soloModeButton.addEventListener('click', () => startGame('solo'));
versusModeButton.addEventListener('click', () => startGame('versus'));

playerCountButtons.forEach(button => {
    button.addEventListener('click', () => {
        const count = parseInt(button.dataset.count, 10);
        startVersusGame(count);
    });
});

backToMainMenuButton.addEventListener('click', () => showScreen('start-screen'));
mainMenuButton.addEventListener('click', () => {
    gameControls.style.display = 'none';
    showScreen('start-screen');
});

restartButton.addEventListener('click', () => {
    if (gameMode === 'solo') {
        startGame('solo');
    } else {
        startVersusGame(numberOfPlayers);
    }
});

nextPlayerButton.addEventListener('click', startPlayerTurn);

pauseButton.addEventListener('click', () => {
    isPaused = true;
    pauseButton.style.display = 'none';
    resumeButton.style.display = 'inline-block';
});

resumeButton.addEventListener('click', () => {
    isPaused = false;
    startTime += Date.now() - (startTime + parseFloat(elapsedTime) * 1000);
    pauseButton.style.display = 'inline-block';
    resumeButton.style.display = 'none';
});

resetButton.addEventListener('click', () => {
    startPlayerTurn();
});
