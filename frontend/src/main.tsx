import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { bootstrap } from './app/bootstrap';
import './index.css';

const root = createRoot(document.getElementById('root')!);

bootstrap()
  .catch((err) => console.error('[bootstrap] lỗi khởi động', err))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
