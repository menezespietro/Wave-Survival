<?php
require_once 'config.php';
requireCoop();
$_SESSION['ranking_access'] = false;
$player1Guest = isGuest();
$player1Name = $_SESSION['username'] ?? 'Convidado';
$player2Guest = !empty($_SESSION['coop_player2_guest']);
$player2Name = $_SESSION['coop_player2_name'] ?? 'Convidado';
$bestDuoWave = 0;
if (!$player1Guest && !$player2Guest) {
    $a = (int)$_SESSION['player_id'];
    $b = (int)$_SESSION['coop_player2_id'];
    [$coopP1, $coopP2] = $a < $b ? [$a, $b] : [$b, $a];
    $bestStmt = $db->prepare('SELECT best_wave FROM coop_records WHERE player1_id = ? AND player2_id = ?');
    $bestStmt->execute([$coopP1, $coopP2]);
    $bestDuoWave = (int)($bestStmt->fetchColumn() ?: 0);
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Wave Survival - 2 Jogadores</title><link rel="stylesheet" href="style.css?v=44">
</head>
<body class="game-page">
<div id="topCenterHud" class="top-center-hud coop-hud">
    <div class="hud-wave"><span class="hud-icon">☠</span><strong>WAVE <span id="wave">1</span></strong></div>
    <div class="hud-time"><span class="hud-icon">◷</span><span id="waveTimer">00:00</span></div>
</div>
<div id="topRightHud" class="top-right-hud">
    <div>👥 <strong>Inimigos:</strong> <span id="enemies">0</span></div>
    <div>🏆 <strong>Dupla:</strong> <span id="bestWave"><?= (!$player1Guest && !$player2Guest) ? $bestDuoWave : "—" ?></span></div>
</div>
<div class="match-actions"><a href="menu.php">Menu inicial</a><a href="logout.php">Sair</a></div>
<div id="healthPanel" class="health-panel coop-health">
    <div class="health-card p1-health">
        <div class="health-card-header"><span>JOGADOR 1</span><strong><?= htmlspecialchars($player1Name) ?></strong></div>
        <div class="health-track"><div id="healthBar1" class="health-fill p1-fill"></div></div>
        <div class="health-value"><span>VIDA</span><strong id="health1">100</strong><span>/ 100</span></div>
    </div>
    <div class="health-card p2-health">
        <div class="health-card-header"><span>JOGADOR 2</span><strong><?= htmlspecialchars($player2Name) ?></strong></div>
        <div class="health-track"><div id="healthBar2" class="health-fill p2-fill"></div></div>
        <div class="health-value"><span>VIDA</span><strong id="health2">100</strong><span>/ 100</span></div>
    </div>
</div>
<div id="xpHud"><div class="xp-label"><span>EXP <b>COMPARTILHADA · NÍVEL <span id="level">1</span></b></span><strong id="xpBarText">0 / 100</strong></div><div class="xp-track"><div id="xpBar" class="xp-fill"></div></div></div>
<div id="waveMessage"></div>
<div id="tutorialOverlay">
    <div id="tutorialBox">
        <h1>TUTORIAL — 2 JOGADORES</h1>
        <p id="tutorialText"></p>
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
            <div class="game-over-stat"><span>🌑 NÍVEL DA DUPLA</span><strong id="finalLevel">1</strong></div>
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
const COOP_MODE = true;
const LOGGED_PLAYER = <?= json_encode($player1Name, JSON_UNESCAPED_UNICODE) ?>;
const SECOND_PLAYER = <?= json_encode($player2Name, JSON_UNESCAPED_UNICODE) ?>;
const IS_GUEST = <?= ($player1Guest || $player2Guest) ? 'true' : 'false' ?>;
const SAVE_SCORE_URL = 'save_coop_score.php';
</script>
<script src="game.js?v=44"></script>
</body></html>
