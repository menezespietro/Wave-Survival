<?php
require_once 'config.php';
if (!empty($_SESSION['player_id']) || !empty($_SESSION['guest_mode'])) { header('Location: menu.php'); exit; }
$error = $_GET['error'] ?? '';
$message = $_GET['message'] ?? '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Wave Survival - Login</title><link rel="stylesheet" href="style.css"></head>
<body class="auth-page">
<div class="auth-card">
    <h1>WAVE SURVIVAL</h1>
    <p class="subtitle">Entre para jogar e disputar o ranking.</p>
    <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <?php if ($message): ?><div class="alert success"><?= htmlspecialchars($message) ?></div><?php endif; ?>
    <form action="login.php" method="post">
        <label>Nome do jogador</label>
        <input type="text" name="username" maxlength="20" required autocomplete="username">
        <label>Senha</label>
        <input type="password" name="password" required autocomplete="current-password">
        <button type="submit">Entrar</button>
    </form>
    <p class="switch">Ainda não tem conta? <a href="register.php">Criar conta</a></p>
    <div class="guest-divider"><span>ou</span></div>
    <a class="guest-button" href="guest.php">🎮 Jogar como convidado</a>
</div>
</body>
</html>
