import { StringSession } from 'telegram/sessions';
import { TelegramClient } from 'telegram';
import { createContext, useState, useEffect } from 'react';
import telegramClientConfig from 'shared/config/telegram-client.config';

type TelegramClientContextType = {
  entity: TelegramClient | null;
  id: number;
  hash: string;
  error: string | null;
  isLoading: boolean;
}

const API_ID = import.meta.env.VITE_API_ID;
const API_HASH = import.meta.env.VITE_API_HASH;

const defaultContext: TelegramClientContextType = {
  entity: null,
  id: 0,
  hash: '',
  error: null,
  isLoading: true,
};

export const TelegramClientContext = createContext<TelegramClientContextType>(defaultContext);

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const [clientState, setClientState] = useState<TelegramClientContextType>(defaultContext);

  const createTelegramClientProxy = (client: TelegramClient) => {
    return new Proxy(client, {
      get: (target: TelegramClient, prop: keyof TelegramClient) => {
        const value = target[prop];

        if (typeof value === 'function') {
          return function(...args: unknown[]) {
            const result = value.apply(target, args);

            if (result instanceof Promise) {
              setClientState(prev => ({ ...prev, isLoading: true }));

              return result.then(data => {
                setClientState(prev => ({ ...prev, isLoading: false }));
                return data;
              }).catch(error => {
                setClientState(prev => ({ ...prev, isLoading: false, error: error.message }));
                throw error;
              });
            }

            return result;
          }
        }

        return value;
      }
    })
  }

  useEffect(() => {
    const initializeClient = async () => {
      try {
        // Validate environment variables
        if (!API_ID || !API_HASH) {
          throw new Error('Missing API_ID or API_HASH in environment variables');
        }

        const numericApiId = Number(API_ID);
        if (isNaN(numericApiId) || !isFinite(numericApiId)) {
          throw new Error('API_ID must be a valid number');
        }

        // Create TelegramClient
        const client = new TelegramClient(
          new StringSession(""),
          numericApiId,
          String(API_HASH),
          telegramClientConfig({ isTest: false })
        );

        setClientState({
          entity: createTelegramClientProxy(client),
          id: numericApiId,
          hash: String(API_HASH),
          error: null,
          isLoading: false,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('TelegramClient initialization error:', error);
        
        setClientState({
          entity: null,
          id: 0,
          hash: '',
          error: errorMessage,
          isLoading: false,
        });
      }
    };

    initializeClient();
  }, []);

  return (
    <TelegramClientContext.Provider value={clientState}>
      {children}
    </TelegramClientContext.Provider>
  )
}