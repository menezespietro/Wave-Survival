<?php
require_once 'config.php';
requirePlayer();
if (empty($_SESSION['ranking_access'])) { header('Location: menu.php'); exit; }
$stmt = $db->query('SELECT username, best_wave FROM players ORDER BY best_wave DESC, username COLLATE NOCASE ASC LIMIT 100');
$players = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ranking - Wave Survival</title><link rel="stylesheet" href="style.css"></head>
<body class="ranking-page">
<div class="ranking-card">
    <h1>🏆 RANKING</h1>
    <p class="subtitle">Maior wave alcançada</p>
    <?php if (!$players): ?><p class="empty">Ainda não há jogadores cadastrados.</p>
    <?php else: ?>
    <table><thead><tr><th>#</th><th>Jogador</th><th>Wave</th></tr></thead><tbody>
    <?php foreach ($players as $i => $player): ?><tr><td><?= $i + 1 ?></td><td><?= htmlspecialchars($player['username']) ?></td><td><?= (int)$player['best_wave'] ?></td></tr><?php endforeach; ?>
    </tbody></table>
    <?php endif; ?>
    <div class="ranking-actions"><?php if (!empty($_SESSION['player_id'])): ?><a href="menu.php">Voltar ao menu</a><?php else: ?><a href="index.php">Login</a><?php endif; ?></div>
</div>
</body></html>
