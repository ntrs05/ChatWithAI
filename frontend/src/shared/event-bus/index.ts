import { EventBus } from './EventBus';
import type { AppEvents } from './events';

export { EventBus } from './EventBus';
export type { AppEvents, AppEventName } from './events';

export type AppEventBus = EventBus<AppEvents>;

/** Bus duy nhất của ứng dụng (Modular Monolith → một tiến trình, một bus). */
export const bus: AppEventBus = new EventBus<AppEvents>();

export const toast = {
  info: (message: string) => bus.publish('ui.toast', { kind: 'info', message }),
  success: (message: string) => bus.publish('ui.toast', { kind: 'success', message }),
  error: (message: string) => bus.publish('ui.toast', { kind: 'error', message }),
};

if (import.meta.env.DEV) {
  bus.subscribeAll((type, payload) => {
    if ((type as string) === 'voice.signal') return; // quá nhiều, bỏ qua khi log
    console.debug('%c[bus]', 'color:#2DD4BF', type, payload);
  });
}
