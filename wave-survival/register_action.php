<?php
require_once 'config.php';
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$confirm = $_POST['password_confirm'] ?? '';

if ($username === '' || mb_strlen($username, 'UTF-8') > 20) {
    header('Location: register.php?error=' . urlencode('O nome deve ter entre 1 e 20 caracteres.')); exit;
}
if ($password !== $confirm) {
    header('Location: register.php?error=' . urlencode('As senhas não coincidem.')); exit;
}
if ($password === '') {
    header('Location: register.php?error=' . urlencode('A senha não pode ficar vazia.')); exit;
}

try {
    $stmt = $db->prepare('INSERT INTO players (username, password_hash) VALUES (?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    $playerId = (int)$db->lastInsertId();
    session_regenerate_id(true);
    $_SESSION['player_id'] = $playerId;
    $_SESSION['username'] = $username;
    unset($_SESSION['coop_player2_id'], $_SESSION['coop_player2_name']);
    header('Location: menu.php');
} catch (PDOException $e) {
    $message = str_contains(strtolower($e->getMessage()), 'unique') ? 'Esse nome de jogador já está em uso.' : 'Não foi possível criar a conta.';
    header('Location: register.php?error=' . urlencode($message));
}
exit;
?>
