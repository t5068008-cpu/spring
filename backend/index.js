require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();

app.use(cors({
  origin: [
    "https://zingy-axolotl-efe13e.netlify.app", // 你的前端域名
    "http://localhost:3000"                      // 本地调试时也允许
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ 确保 OPTIONS 请求能正确返回
app.options("*", cors()); 
app.use(express.json());

// --- Initialize Google Services ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const credentialsJson = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const ttsClient = new textToSpeech.TextToSpeechClient({
    credentials: {
        client_email: credentialsJson.client_email,
        private_key: credentialsJson.private_key,
    }
});

// --- Routes ---

// 1. Main entrance (the "reception desk")
// This handles the 404 error when you open the URL directly.
app.get('/', (req, res) => {
    res.status(200).send('API server is running and ready to receive requests.');
});

// 2. The actual API endpoint (the "secret back door")
app.post('/api/chat', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send('No text provided.');
        }

        const result = await model.generateContent(text);
        const aiResponseText = result.response.text();

        const request = {
            input: { text: aiResponseText },
            voice: { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-C' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        
        res.set('Content-Type', 'audio/mpeg');
        res.send(response.audioContent);

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).send('An error occurred on the server.');
    }
});

module.exports = app;
