import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Blocks, Cable, Cog, Cpu, Files, LayoutDashboard, Network, Radio, Shield, Webhook, Workflow } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TabStrip } from '@/components/TabStrip';
import { useWorkspaceStore } from '@/state/workspace';
import { useNuages } from '@/App';
import { formatLastSeen, isImplantActive, normalizeMaybeArray } from '@/lib/nuages';
import type { ImplantRecord, ServerProfile } from '@/types';

const navItems = [
  ['Overview', '/overview', LayoutDashboard],
  ['Implants', '/implants', Cpu],
  ['Jobs', '/jobs', Workflow],
  ['Files', '/files', Files],
  ['Modules', '/modules', Blocks],
  ['Handlers', '/handlers', Shield],
  ['Listeners', '/listeners', Radio],
  ['Tunnels', '/tunnels', Network],
  ['Channels', '/channels', Cable],
  ['Webhooks', '/webhooks', Webhook],
  ['Settings', '/settings', Cog]
] as const;

export function Shell({ profile }: { profile: ServerProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const profiles = useWorkspaceStore((state) => state.profiles);
  const setActiveProfileId = useWorkspaceStore((state) => state.setActiveProfileId);
  const connectionState = useWorkspaceStore((state) => state.connectionState);
  const openSessionTab = useWorkspaceStore((state) => state.openSessionTab);
  const { app } = useNuages();

  const implants = useQuery({
    queryKey: ['implants-rail'],
    enabled: Boolean(app),
    staleTime: 10_000,
    refetchInterval: 15_000,
    queryFn: async () => normalizeMaybeArray<ImplantRecord>(await app.service('implants').find({ query: { $limit: 50, $sort: { lastSeen: -1 } } }))
  });

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__mark">N</div>
          <div>
            <div className="topbar__title">Nuages C2</div>
            <div className="topbar__subtitle">Experimental dashboard</div>
          </div>
        </div>
        <div className="topbar__controls">
          <label className="profile-picker">
            <span>Server</span>
            <select
              value={profile.id}
              onChange={(event) => {
                setActiveProfileId(event.target.value);
                navigate('/overview');
              }}
            >
              {profiles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <div className={`connection-pill ${connectionState}`}>
            <span className="connection-pill__dot" />
            <span>{connectionState}</span>
          </div>
        </div>
      </header>

      <div className="shell__body">
        <aside className="rail">
          <div className="rail__group">
            <div className="rail__label">Workspace</div>
            {navItems.map(([label, path, Icon]) => (
              <NavLink key={path} to={path} className={({ isActive }) => `rail__link ${isActive ? 'active' : ''}`}>
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
          <div className="rail__separator" />
          <div className="rail__group">
            <div className="rail__label">Implants</div>
            {(implants.data ?? []).length === 0 ? (
              <span className="rail__hint">{implants.isFetching ? 'Loading...' : 'No implants'}</span>
            ) : (
              (implants.data ?? []).map((imp) => {
                const live = isImplantActive(imp.lastSeen);
                const route = `/implants/${imp._id}/session`;
                return (
                  <button
                    key={imp._id}
                    type="button"
                    className={`rail__implant ${location.pathname === route ? 'active' : ''}`}
                    onClick={() => {
                      openSessionTab('implant-session', imp.hostname ?? imp._id.slice(0, 6), route, imp._id, {});
                      navigate(route);
                    }}
                    title={`${imp.hostname ?? imp._id} · ${formatLastSeen(imp.lastSeen)}`}
                  >
                    <span className={`rail__implant-dot ${live ? 'live' : ''}`} />
                    <span className="rail__implant-name">{imp.hostname ?? imp._id.slice(0, 8)}</span>
                    <span className="rail__implant-meta">{imp.os ?? ''}</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="workspace">
          <TabStrip />
          <div className="workspace__panel">
            <Outlet />
          </div>
        </main>
      </div>


    </div>
  );
}