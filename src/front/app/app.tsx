import { LoginPage } from 'pages/LoginPage';
import { MainPage } from 'pages/MainPage';
import { useContext, useState } from 'react';
import { AuthData } from 'shared/login/login.types';
import { Api } from 'telegram';
import { TelegramClientContext } from './providers/telegram-client.provider';
import { loginWithoutCode } from 'shared/login/login.no-code';
import { loginWithCode } from 'shared/login/login.with-code';

export const App = () => {
  const client = useContext(TelegramClientContext);

  const [loginStage, setLoginStage] = useState<'name' | 'code' | 'completed'>('name');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');
  
  const sendData = async (data: AuthData) => {
    if (!client.entity) {
      console.error('TelegramClient not initialized');
      return;
    }

    const { connect, sendCode, invoke } = client.entity;
    const { id, hash } = client;

    if (loginStage === 'name') {
      const result = await loginWithoutCode({ id, hash, phoneNumber: data.phoneNumber, connect, sendCode });

      setPhoneNumber(data.phoneNumber);
      setPhoneCodeHash(result.phoneCodeHash);
      setLoginStage('code');
    } else if (loginStage === 'code') {
      await loginWithCode({ phoneNumber, phoneCodeHash, phoneCode: data.phoneCode || '', invoke, SignIn: Api.auth.SignIn });
      setLoginStage('completed');
    }
  }

  if (client.isLoading) {
    return <div>Loading...</div>;
  }

  if (client.error) {
    return <div>Error: {client.error}</div>;
  }

  if (loginStage === 'completed') {
    return <MainPage />;
  }

  return <LoginPage handleSubmit={sendData} loginStage={loginStage} />;
}
