// filepath: /home/cyb1ove/Projects/teleport/client/src/front/app/App.tsx
// GramJS will be loaded from the global telegram object in window

// Add type definition for the global telegram object
declare global {
  interface Window {
    telegram: any;
  }
}

import { createRoot } from 'react-dom/client';
import { App } from 'app/App';
import { HashRouter } from 'react-router-dom';

// Expose telegram to console for testing
console.log('Telegram client loaded:', window.telegram);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <HashRouter>
    <App />
  </HashRouter>
);

