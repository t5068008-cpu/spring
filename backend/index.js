require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();
let genAI, model, ttsClient;
let startupError = null;

// --- Initialize Google Services with Error Catching ---
try {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("FATAL: GEMINI_API_KEY environment variable is not set.");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the standard, compatible model name
            model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

    const credentialsString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsString) {
        throw new Error("FATAL: GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.");
    }
    const credentialsJson = JSON.parse(credentialsString);
    ttsClient = new textToSpeech.TextToSpeechClient({
        credentials: {
            client_email: credentialsJson.client_email,
            private_key: credentialsJson.private_key,
        }
    });
} catch (error) {
    console.error("---!!! FATAL STARTUP ERROR !!!---");
    console.error(error);
    startupError = error;
}

app.use(cors({
  origin: [
    "https://zingy-axolotl-efe13e.netlify.app",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors()); 
app.use(express.json());

// --- Routes ---
app.get('/', (req, res) => {
    res.status(200).send('API server is running.');
});

app.post('/api/chat', async (req, res) => {
    if (startupError) {
        return res.status(500).send(`Server failed to start: ${startupError.message}`);
    }

    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send('No text provided.');
        }

        const fullPrompt = `你是散文家朱自清。请只根据你的散文《春》来回答以下问题。保持回答简洁、优美、并符合你的写作风格。问题是：“${text}”`;
        
        const result = await model.generateContent(fullPrompt);
        const aiResponseText = result.response.text();
        const cleanedText = aiResponseText.replace(/\*/g, "");

        const request = {
            input: { text: cleanedText },
            voice: { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-C' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        
        res.json({
            text: cleanedText,
            audio: response.audioContent.toString('base64')
        });

    } catch (error) {
        console.error('Error in /api/chat handler:', error);
        res.status(500).send('An error occurred on the server during the request.');
    }
});

module.exports = app;
