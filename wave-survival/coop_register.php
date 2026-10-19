<?php
require_once 'config.php';
requirePlayer();

if (!empty($_SESSION['coop_player2_id'])) {
    header('Location: coop_game.php');
    exit;
}

$error = $_GET['error'] ?? '';
$player1Name = $_SESSION['username'];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Wave Survival - Criar Jogador 2</title><link rel="stylesheet" href="style.css">
</head>
<body class="auth-page">
<div class="auth-card">
    <h1>➕ JOGADOR 2</h1>
    <p class="subtitle"><strong><?= htmlspecialchars($player1Name) ?></strong> já está conectado.<br>Crie uma conta para o segundo jogador entrar na partida.</p>
    <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form action="coop_register_action.php" method="post">
        <label>Nome do jogador 2</label>
        <input type="text" name="username" maxlength="20" required autocomplete="username">
        <small>Máximo de 20 caracteres.</small>
        <label>Senha</label>
        <input type="password" name="password" required autocomplete="new-password">
        <small>A senha não tem limite de caracteres.</small>
        <label>Confirmar senha</label>
        <input type="password" name="password_confirm" required autocomplete="new-password">
        <button type="submit">Criar conta e jogar</button>
    </form>
    <p class="switch"><a href="coop_login.php">Já tem uma conta? Entrar</a></p>
    <p class="switch"><a href="menu.php">Voltar ao menu</a></p>
</div>
</body>
</html>
