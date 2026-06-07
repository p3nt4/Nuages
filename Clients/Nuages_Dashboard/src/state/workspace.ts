import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createId } from '@/lib/storage';
import type { ConnectionState, EventLogEntry, ServerProfile, TabKind, WorkspaceTab } from '@/types';

type TabState = Record<string, string | number | boolean | null>;

interface WorkspaceState {
  profiles: ServerProfile[];
  activeProfileId: string | null;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  utilityOpen: boolean;
  connectionState: ConnectionState;
  eventLog: EventLogEntry[];
  setProfiles: (profiles: ServerProfile[]) => void;
  addProfile: (profile: ServerProfile) => void;
  setActiveProfileId: (profileId: string | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  logEvent: (level: EventLogEntry['level'], message: string) => void;
  clearEventLog: () => void;
  toggleUtilityOpen: () => void;
  openTab: (tab: Omit<WorkspaceTab, 'id' | 'createdAt'> & { id?: string }) => string;
  openSessionTab: (kind: Extract<TabKind, 'implant-session' | 'job-session'>, title: string, route: string, entityId: string, state?: TabState) => string;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string | null) => void;
  patchTabState: (tabId: string, nextState: TabState) => void;
  resetSensitiveState: () => void;
}

const storageKey = 'nuages.dashboard.workspace';

const initialState = {
  profiles: [] as ServerProfile[],
  activeProfileId: null as string | null,
  tabs: [] as WorkspaceTab[],
  activeTabId: null as string | null,
  utilityOpen: true,
  connectionState: 'disconnected' as ConnectionState,
  eventLog: [] as EventLogEntry[]
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setProfiles: (profiles) => set({ profiles }),
      addProfile: (profile) =>
        set((state) => {
          const existing = state.profiles.find((entry) => entry.id === profile.id);
          return {
            profiles: existing ? state.profiles.map((entry) => (entry.id === profile.id ? profile : entry)) : [...state.profiles, profile],
            activeProfileId: profile.id
          };
        }),
      setActiveProfileId: (profileId) => set({ activeProfileId: profileId }),
      setConnectionState: (connectionState) => set({ connectionState }),
      logEvent: (level, message) =>
        set((state) => ({
          eventLog: [
            ...state.eventLog.slice(-149),
            { id: createId('event'), level, message, time: Date.now() }
          ]
        })),
      clearEventLog: () => set({ eventLog: [] }),
      toggleUtilityOpen: () => set((state) => ({ utilityOpen: !state.utilityOpen })),
      openTab: (tab) => {
        const scope = tab.scope;
        const existing = get().tabs.find((entry) => entry.scope === scope);
        if (existing) {
          set((state) => (state.activeTabId === existing.id ? state : { activeTabId: existing.id }));
          return existing.id;
        }

        const id = tab.id ?? createId('tab');
        const nextTab: WorkspaceTab = {
          id,
          scope,
          kind: tab.kind,
          title: tab.title,
          route: tab.route,
          entityId: tab.entityId,
          state: tab.state ?? {},
          createdAt: Date.now()
        };

        set((state) => ({
          tabs: [...state.tabs, nextTab],
          activeTabId: id
        }));

        return id;
      },
      openSessionTab: (kind, title, route, entityId, state = {}) =>
        get().openTab({
          scope: kind === 'implant-session' ? `${kind}:${entityId}` : `${kind}:${entityId}:${route}`,
          kind,
          title,
          route,
          entityId,
          state
        }),
      closeTab: (tabId) =>
        set((state) => {
          const nextTabs = state.tabs.filter((tab) => tab.id !== tabId);
          const nextActive = state.activeTabId === tabId ? nextTabs.at(-1)?.id ?? null : state.activeTabId;
          return {
            tabs: nextTabs,
            activeTabId: nextActive
          };
        }),
      setActiveTabId: (tabId) =>
        set((state) => (state.activeTabId === tabId ? state : { activeTabId: tabId })),
      patchTabState: (tabId, nextState) =>
        set((state) => {
          let changed = false;
          const tabs = state.tabs.map((tab) => {
            if (tab.id !== tabId) {
              return tab;
            }

            const mergedState = { ...tab.state, ...nextState };
            const nextKeys = Object.keys(nextState);
            const hasDelta = nextKeys.some((key) => tab.state[key] !== mergedState[key]);
            if (!hasDelta) {
              return tab;
            }

            changed = true;
            return { ...tab, state: mergedState };
          });

          return changed ? { tabs } : state;
        }),
      resetSensitiveState: () => set({ eventLog: [], connectionState: 'disconnected' })
    }),
    {
      name: storageKey,
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        utilityOpen: state.utilityOpen
      })
    }
  )
);