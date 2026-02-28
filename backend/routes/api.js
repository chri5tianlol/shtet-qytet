const express = require('express');
const router = express.Router();
const pool = require('../db/setup');

// Fetch the top 10 users by total_score or games_won
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`SELECT username, total_score, games_played, games_won FROM users ORDER BY total_score DESC LIMIT 10`);
        res.json({ leaderboard: result.rows });
    } catch (err) {
        console.error("Leaderboard DB Error:", err);
        return res.status(500).json({ error: 'Database error fetching leaderboard.' });
    }
});

module.exports = router;
