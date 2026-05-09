const express = require('express');
const path    = require('path');

const app  = express();
const PORT = 3000;

// public 폴더 안의 파일을 웹에서 접근 가능하게 함
app.use(express.static(path.join(__dirname, 'public')));

// 누군가 localhost:3000 에 접속하면 index.html 을 보여줌
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log('');
  console.log('🎲 ====================================');
  console.log(`🎲  서버 실행 중!`);
  console.log(`🎲  브라우저에서 → http://localhost:${PORT}`);
  console.log('🎲 ====================================');
  console.log('');
});