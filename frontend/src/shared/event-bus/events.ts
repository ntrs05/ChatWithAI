export interface AppEvents {
  'ui.toast': { kind: 'info' | 'success' | 'error'; message: string };
}

export type AppEventName = keyof AppEvents;
