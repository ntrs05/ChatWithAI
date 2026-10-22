import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { bootstrap } from './app/bootstrap';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Không tìm thấy phần tử #root');
const root = createRoot(rootEl);

try {
  await bootstrap();
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (err) {
  console.error('[bootstrap] lỗi khởi động', err);
  root.render(<p>Không thể khởi động ứng dụng. Vui lòng tải lại trang.</p>);
}
