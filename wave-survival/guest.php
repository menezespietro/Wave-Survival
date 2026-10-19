<?php
require_once 'config.php';
session_regenerate_id(true);
$_SESSION['guest_mode'] = true;
$_SESSION['username'] = 'Convidado';
unset($_SESSION['player_id'], $_SESSION['coop_player2_id'], $_SESSION['coop_player2_name'], $_SESSION['coop_player2_guest']);
$_SESSION['ranking_access'] = false;
header('Location: menu.php');
exit;
?>
