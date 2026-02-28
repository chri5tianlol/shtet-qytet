const db = require('../db/setup');
const rooms = new Map();

// Albanian Alphabet without W and X
const ALPHABET = ['A', 'B', 'C', 'Ç', 'D', 'Dh', 'E', 'Ë', 'F', 'G', 'Gj', 'H', 'I', 'J', 'K', 'L', 'Ll', 'M', 'N', 'Nj', 'O', 'P', 'Q', 'R', 'Rr', 'S', 'Sh', 'T', 'Th', 'U', 'V', 'Y', 'Z', 'Zh'];

function finishGame(room, roomCode, io) {
    room.state = 'finished';

    // Compute winner & execute permanent database persistence if accounts exist
    const uniqueScores = [...new Set(room.players.map(p => p.score))].sort((a, b) => b - a);
    const top3Scores = uniqueScores.slice(0, 3);
    const winners = room.players.filter(p => p.score > 0 && top3Scores.includes(p.score));

    room.players.forEach(p => {
        if (p.userId) {
            const isWinner = winners.some(w => w.id === p.id);
            db.run(
                `UPDATE users SET 
                 games_played = games_played + 1, 
                 total_score = total_score + ?, 
                 games_won = games_won + ? 
                 WHERE id = ?`,
                [p.score, isWinner ? 1 : 0, p.userId],
                (err) => {
                    if (err) console.error("Score SQLite Sync Failure:", err.message);
                }
            );
        }
    });

    io.to(roomCode).emit('gameFinished', room);
}

module.exports = (io) => {
    function broadcastPublicRooms() {
        const publicRooms = [];
        rooms.forEach((room, id) => {
            if (!room.settings.isPrivate && room.state === 'lobby') {
                publicRooms.push({
                    id: id,
                    hostUsername: room.players.find(p => p.id === room.host)?.username || 'Host',
                    players: room.players.length,
                    maxPlayers: room.settings.playersMax,
                    mode: room.settings.mode
                });
            }
        });
        io.emit('publicRoomsUpdated', publicRooms);
    }

    io.on('connection', (socket) => {

        // ... Lobby logic ...
        socket.on('createRoom', (settings, userId, callback) => {
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newRoom = {
                id: roomCode,
                host: socket.id,
                settings,
                players: [{ id: socket.id, userId: userId || null, username: settings.hostUsername || 'Guest', score: 0 }],
                state: 'lobby',
                usedLetters: [],
                currentRound: 0,
                currentLetter: null,
                answers: {}, // map of playerId -> answers
                finishedPlayers: 0
            };
            rooms.set(roomCode, newRoom);
            socket.join(roomCode);
            callback({ success: true, roomCode });
            broadcastPublicRooms();
        });

        socket.on('joinRoom', (roomCode, username, userId, callback) => {
            roomCode = roomCode.toUpperCase();
            const room = rooms.get(roomCode);
            if (!room) return callback({ success: false, message: 'Room not found' });
            if (room.players.length >= room.settings.playersMax) return callback({ success: false, message: 'Room is full' });
            if (room.state !== 'lobby') return callback({ success: false, message: 'Game already in progress' });

            const player = { id: socket.id, userId: userId || null, username: username || 'Guest', score: 0 };
            room.players.push(player);
            socket.join(roomCode);
            io.to(roomCode).emit('playerJoined', room.players);
            callback({ success: true, room });
            broadcastPublicRooms();
        });

        socket.on('getRoom', (roomCode, callback) => {
            const room = rooms.get(roomCode.toUpperCase());
            callback(room ? { success: true, room } : { success: false, message: 'Not found' });
        });

        socket.on('getPublicRooms', () => {
            broadcastPublicRooms();
        });

        // ... Game Logic ...
        socket.on('startGame', (roomCode) => {
            const room = rooms.get(roomCode);
            if (room && room.host === socket.id) {
                room.state = 'spinning';
                room.currentRound += 1;
                room.answers = {};
                room.finishedPlayers = 0;

                // Find next player to spin (round-robin)
                const spinnerIndex = (room.currentRound - 1) % room.players.length;
                room.currentSpinner = room.players[spinnerIndex].id;

                io.to(roomCode).emit('gameStarted', { state: room.state, round: room.currentRound, spinner: room.currentSpinner });
                broadcastPublicRooms();
            }
        });

        socket.on('stopSpinner', (roomCode) => {
            const room = rooms.get(roomCode);
            if (room && room.currentSpinner === socket.id && room.state === 'spinning') {
                // Pick a random letter that hasn't been used yet
                const availableLetters = ALPHABET.filter(l => !room.usedLetters.includes(l));
                if (availableLetters.length === 0) {
                    finishGame(room, roomCode, io);
                    return;
                }

                const randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
                room.currentLetter = randomLetter;
                room.usedLetters.push(randomLetter);
                room.state = 'playing';
                room.turnStartTime = Date.now();

                io.to(roomCode).emit('roundStarted', { letter: randomLetter, timeLimit: room.settings.timeLimit });
            }
        });

        socket.on('endGame', (roomCode) => {
            const room = rooms.get(roomCode);
            if (room && room.host === socket.id) {
                finishGame(room, roomCode, io);
            }
        });

        socket.on('submitAnswers', (roomCode, answers, isTimeUp = false) => {
            const room = rooms.get(roomCode);
            if (room && room.state === 'playing') {
                room.answers[socket.id] = answers;
                room.finishedPlayers += 1;

                if (!isTimeUp) {
                    // Broadcast that someone manually finished first
                    const finisher = room.players.find(p => p.id === socket.id);
                    io.to(roomCode).emit('playerFinished', {
                        id: socket.id,
                        username: finisher ? finisher.username : 'Guest'
                    });
                } else {
                    // Tell the room the timer naturally ended so we can show "Time'sUp"
                    io.to(roomCode).emit('playerFinished', {
                        id: 'timeout',
                        username: 'timeout'
                    });
                }

                // Round ends immediately
                endRound(room, roomCode, io);
            }
        });

        socket.on('syncPartialAnswers', (roomCode, partialAnswers) => {
            const room = rooms.get(roomCode);
            if (room && room.state === 'playing') {
                room.answers[socket.id] = partialAnswers;
            }
        });

        socket.on('timeUp', (roomCode) => {
            const room = rooms.get(roomCode);
            if (room && room.state === 'playing') {
                // Auto-submit empty for those who didn't submit
                endRound(room, roomCode, io);
            }
        });

        // Dispute Logic (Voting)
        socket.on('disputeWord', (roomCode, targetPlayerId, category, type) => {
            const room = rooms.get(roomCode);
            if (room && room.state === 'reviewing' && !room.activeVote) {
                const targetPlayer = room.players.find(p => p.id === targetPlayerId);
                if (targetPlayer && room.answers[targetPlayerId] && room.answers[targetPlayerId].points[category] > 0) {
                    const word = room.answers[targetPlayerId][category];

                    room.activeVote = {
                        type: 'wrong',
                        targetPlayerId,
                        category,
                        word,
                        initiator: socket.id,
                        votes: { [socket.id]: true }, // initiator automatically votes yes
                        endTime: Date.now() + 15000
                    };

                    io.to(roomCode).emit('voteStarted', {
                        title: 'Dispute: Invalid Word',
                        message: `Do you agree that "${word}" by ${targetPlayer.username} in ${category} is invalid?`,
                        endTime: room.activeVote.endTime
                    });

                    startVoteTimer(room, roomCode, io);
                }
            }
        });

        socket.on('disputeCopied', (roomCode, p1Id, p2Id, category) => {
            const room = rooms.get(roomCode);
            if (room && room.state === 'reviewing' && !room.activeVote) {
                const p1 = room.players.find(p => p.id === p1Id);
                const p2 = room.players.find(p => p.id === p2Id);

                if (p1 && p2 && room.answers[p1Id] && room.answers[p2Id]) {
                    room.activeVote = {
                        type: 'copied',
                        p1Id,
                        p2Id,
                        category,
                        word1: room.answers[p1Id][category],
                        word2: room.answers[p2Id][category],
                        initiator: socket.id,
                        votes: { [socket.id]: true }, // initiator automatically votes yes
                        endTime: Date.now() + 15000
                    };

                    io.to(roomCode).emit('voteStarted', {
                        title: 'Dispute: Copied Word',
                        message: `Do you agree that ${p1.username} ("${room.activeVote.word1}") and ${p2.username} ("${room.activeVote.word2}") copied each other in ${category}?`,
                        endTime: room.activeVote.endTime
                    });

                    startVoteTimer(room, roomCode, io);
                }
            }
        });

        socket.on('castVote', (roomCode, voteBool) => {
            const room = rooms.get(roomCode);
            if (room && room.activeVote) {
                room.activeVote.votes[socket.id] = voteBool;

                // Check if ALL participants have now voted
                const totalVotesCast = Object.keys(room.activeVote.votes).length;
                if (totalVotesCast === room.players.length) {
                    // Everyone has voted! Cancel timeout and resolve immediately
                    clearTimeout(room.activeVote.timeoutId);
                    resolveVote(room, roomCode, io);
                }
            }
        });

        // ... Chat Logic ...
        socket.on('sendMessage', (roomCode, text, username) => {
            io.to(roomCode).emit('newMessage', { username, text, time: Date.now() });
        });

        socket.on('disconnect', () => {
            rooms.forEach((room, roomCode) => {
                const index = room.players.findIndex(p => p.id === socket.id);
                if (index !== -1) {
                    const leavingPlayer = room.players[index];

                    // Save leaving player's progress if game started but wasn't officially finished
                    if (room.currentRound > 0 && room.state !== 'finished' && leavingPlayer.userId) {
                        db.run(
                            `UPDATE users SET games_played = games_played + 1, total_score = total_score + ? WHERE id = ?`,
                            [leavingPlayer.score, leavingPlayer.userId],
                            (err) => { if (err) console.error("Early Quit Save Error:", err.message); }
                        );
                    }

                    if (room.host === socket.id || room.players.length === 1) {
                        // If host leaves mid-game, save EVERY remaining player's progress before disbanding
                        if (room.currentRound > 0 && room.state !== 'finished') {
                            room.players.forEach(p => {
                                if (p.id !== socket.id && p.userId) { // don't double-save host
                                    db.run(
                                        `UPDATE users SET games_played = games_played + 1, total_score = total_score + ? WHERE id = ?`,
                                        [p.score, p.userId]
                                    );
                                }
                            });
                        }
                        io.to(roomCode).emit('roomDisbanded');
                        rooms.delete(roomCode);
                    } else {
                        // Standard player leaves
                        room.players.splice(index, 1);
                        io.to(roomCode).emit('playerLeft', room.players);
                    }
                    if (room.state === 'lobby') broadcastPublicRooms();
                }
            });
        });
    });
};

function startVoteTimer(room, roomCode, io) {
    room.activeVote.timeoutId = setTimeout(() => {
        resolveVote(room, roomCode, io);
    }, 15000);
}

function resolveVote(room, roomCode, io) {
    if (!room.activeVote) return;

    const voteState = room.activeVote;
    room.activeVote = null; // Clear so a new vote can happen

    let yesCount = 0;
    let noCount = 0;
    Object.values(voteState.votes).forEach(v => {
        if (v) yesCount++;
        else noCount++;
    });

    const totalPlayers = room.players.length;
    // Strict >50% requirement
    const passed = yesCount > (totalPlayers / 2);

    if (voteState.type === 'wrong') {
        const tpId = voteState.targetPlayerId;
        const cat = voteState.category;
        room.answers[tpId].disputed[cat] = true; // Always lock out future disputes for this item

        if (passed) {
            const lostPoints = room.answers[tpId].points[cat];
            const p = room.players.find(pl => pl.id === tpId);
            if (p) {
                p.score -= lostPoints;
                room.answers[tpId].points[cat] = 0;
            }
            io.to(roomCode).emit('newMessage', { username: 'System', text: `Vote PASSED (${yesCount} Yes, ${noCount} No). "${voteState.word}" was marked invalid.` });
        } else {
            io.to(roomCode).emit('newMessage', { username: 'System', text: `Vote FAILED (${yesCount} Yes, ${noCount} No). "${voteState.word}" remains valid.` });
        }
    }
    else if (voteState.type === 'copied') {
        const { p1Id, p2Id, category } = voteState;
        room.answers[p1Id].disputed[category] = true;
        room.answers[p2Id].disputed[category] = true;

        if (passed) {
            const p1 = room.players.find(pl => pl.id === p1Id);
            const p2 = room.players.find(pl => pl.id === p2Id);

            if (p1 && room.answers[p1Id].points[category] === 10) {
                p1.score -= 5;
                room.answers[p1Id].points[category] = 5;
            }
            if (p2 && room.answers[p2Id].points[category] === 10) {
                p2.score -= 5;
                room.answers[p2Id].points[category] = 5;
            }
            io.to(roomCode).emit('newMessage', { username: 'System', text: `Vote PASSED (${yesCount} Yes, ${noCount} No). Copied words penalized.` });
        } else {
            io.to(roomCode).emit('newMessage', { username: 'System', text: `Vote FAILED (${yesCount} Yes, ${noCount} No). Copied dispute rejected.` });
        }
    }

    io.to(roomCode).emit('voteEnded');
    io.to(roomCode).emit('roundEnded', room); // Re-sync
}

function endRound(room, roomCode, io) {
    if (room.state !== 'playing') return; // Prevent double trigger
    room.state = 'reviewing';
    // Base Calculation logic
    calculatePoints(room);
    io.to(roomCode).emit('roundEnded', room);
}

function calculatePoints(room) {
    // 10 for unique, 5 for duplicate, 0 for empty.
    const categories = room.settings.categories || ['Shtet', 'Qytet', 'Kafshë', 'Send', 'Ushqim & Pije', 'Emër'];

    // Fill empty answers
    room.players.forEach(p => {
        if (!room.answers[p.id]) room.answers[p.id] = {};
        // Store points for UI to show breakdown
        room.answers[p.id].points = {};
        // Store resolved disputes to remove ! button
        room.answers[p.id].disputed = {};
    });

    categories.forEach(cat => {
        const wordCounts = {};

        // Count frequencies case-insensitive
        room.players.forEach(p => {
            let word = (room.answers[p.id][cat] || '').trim().toLowerCase();
            if (word.length > 1 && word.startsWith(room.currentLetter.toLowerCase())) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });

        // Assign points
        room.players.forEach(p => {
            let word = (room.answers[p.id][cat] || '').trim().toLowerCase();
            if (word.length < 2 || !word.startsWith(room.currentLetter.toLowerCase())) {
                room.answers[p.id].points[cat] = 0;
                room.answers[p.id][cat] = '-'; // Visually nullify on frontend
            } else {
                if (wordCounts[word] === 1) {
                    room.answers[p.id].points[cat] = 10;
                } else {
                    room.answers[p.id].points[cat] = 5;
                }
            }
            // Update total score
            p.score += room.answers[p.id].points[cat];
        });
    });
}
