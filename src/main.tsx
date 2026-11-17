import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const ensureWritableFetch = (
  window as Window & { __amndEnsureWritableFetch?: () => void }
).__amndEnsureWritableFetch;

ensureWritableFetch?.();
if (ensureWritableFetch) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureWritableFetch, { once: true });
  }
  if (document.readyState !== 'complete') {
    window.addEventListener('load', ensureWritableFetch, { once: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
