require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();

app.use(cors()); 
app.use(express.json());

// --- Initialize Google Services ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const credentialsJson = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
const ttsClient = new textToSpeech.TextToSpeechClient({
    credentials: {
        client_email: credentialsJson.client_email,
        private_key: credentialsJson.private_key,
    }
});

// --- Routes ---
app.get('/', (req, res) => {
    res.status(200).send('API server is running and ready to receive requests.');
});

app.post('/api/chat', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send('No text provided.');
        }

        // Prepend a system prompt to guide the model's response
        const promptedText = `请你以朱自清的身份，并根据他的散文《春》来回答我的问题。请确保回答简洁。我的问题是：“${text}”`;

        const result = await model.generateContent(promptedText);
        const aiResponseText = result.response.text();

        const request = {
            input: { text: aiResponseText },
            voice: { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-C' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        
        // Send both text and audio back in a JSON object
        res.json({
            text: aiResponseText,
            audio: response.audioContent.toString('base64')
        });

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).send('An error occurred on the server.');
    }
});

module.exports = app;
