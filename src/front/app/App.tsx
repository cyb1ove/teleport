import { LoginPage } from 'pages/LoginPage';
import { MainPage } from 'pages/MainPage';
import { useState } from 'react';
import { AuthData } from 'shared/api/auth/types';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';

const API_ID = import.meta.env.VITE_API_ID;
const API_HASH = import.meta.env.VITE_API_HASH;

// Debug the environment variables thoroughly
console.log('Raw environment variables:', { 
  API_ID, 
  API_HASH, 
  type_API_ID: typeof API_ID,
  type_API_HASH: typeof API_HASH,
  API_ID_length: API_ID?.length,
  API_HASH_length: API_HASH?.length
});

// Convert and validate API_ID
let numericApiId: number;
try {
  numericApiId = Number(API_ID);
  console.log('API_ID conversion:', { 
    original: API_ID, 
    converted: numericApiId, 
    isNaN: isNaN(numericApiId),
    isFinite: isFinite(numericApiId)
  });
} catch (error) {
  console.error('Error converting API_ID to number:', error);
  numericApiId = NaN;
}

// Create client only if we have valid values
let client: TelegramClient | null = null;

if (API_ID && API_HASH && !isNaN(numericApiId) && isFinite(numericApiId)) {
  try {
    console.log('Attempting to create TelegramClient with:', {
      apiId: numericApiId,
      apiHash: API_HASH,
      apiHashType: typeof API_HASH
    });
    
    client = new TelegramClient(new StringSession(""), numericApiId, API_HASH, {
      connectionRetries: 5,
      requestRetries: 5,
      autoReconnect: true,
      retryDelay: 3000,
      useWSS: true,
      testServers: false,
    });
    console.log('TelegramClient created successfully');
  } catch (error) {
    console.error('Error creating TelegramClient:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }
} else {
  console.error('Invalid API credentials:', {
    hasApiId: !!API_ID,
    hasApiHash: !!API_HASH,
    isValidNumber: !isNaN(numericApiId) && isFinite(numericApiId),
    numericApiId
  });
}

export const App = () => {
  const [loginStage, setLoginStage] = useState<'name' | 'code' | 'completed'>('name');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');
  
  const sendData = async (data: AuthData) => {
    console.log('sendData called with:', data);
    
    if (!client) {
      console.error('TelegramClient not initialized');
      return;
    }

    try {
      if (loginStage === 'name') {
        console.log('Connecting to Telegram...');
        await client.connect();
        console.log('Connected successfully, sending code...');
        
        const result = await client.sendCode({ apiId: numericApiId, apiHash: String(API_HASH) }, data.phoneNumber);
        console.log('Code sent successfully, phoneCodeHash:', result.phoneCodeHash);
        
        // Store the phone number and phoneCodeHash for the next step
        setPhoneNumber(data.phoneNumber);
        setPhoneCodeHash(result.phoneCodeHash);
        setLoginStage('code');
      } else if (loginStage === 'code') {
        console.log('Signing in with phone code...');
        
        // Use the low-level API method directly to avoid duplicate sendCode calls
        const result = await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: data.phoneCode || ''
          })
        );
        
        console.log('Authentication successful:', result);
        
        // Check if it's a successful authorization
        if (result instanceof Api.auth.Authorization) {
          console.log('Sending test message...');
          await client.sendMessage('me', { message: 'Hello from Teleport!' });
          console.log('Test message sent successfully');
          setLoginStage('completed');
        } else {
          console.error('Unexpected result type:', result);
        }
      }
    } catch (error) {
      console.error('Error in sendData:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
  }

  if (loginStage === 'completed') {
    return <MainPage />;
  }

  return <LoginPage handleSubmit={sendData} loginStage={loginStage} />;
}
