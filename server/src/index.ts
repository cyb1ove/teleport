import express from 'express';
import https from 'https';
import fs from 'fs';
import path, { resolve } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

dotenv.config();
const {
  API_ID,
  API_HASH,
  PORT = 3000,
} = process.env;

const app = express();

// Get the current file path and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SSL options
const sslOptions = {
  key: fs.readFileSync(path.resolve(__dirname, 'private.key')),
  cert: fs.readFileSync(path.resolve(__dirname, 'certificate.crt'))
};

// Serve static files from the frontend directory
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.resolve(__dirname, '../../client')));

const SESSION = new StringSession('');
const client = new TelegramClient(
  SESSION,
  Number(API_ID),
  String(API_HASH),
  { connectionRetries: 5 }
);

function userAuthParamCallback <T> (param: T): () => Promise<T> {
  return async function () {
    return await new Promise<T>(resolve => {
      resolve(param)
    })
  }
}

app.post('/auth', async (req, res) => {
  console.log(req.body)
  const { phoneNumber, phoneCode } = req.body;

  if (!phoneCode) {
    await client.connect();
    await client.sendCode({ apiId: Number(API_ID), apiHash: String(API_HASH) }, phoneNumber);
  } else {
    await client.start({ phoneNumber, phoneCode: userAuthParamCallback(phoneCode), onError: console.error });
    await client.sendMessage('me', { message: 'Logged in' });
  }

  res.json({ message: 'User authenticated!' });
})

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});
