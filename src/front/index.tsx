// filepath: /home/cyb1ove/Projects/teleport/client/src/front/app/App.tsx
// GramJS will be loaded from the global telegram object in window

// Add type definition for the global telegram object
declare global {
  interface Window {
    telegram: typeof import('telegram');
  }
}

import { createRoot } from 'react-dom/client';
import { App } from 'app/app';
import { Providers } from 'app/providers';
// import { HashRouter } from 'react-router-dom';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <Providers>
    <App />
  </Providers>
);

