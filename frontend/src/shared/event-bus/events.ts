/**
 * Hợp đồng sự kiện (Event Contract) của toàn ứng dụng.
 *
 * Shared chỉ khai báo sự kiện dùng chung (toast). Mỗi module tự BỔ SUNG sự kiện
 * của mình vào interface này trong file `modules/<tên>/events.ts`
 * (TypeScript declaration merging). Nhờ vậy:
 *   - shared không phụ thuộc ngược vào module nào,
 *   - mỗi module "sở hữu" và công bố sự kiện của chính nó như một public API.
 */
export interface AppEvents {
  'ui.toast': { kind: 'info' | 'success' | 'error'; message: string };
}

export type AppEventName = keyof AppEvents;
