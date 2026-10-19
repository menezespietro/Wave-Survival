<?php
require_once 'config.php';
requirePlayer();

if (!empty($_SESSION['coop_player2_id'])) {
    header('Location: coop_game.php');
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$confirm = $_POST['password_confirm'] ?? '';

if ($username === '' || mb_strlen($username, 'UTF-8') > 20) {
    header('Location: coop_register.php?error=' . urlencode('O nome deve ter entre 1 e 20 caracteres.'));
    exit;
}
if ($password !== $confirm) {
    header('Location: coop_register.php?error=' . urlencode('As senhas não coincidem.'));
    exit;
}
if ($password === '') {
    header('Location: coop_register.php?error=' . urlencode('A senha não pode ficar vazia.'));
    exit;
}

try {
    // A conta do jogador 2 é criada sem substituir a sessão do jogador 1.
    $stmt = $db->prepare('INSERT INTO players (username, password_hash) VALUES (?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    $playerId = (int)$db->lastInsertId();

    if ($playerId === (int)$_SESSION['player_id']) {
        header('Location: coop_register.php?error=' . urlencode('O jogador 2 precisa usar uma conta diferente.'));
        exit;
    }

    $_SESSION['coop_player2_id'] = $playerId;
    $_SESSION['coop_player2_name'] = $username;
    header('Location: coop_game.php');
} catch (PDOException $e) {
    $message = str_contains(strtolower($e->getMessage()), 'unique')
        ? 'Esse nome de jogador já está em uso.'
        : 'Não foi possível criar a conta.';
    header('Location: coop_register.php?error=' . urlencode($message));
}
exit;
?>
