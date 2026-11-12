import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { App } from './App';
import './index.css';
import { createSshfsApi } from './api/sshfs';

window.sshfs = createSshfsApi();

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => document.documentElement.classList.toggle('dark', darkQuery.matches);
applyTheme();
darkQuery.addEventListener('change', applyTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
