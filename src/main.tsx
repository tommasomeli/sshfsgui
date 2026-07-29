import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { App } from './App';
import './index.css';
import { createSshfsApi } from './api/sshfs';

window.sshfs = createSshfsApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
