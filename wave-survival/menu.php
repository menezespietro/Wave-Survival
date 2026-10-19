<?php
require_once 'config.php';
requirePlayer();
$guest = isGuest();
$playerName = $_SESSION['username'] ?? 'Convidado';
$_SESSION['ranking_access'] = true;
unset($_SESSION['coop_player2_id'], $_SESSION['coop_player2_name'], $_SESSION['coop_player2_guest']);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Wave Survival - Menu</title><link rel="stylesheet" href="style.css">
</head>
<body class="auth-page">
<div class="auth-card mode-card main-menu-card">
    <h1>WAVE SURVIVAL</h1>
    <p class="subtitle">Bem-vindo, <?= htmlspecialchars($playerName) ?>!</p>
    <div class="menu-options">
        <a class="mode-option" href="game.php"><strong>👤 1 JOGADOR</strong><span>Jogue sozinho e tente alcançar a maior wave.</span></a>
        <a class="mode-option coop" href="coop_login.php"><strong>👥 2 JOGADORES</strong><span>Jogue em coop com outra conta.</span></a>
        <a class="mode-option ranking-menu" href="ranking.php"><strong>🏆 RANKING SOLO</strong><span>Veja as maiores waves dos jogadores.</span></a>
        <a class="mode-option ranking-menu" href="coop_ranking.php"><strong>🏆 RANKING 2 JOGADORES</strong><span>Veja as melhores duplas.</span></a>
        <?php if ($guest): ?>
        <div class="guest-notice">🎮 Você está jogando como convidado. Você pode visualizar os rankings, mas seu progresso não entra neles.</div>
        <?php endif; ?>
    </div>
    <div class="mode-links"><a href="logout.php">Sair</a></div>
</div>
</body>
</html>
