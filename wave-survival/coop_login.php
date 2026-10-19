<?php
require_once 'config.php';
requirePlayer();
if (!empty($_SESSION['coop_player2_id'])) { header('Location: coop_game.php'); exit; }
$error = $_GET['error'] ?? '';
$player1Name = $_SESSION['username'] ?? 'Convidado';
$player1Guest = isGuest();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Wave Survival - Jogador 2</title><link rel="stylesheet" href="style.css">
</head>
<body class="auth-page">
<div class="auth-card">
    <h1>👥 JOGADOR 2</h1>
    <p class="subtitle"><strong><?= htmlspecialchars($player1Name) ?></strong> já está conectado<?= $player1Guest ? " como convidado" : "" ?>.<br>O segundo jogador pode entrar com uma conta ou jogar como convidado.</p>
    <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form action="coop_login_action.php" method="post">
        <label>Nome do jogador 2</label>
        <input type="text" name="username" maxlength="20" required autocomplete="username">
        <label>Senha</label>
        <input type="password" name="password" required autocomplete="current-password">
        <button type="submit">Entrar e jogar</button>
    </form>
    <p class="switch">Ainda não tem conta? <a href="coop_register.php">Cadastrar jogador 2</a></p>
    <div class="guest-divider"><span>ou</span></div>
    <form action="coop_guest_action.php" method="post"><button class="guest-button" type="submit">🎮 Jogador 2 como convidado</button></form>
    <p class="switch"><a href="menu.php">Voltar ao menu</a></p>
</div>
</body>
</html>
