<?php
require_once 'config.php';
requirePlayer();
$_SESSION['ranking_access'] = false;
$guest = isGuest();
$playerName = $_SESSION['username'] ?? 'Convidado';
$bestWave = 0;
if (!$guest) {
    $best = $db->prepare('SELECT best_wave FROM players WHERE id = ?');
    $best->execute([$_SESSION['player_id']]);
    $bestWave = (int)($best->fetchColumn() ?: 0);
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Wave Survival</title><link rel="stylesheet" href="style.css?v=44">
</head>
<body class="game-page">
<div id="topCenterHud" class="top-center-hud">
    <div class="hud-wave"><span class="hud-icon">☠</span><strong>WAVE <span id="wave">1</span></strong></div>
    <div class="hud-time"><span class="hud-icon">◷</span><span id="waveTimer">00:00</span></div>
</div>
<div id="topRightHud" class="top-right-hud">
    <div>👥 <strong>Inimigos:</strong> <span id="enemies">0</span></div>
    <div>🏆 <strong>Recorde:</strong> <span id="bestWave"><?= $bestWave ?></span></div>
</div>
<div class="match-actions"><a href="menu.php">Menu inicial</a><a href="logout.php">Sair</a></div>
<div id="healthPanel" class="health-panel solo-health">
    <div class="health-card p1-health">
        <div class="health-card-header"><span>JOGADOR 1</span><strong><?= htmlspecialchars($playerName) ?></strong></div>
        <div class="health-track"><div id="healthBar" class="health-fill p1-fill"></div></div>
        <div class="health-value"><span>VIDA</span><strong id="health">100</strong><span>/ 100</span></div>
    </div>
</div>
<div id="xpHud"><div class="xp-label"><span>EXP <b>NÍVEL <span id="level">1</span></b></span><strong id="xpBarText">0 / 100</strong></div><div class="xp-track"><div id="xpBar" class="xp-fill"></div></div></div>
<div id="waveMessage"></div>
<div id="mageDirectionIndicator" aria-hidden="true">
    <div id="mageDirectionArrow">▲</div>
    <div id="mageDirectionText">Mago das Trevas</div>
</div>
<div id="tutorialOverlay">
    <div id="tutorialBox">
        <h1>TUTORIAL</h1><p id="tutorialText"></p>
        <div class="tutorialButtons"><button type="button" id="tutorialSkip" onclick="return window.skipTutorial(event)">Pular tutorial</button><button type="button" id="tutorialNext" onclick="return window.nextTutorialStep(event)">Próximo</button></div>
    </div>
</div>
<canvas id="gameCanvas"></canvas>
<div id="levelUpOverlay">
    <div id="levelUpBox">
        <h1 id="levelUpTitle">LEVEL 2</h1>
        <p id="levelUpSubtitle">Escolha um buff para continuar</p>
        <div id="buffChoices"></div>
    </div>
</div>
<div id="gameOverScreen">
    <div class="game-over-card">
        <div class="game-over-title">GAME OVER</div>
        <div class="game-over-divider"></div>
        <div class="game-over-stats">
            <div class="game-over-stat"><span>🌑 NÍVEL</span><strong id="finalLevel">1</strong></div>
            <div class="game-over-stat"><span>☠ WAVE</span><strong id="finalWave">1</strong></div>
        </div>
        <p id="recordMessage" class="game-over-record"></p>
        <div class="game-over-actions">
            <button id="restartButton" class="primary">Jogar novamente</button>
            <button id="menuButton" class="secondary">Voltar ao menu</button>
        </div>
    </div>
</div>
<script>
const COOP_MODE = false;
const LOGGED_PLAYER = <?= json_encode($playerName, JSON_UNESCAPED_UNICODE) ?>;
const SAVE_SCORE_URL = 'save_score.php';
const IS_GUEST = <?= $guest ? 'true' : 'false' ?>;
</script>
<script src="game.js?v=44"></script>
</body></html>
