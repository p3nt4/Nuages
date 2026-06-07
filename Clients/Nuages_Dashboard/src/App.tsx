import { useEffect, useMemo, useState, createContext, useContext, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { QueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { createNuagesClient, normalizeMaybeArray } from '@/lib/nuages';
import { useWorkspaceStore } from '@/state/workspace';
import type { ImplantRecord, ServerProfile } from '@/types';
import { ChannelsPage, ConnectPage, FilesExplorerPage, HandlersPage, ImplantSessionPage, ImplantsPage, JobSessionPage, JobsPage, ModulesPage, NotFoundPage, OverviewPage, SettingsPage, ListenersPage, TunnelsPage, WebhooksPage } from '@/pages';

type Toast = { id: number; message: string; sub?: string };

type ToastContextState = { addToast: (message: string, sub?: string) => void };
const ToastContext = createContext<ToastContextState>({ addToast: () => undefined });
export function useToast() { return useContext(ToastContext); }

function ToastLayer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, sub?: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message, sub }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
            <span className="toast__dot" />
            <div>
              <div className="toast__msg">{t.message}</div>
              {t.sub ? <div className="toast__sub">{t.sub}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

type NuagesContextState = {
  profile: ServerProfile;
  app: any;
  socket: any;
};

const NuagesContext = createContext<NuagesContextState | null>(null);

export function useNuages(): NuagesContextState {
  const value = useContext(NuagesContext);
  if (!value) {
    throw new Error('Nuages context is unavailable');
  }

  return value;
}

function RouteTabSync() {
  const location = useLocation();
  const openTab = useWorkspaceStore((state) => state.openTab);
  const setActiveTabId = useWorkspaceStore((state) => state.setActiveTabId);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const tabs = useWorkspaceStore((state) => state.tabs);

  useEffect(() => {
    const exact = tabs.find((tab) => location.pathname === tab.route);
    const session = tabs.find((tab) => tab.route.includes('/session/') && location.pathname.startsWith(tab.route));
    const nestedGlobal = tabs.find(
      (tab) => !tab.route.includes('/session/') && location.pathname.startsWith(`${tab.route}/`)
    );
    const current = exact ?? session ?? nestedGlobal;

    if (current) {
      if (current.id !== activeTabId) {
        setActiveTabId(current.id);
      }
      return;
    }

    const implantMatch = location.pathname.match(/^\/implants\/([^/]+)\/session(?:\/[^/]+)?$/);
    if (implantMatch) {
      const route = `/implants/${implantMatch[1]}/session`;
      openTab({ scope: `implant-session:${implantMatch[1]}`, kind: 'implant-session', title: `Implant ${implantMatch[1].slice(0, 6)}`, route, entityId: implantMatch[1], state: {} });
      return;
    }
  }, [activeTabId, location.pathname, openTab, setActiveTabId, tabs]);

  return null;
}

function WorkspaceFrame({ queryClient }: { queryClient: QueryClient }) {
  const activeProfileId = useWorkspaceStore((state) => state.activeProfileId);
  const profiles = useWorkspaceStore((state) => state.profiles);
  const setConnectionState = useWorkspaceStore((state) => state.setConnectionState);
  const logEvent = useWorkspaceStore((state) => state.logEvent);
  const { addToast } = useToast();
  const [clientState, setClientState] = useState<NuagesContextState | null>(null);
  const profile = useMemo(() => profiles.find((entry) => entry.id === activeProfileId) ?? profiles[0] ?? null, [activeProfileId, profiles]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) {
      setClientState(null);
      setConnectionState('disconnected');
      return;
    }

    const client = createNuagesClient(profile);
    let cancelled = false;

    const handleConnect = () => setConnectionState('connected');
    const handleDisconnect = () => setConnectionState('degraded');
    const handleError = (error: unknown) => {
      setConnectionState('error');
      logEvent('error', error instanceof Error ? error.message : 'Socket connection error');
    };

    client.socket.on('connect', handleConnect);
    client.socket.on('disconnect', handleDisconnect);
    client.socket.on('connect_error', handleError);

    const serviceNames = ['implants', 'jobs', 'files', 'modules', 'modules/run', 'handlers', 'listeners', 'tunnels', 'pipes', 'webhooks'] as const;
    const serviceEvents = ['created', 'updated', 'patched', 'removed'] as const;

    for (const serviceName of serviceNames) {
      const service = client.app.service(serviceName);
      for (const eventName of serviceEvents) {
        service.on(eventName, (record: unknown) => {
          queryClient.invalidateQueries({ queryKey: [serviceName] });
          if (serviceName === 'implants') {
            queryClient.invalidateQueries({ queryKey: ['implants-rail'] });
            if (eventName === 'created') {
              const imp = record as ImplantRecord | undefined;
              const name = imp?.hostname ?? imp?._id?.slice(0, 8) ?? 'unknown';
              addToast('New implant connected', `${name} · ${imp?.os ?? ''} · ${imp?.username ?? ''}`.replace(/ · $/, ''));
            }
          }
          logEvent('info', `${serviceName} ${eventName}`);
        });
      }
    }

    client.socket.connect();
    setConnectionState('connecting');
    setClientState(client);

    (async () => {
      try {
        await client.app.reAuthenticate();
        if (!cancelled) {
          setConnectionState('authenticated');
          logEvent('success', `Connected to ${profile.name}`);
        }
      } catch {
        if (!cancelled) {
          logEvent('warning', 'Awaiting login credentials');
        }
      }
    })();

    return () => {
      cancelled = true;
      client.socket.off('connect', handleConnect);
      client.socket.off('disconnect', handleDisconnect);
      client.socket.off('connect_error', handleError);
      client.socket.disconnect();
    };
  }, [logEvent, profile, queryClient, setConnectionState]);

  useEffect(() => {
    if (location.pathname === '/' && profile) {
      navigate('/overview', { replace: true });
    }
  }, [location.pathname, navigate, profile]);

  if (!profile) {
    return <Navigate to="/connect" replace />;
  }

  if (!clientState) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-card__eyebrow">Nuages Dashboard</div>
          <h1>Connecting to server</h1>
          <p>Loading the realtime client and restoring the current workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <NuagesContext.Provider value={clientState}>
      <RouteTabSync />
      <Shell profile={profile} />
    </NuagesContext.Provider>
  );
}

function LegacyImplantSessionRedirect() {
  const { implantId } = useParams();
  if (!implantId) {
    return <Navigate to="/implants" replace />;
  }

  return <Navigate to={`/implants/${implantId}/session`} replace />;
}

export default function App({ queryClient }: { queryClient: QueryClient }) {
  return (
    <ToastLayer>
      <Routes>
        <Route path="/connect" element={<ConnectPage />} />
        <Route element={<WorkspaceFrame queryClient={queryClient} />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/implants" element={<ImplantsPage />} />
        <Route path="/implants/:implantId/session" element={<ImplantSessionPage />} />
        <Route path="/implants/:implantId/session/:sessionId" element={<LegacyImplantSessionRedirect />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId/session/:sessionId" element={<JobSessionPage />} />
        <Route path="/files" element={<FilesExplorerPage />} />
        <Route path="/modules" element={<ModulesPage />} />
        <Route path="/handlers" element={<HandlersPage />} />
        <Route path="/listeners" element={<ListenersPage />} />
        <Route path="/tunnels" element={<TunnelsPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </ToastLayer>
  );
}