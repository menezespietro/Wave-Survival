<?php
session_start();

$dbDir = __DIR__ . '/data';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}

$db = new PDO('sqlite:' . $dbDir . '/game.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('PRAGMA foreign_keys = ON');

$db->exec("CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    best_wave INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)");

$db->exec("CREATE TABLE IF NOT EXISTS coop_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    best_wave INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player1_id, player2_id),
    FOREIGN KEY(player1_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY(player2_id) REFERENCES players(id) ON DELETE CASCADE
)");

function isGuest(): bool {
    return !empty($_SESSION['guest_mode']);
}

function requireLogin(): void {
    if (empty($_SESSION['player_id'])) {
        header('Location: index.php');
        exit;
    }
}

function requirePlayer(): void {
    if (empty($_SESSION['player_id']) && !isGuest()) {
        header('Location: index.php');
        exit;
    }
}

function requireCoop(): void {
    requirePlayer();
    if (empty($_SESSION['coop_player2_id']) && empty($_SESSION['coop_player2_guest'])) {
        header('Location: menu.php');
        exit;
    }
}
?>
