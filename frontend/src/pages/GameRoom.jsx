import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useAuth } from '../context/AuthContext';

const ALPHABET = ['A', 'B', 'C', 'Ç', 'D', 'Dh', 'E', 'Ë', 'F', 'G', 'Gj', 'H', 'I', 'J', 'K', 'L', 'Ll', 'M', 'N', 'Nj', 'O', 'P', 'Q', 'R', 'Rr', 'S', 'Sh', 'T', 'Th', 'U', 'V', 'Y', 'Z', 'Zh'];
const CATEGORIES = ['Shtet', 'Qytet', 'Kafshë', 'Send', 'Ushqim & Pije', 'Emër'];

function GameRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    const [room, setRoom] = useState(null);
    const [error, setError] = useState('');

    // Chat state
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState('');

    // Game state
    const [currentLetter, setCurrentLetter] = useState('?');
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSpinning, setIsSpinning] = useState(false);
    const [firstFinisher, setFirstFinisher] = useState(null);
    const [modalConfig, setModalConfig] = useState(null);
    const [activeVote, setActiveVote] = useState(null);
    const [voteTimeLeft, setVoteTimeLeft] = useState(0);
    const spinInterval = useRef(null);

    useEffect(() => {
        // Wait for Auth to finish resolving before establishing game connections
        if (loading) return;

        socket.connect();
        socket.emit('getRoom', roomId, (res) => {
            if (res.success) {
                setRoom(res.room);
                const amIInRoom = res.room.players.find(p => p.id === socket.id);
                if (!amIInRoom) {
                    const joinUsername = user ? user.username : 'Guest';
                    socket.emit('joinRoom', roomId, joinUsername, (joinRes) => {
                        if (joinRes.success) setRoom(joinRes.room);
                        else {
                            setError('Unable to join');
                            setTimeout(() => navigate('/lobby'), 2000);
                        }
                    });
                }
            } else {
                setError('Room not found');
                setTimeout(() => navigate('/lobby'), 2000);
            }
        });

        const handlePlayerJoined = (players) => setRoom(prev => prev ? { ...prev, players } : null);
        const handlePlayerLeft = (players) => setRoom(prev => prev ? { ...prev, players } : null);
        const handleNewMessage = (msg) => setChat(prev => [...prev, msg]);

        const handleRoomDisbanded = () => {
            setModalConfig({
                title: 'Room Disbanded',
                message: 'Host has left the room. Disbanding...',
                confirmText: 'Return to Lobby',
                onConfirm: () => navigate('/lobby')
            });
        };

        const handleGameStarted = ({ state, round, spinner }) => {
            setRoom(prev => prev ? { ...prev, state, currentRound: round, currentSpinner: spinner } : null);
            if (state === 'spinning') {
                setIsSpinning(true);
                spinInterval.current = setInterval(() => {
                    setCurrentLetter(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
                }, 100);
            }
        };

        const handleRoundStarted = ({ letter, timeLimit }) => {
            setIsSpinning(false);
            if (spinInterval.current) clearInterval(spinInterval.current);
            setRoom(prev => prev ? { ...prev, state: 'playing' } : null);
            setCurrentLetter(letter);
            setTimeLeft(timeLimit);
            setAnswers({}); // Clear answers for new round
            setFirstFinisher(null); // Clear finished popup status
        };

        const handleRoundEnded = (endedRoom) => {
            setRoom(endedRoom);
        };

        const handlePlayerFinished = (finisherData) => {
            if (finisherData.id === 'timeout') {
                setFirstFinisher('TIMES_UP');
            } else {
                setFirstFinisher(finisherData.username);
            }

            // Auto close the popup after 1.5 seconds
            setTimeout(() => {
                setFirstFinisher(null);
            }, 1500);
        };

        const handleGameFinished = (endedRoom) => {
            setRoom(endedRoom);
        };

        const handleVoteStarted = (voteInfo) => {
            setActiveVote(voteInfo);
            setVoteTimeLeft(15);
        };

        const handleVoteEnded = () => {
            setActiveVote(null);
            setVoteTimeLeft(0);
        };

        socket.on('playerJoined', handlePlayerJoined);
        socket.on('playerLeft', handlePlayerLeft);
        socket.on('newMessage', handleNewMessage);
        socket.on('roomDisbanded', handleRoomDisbanded);
        socket.on('gameStarted', handleGameStarted);
        socket.on('roundStarted', handleRoundStarted);
        socket.on('roundEnded', handleRoundEnded);
        socket.on('playerFinished', handlePlayerFinished);
        socket.on('gameFinished', handleGameFinished);
        socket.on('voteStarted', handleVoteStarted);
        socket.on('voteEnded', handleVoteEnded);

        // Cleanup listener ensures we don't duplicate on unmount in React 18 strict mode
        return () => {
            socket.off('getRoom');
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('playerLeft', handlePlayerLeft);
            socket.off('newMessage', handleNewMessage);
            socket.off('roomDisbanded', handleRoomDisbanded);
            socket.off('gameStarted', handleGameStarted);
            socket.off('roundStarted', handleRoundStarted);
            socket.off('roundEnded', handleRoundEnded);
            socket.off('playerFinished', handlePlayerFinished);
            socket.off('gameFinished', handleGameFinished);
            socket.off('voteStarted', handleVoteStarted);
            socket.off('voteEnded', handleVoteEnded);
            if (spinInterval.current) clearInterval(spinInterval.current);
        }
    }, [roomId, user, navigate]);

    // Vote Timer Countdown
    useEffect(() => {
        if (activeVote && voteTimeLeft > 0) {
            const timer = setTimeout(() => setVoteTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [voteTimeLeft, activeVote]);

    // Timer Countdown logic
    useEffect(() => {
        if (room && room.state === 'playing' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        } else if (room && room.state === 'playing' && timeLeft === 0) {
            handleCompleteAnswers(true);
        }
    }, [timeLeft, room]);

    const handleStartGame = () => {
        socket.emit('startGame', roomId);
    };

    const handleStopSpinner = () => {
        socket.emit('stopSpinner', roomId);
    };

    const handleCompleteAnswers = (isTimeUp = false) => {
        // Validation check
        const hasEmpty = room.settings.categories.some(cat => !answers[cat] || answers[cat].trim() === '');
        if (!isTimeUp && hasEmpty) {
            setModalConfig({
                title: 'Missing Answers',
                message: 'You must fill in a word for every category before finishing!',
                confirmText: 'Got It',
                onConfirm: () => setModalConfig(null)
            });
            return;
        }
        socket.emit('submitAnswers', roomId, answers, isTimeUp);
        // Dont set "waitingForOthers" because the round immediately terminates!
    };

    if (error) return <div className="flex-center" style={{ minHeight: '60vh' }}><h2>{error}</h2></div>;
    if (!room) return <div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div>;

    const isHost = room.host === socket.id;
    const isMyTurnToSpin = room.currentSpinner === socket.id;

    return (
        <div className="game-room-page">
            {activeVote && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel" style={{ textAlign: 'center' }}>
                        <h2 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>{activeVote.title}</h2>
                        <p style={{ marginBottom: '20px', fontSize: '18px' }}>{activeVote.message}</p>

                        <div style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '20px' }}>
                            {voteTimeLeft}s
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button className="glass-btn primary" onClick={() => {
                                socket.emit('castVote', roomId, true);
                                setActiveVote(prev => ({ ...prev, voted: true }));
                            }} disabled={activeVote.voted}>
                                👍 I Agree
                            </button>
                            <button className="glass-btn" style={{ borderColor: 'var(--text-secondary)' }} onClick={() => {
                                socket.emit('castVote', roomId, false);
                                setActiveVote(prev => ({ ...prev, voted: true }));
                            }} disabled={activeVote.voted}>
                                👎 Disagree
                            </button>
                        </div>
                        {activeVote.voted && <p style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>Waiting for others...</p>}
                    </div>
                </div>
            )}
            <div className="glass-panel flex-between top-info-bar" style={{ padding: '15px 30px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }} className="top-info-left">
                    <button
                        className="glass-btn quit-btn"
                        style={{ padding: '8px 15px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                        onClick={() => {
                            setModalConfig({
                                title: 'Leave Room',
                                message: 'Are you sure you want to quit? If you are the Host, the room will be disbanded.',
                                confirmText: 'Quit Game',
                                cancelText: 'Cancel',
                                onConfirm: () => {
                                    socket.disconnect();
                                    navigate('/lobby');
                                }
                            });
                        }}
                    >
                        <span className="quit-text">Quit Room</span>
                        <span className="quit-icon" style={{ display: 'none' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </span>
                    </button>
                    <h3 style={{ margin: 0 }} className="room-code-text">Room: <span style={{ color: 'var(--accent-color)' }}>{roomId}</span></h3>
                </div>

                <div style={{ fontSize: '24px', fontWeight: 'bold' }} className="top-time-text">
                    {room.state === 'playing' ? `${timeLeft}s` : `${room.settings.timeLimit}s`}
                </div>
                <div className="round-text"><span className="round-label">Round: </span>{room.currentRound || 0}/{room.settings.roundsMax}</div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }} className="game-room">
                <div className="glass-panel flex-center" style={{ flex: 2, minHeight: '500px', width: '100%', flexDirection: 'column', padding: '20px' }}>

                    {/* LOBBY STATE */}
                    {room.state === 'lobby' && (
                        <div style={{ width: '100%' }}>
                            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Waiting Lounge</h2>
                            <div className="waiting-lounge-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px', maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                                {room.players.map((p, i) => (
                                    <div key={i} className="glass-panel flex-between" style={{ padding: '12px 20px' }}>
                                        <span>{p.username} {p.id === room.host && '👑'}</span>
                                        <span>{p.score} pts</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-center">
                                {isHost ? (
                                    <button className="glass-btn primary" onClick={handleStartGame}>Start Game</button>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)' }}>Waiting for Host...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SPINNING STATE */}
                    {room.state === 'spinning' && (
                        <div className="flex-center" style={{ flexDirection: 'column', height: '100%' }}>
                            <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                                {isMyTurnToSpin ? 'It is your turn to stop the letter!' : `Waiting for spinner to stop...`}
                            </h3>
                            <div
                                className="glass-panel flex-center"
                                style={{ width: '150px', height: '150px', fontSize: '80px', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '30px', boxShadow: isSpinning ? '0 0 30px var(--accent-color)' : '' }}
                            >
                                {currentLetter}
                            </div>
                            {isMyTurnToSpin && (
                                <button className="glass-btn primary" onClick={handleStopSpinner}>Stop</button>
                            )}
                        </div>
                    )}

                    {/* PLAYING STATE */}
                    {room.state === 'playing' && (
                        <div style={{ width: '100%' }}>
                            <div className="flex-center" style={{ marginBottom: '20px' }}>
                                <div className="glass-panel flex-center" style={{ width: '80px', height: '80px', fontSize: '40px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                    {currentLetter}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr)', gap: '20px' }} className="responsive-grid">
                                {room.settings.categories.map(cat => (
                                    <div key={cat}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>{cat}</label>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            value={answers[cat] || ''}
                                            onChange={(e) => {
                                                const newAnswers = { ...answers, [cat]: e.target.value };
                                                setAnswers(newAnswers);
                                                socket.emit('syncPartialAnswers', roomId, newAnswers);
                                            }}
                                            placeholder={`Type a ${cat}...`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex-center" style={{ marginTop: '30px' }}>
                                <button className="glass-btn primary" onClick={() => handleCompleteAnswers(false)}>Done!</button>
                            </div>
                        </div>
                    )}

                    {/* WAITING FOR OTHERS STATE */}
                    {room.state === 'waitingForOthers' && (
                        <div className="flex-center" style={{ flexDirection: 'column' }}>
                            <h2 style={{ marginBottom: '20px' }}>Answers submitted!</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Waiting for other players to finish...</p>
                        </div>
                    )}

                    {/* REVIEWING STATE */}
                    {room.state === 'reviewing' && (
                        <div style={{ width: '100%' }}>
                            {firstFinisher && (
                                <div className="first-finish-popup">
                                    <div className="first-finish-content">
                                        <div className="first-finish-title">{firstFinisher === 'TIMES_UP' ? "Time's Up!" : "Round Ends!"}</div>
                                        {firstFinisher !== 'TIMES_UP' && (
                                            <>
                                                <div className="first-finish-name">{firstFinisher}</div>
                                                <div style={{ color: 'var(--text-secondary)', marginTop: '15px' }}>finished first!</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '10px', marginBottom: '30px' }}>
                                <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Current Room Leaderboard</h3>
                                <div className="glass-panel" style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
                                    {[...room.players].sort((a, b) => b.score - a.score).map((p, i) => (
                                        <div key={p.id} style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '10px 15px',
                                            borderBottom: i < room.players.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            background: i === 0 ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                            borderRadius: '8px',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: i === 0 ? '#4ade80' : 'var(--text-secondary)', fontSize: '18px' }}>
                                                    #{i + 1}
                                                </span>
                                                <span style={{ fontWeight: i === 0 ? 'bold' : 'normal', fontSize: '16px' }}>
                                                    {p.username}
                                                </span>
                                            </div>
                                            <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '16px' }}>
                                                {p.score} pts
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Round {room.currentRound} Results</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                {room.settings.categories.map(cat => (
                                    <div key={cat} className="glass-panel" style={{ padding: '15px' }}>
                                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px', color: 'var(--accent-color)', textAlign: 'center' }}>
                                            {cat}
                                        </h3>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '12px' }}>Player</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '12px' }}>Answer</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'right' }}>Pts</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {room.players.map(p => {
                                                    const word = room.answers[p.id]?.[cat] || '-';
                                                    const points = room.answers[p.id]?.points?.[cat] || 0;
                                                    return (
                                                        <tr key={p.id}>
                                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '14px' }}>
                                                                {p.username}
                                                            </td>
                                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
                                                                {word}
                                                            </td>
                                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                                                                <div className="flex-center" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                                                    <span style={{ color: points === 10 ? '#4ade80' : points === 5 ? '#facc15' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 'bold' }}>
                                                                        +{points}
                                                                    </span>
                                                                    {word !== '-' && word !== '' && p.id !== socket.id && points > 0 && !room.answers[p.id]?.disputed?.[cat] && (
                                                                        <button
                                                                            className="dispute-btn"
                                                                            title="Dispute (Copied or Wrong)"
                                                                            onClick={() => {
                                                                                setModalConfig({
                                                                                    title: 'Dispute Word',
                                                                                    message: `Why are you disputing "${word}" in ${cat}?`,
                                                                                    options: [
                                                                                        { label: 'Word does not exist / invalid', value: 'wrong' },
                                                                                        { label: 'Someone else copied it', value: 'copied' }
                                                                                    ],
                                                                                    cancelText: 'Cancel',
                                                                                    onConfirm: (val) => {
                                                                                        if (val === 'wrong') {
                                                                                            socket.emit('disputeWord', roomId, p.id, cat, 'wrong');
                                                                                            setModalConfig(null);
                                                                                        } else if (val === 'copied') {
                                                                                            const otherPlayers = room.players.filter(other =>
                                                                                                other.id !== p.id &&
                                                                                                room.answers[other.id]?.[cat] &&
                                                                                                room.answers[other.id][cat].trim() !== '' &&
                                                                                                !room.answers[other.id]?.disputed?.[cat]
                                                                                            );

                                                                                            if (otherPlayers.length === 0) {
                                                                                                setModalConfig({
                                                                                                    title: 'No Matches',
                                                                                                    message: 'There are no other valid answers in this category to link as a copy!',
                                                                                                    confirmText: 'Back',
                                                                                                    onConfirm: () => setModalConfig(null)
                                                                                                });
                                                                                                return;
                                                                                            }

                                                                                            setModalConfig({
                                                                                                title: 'Select Matching Word',
                                                                                                message: 'Which answer did they copy from?',
                                                                                                options: otherPlayers.map(o => ({
                                                                                                    label: `${o.username}: "${room.answers[o.id][cat]}"`,
                                                                                                    value: o.id
                                                                                                })),
                                                                                                cancelText: 'Cancel',
                                                                                                onConfirm: (selectedId) => {
                                                                                                    if (selectedId) socket.emit('disputeCopied', roomId, p.id, selectedId, cat);
                                                                                                    setModalConfig(null);
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                });
                                                                            }}
                                                                        >
                                                                            !
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '20px' }} className="flex-center">
                                {isHost ? (
                                    room.currentRound >= room.settings.roundsMax ? (
                                        <button className="glass-btn primary" onClick={() => socket.emit('endGame', roomId)}>End Game</button>
                                    ) : (
                                        <button className="glass-btn primary" onClick={handleStartGame}>Next Round</button>
                                    )
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        {room.currentRound >= room.settings.roundsMax ? 'Waiting for Host to end the game...' : 'Waiting for Host to start Next Round...'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FINISHED / FINAL LEADERBOARD STATE */}
                    {room.state === 'finished' && (
                        <div style={{ width: '100%', textAlign: 'center' }}>
                            <h2 style={{ marginBottom: '10px', fontSize: '36px', color: 'var(--accent-color)' }}>Game Over!</h2>
                            <h3 style={{ marginBottom: '30px', color: 'var(--text-secondary)' }}>Final Standings</h3>

                            <div className="glass-panel" style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', marginBottom: '30px' }}>
                                {[...room.players].sort((a, b) => b.score - a.score).map((p, i) => (
                                    <div key={p.id} style={{
                                        display: 'flex', justifyContent: 'space-between', padding: '15px',
                                        borderBottom: i < room.players.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                        background: i === 0 ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                        borderRadius: '8px',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: i === 0 ? 'bold' : 'normal', fontSize: i === 0 ? '24px' : '18px', color: i === 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                            </span>
                                            <span style={{ fontWeight: i === 0 ? 'bold' : 'normal', fontSize: '18px' }}>
                                                {p.username}
                                            </span>
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent-color)', fontSize: '20px' }}>
                                            {p.score} pts
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button className="glass-btn primary" onClick={() => navigate('/lobby')} style={{ padding: '15px 40px', fontSize: '18px' }}>
                                Return to Lobby
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat / Sidebar */}
                {/* Mobile Chat Toggle Button */}
                <button
                    className="glass-btn primary"
                    style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 99, borderRadius: '50%', width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 15px rgba(230, 57, 70, 0.4)' }}
                    onClick={() => {
                        const chatPanel = document.getElementById('chat-panel');
                        if (chatPanel.style.display === 'none' || chatPanel.style.display === '') {
                            chatPanel.style.display = 'flex';
                        } else {
                            chatPanel.style.display = 'none';
                        }
                    }}
                    id="mobile-chat-btn"
                >
                    💬
                </button>

                <div id="chat-panel" className="glass-panel chat-container" style={{ flex: 1, height: '600px', width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Live Chat</h3>
                        <button
                            className="close-chat-btn"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', display: 'none' }}
                            onClick={() => document.getElementById('chat-panel').style.display = 'none'}
                        >
                            ×
                        </button>
                    </div>
                    <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Welcome to the room!</div>
                        {chat.map((msg, idx) => (
                            <div key={idx} style={{
                                padding: '8px 12px',
                                background: msg.username === 'System' ? 'rgba(230, 57, 70, 0.1)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                borderLeft: msg.username === 'System' ? '3px solid var(--accent-color)' : 'none'
                            }}>
                                <span style={{ fontWeight: 'bold', color: msg.username === 'System' ? 'var(--accent-color)' : 'var(--text-primary)', marginRight: '8px' }}>{msg.username}:</span>
                                <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '15px', borderTop: '1px solid var(--glass-border)' }}>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (chatInput.trim()) {
                                socket.emit('sendMessage', roomId, chatInput, user ? user.username : 'Guest');
                                setChatInput('');
                            }
                        }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="glass-input"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                            />
                        </form>
                    </div>
                </div>

            </div>

            {/* Global Modal Overlay */}
            {modalConfig && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="modal-title">{modalConfig.title}</h2>
                        <p className="modal-text">{modalConfig.message}</p>

                        {/* Options Menu for Disputes */}
                        {modalConfig.options && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {modalConfig.options.map(opt => (
                                    <button
                                        key={opt.value}
                                        className="glass-btn"
                                        style={{ border: '1px solid var(--accent-color)' }}
                                        onClick={() => modalConfig.onConfirm(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="modal-buttons">
                            {modalConfig.cancelText && (
                                <button className="glass-btn" onClick={() => {
                                    if (modalConfig.onCancel) modalConfig.onCancel();
                                    else setModalConfig(null);
                                }}>
                                    {modalConfig.cancelText}
                                </button>
                            )}
                            {!modalConfig.options && modalConfig.confirmText && (
                                <button className="glass-btn primary" onClick={() => modalConfig.onConfirm()}>
                                    {modalConfig.confirmText}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GameRoom;
