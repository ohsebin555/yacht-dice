const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('접속:', socket.id);

  socket.on('createRoom', (playerName) => {
    const roomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName }],
      round: 1,
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerIndex = 0;
    socket.emit('roomCreated', roomCode);
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) { socket.emit('joinError', '방을 찾을 수 없어요'); return; }
    if (room.players.length >= 2) { socket.emit('joinError', '방이 꽉 찼어요'); return; }
    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerIndex = 1;
    io.to(roomCode).emit('playerJoined', {
      players: room.players.map(p => p.name),
    });
  });

  socket.on('readyToStart', ({ ability }) => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx !== -1) room.players[idx].ability = ability;
    socket.to(socket.roomCode).emit('opponentReady');
    const readyCount = room.players.filter(p => p.ability).length;
    if (readyCount === 2) {
      io.to(socket.roomCode).emit('gameStart', {
        players: room.players.map(p => ({ name: p.name, ability: p.ability })),
        firstTurn: 0,
      });
    }
  });

  // 킵 상태 공유
  socket.on('keepChange', (data) => {
    socket.to(socket.roomCode).emit('opponentKeep', data);
  });

  // 점수 선택
  socket.on('scoreSelect', (data) => {
    socket.to(socket.roomCode).emit('opponentScore', data);
  });

  // 턴 종료 - 라운드 계산
  socket.on('turnEnd', ({ playerIndex, round }) => {
    const room = rooms[socket.roomCode];
    if (!room) return;

    // 플레이어 1(index 1)이 턴을 마쳐야 라운드 증가
    const nextTurn = playerIndex === 0 ? 1 : 0;
    const nextRound = playerIndex === 1 ? round + 1 : round;

    io.to(socket.roomCode).emit('nextTurn', {
      turn: nextTurn,
      round: nextRound,
    });
  });

  // 능력 사용
  socket.on('abilityUsed', (data) => {
    socket.to(socket.roomCode).emit('opponentAbility', data);
  });

  // 주사위 실시간 위치 동기화
  socket.on('diceState', (data) => {
    socket.to(socket.roomCode).emit('opponentDiceState', data);
  });

  socket.on('disconnect', () => {
    if (socket.roomCode && rooms[socket.roomCode]) {
      socket.to(socket.roomCode).emit('opponentLeft');
      delete rooms[socket.roomCode];
    }
    console.log('연결 끊김:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Rolling Dice 서버 실행중: http://localhost:${PORT}`);
});