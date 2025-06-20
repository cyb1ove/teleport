
import { LoginPage } from 'pages/LoginPage';
import { MainPage } from 'pages/MainPage';
import { useState } from 'react';
import { AuthData } from 'shared/api/auth/types';

const API_ID = import.meta.env.VITE_API_ID;
const API_HASH = import.meta.env.VITE_API_HASH;


export const App = () => {
  const [loginStage, setLoginStage] = useState<'name' | 'code' | 'completed'>('name');

  function userAuthParamCallback<T>(param: T): () => Promise<T> {
    return async function () {
      return await new Promise<T>(resolve => {
        resolve(param)
      })
    }
  }
  
  const sendData = async (data: AuthData) => {
    const { TelegramClient } = await import('telegram');
    const { StringSession } = await import('telegram/sessions');

    const SESSION = new StringSession("");
    const client = new TelegramClient(SESSION, Number(API_ID), API_HASH, {
      connectionRetries: 5,
      requestRetries: 5,
      autoReconnect: true,
      retryDelay: 3000,
      useWSS: true,
      testServers: false,
    })

    if (loginStage === 'name') {
      await client.connect();
      await client.sendCode({ apiId: Number(API_ID), apiHash: String(API_HASH) }, data.phoneNumber);
      setLoginStage('code');
    } else {
      await client.start({
        phoneNumber: data.phoneNumber,
        phoneCode: userAuthParamCallback(data.phoneCode ?? (() => { throw new Error('Phone code is required'); })()),
        onError: console.error
      });
      await client.sendMessage('me', { message: 'Hello!' });
      setLoginStage('completed');
    }
  }

  if (loginStage === 'completed') {
    return <MainPage />;
  }

  return <LoginPage handleSubmit={sendData} loginStage={loginStage} />;
}
