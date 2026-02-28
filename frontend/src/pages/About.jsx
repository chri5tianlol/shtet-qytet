import React from 'react';

function About() {
    return (
        <div className="flex-center" style={{ minHeight: '80vh', padding: '40px 20px', alignItems: 'flex-start' }}>
            <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', padding: '40px' }}>
                <h1 style={{ color: 'var(--accent-color)', marginBottom: '20px', textAlign: 'center', fontSize: '36px' }}>About Shtet Qytet</h1>

                <p style={{ fontSize: '18px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '40px', textAlign: 'center' }}>
                    Shtet Qytet (Country City) is a classic Albanian word game brought to life in a modern, real-time multiplayer web experience. Test your vocabulary, speed, and creativity against friends or players from around the world!
                </p>

                <h2 style={{ marginBottom: '20px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>How to Play</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                        <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>1. The Spin</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>At the start of each round, a random letter from the Albanian alphabet will be selected. This letter represents the starting letter for every word you must find in that round.</p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                        <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>2. The Categories</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>You must quickly type a valid word beginning with the active letter for each category (e.g., Shtet, Qytet, Kafshë, Send). Be fast! If a player finishes all categories and hits "Done!", the round immediately ends for everyone!</p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                        <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>3. The Scoring</h3>
                        <ul style={{ color: 'var(--text-secondary)', margin: '10px 0 0 20px' }}>
                            <li style={{ marginBottom: '5px' }}><strong style={{ color: '#4ade80' }}>10 Points:</strong> You submitted a valid, unique word that nobody else thought of.</li>
                            <li style={{ marginBottom: '5px' }}><strong style={{ color: '#facc15' }}>5 Points:</strong> You submitted a valid word, but someone else also submitted the exact same word.</li>
                            <li><strong style={{ color: '#f87171' }}>0 Points:</strong> You left the field blank, provided a single-letter answer, or used the wrong starting letter.</li>
                        </ul>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                        <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>4. Disputes & Voting</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Did someone cheat by making up a fake word or copying an existing answer? Click the <strong style={{ color: '#f87171' }}>!</strong> button next to their score during the Review phase! This triggers a 15-second room-wide vote. If the majority agrees, they will be penalized.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;
