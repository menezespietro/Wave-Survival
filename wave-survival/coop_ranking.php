<?php
require_once 'config.php';
requirePlayer();
if (empty($_SESSION['ranking_access'])) { header('Location: menu.php'); exit; }
$stmt = $db->query('SELECT cr.best_wave, p1.username AS player1, p2.username AS player2 FROM coop_records cr JOIN players p1 ON p1.id = cr.player1_id JOIN players p2 ON p2.id = cr.player2_id ORDER BY cr.best_wave DESC, p1.username COLLATE NOCASE ASC, p2.username COLLATE NOCASE ASC LIMIT 100');
$records = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ranking 2 Jogadores</title><link rel="stylesheet" href="style.css"></head>
<body class="ranking-page">
<div class="ranking-card">
    <h1>🏆 RANKING — 2 JOGADORES</h1>
    <p class="subtitle">Maior wave alcançada por dupla</p>
    <?php if (!$records): ?><p class="empty">Ainda não existe nenhum recorde de dupla.</p>
    <?php else: ?>
    <table><thead><tr><th>#</th><th>Dupla</th><th>Wave</th></tr></thead><tbody>
    <?php foreach ($records as $i => $record): ?><tr><td><?= $i + 1 ?></td><td><?= htmlspecialchars($record['player1']) ?> + <?= htmlspecialchars($record['player2']) ?></td><td><?= (int)$record['best_wave'] ?></td></tr><?php endforeach; ?>
    </tbody></table>
    <?php endif; ?>
    <div class="ranking-actions"><?php if (!empty($_SESSION['player_id'])): ?><a href="menu.php">Voltar ao menu</a><?php else: ?><a href="index.php">Login</a><?php endif; ?></div>
</div>
</body>
</html>
