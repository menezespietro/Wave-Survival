<?php
require_once 'config.php';
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

$stmt = $db->prepare('SELECT id, username, password_hash FROM players WHERE username = ? COLLATE NOCASE LIMIT 1');
$stmt->execute([$username]);
$player = $stmt->fetch();

if (!$player || !password_verify($password, $player['password_hash'])) {
    header('Location: index.php?error=' . urlencode('Nome ou senha incorretos.')); exit;
}

session_regenerate_id(true);
$_SESSION['player_id'] = $player['id'];
$_SESSION['username'] = $player['username'];
header('Location: menu.php');
exit;
?>
