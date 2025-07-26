require('dotenv').config();
const express = require('express');
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 根路由测试
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

// 聊天接口
app.post('/api/chat', (req, res) => {
  const { text } = req.body;
  // 这里先用固定文本 + 静音 Wav 做占位，后面再接 AI
  const fakeWav = Buffer.alloc(44 + 8000); // 空白 1 秒 wav
  res.set('Content-Type', 'audio/wav');
  res.send(fakeWav);
});

app.listen(PORT, () => console.log(`Server on ${PORT}`));
