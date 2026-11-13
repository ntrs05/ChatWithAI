declare module '@/shared/event-bus/events' {
  interface AppEvents {
    'direct.read': { conversationId: string };
  }
}

export {};
