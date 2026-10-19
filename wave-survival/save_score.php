<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['player_id']) || isGuest()) {
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'Convidados não podem entrar no ranking']); exit;
}

$wave = filter_input(INPUT_POST, 'wave', FILTER_VALIDATE_INT);
if ($wave === false || $wave === null || $wave < 1 || $wave > 1000000) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Wave inválida']); exit;
}

$stmt = $db->prepare('SELECT best_wave FROM players WHERE id = ?');
$stmt->execute([$_SESSION['player_id']]);
$current = (int)$stmt->fetchColumn();

if ($wave > $current) {
    $update = $db->prepare('UPDATE players SET best_wave = ? WHERE id = ?');
    $update->execute([$wave, $_SESSION['player_id']]);
    $current = $wave;
    $newRecord = true;
} else {
    $newRecord = false;
}

echo json_encode(['success'=>true,'best_wave'=>$current,'new_record'=>$newRecord]);
?>
