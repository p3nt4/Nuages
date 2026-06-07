import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace';

function isCurrentRoute(route: string, pathname: string): boolean {
  if (route === pathname) {
    return true;
  }

  if (route.endsWith('/session') || route.includes('/session/')) {
    return pathname.startsWith(route);
  }

  return false;
}

export function TabStrip() {
  const tabs = useWorkspaceStore((state) => state.tabs);
  const implantTabs = tabs.filter((tab) => tab.kind === 'implant-session');
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const setActiveTabId = useWorkspaceStore((state) => state.setActiveTabId);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const navigate = useNavigate();
  const location = useLocation();

  if (implantTabs.length === 0) {
    return null;
  }

  return (
    <div className="tab-strip" role="tablist" aria-label="Implant session tabs">
      {implantTabs.map((tab) => {
        const active = tab.id === activeTabId || isCurrentRoute(tab.route, location.pathname);

        return (
          <div key={tab.id} className={`tab-chip ${active ? 'active' : ''}`}>
            <button
              type="button"
              className="tab-chip__button"
              onClick={() => {
                setActiveTabId(tab.id);
                navigate(tab.route);
              }}
            >
              <span className="tab-chip__kind">{tab.kind.replace('-', ' ')}</span>
              <span>{tab.title}</span>
            </button>
            <button
              type="button"
              className="tab-chip__close"
              aria-label={`Close ${tab.title}`}
              onClick={() => {
                closeTab(tab.id);
                if (active) {
                  navigate('/overview');
                }
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        );
      })}
      <div className="tab-strip__spacer" />
      <NavLink className="tab-strip__utility" to="/settings">
        Settings
      </NavLink>
    </div>
  );
}