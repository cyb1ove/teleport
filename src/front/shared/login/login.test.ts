import { describe, it, expect } from 'vitest';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { loginWithoutCode } from './login.no-code';
import { loginWithCode } from './login.with-code';
import telegramClientConfig from '../config/telegram-client.config';

describe('login', () => {
  it('should login', async () => {
    const apiIdRaw = import.meta.env.VITE_API_ID ?? process.env.API_ID;
    const apiHash = import.meta.env.VITE_API_HASH ?? process.env.API_HASH;

    if (!apiIdRaw || !apiHash) {
      console.error(
        'Skipping test – Telegram API credentials not found in the environment.'
      );
      return;
    }

    const apiId = Number(apiIdRaw);
    if (Number.isNaN(apiId)) {
      throw new Error(`API_ID must be a number, got: ${apiIdRaw}`);
    }

    // We will use DC-2 for the test login.
    const phoneNumber = '9996657384';
    const phoneCode = '99966';

    // We use an in-memory (empty) session so each test run starts fresh.
    const client = new TelegramClient(
      new StringSession(''),
      apiId,
      apiHash,
      telegramClientConfig({ isTest: true })
    );
    
    const { phoneCodeHash } = await loginWithoutCode({
      id: apiId,
      hash: apiHash,
      phoneNumber,
      connect: () => client.connect(),
      sendCode: (data, phone) => client.sendCode(data, phone),
    });

    const signInResult = await loginWithCode({
      phoneNumber,
      phoneCodeHash,
      phoneCode,
      invoke: client.invoke.bind(client),
      SignIn: Api.auth.SignIn,
    });


    expect(signInResult).toBeInstanceOf(Api.auth.Authorization);

    await client.disconnect();
  }, 30000);
})
