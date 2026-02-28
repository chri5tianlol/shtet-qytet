import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';

function Lobby() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');

    const [settings, setSettings] = useState({
        isPrivate: false,
        timeLimit: 30, // seconds
        playersMax: 15,
        roundsMax: 24,
        mode: 'Normal',
        categories: ['Shtet', 'Qytet', 'Kafshë', 'Send', 'Ushqim & Pije', 'Emër']
    });

    const [activeTab, setActiveTab] = useState(null); // null means selection screen
    const [publicRooms, setPublicRooms] = useState([]);
    const standardExtraTags = ['Mbiemër', 'VIP', 'Film', 'Brand', 'Profesion'];
    const [customTagInput, setCustomTagInput] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
    };

    const toggleCategory = (cat) => {
        setSettings(prev => {
            if (prev.categories.includes(cat)) {
                return { ...prev, categories: prev.categories.filter(c => c !== cat) }
            } else {
                return { ...prev, categories: [...prev.categories, cat] }
            }
        });
    };

    const addCustomCategory = (e) => {
        e.preventDefault();
        const trimmed = customTagInput.trim();
        if (trimmed && !settings.categories.includes(trimmed)) {
            setSettings(prev => ({ ...prev, categories: [...prev.categories, trimmed] }));
        }
        setCustomTagInput('');
    }

    useEffect(() => {
        socket.connect();

        socket.emit('getPublicRooms');
        socket.on('publicRoomsUpdated', (rooms) => {
            setPublicRooms(rooms);
        });

        return () => {
            socket.off('publicRoomsUpdated');
        };
    }, []);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        setError('');

        const payload = {
            ...settings,
            hostUsername: user ? user.username : 'Guest'
        };

        socket.emit('createRoom', payload, user?.id || null, (response) => {
            if (response.success) {
                navigate(`/room/${response.roomCode}`);
            } else {
                setError('Failed to create room');
            }
        });
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (!roomCode) return;
        setError('');
        socket.emit('joinRoom', roomCode, user?.username || 'Guest', user?.id || null, (res) => {
            if (res.success) {
                navigate(`/room/${roomCode.toUpperCase()}`);
            } else {
                setError(res.message || 'Failed to join room');
            }
        });
    };

    const joinSpecificRoom = (code) => {
        setError('');
        socket.emit('joinRoom', code, user ? user.username : 'Guest', user?.id || null, (res) => {
            if (res.success) {
                navigate(`/room/${code}`);
            } else {
                setError(res.message || 'Failed to join room');
            }
        });
    };

    return (
        <div className="lobby-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', width: '100%' }}>

            {!activeTab && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '400px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Welcome to the Lobby</h2>
                    <button
                        className="glass-btn primary"
                        style={{ padding: '20px', fontSize: '20px' }}
                        onClick={() => setActiveTab('join')}
                    >
                        Join Room
                    </button>
                    <button
                        className="glass-btn"
                        style={{ padding: '20px', fontSize: '20px' }}
                        onClick={() => setActiveTab('create')}
                    >
                        Create Room
                    </button>
                </div>
            )}

            {activeTab && (
                <button
                    className="glass-btn"
                    style={{ marginBottom: '20px', alignSelf: 'flex-start', marginLeft: 'max(0px, calc(50vw - 300px))' }}
                    onClick={() => setActiveTab(null)}
                >
                    ← Back to Options
                </button>
            )}

            {/* Join Room Panel */}
            {activeTab === 'join' && (
                <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '600px' }}>
                    <h2 style={{ marginBottom: '20px' }}>Join Room</h2>
                    {error && <div style={{ color: 'var(--accent-hover)', marginBottom: '10px' }}>{error}</div>}
                    <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="text"
                            placeholder="Enter Room Code"
                            className="glass-input"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            required
                            maxLength={6}
                        />
                        <button type="submit" className="glass-btn primary">Join</button>
                    </form>
                    <div style={{ marginTop: '30px' }}>
                        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Available Public Rooms</h4>
                        <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                            {publicRooms.length > 0 ? (
                                (() => {
                                    const ROOMS_PER_PAGE = 5;
                                    const totalPages = Math.ceil(publicRooms.length / ROOMS_PER_PAGE);
                                    const displayedRooms = publicRooms.slice((currentPage - 1) * ROOMS_PER_PAGE, currentPage * ROOMS_PER_PAGE);

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {displayedRooms.map(r => (
                                                <div key={r.id} className="flex-between room-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <strong style={{ fontSize: '16px', color: 'var(--accent-color)' }}>{r.hostUsername}'s Room</strong>
                                                            <button
                                                                className="glass-btn"
                                                                style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`${window.location.origin}/room/${r.id}`);
                                                                    alert('Room link copied to clipboard!');
                                                                }}
                                                                title="Share Room Link"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                                                                <span className="share-text">Share</span>
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{r.id}</span>
                                                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-secondary)' }}>{r.mode}</span>
                                                        </div>
                                                    </div>
                                                    <div className="room-card-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            {r.players}/{r.maxPlayers}
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="glass-btn primary"
                                                            style={{ padding: '6px 16px', fontSize: '12px' }}
                                                            onClick={() => joinSpecificRoom(r.id)}
                                                        >
                                                            Join
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {totalPages > 1 && (
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
                                                    <button className="glass-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                                        &laquo; Back
                                                    </button>
                                                    {Array.from({ length: totalPages }).map((_, i) => (
                                                        <button
                                                            key={i}
                                                            className={`glass-btn ${currentPage === i + 1 ? 'primary' : ''}`}
                                                            onClick={() => setCurrentPage(i + 1)}
                                                            style={{ padding: '4px 12px' }}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    ))}
                                                    <button className="glass-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                                        Next &raquo;
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No public rooms available</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Room Panel */}
            {activeTab === 'create' && (
                <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '600px' }}>
                    <h2 style={{ marginBottom: '20px' }}>Create Room</h2>
                    <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className={`glass-btn ${!settings.isPrivate ? 'primary' : ''}`}
                                style={{ flex: 1 }}
                                onClick={() => setSettings({ ...settings, isPrivate: false })}
                            >
                                Public Room
                            </button>
                            <button
                                type="button"
                                className={`glass-btn ${settings.isPrivate ? 'primary' : ''}`}
                                style={{ flex: 1 }}
                                onClick={() => setSettings({ ...settings, isPrivate: true })}
                            >
                                Private Room
                            </button>
                        </div>

                        <div>
                            <label className="flex-between" style={{ marginBottom: '10px' }}>
                                <span>Time Limit (seconds)</span>
                                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{formatTime(settings.timeLimit)}</span>
                            </label>
                            <input
                                type="range"
                                min="30" max="120" step="1"
                                value={settings.timeLimit}
                                onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) })}
                                style={{ width: '100%', accentColor: 'var(--accent-color)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Players Max</label>
                                <input type="number" min="2" max="15" className="glass-input" value={settings.playersMax} onChange={(e) => setSettings({ ...settings, playersMax: e.target.value })} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Rounds Max</label>
                                <input type="number" min="1" max="24" className="glass-input" value={settings.roundsMax} onChange={(e) => setSettings({ ...settings, roundsMax: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label>Mode</label>
                            <select
                                className="glass-input"
                                value={settings.mode}
                                onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                                style={{ padding: '12px', marginTop: '10px' }}
                            >
                                <option value="Normal" style={{ color: '#000' }}>Normal</option>
                                <option value="Annonymous" style={{ color: '#000' }}>Annonymous</option>
                                <option value="Blitz" style={{ color: '#000' }}>Blitz (20s)</option>
                                <option value="Tournament" style={{ color: '#000' }}>Tournament</option>
                            </select>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label>Categories</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                {['Shtet', 'Qytet', 'Kafshë', 'Send', 'Ushqim & Pije', 'Emër', ...standardExtraTags].map(tag => {
                                    const isSelected = settings.categories.includes(tag);
                                    return (
                                        <span
                                            key={tag}
                                            onClick={() => toggleCategory(tag)}
                                            style={{
                                                padding: '8px 12px',
                                                background: isSelected ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {tag} {isSelected ? '×' : '+'}
                                        </span>
                                    )
                                })}
                                {/* Render custom added tags that are not in defaults */}
                                {settings.categories.filter(c => !['Shtet', 'Qytet', 'Kafshë', 'Send', 'Ushqim & Pije', 'Emër', ...standardExtraTags].includes(c)).map(customTag => (
                                    <span
                                        key={customTag}
                                        onClick={() => toggleCategory(customTag)}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'var(--accent-color)',
                                            borderRadius: '20px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {customTag} ×
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Add custom category..."
                                    className="glass-input"
                                    value={customTagInput}
                                    onChange={(e) => setCustomTagInput(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="button" onClick={addCustomCategory} className="glass-btn">Add</button>
                            </div>
                        </div>

                        <button type="submit" className="glass-btn primary" style={{ marginTop: '10px' }}>Create Room</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Lobby;
