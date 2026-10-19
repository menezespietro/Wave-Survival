<?php
require_once 'config.php';
requirePlayer();
if (!empty($_SESSION['coop_player2_id']) || !empty($_SESSION['coop_player2_guest'])) {
    header('Location: coop_game.php');
    exit;
}
$_SESSION['coop_player2_guest'] = true;
$_SESSION['coop_player2_name'] = 'Convidado';
header('Location: coop_game.php');
exit;
?>
