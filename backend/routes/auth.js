const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/setup');

const JWT_SECRET = process.env.JWT_SECRET || 'shtet_qytet_secret_key';

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Username already taken' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                const newUserId = this.lastID;
                const token = jwt.sign({ id: newUserId, username }, JWT_SECRET, { expiresIn: '24h' });
                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: { id: newUserId, username, score: 0 }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid username' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

        // Don't send password hash back
        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    });
});

router.get('/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });

        db.get('SELECT id, username, games_played, games_won, total_score, created_at FROM users WHERE id = ?', [decoded.id], (err, user) => {
            if (err || !user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        });
    });
});

module.exports = router;
