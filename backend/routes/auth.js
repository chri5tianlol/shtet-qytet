const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/setup');

const JWT_SECRET = process.env.JWT_SECRET || 'shtet_qytet_secret_key';

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );
        const newUserId = result.rows[0].id;
        const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: newUserId, username, score: 0 }
        });
    } catch (error) {
        if (error.code === '23505') { // Postgres UNIQUE violation code
            return res.status(400).json({ error: 'Username already taken' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid username' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });

        try {
            const result = await pool.query('SELECT id, username, games_played, games_won, total_score, created_at FROM users WHERE id = $1', [decoded.id]);
            const user = result.rows[0];
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (dbErr) {
            console.error('Me Auth Error:', dbErr);
            res.status(500).json({ error: 'Database error' });
        }
    });
});

module.exports = router;
