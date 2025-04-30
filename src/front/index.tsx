// filepath: /home/cyb1ove/Projects/teleport/client/src/front/app/App.tsx
// import { Buffer } from 'buffer';
// import process from 'process';

// Make Buffer globally available
// window.Buffer = Buffer;
// window.process = process;

import { createRoot } from 'react-dom/client';

// import "app/styles/index.scss";
import { App } from 'app/App';
import { HashRouter } from 'react-router-dom';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <HashRouter>
    <App />
  </HashRouter>
);

