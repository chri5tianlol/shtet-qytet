import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        // Fetch the Global Top 10 Champs
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leaderboard`);
                if (res.ok) {
                    const data = await res.json();
                    setLeaderboard(data.leaderboard || []);
                }
            } catch (err) {
                console.error("Failed to load Top 10 Champs:", err);
            }
        };
        fetchLeaderboard();
    }, []);

    return (
        <div className="home-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px', minHeight: '80vh' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '20px' }}>
                Shtet <span style={{ color: 'var(--accent-color)' }}>Qytet</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '40px', maxWidth: '600px' }}>
                The classic word game reinvented for the modern web. Create a room, invite your friends, and battle in real-time.
            </p>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '60px' }}>
                <button className="glass-btn primary" style={{ fontSize: '1.2rem', padding: '15px 40px' }} onClick={() => navigate(user ? '/lobby' : '/login')}>
                    Play Now
                </button>
            </div>

            {/* All-Time Champs Leaderboard Component */}
            <div style={{ width: '100%', maxWidth: '800px', marginTop: '20px' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '30px', color: 'var(--text-primary)' }}>
                    🏆 All-Time Champs
                </h2>
                <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '300px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Rank</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Player</th>
                                <th style={{ padding: '15px 10px', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'right' }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No champions yet! Start a room and claim the #1 spot.
                                    </td>
                                </tr>
                            ) : (
                                leaderboard.map((player, index) => (
                                    <tr key={index} style={{ borderBottom: index < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: index === 0 ? 'rgba(74, 222, 128, 0.05)' : index === 1 ? 'rgba(250, 204, 21, 0.05)' : index === 2 ? 'rgba(251, 146, 60, 0.05)' : 'transparent' }}>
                                        <td style={{ padding: '15px 10px', fontSize: '16px', fontWeight: 'bold', color: index === 0 ? '#4ade80' : index === 1 ? '#facc15' : index === 2 ? '#fb923c' : 'var(--text-secondary)' }}>
                                            {index === 0 ? '1st 🥇' : index === 1 ? '2nd 🥈' : index === 2 ? '3rd 🥉' : `#${index + 1}`}
                                        </td>
                                        <td style={{ padding: '15px 10px', fontSize: '16px', fontWeight: index < 3 ? 'bold' : 'normal', wordBreak: 'break-word' }}>
                                            {player.username}
                                        </td>
                                        <td style={{ padding: '15px 10px', fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-color)', textAlign: 'right' }}>
                                            {player.total_score} pts
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Home;
