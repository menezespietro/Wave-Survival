const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const isCoop = typeof COOP_MODE !== "undefined" && COOP_MODE;

const spriteImages = {
    soldierBlue: new Image(),
    soldierRed: new Image(),
    zombie: new Image(),
    soldierBlueLeft: new Image(),
    soldierRedLeft: new Image(),
    zombieLeft: new Image()
};
spriteImages.soldierBlue.src = "assets/soldier_blue_sheet.png?v=44";
spriteImages.soldierRed.src = "assets/soldier_red_sheet.png?v=44";
spriteImages.zombie.src = "assets/zombie_sheet.png?v=44";

spriteImages.soldierBlueLeft.src = "assets/soldier_blue_left_sheet.png?v=44";
spriteImages.soldierRedLeft.src = "assets/soldier_red_left_sheet.png?v=44";
spriteImages.zombieLeft.src = "assets/zombie_left_sheet.png?v=44";

spriteImages.soldierBlue.left = spriteImages.soldierBlueLeft;
spriteImages.soldierRed.left = spriteImages.soldierRedLeft;
spriteImages.zombie.left = spriteImages.zombieLeft;

const spriteMeta = new Map([
    [spriteImages.soldierBlue, { frames: [5, 8, 6, 6] }],
    [spriteImages.soldierRed, { frames: [5, 8, 6, 6] }],
    [spriteImages.zombie, { frames: [5, 8, 6, 6] }],
    [spriteImages.soldierBlueLeft, { frames: [5, 8, 6, 6] }],
    [spriteImages.soldierRedLeft, { frames: [5, 8, 6, 6] }],
    [spriteImages.zombieLeft, { frames: [5, 8, 6, 6] }]
]);

function spriteReady(image) {
    return image && image.complete && image.naturalWidth > 0;
}

// Aguarda todos os sprites antes de iniciar a partida, evitando que uma direção
// apareça como fallback enquanto a folha correspondente ainda está carregando.
const spriteLoadPromise = Promise.all(Object.values(spriteImages).map(image => new Promise(resolve => {
    if (spriteReady(image)) return resolve();
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
})));

function drawSpriteFrame(image, frame, row, x, y, width, height, facingX = 1, leftImage = null) {
    const renderImage = facingX < 0 && leftImage ? leftImage : image;
    if (!spriteReady(renderImage)) return false;
    const meta = spriteMeta.get(renderImage) || spriteMeta.get(image) || { frames: [1, 1, 1, 1] };
    const frameCount = Math.max(1, meta.frames[row] || 1);
    const safeFrame = Math.max(0, Math.min(frameCount - 1, frame));
    const cellW = 100;
    const cellH = 100;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        renderImage,
        safeFrame * cellW,
        Math.max(0, row) * cellH,
        cellW,
        cellH,
        x - width / 2,
        y - height / 2,
        width,
        height
    );
    ctx.restore();
    return true;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (player) player.clamp();
    if (player2) player2.clamp();
}

let gameRunning = true;
let gamePausedForLevelUp = false;
let gamePausedForTutorial = false;
let score = 0;
let wave = 1;
let level = 1;
let xp = 0;
const XP_PER_WAVE = 100;
const XP_TO_NEXT_LEVEL = 100;
let scoreSaved = false;
let waveElapsed = 0;
let waveCompletionTimer = null;
let levelUpChoiceMade = false;
const MAX_BUFF_UPGRADES = 5;

// Mundo infinito: jogadores e inimigos usam coordenadas do mundo; a câmera acompanha os jogadores.
let cameraX = 0;
let cameraY = 0;

const enemies = [];
const bullets = [];
const enemyBullets = [];
const healthDrops = [];

let enemiesToSpawn = 0;
let enemiesSpawned = 0;
let normalToSpawn = 0;
let sniperToSpawn = 0;
let bomberToSpawn = 0;
let mageToSpawn = 0;
let mageIndicatorUntil = 0;
let spawnTimer = 0;
let waveStarting = false;
let darkMagePresent = false;
let bossToSpawn = 0;
let bossSpawned = false;
const spawnQueue = [];
const activeSpawnAnimations = [];
const MAX_CONCURRENT_SPAWN_ANIMATIONS = 3;
const SPAWN_BATCH_SIZE = 2;
const SPAWN_SKULL_DURATION = 1120;
const dodgeEffects = [];
const mageTeleportIndicators = [];
const bossSpikeIndicators = [];
const bossTeleportIndicators = [];
const bossSpikeBursts = [];

const keys = {};

window.addEventListener("keydown", event => {
    keys[event.key.toLowerCase()] = true;
    if (isCoop && ["arrowup","arrowdown","arrowleft","arrowright"," "].includes(event.key.toLowerCase())) event.preventDefault();
});
window.addEventListener("keyup", event => { keys[event.key.toLowerCase()] = false; });

function clampPlayer(p) {
    // Não há limites: o mapa é procedural/infinito.
    return p;
}

function isEnemyInsideView(enemy) {
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    return enemy.x >= cameraX - halfW && enemy.x <= cameraX + halfW &&
           enemy.y >= cameraY - halfH && enemy.y <= cameraY + halfH;
}

function nearestEnemy(p) {
    let target = null, best = Infinity;
    for (const enemy of enemies) {
        if (enemy.dead || enemy.health <= 0 || !isEnemyInsideView(enemy)) continue;
        const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (d < best) { best = d; target = enemy; }
    }
    return target;
}

function createPlayer(config) {
    return {
        x: 0, y: 0,
        radius: 18,
        speed: 250,
        health: 100,
        maxHealth: 100,
        shootCooldown: 0,
        shootDelay: 150,
        damage: 25,
        bulletSpeed: 600,
        damageCooldown: 0,
        buffLevels: {},
        animTime: 0,
        isMoving: false,
        facingX: 1,
        shootAnimUntil: 0,
        ...config,
        clamp() { clampPlayer(this); },
        update(dt) {
            let dx = 0, dy = 0;
            if (this.control === "p1") {
                if (keys["w"]) dy -= 1;
                if (keys["s"]) dy += 1;
                if (keys["a"]) dx -= 1;
                if (keys["d"]) dx += 1;
            } else {
                if (keys["arrowup"]) dy -= 1;
                if (keys["arrowdown"]) dy += 1;
                if (keys["arrowleft"]) dx -= 1;
                if (keys["arrowright"]) dx += 1;
            }
            this.isMoving = !!(dx || dy);
            if (dx !== 0) this.facingX = dx > 0 ? 1 : -1;
            if (this.isMoving) {
                const length = Math.hypot(dx, dy);
                dx /= length; dy /= length;
                this.animTime += dt * 8;
            } else {
                this.animTime += dt * 2.5;
            }
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
            this.clamp();
            this.shootCooldown -= dt * 1000;
            this.damageCooldown -= dt * 1000;

            // Tiro totalmente automático: mira e dispara no inimigo mais próximo.
            if (this.shootCooldown <= 0) this.shoot();
        },
        shoot() {
            const sortedTargets = enemies
                .filter(enemy => !enemy.dead && enemy.health > 0 && isEnemyInsideView(enemy))
                .map(enemy => ({ enemy, distance: Math.hypot(enemy.x - this.x, enemy.y - this.y) }))
                .sort((a, b) => a.distance - b.distance)
                .map(item => item.enemy);
            const target = sortedTargets[0];
            if (!target) return;
            const makeBullet = (aimTarget) => {
                const angle = Math.atan2(aimTarget.y - this.y, aimTarget.x - this.x);
                const piercingChance = (this.buffLevels.piercing || 0) * 0.195;
                return {
                    x: this.x + Math.cos(angle) * 22,
                    y: this.y + Math.sin(angle) * 22,
                    radius: 5,
                    speedX: Math.cos(angle) * this.bulletSpeed,
                    speedY: Math.sin(angle) * this.bulletSpeed,
                    damage: this.damage,
                    owner: this.control,
                    speed: this.bulletSpeed,
                    piercing: Math.random() < piercingChance,
                    ricochetLevel: this.buffLevels.ricochet || 0,
                    ricochets: 0,
                    hitEnemies: new Set()
                };
            };

            bullets.push(makeBullet(target));
            this.shootAnimUntil = performance.now() + 220;

            const doubleShotChance = (this.buffLevels.doubleShot || 0) * 0.195;
            if (Math.random() < doubleShotChance) {
                // Com 2+ inimigos, o segundo disparo mira sempre o segundo mais próximo.
                // Com apenas 1, os dois disparos miram o único inimigo disponível.
                const secondTarget = sortedTargets[1] || sortedTargets[0];
                bullets.push(makeBullet(secondTarget));
            }

            this.shootCooldown = this.shootDelay;
        },
        takeDamage(amount) {
            if (this.damageCooldown > 0 || this.health <= 0) return;
            this.health -= amount;
            this.damageCooldown = 500;
            if (this.health <= 0) {
                this.health = 0;
                if (!isCoop || player2.health <= 0) gameOver();
            }
        },
        draw() {
            const target = nearestEnemy(this);
            const isShooting = performance.now() < this.shootAnimUntil;
            const row = isShooting ? 2 : (this.isMoving ? 1 : 0);
            const sprite = this.control === "p1" ? spriteImages.soldierBlue : spriteImages.soldierRed;
            const frameCount = spriteMeta.get(sprite).frames[row] || 1;
            const frameSpeed = isShooting ? 20 : (this.isMoving ? 9 : 2.5);
            const frame = Math.floor(this.animTime * frameSpeed) % frameCount;

            ctx.save();
            if (this.damageCooldown > 350 && Math.floor(this.damageCooldown / 70) % 2 === 0) ctx.globalAlpha = 0.35;

            const leftSprite = this.control === "p1" ? spriteImages.soldierBlueLeft : spriteImages.soldierRedLeft;
            const drawn = drawSpriteFrame(sprite, frame, row, this.x, this.y - 2, 52, 66, this.facingX, leftSprite);
            if (!drawn) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "white";
                ctx.stroke();
                if (this.health > 0 && target) {
                    const angle = Math.atan2(target.y - this.y, target.x - this.x);
                    const gunX = this.x + Math.cos(angle) * 27;
                    const gunY = this.y + Math.sin(angle) * 27;
                    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(gunX, gunY);
                    ctx.strokeStyle = "white"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();
                }
            }
            ctx.restore();
        }
    };
}

const player = createPlayer({ control: "p1", color: "#3498db" });
const player2 = isCoop ? createPlayer({ control: "p2", color: "#e74c3c" }) : null;

function spawnHealthDrop(enemy) {
    let chance = 0;
    if (enemy.type === "bomber") chance = 0.10;
    else if (enemy.type === "sniper") chance = 0.15;
    else if (enemy.type === "mage") chance = 0.30;
    if (chance <= 0 || Math.random() >= chance) return;

    healthDrops.push({
        x: enemy.x,
        y: enemy.y,
        radius: 11,
        amount: 30,
        pulse: Math.random() * Math.PI * 2
    });
}

function updateHealthDrops(dt) {
    const targets = isCoop ? [player, player2].filter(p => p && p.health > 0) : [player];
    for (let i = healthDrops.length - 1; i >= 0; i--) {
        const drop = healthDrops[i];
        drop.pulse += dt * 4;

        let collected = false;
        for (const target of targets) {
            if (Math.hypot(drop.x - target.x, drop.y - target.y) <= drop.radius + target.radius + 8) {
                if (target.health < target.maxHealth) {
                    target.health = Math.min(target.maxHealth, target.health + drop.amount);
                    collected = true;
                    break;
                }
            }
        }
        if (collected) healthDrops.splice(i, 1);
    }
}

function drawHealthDrops() {
    for (const drop of healthDrops) {
        const pulse = Math.sin(drop.pulse) * 2;
        ctx.save();
        ctx.shadowColor = "#ff4d6d";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.radius + pulse * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "#e74c3c";
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "white";
        ctx.fillRect(drop.x - 3, drop.y - 7, 6, 14);
        ctx.fillRect(drop.x - 7, drop.y - 3, 14, 6);
        ctx.restore();
    }
}

function getVisibleNormalSpawnPosition() {
    const margin = 34;
    const minFromPlayer = 170;
    const minFromOtherSpawns = 180;
    const center = getActivePlayerCenter();
    const reserved = activeSpawnAnimations.concat(spawnQueue).slice(-14);
    for (let attempt = 0; attempt < 60; attempt++) {
        const x = cameraX + (Math.random() * (canvas.width - margin * 2) - (canvas.width / 2 - margin));
        const y = cameraY + (Math.random() * (canvas.height - margin * 2) - (canvas.height / 2 - margin));
        const targets = isCoop ? [player, player2].filter(p => p && p.health > 0) : [player];
        const farFromPlayers = targets.every(p => Math.hypot(x - p.x, y - p.y) >= minFromPlayer);
        const farFromOtherSpawns = reserved.every(spawn => Math.hypot(x - spawn.x, y - spawn.y) >= minFromOtherSpawns);
        if (farFromPlayers && farFromOtherSpawns) return { x, y };
    }
    return {
        x: center.x + (Math.random() < 0.5 ? -1 : 1) * Math.max(190, canvas.width * 0.32),
        y: center.y + (Math.random() - 0.5) * canvas.height * 0.35
    };
}

function getSpecialSpawnPosition(type) {
    if (type === 'normal') return getVisibleNormalSpawnPosition();
    const targets = isCoop ? [player, player2].filter(p => p && p.health > 0) : [player];
    const anchor = targets[Math.floor(Math.random() * targets.length)] || player;
    if (type === 'mage') {
        const vision = Math.max(canvas.width, canvas.height) * 0.56;
        const distance = vision * 4;
        const angle = Math.random() * Math.PI * 2;
        return { x: anchor.x + Math.cos(angle) * distance, y: anchor.y + Math.sin(angle) * distance };
    }
    if (type === 'boss') {
        const distance = Math.max(canvas.width, canvas.height) * (0.72 + Math.random() * 0.10);
        const angle = Math.random() * Math.PI * 2;
        return { x: anchor.x + Math.cos(angle) * distance, y: anchor.y + Math.sin(angle) * distance };
    }
    const minDistance = Math.max(canvas.width, canvas.height) * 0.58;
    const maxDistance = Math.max(canvas.width, canvas.height) * 0.78;
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    return { x: anchor.x + Math.cos(angle) * distance, y: anchor.y + Math.sin(angle) * distance };
}

function queueEnemySpawn(type, forcedPosition = null, source = 'dynamic') {
    const pos = forcedPosition || getSpecialSpawnPosition(type);
    spawnQueue.push({ type, x: pos.x, y: pos.y, source });
}

function processSpawnAnimations(dt) {
    // Preenche vários slots de animação ao mesmo tempo para que a geração
    // continue rápida sem encurtar a animação individual da caveira.
    while (activeSpawnAnimations.length < MAX_CONCURRENT_SPAWN_ANIMATIONS && spawnQueue.length) {
        const next = spawnQueue.shift();
        activeSpawnAnimations.push({
            ...next,
            elapsed: 0
        });
    }

    if (!activeSpawnAnimations.length) return;

    const deltaMs = dt * 1000;
    for (let i = activeSpawnAnimations.length - 1; i >= 0; i--) {
        const spawn = activeSpawnAnimations[i];
        spawn.elapsed += deltaMs;
        if (spawn.elapsed < SPAWN_SKULL_DURATION) continue;

        const enemy = new Enemy(spawn.type, { x: spawn.x, y: spawn.y });
        enemies.push(enemy);
        if (spawn.source === 'wave') enemiesSpawned++;
        if (spawn.type === 'boss') bossSpawned = true;
        if (spawn.type === 'mage') {
            darkMagePresent = true;
            mageIndicatorUntil = performance.now() + 4000;
        }
        activeSpawnAnimations.splice(i, 1);
    }
}

function drawSpawnAnimation(now) {
    if (!activeSpawnAnimations.length) return;

    for (const p of activeSpawnAnimations) {
        const progress = Math.min(1, p.elapsed / SPAWN_SKULL_DURATION);
        const pulse = 1 + Math.sin(progress * Math.PI * 5) * 0.12;
        const radius = 18 + progress * 18;

        ctx.save();
        ctx.globalAlpha = 0.18 + (1 - progress) * 0.55;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'boss' ? '#ff3045' : '#c9d7e8';
        ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (11 + progress * 7) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = p.type === 'boss' ? '#ff3045' : '#f4f7fb';
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = `${24 + Math.round(progress * 8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = p.type === 'boss' ? '#ff5b68' : '#ffffff';
        ctx.fillText('☠', p.x, p.y - 1);
        ctx.restore();
    }
}

class Enemy {
    constructor(type = 'normal', spawnPos = null) {
        this.type = type;
        this.radius = type === 'boss' ? 30 : type === 'mage' ? 20 : type === 'sniper' ? 16 : type === 'bomber' ? 15 : 16;
        const multiplier = isCoop ? 2 : 1;
        const normalSpeed = 75 * 1.5 * 1.8 * multiplier;
        const normalHealth = 55 * Math.pow(1.20, wave - 1) * multiplier;
        this.speed = normalSpeed;
        this.health = normalHealth;
        this.maxHealth = this.health;
        this.damage = Math.max(8, (8 + Math.floor(wave / 3)) * multiplier);
        this.shootCooldown = 450 + Math.random() * 250;
        this.mageTeleportCooldown = 1800 + Math.random() * 1400;
        this.mageTeleportPending = false;
        this.dodgeFlashCooldown = 0;
        this.animTime = Math.random() * 10;
        this.facingX = 1;
        this.attackAnimUntil = 0;
        this.dead = false;
        this.deathStartedAt = 0;
        this.deathDuration = 520;
        this.x = 0;
        this.y = 0;

        if (spawnPos) {
            this.x = spawnPos.x;
            this.y = spawnPos.y;
        } else {
            const p = getSpecialSpawnPosition(type);
            this.x = p.x; this.y = p.y;
        }

        if (type === 'sniper') {
            this.speed = normalSpeed * 0.56;
        } else if (type === 'bomber') {
            this.speed = normalSpeed * 1.6;
            this.health = normalHealth * 0.6;
            this.maxHealth = this.health;
            this.explosionTriggerRadius = 82;
            this.explosionRadius = 72;
            this.exploded = false;
        } else if (type === 'mage') {
            this.speed = 0;
            this.health = normalHealth * 3;
            this.maxHealth = this.health;
            this.mageTeleportCooldown = 1200;
        } else if (type === 'boss') {
            this.speed = normalSpeed * 0.5;
            this.health = normalHealth * 6;
            this.maxHealth = this.health;
            this.damage = Math.max(18, (14 + Math.floor(wave / 2)) * multiplier);
            this.dashCooldown = 4200;
            this.dashTimer = 0;
            this.dashFromX = this.x;
            this.dashFromY = this.y;
            this.dashToX = this.x;
            this.dashToY = this.y;
            this.dashDuration = 320;
            this.bomberSummonCooldown = 4000;
            this.sniperSummonCooldown = 12000;
            this.spikeCooldown = 3000;
            this.bossTeleportCooldown = 1800;
            this.bossTeleportPending = false;
        }
    }

    getTargets() {
        return isCoop ? [player, player2].filter(p => p && p.health > 0) : [player];
    }

    getNearestTarget() {
        const targets = this.getTargets();
        if (!targets.length) return null;
        let target = targets[0];
        let best = Math.hypot(target.x - this.x, target.y - this.y);
        for (const p of targets.slice(1)) {
            const d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < best) { best = d; target = p; }
        }
        return { target, distance: best };
    }

    sniperVisionDistance() {
        return Math.max(canvas.width, canvas.height) * 0.56 * 0.82 * 0.80;
    }

    shootAt(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        enemyBullets.push({
            x: this.x, y: this.y, radius: 5,
            speedX: Math.cos(angle) * 900, speedY: Math.sin(angle) * 900,
            damage: 25
        });
        this.shootCooldown = 550 / 0.15;
    }

    updateMage(dt) {
        this.mageTeleportCooldown -= dt * 1000;
        if (this.mageTeleportCooldown <= 0 && !this.mageTeleportPending) {
            this.teleportGroupedEnemies();
            this.mageTeleportCooldown = 2800 + Math.random() * 1400;
        }
    }

    teleportGroupedEnemies() {
        const candidates = enemies.filter(e => e !== this && e.type !== 'mage' && e.type !== 'boss' && e.health > 0);
        if (candidates.length < 2) return;

        const visited = new Set();
        const groups = [];
        const clusterDistance = 62;

        for (const enemy of candidates) {
            if (visited.has(enemy)) continue;
            const group = [];
            const queue = [enemy];
            visited.add(enemy);
            while (queue.length) {
                const current = queue.shift();
                group.push(current);
                for (const other of candidates) {
                    if (visited.has(other)) continue;
                    if (Math.hypot(other.x - current.x, other.y - current.y) < clusterDistance) {
                        visited.add(other);
                        queue.push(other);
                    }
                }
            }
            if (group.length >= 2) groups.push(group);
        }
        if (!groups.length) return;

        groups.sort((a, b) => b.length - a.length);
        const clustered = groups[0].slice(0, 15);
        const targets = this.getTargets();
        const target = targets[Math.floor(Math.random() * targets.length)];
        if (!target) return;

        const baseAngle = Math.random() * Math.PI * 2;
        const centerRadius = 250 + Math.random() * 100;
        const positions = clustered.map((enemy, index) => {
            const spread = Math.min(1.0, clustered.length * 0.08);
            const angle = baseAngle + (index - (clustered.length - 1) / 2) * spread;
            const distance = centerRadius + (Math.random() - 0.5) * 90;
            return {
                enemy,
                x: target.x + Math.cos(angle) * Math.max(190, distance),
                y: target.y + Math.sin(angle) * Math.max(190, distance)
            };
        });

        mageTeleportIndicators.push({
            positions,
            startedAt: performance.now(),
            duration: 850,
            executeAt: performance.now() + 850,
            executed: false,
            mage: this
        });
        this.mageTeleportPending = true;
    }

    updateBoss(dt) {
        const info = this.getNearestTarget();
        if (!info) return;

        this.dashCooldown -= dt * 1000;
        this.bomberSummonCooldown -= dt * 1000;
        this.sniperSummonCooldown -= dt * 1000;
        this.spikeCooldown -= dt * 1000;
        this.bossTeleportCooldown -= dt * 1000;

        // Quando o boss fica muito distante, prepara um teleporte para dentro
        // do campo de visão do jogador. O indicador permanece no chão antes
        // da mudança de posição.
        const bossVision = Math.max(canvas.width, canvas.height) * 0.56;
        if (wave === 5 && !this.bossTeleportPending && this.bossTeleportCooldown <= 0 && info.distance > bossVision * 1.75) {
            this.scheduleBossTeleport(info.target);
            this.bossTeleportCooldown = 2600;
        }

        if (this.dashTimer > 0) {
            this.dashTimer -= dt * 1000;
            const progress = 1 - Math.max(0, this.dashTimer) / this.dashDuration;
            this.x = this.dashFromX + (this.dashToX - this.dashFromX) * progress;
            this.y = this.dashFromY + (this.dashToY - this.dashFromY) * progress;
        } else if (this.dashCooldown <= 0 && info.distance > 150) {
            const dx = (info.target.x - this.x) / Math.max(info.distance, 0.001);
            const dy = (info.target.y - this.y) / Math.max(info.distance, 0.001);
            const dashDistance = Math.min(300, Math.max(140, info.distance - 100));
            this.dashFromX = this.x;
            this.dashFromY = this.y;
            this.dashToX = this.x + dx * dashDistance;
            this.dashToY = this.y + dy * dashDistance;
            this.dashTimer = this.dashDuration;
            this.dashCooldown = 4200 + Math.random() * 1600;
        } else if (info.distance > 0) {
            this.x += ((info.target.x - this.x) / info.distance) * this.speed * dt;
            this.y += ((info.target.y - this.y) / info.distance) * this.speed * dt;
        }

        if (this.bomberSummonCooldown <= 0) {
            for (let i = 0; i < 2; i++) queueEnemySpawn('bomber', this.getSummonPosition(75 + i * 35), 'boss');
            this.bomberSummonCooldown = 4000;
        }
        if (this.sniperSummonCooldown <= 0) {
            for (let i = 0; i < 2; i++) queueEnemySpawn('sniper', this.getSummonPosition(85 + i * 40), 'boss');
            this.sniperSummonCooldown = 12000;
        }
        if (this.spikeCooldown <= 0 && !bossSpikeIndicators.some(a => a.boss === this)) {
            this.scheduleSpikeAttack(info.target);
            this.spikeCooldown = 5600 + Math.random() * 1800;
        }

        if (info.distance < this.radius + info.target.radius + 8) info.target.takeDamage(this.damage);
    }

    scheduleBossTeleport(target) {
        const targetVision = Math.max(canvas.width, canvas.height) * 0.48;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(180, targetVision * (0.72 + Math.random() * 0.18));
        const x = target.x + Math.cos(angle) * distance;
        const y = target.y + Math.sin(angle) * distance;

        bossTeleportIndicators.push({
            boss: this,
            x, y,
            startedAt: performance.now(),
            executeAt: performance.now() + 1200,
            duration: 1200
        });
        this.bossTeleportPending = true;
    }

    getSummonPosition(distance) {
        const angle = Math.random() * Math.PI * 2;
        return {
            x: this.x + Math.cos(angle) * distance,
            y: this.y + Math.sin(angle) * distance
        };
    }

    scheduleSpikeAttack(target) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        bossSpikeIndicators.push({
            boss: this,
            x: this.x,
            y: this.y,
            angle,
            length: 460,
            width: 92,
            startedAt: performance.now(),
            executeAt: performance.now() + 2000
        });
    }

    update(dt) {
        if (this.dead) return;
        if (this.dodgeFlashCooldown > 0) this.dodgeFlashCooldown -= dt * 1000;
        if (this.type === 'mage') { this.updateMage(dt); return; }
        if (this.type === 'boss') { this.updateBoss(dt); return; }

        const info = this.getNearestTarget();
        if (!info) return;

        if (this.type === 'sniper') {
            const desired = this.sniperVisionDistance();
            if (info.distance > desired + 18) {
                const dx = (info.target.x - this.x) / info.distance;
                const dy = (info.target.y - this.y) / info.distance;
                if (Math.abs(dx) > 0.02) this.facingX = dx > 0 ? 1 : -1;
                this.x += dx * this.speed * dt;
                this.y += dy * this.speed * dt;
            } else if (info.distance < desired - 12) {
                const dx = (this.x - info.target.x) / Math.max(info.distance, 0.001);
                const dy = (this.y - info.target.y) / Math.max(info.distance, 0.001);
                if (Math.abs(dx) > 0.02) this.facingX = dx > 0 ? 1 : -1;
                this.x += dx * this.speed * dt;
                this.y += dy * this.speed * dt;
            }
            this.shootCooldown -= dt * 1000;
            if (this.shootCooldown <= 0 && info.distance <= desired + 70) this.shootAt(info.target);
            return;
        }

        if (info.distance > 0) {
            const moveX = (info.target.x - this.x) / info.distance;
            const moveY = (info.target.y - this.y) / info.distance;
            if (Math.abs(moveX) > 0.02) this.facingX = moveX > 0 ? 1 : -1;
            this.x += moveX * this.speed * dt;
            this.y += moveY * this.speed * dt;
            this.animTime += dt * 8;
        }

        if (this.type === 'bomber') {
            if (info.distance < this.explosionTriggerRadius) this.explode();
            return;
        }

        if (info.distance < this.radius + info.target.radius) {
            // A orientação segue a direção do deslocamento horizontal.
            // Atacar o jogador não altera o lado para o qual o zumbi está virado.
            info.target.takeDamage(this.damage);
            this.attackAnimUntil = performance.now() + 220;
        }
    }

    explode() {
        if (this.exploded) return;
        this.exploded = true;
        const targets = this.getTargets();
        for (const target of targets) {
            if (Math.hypot(target.x - this.x, target.y - this.y) <= this.explosionRadius + target.radius) {
                target.takeDamage(15);
            }
        }
        spawnHealthDrop(this);
        const index = enemies.indexOf(this);
        if (index !== -1) enemies.splice(index, 1);
        score += 10;
    }

    takeDamage(amount) {
        if (this.dead) return false;
        if (this.type !== 'mage' && darkMagePresent && Math.random() < 0.20 && this.dodgeFlashCooldown <= 0) {
            dodgeEffects.push({
                x: this.x,
                y: this.y,
                startedAt: performance.now(),
                duration: 360,
                label: 'DESVIOU'
            });
            this.dodgeFlashCooldown = 120;
            return null;
        }
        this.health -= amount;
        return this.health <= 0;
    }

    startDeath() {
        if (this.dead) return;
        this.dead = true;
        this.health = 0;
        this.deathStartedAt = performance.now();
        this.deathDuration = 520;
    }

    draw() {
        if (this.type === 'boss') {
            ctx.save();
            const pulse = 1 + Math.sin(performance.now() / 160) * 0.05;
            ctx.translate(this.x, this.y);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = '#6e1628';
            ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#b91c3c';
            ctx.beginPath(); ctx.moveTo(-21,-15); ctx.lineTo(-31,-34); ctx.lineTo(-9,-22); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(21,-15); ctx.lineTo(31,-34); ctx.lineTo(9,-22); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffcc66';
            ctx.beginPath(); ctx.arc(-10,-5,4,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(10,-5,4,0,Math.PI*2); ctx.fill();
            ctx.restore();
        } else if (this.type === 'sniper') {
            ctx.save();
            const targetInfo = this.getNearestTarget();
            const angle = targetInfo ? Math.atan2(targetInfo.target.y - this.y, targetInfo.target.x - this.x) : 0;
            ctx.translate(this.x, this.y); ctx.rotate(angle);
            ctx.fillStyle = '#8e44ad'; ctx.fillRect(-13,-13,26,26);
            ctx.fillStyle = '#d7bde2'; ctx.fillRect(2,-3,20,6);
            ctx.fillStyle = '#ff4757'; ctx.fillRect(-7,-6,4,4); ctx.fillRect(-7,2,4,4);
            ctx.restore();
        } else if (this.type === 'bomber') {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3; ctx.stroke();
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(-8,-7,5,5); ctx.fillRect(3,-7,5,5);
            ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0,5,4,0,Math.PI*2); ctx.fill();
            ctx.restore();
        } else if (this.type === 'mage') {
            ctx.save(); ctx.translate(this.x, this.y);
            ctx.fillStyle = '#2c0f4f'; ctx.beginPath(); ctx.arc(0,4,16,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.moveTo(-15,-8); ctx.lineTo(0,-30); ctx.lineTo(15,-8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(-6,2,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(6,2,3,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(155,89,182,.25)'; ctx.beginPath(); ctx.arc(0,4,26,0,Math.PI*2); ctx.fill();
            ctx.restore();
        } else {
            const targetInfo = this.getNearestTarget();
            if (this.dead) {
                const progress = Math.min(1, (performance.now() - this.deathStartedAt) / this.deathDuration);
                const deathFrame = Math.min(5, Math.floor(progress * 6));
                const drawn = drawSpriteFrame(spriteImages.zombie, deathFrame, 3, this.x, this.y - 3, 50, 66, this.facingX, spriteImages.zombieLeft);
                if (!drawn) {
                    ctx.save();
                    ctx.globalAlpha = 1 - progress * 0.4;
                    ctx.fillStyle = '#27ae60';
                    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
                return;
            }
            const attacking = performance.now() < this.attackAnimUntil;
            const row = attacking ? 2 : (targetInfo && targetInfo.distance < 140 ? 1 : 0);
            const frameCount = spriteMeta.get(spriteImages.zombie).frames[row] || 1;
            const frame = Math.floor(this.animTime * (attacking ? 10 : 8)) % frameCount;
            const drawn = drawSpriteFrame(spriteImages.zombie, frame, row, this.x, this.y - 3, 50, 66, this.facingX, spriteImages.zombieLeft);
            if (!drawn) {
                ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fillStyle='#27ae60'; ctx.fill();
                ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(this.x-6,this.y-4,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(this.x+6,this.y-4,3,0,Math.PI*2); ctx.fill();
            }
        }

        if (this.dead) return;
        const barWidth = this.type === 'boss' ? 86 : this.type === 'mage' ? 42 : 30;
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle='#333'; ctx.fillRect(this.x-barWidth/2,this.y-this.radius-10,barWidth,4);
        ctx.fillStyle = this.type === 'boss' ? '#ff3045' : this.type === 'mage' ? '#9b59b6' : this.type === 'bomber' ? '#f39c12' : '#e74c3c';
        ctx.fillRect(this.x-barWidth/2,this.y-this.radius-10,barWidth*healthPercent,4);
        if (this.type === 'boss') {
            ctx.save(); ctx.font='bold 11px Arial'; ctx.textAlign='center'; ctx.fillStyle='#ff6b7a'; ctx.fillText('BOSS',this.x,this.y-this.radius-18); ctx.restore();
        }
    }
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return Math.hypot(px-x1, py-y1);
    let t = ((px-x1)*dx + (py-y1)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t*dx, cy = y1 + t*dy;
    return Math.hypot(px-cx, py-cy);
}

function updateCombatEffects(dt) {
    const now = performance.now();

    for (let i = mageTeleportIndicators.length - 1; i >= 0; i--) {
        const event = mageTeleportIndicators[i];
        if (!event.executed && now >= event.executeAt) {
            for (const item of event.positions) {
                if (item.enemy.health > 0 && enemies.includes(item.enemy)) {
                    item.enemy.x = item.x;
                    item.enemy.y = item.y;
                }
            }
            event.executed = true;
            event.mage.mageTeleportPending = false;
            mageTeleportIndicators.splice(i, 1);
        }
    }

    for (let i = bossTeleportIndicators.length - 1; i >= 0; i--) {
        const event = bossTeleportIndicators[i];
        if (!event.boss || event.boss.health <= 0 || !enemies.includes(event.boss)) {
            bossTeleportIndicators.splice(i, 1);
            continue;
        }
        if (now >= event.executeAt) {
            event.boss.x = event.x;
            event.boss.y = event.y;
            event.boss.bossTeleportPending = false;
            bossTeleportIndicators.splice(i, 1);
        }
    }

    for (let i = bossSpikeIndicators.length - 1; i >= 0; i--) {
        const attack = bossSpikeIndicators[i];
        if (now < attack.executeAt) continue;
        const x2 = attack.x + Math.cos(attack.angle) * attack.length;
        const y2 = attack.y + Math.sin(attack.angle) * attack.length;
        for (const target of attack.boss.getTargets()) {
            if (pointToSegmentDistance(target.x, target.y, attack.x, attack.y, x2, y2) <= attack.width/2 + target.radius) {
                target.takeDamage(35);
            }
        }
        bossSpikeBursts.push({ ...attack, startedAt: now, duration: 700 });
        bossSpikeIndicators.splice(i, 1);
    }

    for (let i = dodgeEffects.length - 1; i >= 0; i--) {
        if (now - dodgeEffects[i].startedAt >= dodgeEffects[i].duration) dodgeEffects.splice(i, 1);
    }
    for (let i = bossSpikeBursts.length - 1; i >= 0; i--) {
        if (now - bossSpikeBursts[i].startedAt >= bossSpikeBursts[i].duration) bossSpikeBursts.splice(i, 1);
    }
}

function drawMageTeleportIndicators(now) {
    for (const event of mageTeleportIndicators) {
        const progress = Math.min(1, (now - event.startedAt) / event.duration);
        for (const item of event.positions) {
            const pulse = 1 + Math.sin((progress * 8 + item.x) * 1.7) * 0.08;
            ctx.save();
            ctx.translate(item.x, item.y);
            ctx.globalAlpha = 0.35 + 0.55 * (1 - progress * 0.35);
            ctx.beginPath(); ctx.arc(0,0,(18 + progress*8)*pulse,0,Math.PI*2);
            ctx.fillStyle = 'rgba(155,89,182,.28)'; ctx.fill();
            ctx.strokeStyle='#d58cff'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(5,-8); ctx.lineTo(-5,-8); ctx.closePath();
            ctx.fillStyle='#f0c8ff'; ctx.fill();
            ctx.restore();
        }
    }
}

function drawDodgeEffects(now) {
    for (const effect of dodgeEffects) {
        const p = Math.min(1, (now - effect.startedAt) / effect.duration);
        const alpha = 1 - p;
        const radius = 16 + p * 20;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI*2);
        ctx.strokeStyle='#7dd3fc'; ctx.lineWidth=3; ctx.shadowColor='#38bdf8'; ctx.shadowBlur=16; ctx.stroke(); ctx.shadowBlur=0;
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(effect.x-12, effect.y-12); ctx.lineTo(effect.x+12, effect.y+12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(effect.x+12, effect.y-12); ctx.lineTo(effect.x-12, effect.y+12); ctx.stroke();
        ctx.font='bold 11px Arial'; ctx.textAlign='center'; ctx.fillStyle='#e0f2fe'; ctx.fillText(effect.label, effect.x, effect.y-24-p*8);
        ctx.restore();
    }
}

function drawBossTeleportIndicators(now) {
    for (const event of bossTeleportIndicators) {
        const p = Math.min(1, (now - event.startedAt) / event.duration);
        const pulse = 1 + Math.sin(p * Math.PI * 7) * 0.12;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.5 * Math.sin(p * Math.PI);
        ctx.beginPath();
        ctx.arc(event.x, event.y, 34 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,48,69,.18)';
        ctx.fill();
        ctx.strokeStyle = '#ff3045';
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(event.x, event.y, 11 + p * 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6675';
        ctx.fill();
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd1d6';
        ctx.fillText('BOSS TELEPORTANDO', event.x, event.y - 48);
        ctx.restore();
    }
}

function drawBossSpikeIndicators(now) {
    for (const attack of bossSpikeIndicators) {
        const p = Math.min(1, (now - attack.startedAt) / 2000);
        const x2 = attack.x + Math.cos(attack.angle) * attack.length;
        const y2 = attack.y + Math.sin(attack.angle) * attack.length;
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.22 * Math.sin(p * Math.PI);
        ctx.strokeStyle='#ff3045'; ctx.lineWidth=attack.width; ctx.lineCap='butt';
        ctx.beginPath(); ctx.moveTo(attack.x, attack.y); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle='#ff6675'; ctx.lineWidth=3; ctx.setLineDash([12,8]);
        ctx.beginPath(); ctx.moveTo(attack.x, attack.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle='#ffb3bb';
        ctx.beginPath(); ctx.arc(attack.x, attack.y, 8 + Math.sin(p*10)*3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

function drawBossSpikeBursts(now) {
    for (const attack of bossSpikeBursts) {
        const p = Math.min(1, (now - attack.startedAt) / attack.duration);
        const x2 = attack.x + Math.cos(attack.angle) * attack.length;
        const y2 = attack.y + Math.sin(attack.angle) * attack.length;
        ctx.save();
        ctx.translate(attack.x, attack.y); ctx.rotate(attack.angle);
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle='#ff3045';
        const count = 10;
        for (let i=0;i<count;i++) {
            const x = (attack.length / count) * (i + .5);
            const h = 18 + Math.sin(i*1.7)*4 + p*6;
            ctx.beginPath(); ctx.moveTo(x-10,-6); ctx.lineTo(x,h); ctx.lineTo(x+10,-6); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle='#ff8d98'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(attack.length,0); ctx.stroke();
        ctx.restore();
    }
}

function updateEnemyBullets(dt) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.speedX * dt;
        b.y += b.speedY * dt;
        const far = Math.max(canvas.width, canvas.height) * 1.5;
        if (Math.hypot(b.x - cameraX, b.y - cameraY) > far) { enemyBullets.splice(i, 1); continue; }
        const targets = isCoop ? [player, player2].filter(p => p.health > 0) : [player];
        let hit = false;
        for (const target of targets) {
            if (Math.hypot(b.x - target.x, b.y - target.y) < b.radius + target.radius) {
                target.takeDamage(b.damage);
                hit = true;
                break;
            }
        }
        if (hit) enemyBullets.splice(i, 1);
    }
}

function drawEnemyBullets() {
    for (const b of enemyBullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4757"; ctx.fill();
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = "#8e44ad"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.speedX * dt;
        b.y += b.speedY * dt;
        const far = Math.max(canvas.width, canvas.height) * 1.5;
        if (Math.hypot(b.x - cameraX, b.y - cameraY) > far) bullets.splice(i, 1);
    }
}
function drawBullets() {
    for (const b of bullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.owner === "p2" ? "#e74c3c" : "#3498db";
        ctx.fill();
    }
}
function findNearestUnhitEnemy(bullet) {
    let target = null;
    let best = Infinity;
    for (const enemy of enemies) {
        if (enemy.dead || enemy.health <= 0 || bullet.hitEnemies.has(enemy)) continue;
        const d = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        if (d < best) { best = d; target = enemy; }
    }
    return target;
}

function ricochetBullet(bullet, currentEnemy) {
    const chance = (bullet.ricochetLevel || 0) * 0.195;
    if (chance <= 0 || Math.random() >= chance) return false;

    const nextTarget = findNearestUnhitEnemy(bullet);
    if (!nextTarget) return false;

    const angle = Math.atan2(nextTarget.y - bullet.y, nextTarget.x - bullet.x);
    bullet.speedX = Math.cos(angle) * bullet.speed;
    bullet.speedY = Math.sin(angle) * bullet.speed;
    bullet.ricochets++;
    return true;
}

function cleanupDeadEnemies() {
    const now = performance.now();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.dead && now - enemy.deathStartedAt >= enemy.deathDuration) {
            enemies.splice(i, 1);
        }
    }
}

function checkBulletCollisions() {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];
            if (e.dead || b.hitEnemies.has(e)) continue;
            if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
                const damageResult = e.takeDamage(b.damage);
                if (damageResult === null) {
                    // O zumbi desviou: a bala continua viajando e pode atingir outro alvo.
                    continue;
                }
                b.hitEnemies.add(e);
                const died = damageResult;
                if (died) {
                    spawnHealthDrop(e);
                    e.startDeath();
                    if (e.type === "mage") darkMagePresent = false;
                    if (e.type === "boss") {
                        for (let si = bossSpikeIndicators.length - 1; si >= 0; si--) {
                            if (bossSpikeIndicators[si].boss === e) bossSpikeIndicators.splice(si, 1);
                        }
                        for (let sb = bossSpikeBursts.length - 1; sb >= 0; sb--) {
                            if (bossSpikeBursts[sb].boss === e) bossSpikeBursts.splice(sb, 1);
                        }
                    }
                    score += 10;
                }

                // Cada acerto pode gerar um novo ricochete. Isso pode acontecer
                // repetidamente enquanto ainda houver inimigos sem acerto.
                const bounced = ricochetBullet(b, e);
                if (!b.piercing && !bounced) {
                    bullets.splice(bi, 1);
                }
                break;
            }
        }
    }
}

function startWave() {
    waveElapsed = 0;
    const baseNormals = Math.round(50 * Math.pow(1.5, wave - 1));
    const multiplier = isCoop ? 2 : 1;

    normalToSpawn = baseNormals * multiplier;
    sniperToSpawn = Math.pow(2, wave - 1);
    bomberToSpawn = 4 * Math.pow(2, wave - 1);
    mageToSpawn = wave >= 6 ? 1 : 0;
    bossToSpawn = wave === 5 ? 1 : 0;
    bossSpawned = false;

    enemiesToSpawn = normalToSpawn + sniperToSpawn + bomberToSpawn + mageToSpawn + bossToSpawn;
    enemiesSpawned = 0;
    spawnTimer = 0;
    waveStarting = false;
    darkMagePresent = false;
    mageTeleportIndicators.length = 0;
    bossSpikeIndicators.length = 0;
    bossSpikeBursts.length = 0;
    bossTeleportIndicators.length = 0;
    spawnQueue.length = 0;
    activeSpawnAnimations.length = 0;
    showWaveMessage(`${isCoop ? '👥 ' : ''}WAVE ${wave} · ${enemiesToSpawn} INIMIGOS`);
}

function spawnOneEnemy() {
    if (activeSpawnAnimations.length >= MAX_CONCURRENT_SPAWN_ANIMATIONS && spawnQueue.length) return false;

    const pendingNormal = normalToSpawn;
    const pendingSniper = sniperToSpawn;
    const pendingBomber = bomberToSpawn;
    const pendingMage = mageToSpawn;
    const pendingRegular = pendingNormal + pendingSniper + pendingBomber + pendingMage;

    if (pendingRegular <= 0 && bossToSpawn <= 0) return false;

    let type;
    const regularAlive = enemies.filter(e => e.type !== 'boss' && e.health > 0).length;
    if (bossToSpawn > 0 && pendingRegular + regularAlive <= 50) {
        type = 'boss';
        bossToSpawn--;
    } else {
        const roll = Math.random() * pendingRegular;
        if (roll < pendingNormal) type = 'normal';
        else if (roll < pendingNormal + pendingSniper) type = 'sniper';
        else if (roll < pendingNormal + pendingSniper + pendingBomber) type = 'bomber';
        else type = 'mage';

        if (type === 'normal') normalToSpawn--;
        else if (type === 'sniper') sniperToSpawn--;
        else if (type === 'bomber') bomberToSpawn--;
        else if (type === 'mage') mageToSpawn--;
    }

    const pos = getSpecialSpawnPosition(type);
    queueEnemySpawn(type, pos, 'wave');
    return true;
}

function updateWave(dt) {
    waveElapsed += dt;
    processSpawnAnimations(dt);

    if (enemiesSpawned < enemiesToSpawn) {
        spawnTimer -= dt * 1000;
        if (spawnTimer <= 0) {
            // Gera um pequeno lote por ciclo. As caveiras continuam com a
            // mesma duração, mas várias delas podem aparecer simultaneamente.
            let batch = Math.min(SPAWN_BATCH_SIZE, enemiesToSpawn - enemiesSpawned);
            for (let i = 0; i < batch; i++) {
                if (!spawnOneEnemy()) break;
            }
            // A cada wave, a geração fica 25% mais rápida para acompanhar
            // o aumento de 50% na quantidade de inimigos.
            const baseInterval = Math.max(180, 560 / Math.pow(1.25, wave - 1));
            spawnTimer = isCoop ? Math.max(150, baseInterval * 0.92) : baseInterval;
        }
    }

    if (enemiesSpawned >= enemiesToSpawn && activeSpawnAnimations.length === 0 && spawnQueue.length === 0 && enemies.length === 0 && !waveStarting) {
        waveStarting = true;
        completeWave();
    }
}

function completeWave() {
    if (!gameRunning || !waveStarting) return;
    showWaveMessage("WAVE COMPLETA!");
    // As curas não passam de uma wave para outra.
    healthDrops.length = 0;
    spawnQueue.length = 0;
    activeSpawnAnimations.length = 0;
    mageTeleportIndicators.length = 0;
    bossSpikeIndicators.length = 0;
    bossSpikeBursts.length = 0;
    bossTeleportIndicators.length = 0;
    addWaveXp();
    clearTimeout(waveCompletionTimer);
    waveCompletionTimer = setTimeout(() => {
        waveCompletionTimer = null;
        if (gameRunning) openLevelUp();
    }, 650);
}

function addWaveXp() {
    // Cada wave concluída concede exatamente um nível.
    xp = XP_TO_NEXT_LEVEL;
    level += 1;
    updateHUD();
}

const BUFFS = [
    {
        id: "damage", title: "Poder de fogo", description: "+13 de dano por tiro", icon: "⚔️",
        apply(p) { p.damage += 13; }
    },
    {
        id: "fireRate", title: "Cadência", description: "Dispara 26 ms mais rápido", icon: "⚡",
        apply(p) { p.shootDelay = Math.max(50, p.shootDelay - 26); }
    },
    {
        id: "maxHealth", title: "Vitalidade", description: "+26 de vida máxima e cura 26", icon: "❤️",
        apply(p) { p.maxHealth += 26; p.health = Math.min(p.maxHealth, p.health + 26); }
    },
    {
        id: "bulletSpeed", title: "Projéteis rápidos", description: "+156 de velocidade das balas", icon: "💨",
        apply(p) { p.bulletSpeed += 156; }
    },
    {
        id: "ricochet", title: "Bala ricochete", description: "+19,5% de chance de ricochetear a cada acerto", icon: "🔄",
        apply(p) { }
    },
    {
        id: "piercing", title: "Bala perfuradora", description: "+19,5% de chance do disparo atravessar inimigos", icon: "🎯",
        apply(p) { }
    },
    {
        id: "doubleShot", title: "Tiro duplo", description: "+19,5% de chance de disparar dois tiros", icon: "✌️",
        apply(p) { }
    }
];

function getBuffLevel(buff, p = player) {
    return p?.buffLevels?.[buff.id] || 0;
}

function buffIsAvailable(buff) {
    return getBuffLevel(buff) < MAX_BUFF_UPGRADES;
}

function pickThreeBuffs() {
    const pool = BUFFS.filter(buffIsAvailable);
    const selected = [];
    while (selected.length < 3 && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        selected.push(pool.splice(index, 1)[0]);
    }
    return selected;
}

let currentBuffChoices = [];

function openLevelUp() {
    if (!gameRunning || gamePausedForLevelUp) return;
    gamePausedForLevelUp = true;
    levelUpChoiceMade = false;
    currentBuffChoices = pickThreeBuffs();
    renderBuffChoices();
    document.getElementById("levelUpOverlay").style.display = "flex";
}

function renderBuffChoices() {
    const title = document.getElementById("levelUpTitle");
    const subtitle = document.getElementById("levelUpSubtitle");
    const container = document.getElementById("buffChoices");

    title.textContent = `LEVEL ${level}`;
    subtitle.textContent = isCoop
        ? "👥 Escolham 1 buff para os DOIS jogadores"
        : "Escolha 1 buff para continuar";

    container.innerHTML = "";
    currentBuffChoices.forEach(buff => {
        const button = document.createElement("button");
        button.className = "buff-card shared-buff";
        const currentLevel = getBuffLevel(buff);
        button.innerHTML = `<span class="buff-icon">${buff.icon}</span><strong>${buff.title}</strong><span>${buff.description}</span><small>Upgrade ${currentLevel + 1}/${MAX_BUFF_UPGRADES}</small>`;
        button.addEventListener("click", () => chooseBuff(buff));
        container.appendChild(button);
    });
}

function chooseBuff(buff) {
    if (!gameRunning || !gamePausedForLevelUp || levelUpChoiceMade) return;
    if (!buffIsAvailable(buff)) return;
    levelUpChoiceMade = true;
    if (isCoop) {
        // No coop, UMA escolha é aplicada simultaneamente aos dois jogadores.
        player.buffLevels[buff.id] = (player.buffLevels[buff.id] || 0) + 1;
        player2.buffLevels[buff.id] = (player2.buffLevels[buff.id] || 0) + 1;
        buff.apply(player);
        buff.apply(player2);
        showWaveMessage(`BUFF COMPARTILHADO: ${buff.title}`);
    } else {
        player.buffLevels[buff.id] = (player.buffLevels[buff.id] || 0) + 1;
        buff.apply(player);
    }
    updateHUD();
    finishLevelUp();
}

function finishLevelUp() {
    if (!gameRunning) return;
    document.getElementById("levelUpOverlay").style.display = "none";
    gamePausedForLevelUp = false;
    xp = 0;
    wave++;
    enemies.length = 0;
    bullets.length = 0;
    enemyBullets.length = 0;
    healthDrops.length = 0;
    spawnQueue.length = 0;
    activeSpawnAnimations.length = 0;
    mageTeleportIndicators.length = 0;
    bossSpikeIndicators.length = 0;
    bossSpikeBursts.length = 0;
    bossTeleportIndicators.length = 0;
    startWave();
    lastTime = performance.now();
    updateHUD();
}

function getActivePlayerCenter() {
    const targets = isCoop ? [player, player2].filter(p => p && p.health > 0) : [player];
    if (!targets.length) return { x: cameraX, y: cameraY };
    let x = 0, y = 0;
    for (const p of targets) { x += p.x; y += p.y; }
    return { x: x / targets.length, y: y / targets.length };
}

function drawMageDirectionIndicator(now) {
    const el = document.getElementById("mageDirectionIndicator");
    const arrow = document.getElementById("mageDirectionArrow");
    const text = document.getElementById("mageDirectionText");
    if (!el || !arrow || !text) return;

    const mage = enemies.find(e => e.type === "mage" && e.health > 0);
    if (!mage || now >= mageIndicatorUntil) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
    }

    const center = getActivePlayerCenter();
    const angle = Math.atan2(mage.y - center.y, mage.x - center.x);
    const degrees = angle * 180 / Math.PI + 90;
    arrow.style.transform = `rotate(${degrees}deg)`;

    const distance = Math.round(Math.hypot(mage.x - center.x, mage.y - center.y));
    text.textContent = `Mago das Trevas · ${distance}m`;
    el.style.opacity = "1";
    el.style.pointerEvents = "none";
}

function showWaveMessage(message) {
    const el = document.getElementById("waveMessage");
    el.textContent = message;
    el.style.opacity = "1";
    clearTimeout(showWaveMessage.timer);
    showWaveMessage.timer = setTimeout(() => el.style.opacity = "0", 1000);
}

function updateHUD() {
    document.getElementById("wave").textContent = wave;
    const xpLegacy = document.getElementById("xp");
    if (xpLegacy) xpLegacy.textContent = `${xp} / ${XP_TO_NEXT_LEVEL}`;
    document.getElementById("level").textContent = level;
    const timer = document.getElementById("waveTimer");
    if (timer) {
        const total = Math.floor(waveElapsed);
        const mins = String(Math.floor(total / 60)).padStart(2, "0");
        const secs = String(total % 60).padStart(2, "0");
        timer.textContent = `${mins}:${secs}`;
    }
    document.getElementById("xpBar").style.width = `${Math.min(100, (xp / XP_TO_NEXT_LEVEL) * 100)}%`;
    document.getElementById("xpBarText").textContent = `${xp} / ${XP_TO_NEXT_LEVEL}`;
    const pendingVisualSpawns = spawnQueue.length + activeSpawnAnimations.length;
    document.getElementById("enemies").textContent = Math.max(0, enemiesToSpawn - enemiesSpawned) + enemies.length + pendingVisualSpawns;

    if (isCoop) {
        const h1 = Math.ceil(player.health);
        const h2 = Math.ceil(player2.health);
        document.getElementById("health1").textContent = h1;
        document.getElementById("health2").textContent = h2;
        document.getElementById("healthBar1").style.width = `${Math.max(0, (h1 / player.maxHealth) * 100)}%`;
        document.getElementById("healthBar2").style.width = `${Math.max(0, (h2 / player2.maxHealth) * 100)}%`;
    } else {
        const h = Math.ceil(player.health);
        document.getElementById("health").textContent = h;
        document.getElementById("healthBar").style.width = `${Math.max(0, (h / player.maxHealth) * 100)}%`;
    }
}

async function gameOver() {
    if (!gameRunning) return;
    gameRunning = false;
    gamePausedForLevelUp = false;
    clearTimeout(waveCompletionTimer);
    waveCompletionTimer = null;
    document.getElementById("levelUpOverlay").style.display = "none";
    document.getElementById("finalLevel").textContent = level;
    document.getElementById("finalWave").textContent = wave;
    document.getElementById("gameOverScreen").style.display = "flex";
    if (scoreSaved) return;
    scoreSaved = true;
    if (typeof IS_GUEST !== "undefined" && IS_GUEST) {
        document.getElementById("recordMessage").textContent = isCoop
            ? "🎮 Partida com convidado: a dupla não entra no ranking."
            : "🎮 Você está como convidado: seu resultado não entra no ranking.";
        return;
    }
    try {
        const body = new URLSearchParams();
        body.set("wave", String(wave));
        const response = await fetch(SAVE_SCORE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById("recordMessage").textContent = result.new_record
                ? (isCoop ? "🏆 Novo recorde da dupla!" : "🏆 Novo recorde!")
                : (isCoop ? `Recorde da dupla: wave ${result.best_wave}.` : `Seu recorde: wave ${result.best_wave}.`);
        }
    } catch (error) {
        document.getElementById("recordMessage").textContent = isCoop ? "Não foi possível salvar o recorde da dupla." : "Não foi possível salvar o recorde.";
    }
}

document.getElementById("restartButton").addEventListener("click", () => location.reload());
document.getElementById("menuButton").addEventListener("click", () => { window.location.href = "menu.php"; });

function updateCamera() {
    if (isCoop && player2 && player2.health > 0) {
        cameraX = (player.x + player2.x) / 2;
        cameraY = (player.y + player2.y) / 2;
    } else {
        const active = player.health > 0 ? player : player2;
        cameraX = active ? active.x : cameraX;
        cameraY = active ? active.y : cameraY;
    }
}

function drawBackground() {
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#202020";
    ctx.lineWidth = 1;
    const grid = 50;
    const offsetX = ((canvas.width / 2) - cameraX) % grid;
    const offsetY = ((canvas.height / 2) - cameraY) % grid;
    for (let x = offsetX; x < canvas.width; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = offsetY; y < canvas.height; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
}

function beginWorldRender() {
    ctx.save();
    ctx.translate(canvas.width / 2 - cameraX, canvas.height / 2 - cameraY);
}

function endWorldRender() {
    ctx.restore();
}

const tutorialSteps = isCoop ? [
    `P1 (${LOGGED_PLAYER}): mova com WASD. O tiro é automático e sempre mira no inimigo mais próximo.`,
    `P2 (${SECOND_PLAYER}): mova com as SETAS. O tiro é automático e sempre mira no inimigo mais próximo.`,
    "A EXP é compartilhada entre vocês. A cada wave concluída, vocês sobem 1 nível e escolhem buffs.",
    "Vocês precisam sobreviver juntos. Se os dois perderem toda a vida, a partida acaba.",
    "A quantidade e a força dos inimigos são maiores no modo 2 jogadores. Boa sorte!"
] : [
    "Mova com WASD.",
    "O tiro é automático e sempre mira no inimigo mais próximo.",
    "A cada wave concluída você ganha EXP suficiente para subir 1 nível.",
    "A cada nível, escolha 1 entre 3 buffs para ficar mais forte."
];
let tutorialIndex = 0;
const tutorialOverlay = document.getElementById("tutorialOverlay");
const tutorialNext = document.getElementById("tutorialNext");
const tutorialSkip = document.getElementById("tutorialSkip");
const tutorialText = document.getElementById("tutorialText");

// O tutorial usa onclick diretamente para evitar qualquer conflito entre o canvas
// e os listeners do jogo. Os botões ficam independentes da lógica da partida.
function finishTutorial() {
    gamePausedForTutorial = false;
    if (tutorialOverlay) {
        tutorialOverlay.style.display = "none";
        tutorialOverlay.style.pointerEvents = "none";
    }
    try { localStorage.setItem("waveSurvivalTutorialSeen", "1"); } catch (e) {}
    if (typeof lastTime !== "undefined") lastTime = performance.now();
}

function nextTutorialStep(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!gamePausedForTutorial) return false;
    tutorialIndex++;
    if (tutorialIndex >= tutorialSteps.length) {
        finishTutorial();
    } else if (tutorialText) {
        tutorialText.textContent = tutorialSteps[tutorialIndex];
    }
    return false;
}

function skipTutorial(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    finishTutorial();
    return false;
}

// Também expõe as funções globalmente, garantindo que o HTML possa acioná-las.
window.nextTutorialStep = nextTutorialStep;
window.skipTutorial = skipTutorial;

function showTutorial() {
    if (!tutorialOverlay || !tutorialNext || !tutorialSkip || !tutorialText) return;

    let alreadySeen = false;
    try { alreadySeen = localStorage.getItem("waveSurvivalTutorialSeen") === "1"; } catch (e) {}
    if (alreadySeen) {
        finishTutorial();
        return;
    }

    gamePausedForTutorial = true;
    tutorialIndex = 0;
    tutorialOverlay.style.display = "flex";
    tutorialOverlay.style.pointerEvents = "auto";
    tutorialOverlay.style.zIndex = "99999";
    tutorialText.textContent = tutorialSteps[0];

    tutorialNext.onclick = nextTutorialStep;
    tutorialSkip.onclick = skipTutorial;
}

let lastTime = performance.now();
function gameLoop(currentTime) {
    if (!gameRunning) return;
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    if (!gamePausedForLevelUp && !gamePausedForTutorial) {
        if (player.health > 0) player.update(dt);
        if (player2 && player2.health > 0) player2.update(dt);
        updateCamera();
        for (const enemy of enemies) enemy.update(dt);
        updateCombatEffects(dt);
        updateBullets(dt);
        updateEnemyBullets(dt);
        checkBulletCollisions();
        updateHealthDrops(dt);
        updateWave(dt);
    }
    updateCamera();
    drawBackground();
    beginWorldRender();
    drawBullets();
    drawEnemyBullets();
    drawHealthDrops();
    drawMageTeleportIndicators(currentTime);
    drawBossTeleportIndicators(currentTime);
    drawBossSpikeIndicators(currentTime);
    drawBossSpikeBursts(currentTime);
    drawDodgeEffects(currentTime);
    drawSpawnAnimation(currentTime);
    for (const enemy of enemies) enemy.draw();
    cleanupDeadEnemies();
    if (player.health > 0) player.draw();
    if (player2 && player2.health > 0) player2.draw();
    endWorldRender();
    updateHUD();
    drawMageDirectionIndicator(currentTime);
    requestAnimationFrame(gameLoop);
}

function initializeGame() {
    // Posição inicial no mundo. O mapa não possui bordas.
    player.x = 0;
    player.y = 0;
    if (player2) {
        player2.x = 70;
        player2.y = 0;
    }
    updateCamera();
    startWave();
    updateHUD();
    showTutorial();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
initializeGame();
