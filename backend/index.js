require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs'); // Not strictly needed for this version, but often useful
const util = require('util'); // Not strictly needed for this version, but often useful

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 根路由测试
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using gemini-1.5-flash for compatibility

// Initialize Google Cloud Text-to-Speech client
const ttsClient = new textToSpeech.TextToSpeechClient({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
});

// API Endpoint for chat
app.post('/api/chat', async (req, res) => {
    const userText = req.body.text;
    if (!userText) {
        return res.status(400).send('Missing text in request body');
    }

    try {
        // Step 1: Get AI response from Gemini
        const result = await model.generateContent(userText);
        const response = await result.response;
        const aiResponseText = response.text();

        // Step 2: Convert AI response text to speech
        const request = {
            input: { text: aiResponseText },
            voice: { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-C', ssmlGender: 'MALE' }, // Chinese male voice
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [audioResponse] = await ttsClient.synthesizeSpeech(request);

        // Step 3: Send both text and audio data back to the frontend
        const audioBase64 = audioResponse.audioContent.toString('base64');
        res.json({ 
            text: aiResponseText, 
            audio: audioBase64 
        });

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).send('Error processing request');
    }
});

app.listen(PORT, () => {
    console.log(`Server on ${PORT}`);
});
