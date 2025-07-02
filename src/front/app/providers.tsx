import { TelegramProvider } from './providers/telegram-client.provider';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <TelegramProvider>
      {children}
    </TelegramProvider>
  )
}