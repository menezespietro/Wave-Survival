<?php
require_once 'config.php';
if (!empty($_SESSION['player_id'])) { header('Location: game.php'); exit; }
$error = $_GET['error'] ?? '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Wave Survival - Cadastro</title><link rel="stylesheet" href="style.css"></head>
<body class="auth-page">
<div class="auth-card">
    <h1>CRIAR CONTA</h1>
    <p class="subtitle">Crie seu jogador para salvar seu recorde.</p>
    <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form action="register_action.php" method="post">
        <label>Nome do jogador</label>
        <input type="text" name="username" maxlength="20" required autocomplete="username">
        <small>Máximo de 20 caracteres.</small>
        <label>Senha</label>
        <input type="password" name="password" required autocomplete="new-password">
        <small>A senha não tem limite de caracteres.</small>
        <label>Confirmar senha</label>
        <input type="password" name="password_confirm" required autocomplete="new-password">
        <button type="submit">Criar conta</button>
    </form>
    <p class="switch">Já tem conta? <a href="index.php">Voltar para o login</a></p>
</div>
</body>
</html>
