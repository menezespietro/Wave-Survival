<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['player_id']) || empty($_SESSION['coop_player2_id']) || isGuest() || !empty($_SESSION['coop_player2_guest'])) {
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'Duplas com convidados não entram no ranking']); exit;
}

$wave = filter_input(INPUT_POST, 'wave', FILTER_VALIDATE_INT);
if ($wave === false || $wave === null || $wave < 1 || $wave > 1000000) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Wave inválida']); exit;
}

$a = (int)$_SESSION['player_id'];
$b = (int)$_SESSION['coop_player2_id'];
if ($a === $b) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Dupla inválida']); exit; }
[$p1, $p2] = $a < $b ? [$a, $b] : [$b, $a];

$stmt = $db->prepare('SELECT id, best_wave FROM coop_records WHERE player1_id = ? AND player2_id = ?');
$stmt->execute([$p1, $p2]);
$record = $stmt->fetch();
$newRecord = false;

if (!$record) {
    $insert = $db->prepare('INSERT INTO coop_records (player1_id, player2_id, best_wave) VALUES (?, ?, ?)');
    $insert->execute([$p1, $p2, $wave]);
    $current = $wave;
    $newRecord = true;
} else {
    $current = (int)$record['best_wave'];
    if ($wave > $current) {
        $update = $db->prepare('UPDATE coop_records SET best_wave = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $update->execute([$wave, $record['id']]);
        $current = $wave;
        $newRecord = true;
    }
}

echo json_encode(['success'=>true,'best_wave'=>$current,'new_record'=>$newRecord]);
?>
