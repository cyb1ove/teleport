import { LoginPage } from 'pages/LoginPage';
import { MainPage } from 'pages/MainPage';
import { useState } from 'react';
import { authentificate } from 'shared/api/auth/auth';
import { AuthData } from 'shared/api/auth/types';

export const App = () => {
  const [loginStage, setLoginStage] = useState<'name' | 'code' | 'completed'>('name');
  
  const sendData = async (data: AuthData) => {
    await authentificate(data);
    loginStage === 'name' ? setLoginStage('code') : setLoginStage('completed');
  }

  if (loginStage === 'completed') {
    return <MainPage />;
  }

  return (
    <LoginPage
      loginStage={loginStage}
      handleSubmit={sendData}
    />
  );
}
