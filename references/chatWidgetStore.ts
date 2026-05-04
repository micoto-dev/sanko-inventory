import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatWidgetState {
  enabled: boolean;
  toggle: () => void;
}

const useChatWidgetStore = create<ChatWidgetState>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: 'temanashi-chat-widget' }
  )
);

export default useChatWidgetStore;
