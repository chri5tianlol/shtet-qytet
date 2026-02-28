const express = require('express');
const router = express.Router();
const db = require('../db/setup');

// Fetch the top 10 users by total_score or games_won
router.get('/leaderboard', (req, res) => {
    db.all(`SELECT username, total_score, games_played, games_won FROM users ORDER BY total_score DESC LIMIT 10`, [], (err, rows) => {
        if (err) {
            console.error("Leaderboard DB Error:", err);
            return res.status(500).json({ error: 'Database error fetching leaderboard.' });
        }
        res.json({ leaderboard: rows });
    });
});

module.exports = router;
