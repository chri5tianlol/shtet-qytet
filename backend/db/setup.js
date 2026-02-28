const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle pg client', err);
    process.exit(-1);
});

// Create tables
const createTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS matches (
                id SERIAL PRIMARY KEY,
                room_code VARCHAR(50),
                winner_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Connected to Neon PostgreSQL and initialized tables.');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};

createTables();

module.exports = pool;
