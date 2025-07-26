require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 根路由测试
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Changed model to gemini-pro for general use

// VoiceRSS API Key
const voiceRSSKey = process.env.VOICERSS_API_KEY;

// API Endpoint for chat
app.post('/api/chat', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send('No text provided.');
        }

        // 1. Get text response from Gemini
        // For a more persistent chat, you might want to manage chat history.
        // For simplicity, this example treats each request as a new turn.
        const result = await model.generateContent(text);
        const aiResponseText = result.response.text();

        // 2. Get voice response from VoiceRSS
        // Ensure voiceRSSKey is defined and valid
        if (!voiceRSSKey) {
            console.error('VoiceRSS API Key is not set in .env');
            return res.status(500).send('VoiceRSS API Key is missing.');
        }

        // Using a Chinese voice (Zhen-hua)
        const voiceUrl = `http://api.voicerss.org/?key=${voiceRSSKey}&hl=zh-cn&src=${encodeURIComponent(aiResponseText)}&c=MP3&f=44khz_16bit_stereo&v=Zhen-hua`;

        const audioResponse = await axios.get(voiceUrl, { responseType: 'arraybuffer' });

        // 3. Send audio back to the frontend
        res.set('Content-Type', 'audio/mpeg');
        res.send(audioResponse.data);

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).send('An error occurred on the server.');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
