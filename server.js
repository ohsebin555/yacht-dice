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

// 방 목록
const rooms = {};

io.on('connection', (socket) => {
  console.log('접속:', socket.id);

  // 방 만들기
  socket.on('createRoom', (playerName) => {
    const roomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName }],
      gameState: null,
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerIndex = 0;
    socket.emit('roomCreated', roomCode);
    console.log(`방 생성: ${roomCode} by ${playerName}`);
  });

  // 방 입장
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
    console.log(`방 입장: ${roomCode} by ${playerName}`);
  });

  // 능력 선택 후 게임 시작
socket.on('readyToStart', ({ ability }) => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx !== -1) room.players[idx].ability = ability;

    // 상대방에게 준비 완료 알림
    socket.to(socket.roomCode).emit('opponentReady');

    const readyCount = room.players.filter(p => p.ability).length;
    if (readyCount === 2) {
      io.to(socket.roomCode).emit('gameStart', {
        players: room.players.map(p => ({ name: p.name, ability: p.ability })),
        firstTurn: 0,
      });
    }
  });

// 주사위 굴리기 결과 공유
  socket.on('rollResult', (data) => {
    socket.to(socket.roomCode).emit('opponentRoll', data);
  });

  // 킵 상태 공유
  socket.on('keepChange', (data) => {
    socket.to(socket.roomCode).emit('opponentKeep', data);
  });

  // 점수 선택
  socket.on('scoreSelect', (data) => {
    io.to(socket.roomCode).emit('scoreUpdate', data);
  });

  // 턴 종료
  socket.on('turnEnd', (data) => {
    io.to(socket.roomCode).emit('nextTurn', data);
  });
  
// 주사위 실시간 위치 동기화
  socket.on('diceState', (data) => {
    socket.to(socket.roomCode).emit('opponentDiceState', data);
  });

  // 능력 사용
  socket.on('abilityUsed', (data) => {
    socket.to(socket.roomCode).emit('opponentAbility', data);
  });

  // 연결 끊김
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