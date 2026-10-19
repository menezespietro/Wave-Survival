<?php
require_once 'config.php';
requirePlayer();
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

$stmt = $db->prepare('SELECT id, username, password_hash FROM players WHERE username = ? COLLATE NOCASE LIMIT 1');
$stmt->execute([$username]);
$player = $stmt->fetch();

if (!$player || !password_verify($password, $player['password_hash'])) {
    header('Location: coop_login.php?error=' . urlencode('Nome ou senha do jogador 2 incorretos.'));
    exit;
}

if ((int)$player['id'] === (int)$_SESSION['player_id']) {
    header('Location: coop_login.php?error=' . urlencode('O jogador 2 precisa usar uma conta diferente.'));
    exit;
}

$_SESSION['coop_player2_id'] = (int)$player['id'];
$_SESSION['coop_player2_name'] = $player['username'];
header('Location: coop_game.php');
exit;
?>
