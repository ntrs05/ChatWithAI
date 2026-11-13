import { EventBus } from './EventBus';
import type { AppEvents } from './events';

export { EventBus } from './EventBus';
export type { AppEvents, AppEventName } from './events';

export type AppEventBus = EventBus<AppEvents>;

export const bus: AppEventBus = new EventBus<AppEvents>();

export const toast = {
  info: (message: string) => bus.publish('ui.toast', { kind: 'info', message }),
  success: (message: string) => bus.publish('ui.toast', { kind: 'success', message }),
  error: (message: string) => bus.publish('ui.toast', { kind: 'error', message }),
};

if (import.meta.env.DEV) {
  bus.subscribeAll((type, payload) => {
    if ((type as string) === 'voice.signal') return; // quá nhiều, khỏi log
    console.debug('%c[bus]', 'color:#2DD4BF', type, payload);
  });
}
