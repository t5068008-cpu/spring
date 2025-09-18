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
        // --- CORRECTED DIAGNOSTIC STEP: List available models ---
        console.log("Running corrected diagnostic: Listing available models...");
        
        // The correct way to list models is via a temporary model instance
        const modelInfo = await genAI.getGenerativeModel({ model: "gemini-1.0-pro" }).listModels();

        let modelNames = [];
        for await (const m of modelInfo) {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                 modelNames.push(m.name);
            }
        }
        console.log("Available models that support generateContent:", modelNames);
        
        return res.json({
            diagnostic: "Available Models",
            models: modelNames
        });
        // --- END DIAGNOSTIC STEP ---

    } catch (error) {
        console.error('Error in /api/chat handler during diagnostic:', error);
        res.status(500).send('An error occurred during the diagnostic check.');
    }
});

module.exports = app;