import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { authenticate, cdJobPayload, createNuagesClient, describeJobStatus, describeListenerStatus, describeRunStatus, downloadJobPayload, downloadPipePayload, exitJobPayload, formatFileSize, formatLastSeen, isImplantActive, jobPayload, lsJobPayload, normalizeMaybeArray, normalizePath, uploadJobPayload, uploadPipePayload } from '@/lib/nuages';
import { createId, readJson, writeJson } from '@/lib/storage';
import { useWorkspaceStore } from '@/state/workspace';
import type { FileRecord, ImplantRecord, JobRecord, ListItem, ServerProfile } from '@/types';
import { useNuages } from '@/App';

type ConnectionDraft = {
  name: string;
  url: string;
  username: string;
  password: string;
};

type LegacyConnectionDraft = {
  name?: string;
  url?: string;
  username?: string;
  email?: string;
  password?: string;
};

type ModuleOptionDefinition = {
  value?: unknown;
  required?: boolean;
  description?: string;
};

type ModuleRecord = {
  _id: string;
  name?: string;
  description?: string;
  supportedOS?: string[];
  requiredPayloads?: string[];
  options?: Record<string, ModuleOptionDefinition>;
  [key: string]: unknown;
};

type ModuleLogRecord = {
  _id: string;
  sourceId?: string;
  sourceType?: string;
  sourceName?: string;
  type?: number;
  time?: number;
  message?: string;
  [key: string]: unknown;
};

const defaultDraft: ConnectionDraft = {
  name: 'Local Server',
  url: 'http://localhost:3030',
  username: '',
  password: ''
};

function normalizeConnectionDraft(value: LegacyConnectionDraft): ConnectionDraft {
  return {
    name: value.name ?? defaultDraft.name,
    url: value.url ?? defaultDraft.url,
    username: value.username ?? value.email ?? defaultDraft.username,
    password: value.password ?? defaultDraft.password
  };
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status status--${value.replace(/\s+/g, '-')}`}>{value}</span>;
}

function useServiceCollection<T>(serviceName: string, query: Record<string, unknown> = {}, staleTime = 15_000) {
  const client = useNuages();
  return useQuery({
    queryKey: [serviceName, query, client?.profile.id ?? 'offline'],
    enabled: Boolean(client?.app),
    staleTime,
    queryFn: async () => normalizeMaybeArray<T>(await client.app.service(serviceName).find({ query }))
  });
}

function createTabTitle(kind: 'implant-session' | 'job-session', entityId: string): string {
  return `${kind === 'implant-session' ? 'Implant' : 'Job'} ${entityId.slice(0, 6)}`;
}

function parseConfigResult(raw: unknown): Record<string, string> {
  if (typeof raw !== 'string' || !raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).map(([key, value]) => [key, String(value)] as const);
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function ConnectPage() {
  const profiles = useWorkspaceStore((state) => state.profiles);
  const addProfile = useWorkspaceStore((state) => state.addProfile);
  const setConnectionState = useWorkspaceStore((state) => state.setConnectionState);
  const logEvent = useWorkspaceStore((state) => state.logEvent);
  const setActiveProfileId = useWorkspaceStore((state) => state.setActiveProfileId);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ConnectionDraft>(() => normalizeConnectionDraft(readJson<LegacyConnectionDraft>('nuages.dashboard.connectDraft', defaultDraft)));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    writeJson('nuages.dashboard.connectDraft', draft);
  }, [draft]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setConnectionState('connecting');

    const profile: ServerProfile = {
      id: createId('profile'),
      name: draft.name.trim() || 'Nuages Server',
      url: draft.url.trim() || 'http://localhost:3030'
    };

    try {
      const { app, socket } = createNuagesClient(profile);
      socket.connect();
      setConnectionState('authenticating');
      await authenticate(app, draft.username, draft.password);
      addProfile(profile);
      setActiveProfileId(profile.id);
      logEvent('success', `Authenticated with ${profile.name}`);
      navigate('/overview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect';
      setConnectionState('error');
      logEvent('error', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__eyebrow">Nuages Dashboard</div>
        <h1>Connect to a server</h1>
        <p>Register a server profile, authenticate with local credentials, and jump into the workspace.</p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>Profile name</span>
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Server URL</span>
            <input value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder="http://localhost:3030" />
          </label>
          <div className="auth-form__grid">
            <label>
              <span>Username</span>
              <input value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} />
            </label>
            <label>
              <span>Password</span>
              <input type="password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
            </label>
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'Connecting...' : 'Connect and authenticate'}
          </button>
        </form>
        <div className="auth-card__profiles">
          <div className="muted">Saved profiles</div>
          <div className="profile-list">
            {profiles.length === 0 ? <span className="profile-list__empty">None yet</span> : null}
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="profile-chip"
                onClick={() => {
                  setDraft((current) => ({ ...current, name: profile.name, url: profile.url }));
                  setActiveProfileId(profile.id);
                  navigate('/overview');
                }}
              >
                <strong>{profile.name}</strong>
                <span>{profile.url}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OverviewPage() {
  const implants = useServiceCollection<ImplantRecord>('implants', { $limit: 10, $sort: { lastSeen: -1 } });
  const jobs = useServiceCollection<JobRecord>('jobs', { $limit: 10, $sort: { createdAt: -1 } });
  const listeners = useServiceCollection<Record<string, unknown>>('listeners', { $limit: 10 });
  const files = useServiceCollection<FileRecord>('files', { $limit: 10 });

  const cards = [
    ['Implants', implants.data?.length ?? 0],
    ['Jobs', jobs.data?.length ?? 0],
    ['Listeners', listeners.data?.length ?? 0],
    ['Files', files.data?.length ?? 0]
  ] as const;

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard Overview" subtitle="Realtime command center for implants, jobs, and infrastructure." />
      <section className="stats-grid">
        {cards.map(([label, value]) => (
          <article key={label} className="stat-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="split-grid">
        <Panel title="Recent implants">
          <CollectionMini
            data={implants.data ?? []}
            emptyLabel="No implants yet"
            render={(implant) => {
              const active = isImplantActive(implant.lastSeen);
              return (
                <div className="overview-mini-item">
                  <div className="overview-mini-item__title">
                    <span className={`implant-status__dot ${active ? 'live' : ''}`} aria-hidden="true" />
                    <strong>{implant.hostname ?? implant._id.slice(0, 10)}</strong>
                  </div>
                  <div className="overview-mini-item__meta">
                    <span>{implant.os ?? 'unknown OS'}</span>
                    <span>{implant.username ?? 'unknown user'}</span>
                    <span>{formatLastSeen(implant.lastSeen)}</span>
                  </div>
                </div>
              );
            }}
          />
        </Panel>
        <Panel title="Recent jobs">
          <CollectionMini
            data={jobs.data ?? []}
            emptyLabel="No jobs yet"
            render={(job) => {
              const payload = (job.payload as { type?: string } | undefined) ?? undefined;
              const payloadType = payload?.type ? String(payload.type) : 'unknown';
              return (
                <div className="overview-mini-item">
                  <div className="overview-mini-item__title">
                    <strong>{job._id.slice(0, 8)}</strong>
                    <span className="muted">{payloadType}</span>
                  </div>
                  <div className="overview-mini-item__meta">
                    <span>job: {describeJobStatus(job.jobStatus)}</span>
                    <span>run: {describeRunStatus(job.runStatus as number | undefined)}</span>
                    <span>implant: {job.implantId ? job.implantId.slice(0, 8) : 'n/a'}</span>
                    <span>{job.createdAt ? new Date(job.createdAt).toLocaleString() : 'unknown time'}</span>
                  </div>
                </div>
              );
            }}
          />
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function CollectionMini<T>({ data, emptyLabel, render }: { data: T[]; emptyLabel: string; render: (item: T) => React.ReactNode }) {
  if (data.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <ul className="mini-list">
      {data.map((item, index) => (
        <li key={index}>{render(item)}</li>
      ))}
    </ul>
  );
}

function ServiceTable<T extends Record<string, unknown>>({
  title,
  subtitle,
  serviceName,
  columns,
  rowAction,
  query
}: {
  title: string;
  subtitle: string;
  serviceName: string;
  columns: Array<{ key: keyof T | string; label: string; render?: (row: T) => React.ReactNode }>;
  rowAction?: (row: T) => React.ReactNode;
  query?: Record<string, unknown>;
}) {
  const result = useServiceCollection<T>(serviceName, query ?? { $limit: 100, $sort: { createdAt: -1 } });

  return (
    <div className="page-stack">
      <PageHeader title={title} subtitle={subtitle} />
      <section className="panel panel--table">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.label}</th>
              ))}
              {rowAction ? <th className="table-actions">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {(result.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowAction ? 1 : 0)} className="empty-cell">
                  No records found.
                </td>
              </tr>
            ) : (
              (result.data ?? []).map((row, index) => (
                <tr key={(row._id as string | undefined) ?? index}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>{column.render ? column.render(row) : String(row[column.key] ?? '')}</td>
                  ))}
                  {rowAction ? <td>{rowAction(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ImplantsPage() {
  const navigate = useNavigate();
  const openSessionTab = useWorkspaceStore((state) => state.openSessionTab);
  const queryClient = useQueryClient();
  const { app } = useNuages();

  async function removeImplant(row: ImplantRecord) {
    const label = row.hostname ?? row._id.slice(0, 10);
    if (!window.confirm(`Remove implant ${label}? This deletes the implant record.`)) {
      return;
    }

    await app.service('implants').remove(row._id);
    queryClient.invalidateQueries({ queryKey: ['implants'] });
    queryClient.invalidateQueries({ queryKey: ['implants-rail'] });
  }

  async function killImplant(row: ImplantRecord) {
    const label = row.hostname ?? row._id.slice(0, 10);
    if (!window.confirm(`Kill implant ${label}? This queues an exit job for the implant.`)) {
      return;
    }

    await app.service('jobs').create(exitJobPayload(row._id));
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['implants'] });
  }

  return (
    <ServiceTable<ImplantRecord>
      title="Implants"
      subtitle="List, inspect, and open live sessions for active implants."
      serviceName="implants"
      columns={[
        {
          key: 'lastSeen',
          label: 'Status',
          render: (row) => {
            const active = isImplantActive(row.lastSeen);
            return (
              <span className="implant-status" title={active ? 'Active within the last 5 minutes' : 'Inactive'}>
                <span className={`implant-status__dot ${active ? 'live' : ''}`} aria-hidden="true" />
                <span>{active ? 'Active' : 'Idle'}</span>
              </span>
            );
          }
        },
        { key: '_id', label: 'ID', render: (row) => <code>{row._id.slice(0, 10)}</code> },
        { key: 'hostname', label: 'Hostname' },
        { key: 'username', label: 'User' },
        { key: 'os', label: 'OS' },
        { key: 'localIp', label: 'Local IP' },
        { key: 'handler', label: 'Handler' },
        { key: 'lastSeen', label: 'Last seen', render: (row) => formatLastSeen(row.lastSeen) }
      ]}
      rowAction={(row) => (
        <div className="row-actions">
          <button
            type="button"
            onClick={() => {
              const route = `/implants/${row._id}/session`;
              openSessionTab('implant-session', createTabTitle('implant-session', row._id), route, row._id, {});
              navigate(route);
            }}
          >
            Open
          </button>
          <button type="button" onClick={() => void killImplant(row)}>
            Kill
          </button>
          <button type="button" className="btn-danger" onClick={() => void removeImplant(row)}>
            Remove
          </button>
        </div>
      )}
    />
  );
}

export function JobsPage() {
  const navigate = useNavigate();
  const openSessionTab = useWorkspaceStore((state) => state.openSessionTab);
  return (
    <ServiceTable<JobRecord>
      title="Jobs"
      subtitle="Track command execution, module runs, and job results in one place."
      serviceName="jobs"
      columns={[
        { key: '_id', label: 'ID', render: (row) => <code>{row._id.slice(0, 10)}</code> },
        { key: 'implantId', label: 'Implant' },
        { key: 'creator', label: 'Creator' },
        { key: 'jobStatus', label: 'Job status', render: (row) => describeJobStatus(row.jobStatus) },
        { key: 'runStatus', label: 'Run status', render: (row) => describeRunStatus(row.runStatus as number | undefined) },
        { key: 'createdAt', label: 'Created', render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : 'unknown') }
      ]}
      rowAction={(row) => (
        <button
          type="button"
          onClick={() => {
            const sessionId = createId('session');
            openSessionTab('job-session', createTabTitle('job-session', row._id), `/jobs/${row._id}/session/${sessionId}`, row._id);
            navigate(`/jobs/${row._id}/session/${sessionId}`);
          }}
        >
          Open
        </button>
      )}
    />
  );
}

export function FilesExplorerPage() {
  const [implantFilter, setImplantFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [busyDownloadId, setBusyDownloadId] = useState('');
  const [busyDeleteId, setBusyDeleteId] = useState('');
  const [busyUploadName, setBusyUploadName] = useState('');
  const [downloadMessage, setDownloadMessage] = useState('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { app } = useNuages();

  const query = implantFilter.trim()
    ? { $limit: 500, $sort: { uploadDate: -1 }, 'metadata.implantId': implantFilter.trim() }
    : { $limit: 500, $sort: { uploadDate: -1 } };

  const result = useServiceCollection<FileRecord>('files', query, 15_000);

  const files = useMemo(() => {
    const all = result.data ?? [];
    const needle = nameFilter.trim().toLowerCase();
    return needle ? all.filter((f) => f.filename.toLowerCase().includes(needle)) : all;
  }, [result.data, nameFilter]);

  async function downloadFile(file: FileRecord) {
    if (busyDownloadId) {
      return;
    }

    setBusyDownloadId(file._id);
    setDownloadMessage(`Downloading ${file.filename}...`);
    let pipeId = '';
    try {
      const pipe = await app.service('pipes').create({
        type: 'download',
        source: file._id,
        destination: file.filename,
        bufferSize: 261120
      });
      pipeId = String(pipe?._id ?? '');
      if (!pipeId) {
        throw new Error('Unable to open download pipe');
      }

      const chunks: ArrayBuffer[] = [];
      let received = 0;
      let idleCount = 0;
      while (received < file.length && idleCount < 120) {
        const io = await app.service('pipes/io').create({ pipe_id: pipeId });
        const out = typeof io?.out === 'string' ? io.out : '';
        if (!out) {
          idleCount += 1;
          continue;
        }

        const raw = atob(out);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i += 1) {
          bytes[i] = raw.charCodeAt(i);
        }
        const chunk = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        chunks.push(chunk);
        received += bytes.length;
        idleCount = 0;
      }

      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloadMessage(`Downloaded ${file.filename}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download file';
      setDownloadMessage(message);
    } finally {
      if (pipeId) {
        void app.service('pipes').remove(pipeId).catch(() => undefined);
      }
      setBusyDownloadId('');
    }
  }

  async function deleteFile(file: FileRecord) {
    if (busyDeleteId) return;
    setBusyDeleteId(file._id);
    try {
      await app.service('files').remove(file._id);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setDownloadMessage(`Deleted ${file.filename}`);
    } catch (error) {
      setDownloadMessage(error instanceof Error ? error.message : 'Unable to delete file');
    } finally {
      setBusyDeleteId('');
    }
  }

  async function uploadFile(file: File) {
    if (busyUploadName) {
      return;
    }

    setBusyUploadName(file.name);
    setDownloadMessage(`Uploading ${file.name}...`);
    let pipeId = '';
    try {
      const pipe = await app.service('pipes').create({
        type: 'upload',
        source: file.name,
        filename: file.name,
        bufferSize: 65536
      });
      pipeId = String(pipe?._id ?? '');
      if (!pipeId) {
        throw new Error('Unable to open upload pipe');
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const chunkSize = 65536;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
        let binary = '';
        for (let i = 0; i < chunk.length; i += 1) {
          binary += String.fromCharCode(chunk[i]);
        }
        await app.service('pipes/io').create({ pipe_id: pipeId, in: btoa(binary) });
      }

      queryClient.invalidateQueries({ queryKey: ['files'] });
      setDownloadMessage(`Uploaded ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload file';
      setDownloadMessage(message);
    } finally {
      if (pipeId) {
        void app.service('pipes').remove(pipeId).catch(() => undefined);
      }
      setBusyUploadName('');
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Files"
        subtitle={`${files.length} file${files.length === 1 ? '' : 's'} on server`}
        action={
          <div className="row-actions">
            <input
              ref={uploadInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  void uploadFile(selected);
                }
              }}
            />
            <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={Boolean(busyUploadName)}>
              {busyUploadName ? `Uploading ${busyUploadName}...` : 'Upload file'}
            </button>
            <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ['files'] })}>Refresh</button>
          </div>
        }
      />
      <section className="panel panel--toolbar">
        <label>
          <span>Search name</span>
          <input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Filter by filename..." />
        </label>
        <label>
          <span>Implant ID</span>
          <input value={implantFilter} onChange={(e) => setImplantFilter(e.target.value)} placeholder="Optional implant filter" />
        </label>
      </section>
      {downloadMessage ? <p className="muted">{downloadMessage}</p> : null}
      <section className="panel panel--table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Implant</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={5}>
                  {result.data === undefined ? 'Loading...' : 'No files on server yet.'}
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file._id}>
                  <td><code>{file.filename}</code></td>
                  <td>{formatFileSize(file.length)}</td>
                  <td><code className="muted">{file.metadata?.implantId ? String(file.metadata.implantId).slice(0, 8) : '—'}</code></td>
                  <td>{file.uploadDate ? new Date(file.uploadDate).toLocaleString() : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => downloadFile(file)} disabled={busyDownloadId === file._id}>
                        {busyDownloadId === file._id ? 'Downloading...' : 'Download'}
                      </button>
                      <button type="button" className="btn-danger" onClick={() => deleteFile(file)} disabled={busyDeleteId === file._id}>
                        {busyDeleteId === file._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SessionPane({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <section className="panel session-pane">
      <div className="session-pane__header">
        <h2>{title}</h2>
      </div>
      {body}
    </section>
  );
}

type TunnelDraft = {
  type: 'socks' | 'tcp_fwd' | 'rev_tcp';
  bindIP: string;
  bindPort: string;
  destination: string;
  maxPipes: string;
  timeout: string;
};

const defaultTunnelDraft = (): TunnelDraft => ({
  type: 'socks',
  bindIP: '127.0.0.1',
  bindPort: '1080',
  destination: '',
  maxPipes: '',
  timeout: ''
});

function TunnelsPane({ implantId, tunnels, onRefresh, app }: {
  implantId: string;
  tunnels: Record<string, unknown>[];
  onRefresh: () => void;
  app: any;
}) {
  const [draft, setDraft] = useState<TunnelDraft>(defaultTunnelDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const needsDestination = draft.type === 'tcp_fwd' || draft.type === 'rev_tcp';

  async function createTunnel(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const port = draft.bindPort.trim();
    if (!port) { setMessage('Bind port is required.'); return; }
    if (needsDestination && !draft.destination.trim()) { setMessage('Destination is required for TCP tunnels.'); return; }
    setBusy(true);
    setMessage('');
    try {
      await app.service('tunnels').create({
        port,
        type: draft.type,
        destination: needsDestination ? draft.destination.trim() : draft.type,
        bindIP: draft.bindIP.trim() || '127.0.0.1',
        implantId,
        maxPipes: draft.maxPipes ? parseInt(draft.maxPipes, 10) : undefined,
        timeout: draft.timeout ? parseInt(draft.timeout, 10) : undefined,
        jobOptions: {}
      });
      setMessage(`${draft.type} tunnel queued on port ${port}`);
      setDraft(defaultTunnelDraft());
      onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create tunnel');
    } finally {
      setBusy(false);
    }
  }

  async function removeTunnel(tunnelId: string) {
    try {
      await app.service('tunnels').remove(tunnelId);
      onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to remove tunnel');
    }
  }

  function field(label: string, node: React.ReactNode) {
    return (
      <div className="inline-field inline-field--grow">
        <label><span>{label}</span>{node}</label>
      </div>
    );
  }

  return (
    <SessionPane
      title="Tunnels"
      body={
        <div className="session-results">
          <form className="tunnel-create-form" onSubmit={createTunnel}>
            <div className="tunnel-create-form__row">
              {field('Type',
                <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as TunnelDraft['type'] }))}>
                  <option value="socks">SOCKS</option>
                  <option value="tcp_fwd">TCP Forward</option>
                  <option value="rev_tcp">Reverse TCP</option>
                </select>
              )}
              {field('Bind IP',
                <input value={draft.bindIP} onChange={(e) => setDraft((d) => ({ ...d, bindIP: e.target.value }))} placeholder="127.0.0.1" />
              )}
              {field('Bind Port',
                <input value={draft.bindPort} onChange={(e) => setDraft((d) => ({ ...d, bindPort: e.target.value }))} placeholder="1080" />
              )}
              {needsDestination && field('Destination',
                <input value={draft.destination} onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))} placeholder="host:port" />
              )}
              {field('Max channels',
                <input value={draft.maxPipes} onChange={(e) => setDraft((d) => ({ ...d, maxPipes: e.target.value }))} placeholder="optional" />
              )}
              {field('Timeout (ms)',
                <input value={draft.timeout} onChange={(e) => setDraft((d) => ({ ...d, timeout: e.target.value }))} placeholder="optional" />
              )}
            </div>
            <div className="tunnel-create-form__actions">
              {message ? <span className="muted">{message}</span> : null}
              <button type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Tunnel'}</button>
            </div>
          </form>
          <section className="panel panel--table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Bind</th>
                  <th>Destination</th>
                  <th>Channels</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tunnels.length === 0 ? (
                  <tr><td className="empty-cell" colSpan={7}>No tunnels for this implant.</td></tr>
                ) : (
                  tunnels.map((t, i) => (
                    <tr key={String(t._id ?? i)}>
                      <td><code>{String(t._id ?? '-').slice(0, 8)}</code></td>
                      <td>{String(t.type ?? '-')}</td>
                      <td><code>{String(t.bindIP ?? '-')}:{String(t.port ?? '-')}</code></td>
                      <td><code>{String(t.destination ?? '-')}</code></td>
                      <td>{String(t.pipeNo ?? 0)}/{String(t.maxPipes ?? '∞')}</td>
                      <td>{String(t.status ?? '-')}</td>
                      <td>
                        <button type="button" onClick={() => removeTunnel(String(t._id))}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      }
    />
  );
}

export function ImplantSessionPage() {
  const { implantId } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { app } = useNuages();
  const patchTabState = useWorkspaceStore((state) => state.patchTabState);
  const currentTab = useWorkspaceStore((state) => state.tabs.find((tab) => tab.route === location.pathname));
  const [activeSubtab, setActiveSubtab] = useState((currentTab?.state.activeSubtab?.toString() as 'shell' | 'browser' | 'modules' | 'configure' | 'tunnels' | 'history' | undefined) ?? 'shell');
  const [shellSessions, setShellSessions] = useState<ShellSessionState[]>(
    parseShellSessions(currentTab?.state.shellSessions?.toString(), {
      cwd: currentTab?.state.cwd?.toString() ?? '.',
      commandDraft: currentTab?.state.commandDraft?.toString() ?? '',
      commandJobIds: parseSessionJobIds(currentTab?.state.commandJobIds?.toString())
    })
  );
  const [activeShellId, setActiveShellId] = useState<string>(currentTab?.state.activeShellId?.toString() ?? shellSessions[0]?.id ?? defaultShellSession().id);
  const [browserSessions, setBrowserSessions] = useState<BrowserSessionState[]>(
    parseBrowserSessions(currentTab?.state.browserSessions?.toString())
  );
  const [activeBrowserId, setActiveBrowserId] = useState<string>(currentTab?.state.activeBrowserId?.toString() ?? browserSessions[0]?.id ?? defaultBrowserSession().id);
  const [configKey, setConfigKey] = useState('');
  const [configValue, setConfigValue] = useState('');
  const [configDraftValues, setConfigDraftValues] = useState<Record<string, string>>({});
  const [configMessage, setConfigMessage] = useState('');
  const [busyCommand, setBusyCommand] = useState(false);
  const [busyConfigRefresh, setBusyConfigRefresh] = useState(false);
  const [busyReconfigure, setBusyReconfigure] = useState(false);
  const [busyBrowser, setBusyBrowser] = useState(false);
  const [busyTransfer, setBusyTransfer] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [showPutModal, setShowPutModal] = useState(false);
  const [putFileId, setPutFileId] = useState('');
  const [putTarget, setPutTarget] = useState('');
  const [editingShellId, setEditingShellId] = useState<string | null>(null);
  const [editingShellTitle, setEditingShellTitle] = useState('');
  const [editingBrowserId, setEditingBrowserId] = useState<string | null>(null);
  const [editingBrowserTitle, setEditingBrowserTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [moduleOptionDrafts, setModuleOptionDrafts] = useState<Record<string, string>>({});
  const [busyModuleRun, setBusyModuleRun] = useState(false);
  const [moduleMessage, setModuleMessage] = useState('');
  const implant = useServiceCollection<ImplantRecord>('implants', implantId ? { _id: implantId } : {});
  const jobs = useServiceCollection<JobRecord>('jobs', implantId ? { implantId, $limit: 200, $sort: { createdAt: -1 } } : { $limit: 200 });
  const storedFiles = useServiceCollection<FileRecord>('files', { $limit: 200, $sort: { uploadDate: -1 } }, 60_000);
  const modules = useServiceCollection<ModuleRecord>('modules', { $limit: 500, $sort: { name: 1 } }, 60_000);
  const moduleRuns = useServiceCollection<Record<string, unknown>>('modules/run', { $limit: 200, $sort: { createdAt: -1 } }, 15_000);
  const moduleLogs = useServiceCollection<ModuleLogRecord>('logs', { sourceType: 'module', $limit: 500, $sort: { time: -1 } }, 15_000);
  const tunnels = useServiceCollection<Record<string, unknown>>('tunnels', implantId ? { implantId, $limit: 100, $sort: { createdAt: -1 } } : { $limit: 100 });
  const config = useQuery({
    queryKey: ['implant-config', implantId],
    enabled: Boolean(implantId),
    staleTime: 60_000,
    queryFn: async () => {
      const implantData = await app.service('implants').get(implantId);
      return (implantData?.config ?? {}) as Record<string, string>;
    }
  });
  const implantData = implant.data?.[0];

  const implantDetails: Array<[string, string]> = [
    ['ID', implantData?._id ? String(implantData._id) : '-'],
    ['Hostname', implantData?.hostname ? String(implantData.hostname) : '-'],
    ['Username', implantData?.username ? String(implantData.username) : '-'],
    ['OS', implantData?.os ? String(implantData.os) : '-'],
    ['Local IP', implantData?.localIp ? String(implantData.localIp) : '-'],
    ['Handler', implantData?.handler ? String(implantData.handler) : '-'],
    ['Listener', implantData?.listener ? String(implantData.listener) : '-'],
    ['Last Seen', implantData?.lastSeen ? formatLastSeen(implantData.lastSeen as string | number) : '-']
  ];

  const configEntries = Object.entries(config.data ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const activeShell = useMemo(() => shellSessions.find((session) => session.id === activeShellId) ?? shellSessions[0] ?? defaultShellSession(1), [activeShellId, shellSessions]);
  const activeBrowser = useMemo(() => browserSessions.find((session) => session.id === activeBrowserId) ?? browserSessions[0] ?? defaultBrowserSession(1), [activeBrowserId, browserSessions]);
  const selectedPutFile = useMemo(() => (storedFiles.data ?? []).find((file) => file._id === putFileId), [putFileId, storedFiles.data]);
  const activeBrowserListing = activeBrowser.cache[browserCacheKey(activeBrowser.pathDraft)] ?? activeBrowser.cache[browserCacheKey(activeBrowser.cwd)];
  const orderedBrowserListing = useMemo(() => {
    if (activeBrowserListing === undefined) {
      return undefined;
    }

    const typeOrder: Record<BrowserFileEntry['type'], number> = {
      directory: 0,
      file: 1,
      other: 2
    };

    return [...activeBrowserListing].sort((left, right) => {
      const typeDelta = typeOrder[left.type] - typeOrder[right.type];
      if (typeDelta !== 0) {
        return typeDelta;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
  }, [activeBrowserListing]);
  const commandJobIdSet = useMemo(() => new Set(activeShell.commandJobIds), [activeShell.commandJobIds]);
  const sessionCommandJobs = useMemo(
    () =>
      (jobs.data ?? []).filter((job) => {
        const type = (job.payload as { type?: string } | undefined)?.type;
        return (type === 'command' || type === 'cd' || type === 'ls') && commandJobIdSet.has(job._id);
      }),
    [commandJobIdSet, jobs.data]
  );
  const compatibleModules = useMemo(() => {
    const implantOs = implantData?.os ? String(implantData.os).toLowerCase() : '';
    const supportedPayloads = Array.isArray(implantData?.supportedPayloads)
      ? implantData.supportedPayloads.map((payload) => String(payload))
      : [];

    return (modules.data ?? []).filter((module) => {
      const moduleOs = Array.isArray(module.supportedOS) ? module.supportedOS.map((entry) => String(entry).toLowerCase()) : [];
      const modulePayloads = Array.isArray(module.requiredPayloads) ? module.requiredPayloads.map((entry) => String(entry)) : [];
      const osSupported = moduleOs.length === 0 || !implantOs || moduleOs.includes(implantOs);
      const payloadsSupported = modulePayloads.every((payload) => supportedPayloads.includes(payload));
      return osSupported && payloadsSupported;
    });
  }, [implantData?.os, implantData?.supportedPayloads, modules.data]);
  const selectedModule = useMemo(
    () => compatibleModules.find((module) => module._id === selectedModuleId) ?? compatibleModules[0] ?? null,
    [compatibleModules, selectedModuleId]
  );
  const implantModuleRuns = useMemo(
    () =>
      (moduleRuns.data ?? [])
        .filter((run) => {
          const options = run.options as Record<string, { value?: unknown }> | undefined;
          const implantValue = options?.implant?.value;
          return implantId && typeof implantValue === 'string' && implantValue === implantId;
        })
        .slice(0, 25),
    [implantId, moduleRuns.data]
  );
  const moduleLogsByRun = useMemo(() => {
    const grouped = new Map<string, ModuleLogRecord[]>();
    for (const entry of moduleLogs.data ?? []) {
      const runId = typeof entry.sourceId === 'string' ? entry.sourceId : '';
      if (!runId) {
        continue;
      }
      const current = grouped.get(runId) ?? [];
      current.push(entry);
      grouped.set(runId, current);
    }
    return grouped;
  }, [moduleLogs.data]);

  async function waitForJobResult(jobId: string): Promise<JobRecord> {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const job = (await app.service('jobs').get(jobId)) as JobRecord;
      if ((job.jobStatus ?? 0) > 2) {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Timed out waiting for implant response');
  }

  async function refreshConfig() {
    if (!implantId || busyConfigRefresh) {
      return;
    }

    setBusyConfigRefresh(true);
    setConfigMessage('Refreshing config from implant...');
    try {
      const timeoutAt = Date.now() + 300_000;
      const job = (await app.service('jobs').create({
        implantId,
        timeout: timeoutAt,
        payload: {
          type: 'configure',
          options: {
            config: {}
          }
        }
      })) as JobRecord;

      const result = await waitForJobResult(job._id);
      const parsed = parseConfigResult(result.result);
      queryClient.setQueryData(['implant-config', implantId], parsed);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['implants'] });
      setConfigMessage('Config refreshed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh config';
      setConfigMessage(message);
    } finally {
      setBusyConfigRefresh(false);
    }
  }

  async function reconfigureImplant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!implantId || !configKey.trim() || busyReconfigure) {
      return;
    }

    const patch = { [configKey.trim()]: configValue };
    await applyConfigPatch(patch, `Reconfigure job queued for ${configKey.trim()}`);
    setConfigKey('');
    setConfigValue('');
  }

  async function applyConfigPatch(patch: Record<string, string>, successMessage: string) {
    if (!implantId || busyReconfigure) {
      return;
    }

    setBusyReconfigure(true);
    setConfigMessage('Sending reconfigure request...');
    try {
      const timeoutAt = Date.now() + 300_000;
      await app.service('jobs').create({
        implantId,
        timeout: timeoutAt,
        payload: {
          type: 'configure',
          options: {
            config: patch
          }
        }
      });

      queryClient.setQueryData<Record<string, string>>(['implant-config', implantId], (current = {}) => ({
        ...current,
        ...patch
      }));
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setConfigMessage(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reconfigure implant';
      setConfigMessage(message);
    } finally {
      setBusyReconfigure(false);
    }
  }

  useEffect(() => {
    if (!currentTab) {
      return;
    }

    const nextShellSessions = parseShellSessions(currentTab.state.shellSessions?.toString(), {
      cwd: currentTab.state.cwd?.toString() ?? '.',
      commandDraft: currentTab.state.commandDraft?.toString() ?? '',
      commandJobIds: parseSessionJobIds(currentTab.state.commandJobIds?.toString())
    });
    const preferredShellId = currentTab.state.activeShellId?.toString();
    const resolvedShellId = nextShellSessions.some((session) => session.id === preferredShellId) ? String(preferredShellId) : nextShellSessions[0].id;
    const nextBrowserSessions = parseBrowserSessions(currentTab.state.browserSessions?.toString());
    const preferredBrowserId = currentTab.state.activeBrowserId?.toString();
    const resolvedBrowserId = nextBrowserSessions.some((session) => session.id === preferredBrowserId) ? String(preferredBrowserId) : nextBrowserSessions[0].id;

    setShellSessions(nextShellSessions);
    setActiveShellId(resolvedShellId);
    setBrowserSessions(nextBrowserSessions);
    setActiveBrowserId(resolvedBrowserId);
    setActiveSubtab((currentTab.state.activeSubtab?.toString() as 'shell' | 'browser' | 'modules' | 'configure' | 'tunnels' | 'history' | undefined) ?? 'shell');
    setEditingShellId(null);
    setEditingShellTitle('');
    setEditingBrowserId(null);
    setEditingBrowserTitle('');
  }, [currentTab?.id]);

  useEffect(() => {
    if (shellSessions.length === 0) {
      setShellSessions([defaultShellSession(1)]);
      return;
    }

    if (!shellSessions.some((session) => session.id === activeShellId)) {
      setActiveShellId(shellSessions[0].id);
    }
  }, [activeShellId, shellSessions]);

  useEffect(() => {
    if (browserSessions.length === 0) {
      setBrowserSessions([defaultBrowserSession(1)]);
      return;
    }

    if (!browserSessions.some((session) => session.id === activeBrowserId)) {
      setActiveBrowserId(browserSessions[0].id);
    }
  }, [activeBrowserId, browserSessions]);

  useEffect(() => {
    const currentSubtab = (currentTab?.state.activeSubtab?.toString() as 'shell' | 'browser' | 'configure' | 'tunnels' | 'history' | undefined) ?? 'shell';
    const currentActiveShellId = currentTab?.state.activeShellId?.toString() ?? '';
    const currentActiveBrowserId = currentTab?.state.activeBrowserId?.toString() ?? '';
    const currentShellsRaw = currentTab?.state.shellSessions?.toString() ?? '[]';
    const currentBrowsersRaw = currentTab?.state.browserSessions?.toString() ?? '[]';
    const serializedShells = shellSessions.map((session, index) => ({
      id: session.id,
      title: session.title || `Shell ${index + 1}`,
      cwd: session.cwd || '.',
      commandDraft: session.commandDraft,
      commandJobIds: session.commandJobIds.slice(0, 300)
    }));
    const serializedBrowsers = browserSessions.map((session, index) => {
      const normalizedCache: Record<string, BrowserFileEntry[]> = {};
      for (const [key, value] of Object.entries(session.cache)) {
        normalizedCache[key] = value.slice(0, 500);
      }

      return {
        id: session.id,
        title: session.title || `Browser ${index + 1}`,
        pathDraft: session.pathDraft || '.',
        cwd: session.cwd || '.',
        resolved: session.resolved,
        cache: normalizedCache
      };
    });
    const nextShellsRaw = JSON.stringify(serializedShells);
    const nextBrowsersRaw = JSON.stringify(serializedBrowsers);
    const nextLegacyJobIdsRaw = JSON.stringify(activeShell.commandJobIds.slice(0, 300));

    if (currentTab && (currentSubtab !== activeSubtab || currentActiveShellId !== activeShell.id || currentActiveBrowserId !== activeBrowser.id || currentShellsRaw !== nextShellsRaw || currentBrowsersRaw !== nextBrowsersRaw)) {
      patchTabState(currentTab.id, {
        activeSubtab,
        activeShellId: activeShell.id,
        activeBrowserId: activeBrowser.id,
        shellSessions: nextShellsRaw,
        browserSessions: nextBrowsersRaw,
        commandDraft: activeShell.commandDraft,
        cwd: activeShell.cwd,
        commandJobIds: nextLegacyJobIdsRaw
      });
    }
  }, [activeBrowser, activeShell, activeSubtab, browserSessions, currentTab, patchTabState, shellSessions]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.data ?? {})) {
      nextDrafts[key] = String(value);
    }
    setConfigDraftValues(nextDrafts);
  }, [config.data]);

  useEffect(() => {
    if (activeSubtab !== 'browser' || busyBrowser) {
      return;
    }

    if (activeBrowser.resolved) {
      return;
    }

    void browsePath('.', true);
  }, [activeBrowser.id, activeBrowser.resolved, activeSubtab, busyBrowser]);

  useEffect(() => {
    if (compatibleModules.length === 0) {
      setSelectedModuleId('');
      return;
    }

    if (!compatibleModules.some((module) => module._id === selectedModuleId)) {
      setSelectedModuleId(compatibleModules[0]._id);
    }
  }, [compatibleModules, selectedModuleId]);

  useEffect(() => {
    if (!selectedModule) {
      setModuleOptionDrafts({});
      return;
    }

    const nextDrafts: Record<string, string> = {};
    for (const [key, definition] of Object.entries(selectedModule.options ?? {})) {
      nextDrafts[key] = definition?.value === undefined || definition?.value === null ? '' : String(definition.value);
    }
    if (implantId && Object.prototype.hasOwnProperty.call(selectedModule.options ?? {}, 'implant')) {
      nextDrafts.implant = implantId;
    }
    setModuleOptionDrafts(nextDrafts);
    setModuleMessage('');
  }, [implantId, selectedModule?._id]);

  if (!implantId) {
    return <Navigate to="/implants" replace />;
  }

  function commitShellRename(sessionId: string) {
    const trimmed = editingShellTitle.trim();
    setShellSessions((current) =>
      current.map((session, index) =>
        session.id === sessionId ? { ...session, title: trimmed.length > 0 ? trimmed : `Shell ${index + 1}` } : session
      )
    );
    setEditingShellId(null);
    setEditingShellTitle('');
  }

  function commitBrowserRename(sessionId: string) {
    const trimmed = editingBrowserTitle.trim();
    setBrowserSessions((current) =>
      current.map((session, index) =>
        session.id === sessionId ? { ...session, title: trimmed.length > 0 ? trimmed : `Browser ${index + 1}` } : session
      )
    );
    setEditingBrowserId(null);
    setEditingBrowserTitle('');
  }

  async function browsePath(requestPath: string, forceRefresh = false) {
    if (!implantId || busyBrowser) {
      return;
    }

    const target = requestPath.trim() || '.';
    const targetKey = browserCacheKey(target);
    const cached = activeBrowser.cache[targetKey];
    if (!forceRefresh && activeBrowser.resolved && cached !== undefined) {
      setBrowserSessions((current) =>
        current.map((session) =>
          session.id === activeBrowser.id
            ? {
                ...session,
                pathDraft: target,
                cwd: target
              }
            : session
        )
      );
      return;
    }

    setBusyBrowser(true);
    try {
      const created = (await app.service('jobs').create(lsJobPayload(target, implantId))) as JobRecord;
      const finished = await waitForJobResult(created._id);
      const parsed = parseLsResult(finished.result);
      const resolvedPath = parsed.cwd || target;
      const resolvedKey = browserCacheKey(resolvedPath);

      setBrowserSessions((current) =>
        current.map((session) =>
          session.id === activeBrowser.id
            ? {
                ...session,
                cwd: resolvedPath,
                pathDraft: resolvedPath,
                resolved: true,
                cache: {
                  ...session.cache,
                  [targetKey]: parsed.files,
                  [resolvedKey]: parsed.files
                }
              }
            : session
        )
      );
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } finally {
      setBusyBrowser(false);
    }
  }

  async function queueGet(remoteName: string) {
    if (!implantId || busyTransfer) {
      return;
    }

    const remotePath = joinBrowserPath(activeBrowser.cwd, remoteName);
    setBusyTransfer(true);
    setTransferMessage(`Queuing get for ${remoteName}...`);
    try {
      await app.service('jobs').create({
        ...uploadJobPayload(remotePath, activeBrowser.cwd, implantId),
        pipe: uploadPipePayload(remotePath, remoteName, implantId)
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setTransferMessage(`Get queued: ${remoteName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to queue get job';
      setTransferMessage(message);
    } finally {
      setBusyTransfer(false);
    }
  }

  async function queuePut(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!implantId || busyTransfer || !putFileId) {
      return;
    }

    const selectedFile = (storedFiles.data ?? []).find((file) => file._id === putFileId);
    if (!selectedFile) {
      setTransferMessage('Select a valid file to put.');
      return;
    }

    const target = putTarget.trim() || selectedFile.filename;
    setBusyTransfer(true);
    setTransferMessage(`Queuing put for ${selectedFile.filename}...`);
    try {
      await app.service('jobs').create({
        ...downloadJobPayload(target, selectedFile.filename, selectedFile.length, activeBrowser.cwd, implantId),
        pipe: downloadPipePayload(selectedFile._id, target, implantId)
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setTransferMessage(`Put queued: ${selectedFile.filename} -> ${target}`);
      setPutTarget('');
      setShowPutModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to queue put job';
      setTransferMessage(message);
    } finally {
      setBusyTransfer(false);
    }
  }

  async function runModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!implantId || !selectedModule || busyModuleRun) {
      return;
    }

    const optionDefinitions = selectedModule.options ?? {};
    const optionsPayload: Record<string, ModuleOptionDefinition> = {};
    for (const [key, definition] of Object.entries(optionDefinitions)) {
      const value = key === 'implant' ? implantId : moduleOptionDrafts[key] ?? (definition.value === undefined ? '' : String(definition.value));
      optionsPayload[key] = {
        ...definition,
        value
      };
    }

    setBusyModuleRun(true);
    setModuleMessage(`Running ${selectedModule.name ?? 'module'}...`);
    try {
      await app.service('modules/run').create({
        moduleId: selectedModule._id,
        options: optionsPayload,
        autorun: false
      });
      setModuleMessage(`Run queued: ${selectedModule.name ?? selectedModule._id}`);
      queryClient.invalidateQueries({ queryKey: ['modules/run'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error) {
      setModuleMessage(error instanceof Error ? error.message : 'Unable to run module');
    } finally {
      setBusyModuleRun(false);
    }
  }

  return (
    <div className="page-stack implant-compact">
      <PageHeader title={`Implant session ${implantId.slice(0, 8)}`} subtitle="Interactive command workspace and recent job stream." />
      <section className="session-subtabs" role="tablist" aria-label="Implant session views">
        <button type="button" className={`session-subtabs__item ${activeSubtab === 'shell' ? 'active' : ''}`} onClick={() => setActiveSubtab('shell')}>
          Shell
        </button>
        <button type="button" className={`session-subtabs__item ${activeSubtab === 'browser' ? 'active' : ''}`} onClick={() => setActiveSubtab('browser')}>
          Browser
        </button>
        <button type="button" className={`session-subtabs__item ${activeSubtab === 'modules' ? 'active' : ''}`} onClick={() => setActiveSubtab('modules')}>
          Modules
        </button>
        <button type="button" className={`session-subtabs__item ${activeSubtab === 'configure' ? 'active' : ''}`} onClick={() => setActiveSubtab('configure')}>
          Configure
        </button>
        <button type="button" className={`session-subtabs__item ${activeSubtab === 'tunnels' ? 'active' : ''}`} onClick={() => setActiveSubtab('tunnels')}>
          Tunnels
        </button>
        <button type="button" className={`session-subtabs__item ${activeSubtab === 'history' ? 'active' : ''}`} onClick={() => setActiveSubtab('history')}>
          Job History
        </button>
      </section>

      {activeSubtab === 'shell' ? (
        <SessionPane
          title="Shell"
          body={
            <>
              <section className="shell-session-menu" aria-label="Shell sessions">
                {shellSessions.map((session) =>
                  editingShellId === session.id ? (
                    <input
                      key={session.id}
                      className="session-subtabs__rename"
                      value={editingShellTitle}
                      autoFocus
                      onChange={(event) => setEditingShellTitle(event.target.value)}
                      onBlur={() => commitShellRename(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitShellRename(session.id);
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingShellId(null);
                          setEditingShellTitle('');
                        }
                      }}
                    />
                  ) : (
                    <button
                      key={session.id}
                      type="button"
                      className={`session-subtabs__item ${session.id === activeShell.id ? 'active' : ''}`}
                      onClick={() => setActiveShellId(session.id)}
                      onDoubleClick={() => {
                        setEditingShellId(session.id);
                        setEditingShellTitle(session.title);
                      }}
                      title="Double-click to rename"
                    >
                      {session.title}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="session-subtabs__item"
                  onClick={() => {
                    setShellSessions((current) => {
                      const next = [...current, defaultShellSession(current.length + 1)];
                      setActiveShellId(next[next.length - 1].id);
                      return next;
                    });
                  }}
                >
                  + New Shell
                </button>
              </section>
              <section className="shell-cwd-banner" aria-label="Current working directory">
                <span className="shell-cwd-banner__label">Current directory</span>
                <code>{activeShell.cwd}</code>
              </section>
              <form
                className="session-form session-form--compact"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const nextCommand = activeShell.commandDraft.trim();
                  if (!nextCommand || busyCommand) {
                    return;
                  }

                  setBusyCommand(true);
                  try {
                    const cdMatch = nextCommand.match(/^cd(?:\s+(.*))?$/i);
                    const isCd = Boolean(cdMatch);
                    const cdTarget = (cdMatch?.[1] ?? '').trim();

                    const createdJob = (await app
                      .service('jobs')
                      .create(
                        isCd
                          ? cdJobPayload(cdTarget, activeShell.cwd, implantId)
                          : jobPayload(nextCommand, activeShell.cwd, implantId)
                      )) as JobRecord;

                    setShellSessions((current) =>
                      current.map((session) => {
                        if (session.id !== activeShell.id) {
                          return session;
                        }

                        return {
                          ...session,
                          commandDraft: '',
                          commandJobIds: [createdJob._id, ...session.commandJobIds.filter((id: string) => id !== createdJob._id)].slice(0, 300)
                        };
                      })
                    );

                    if (isCd) {
                      try {
                        const finished = await waitForJobResult(createdJob._id);
                        if ((finished.jobStatus ?? 0) === 3 && typeof finished.result === 'string' && finished.result.trim()) {
                          const nextCwd = finished.result.trim();
                          setShellSessions((current) =>
                            current.map((session) =>
                              session.id === activeShell.id ? { ...session, cwd: nextCwd } : session
                            )
                          );
                        }
                      } catch {
                        // Keep existing cwd when cd did not complete successfully.
                      }
                    }

                    queryClient.invalidateQueries({ queryKey: ['jobs'] });
                  } finally {
                    setBusyCommand(false);
                  }
                }}
              >
                <div className="inline-field inline-field--grow">
                  <label>
                    <span>command</span>
                    <input
                      value={activeShell.commandDraft}
                      onChange={(event) =>
                        setShellSessions((current) =>
                          current.map((session) =>
                            session.id === activeShell.id ? { ...session, commandDraft: event.target.value } : session
                          )
                        )
                      }
                      placeholder="whoami"
                    />
                  </label>
                </div>
                <button type="submit" disabled={busyCommand}>
                  {busyCommand ? 'Running...' : 'Run'}
                </button>
              </form>
              <div className="shell-results">
                {sessionCommandJobs.map((job, index) => {
                  const type = String((job.payload as { type?: string } | undefined)?.type ?? 'command');
                  const options = (job.payload as { options?: { cmd?: string; dir?: string; path?: string } } | undefined)?.options;
                  const cmd =
                    type === 'cd'
                      ? `cd ${String(options?.dir ?? '').trim()}`.trim()
                      : type === 'ls'
                        ? `ls ${String(options?.path ?? '').trim()}`.trim()
                        : String(options?.cmd ?? 'command');
                  return (
                    <details key={job._id} className="result-collapsible" open={index < 3}>
                      <summary>
                        <span className="result-summary-id">{job._id.slice(0, 8)}</span>
                        <StatusBadge value={describeJobStatus(job.jobStatus)} />
                        <span className="result-summary-type">{cmd}</span>
                      </summary>
                      <pre>{job.result ?? 'No output yet.'}</pre>
                    </details>
                  );
                })}
                {sessionCommandJobs.length === 0 ? <p className="muted">No shell commands executed in this session yet.</p> : null}
              </div>
            </>
          }
        />
      ) : null}

      {activeSubtab === 'browser' ? (
        <SessionPane
          title="Browser"
          body={
            <>
              <section className="shell-session-menu" aria-label="Browser sessions">
                {browserSessions.map((session) =>
                  editingBrowserId === session.id ? (
                    <input
                      key={session.id}
                      className="session-subtabs__rename"
                      value={editingBrowserTitle}
                      autoFocus
                      onChange={(event) => setEditingBrowserTitle(event.target.value)}
                      onBlur={() => commitBrowserRename(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitBrowserRename(session.id);
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingBrowserId(null);
                          setEditingBrowserTitle('');
                        }
                      }}
                    />
                  ) : (
                    <button
                      key={session.id}
                      type="button"
                      className={`session-subtabs__item ${session.id === activeBrowser.id ? 'active' : ''}`}
                      onClick={() => setActiveBrowserId(session.id)}
                      onDoubleClick={() => {
                        setEditingBrowserId(session.id);
                        setEditingBrowserTitle(session.title);
                      }}
                      title="Double-click to rename"
                    >
                      {session.title}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="session-subtabs__item"
                  onClick={() => {
                    setBrowserSessions((current) => {
                      const next = [...current, defaultBrowserSession(current.length + 1)];
                      setActiveBrowserId(next[next.length - 1].id);
                      return next;
                    });
                  }}
                >
                  + New Browser
                </button>
              </section>
              <section className="shell-cwd-banner" aria-label="Current browsing directory">
                <span className="shell-cwd-banner__label">Current directory</span>
                <code>{activeBrowser.cwd}</code>
              </section>
              <form
                className="session-form session-form--compact browser-path-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await browsePath(activeBrowser.pathDraft, true);
                }}
              >
                <div className="inline-field inline-field--grow">
                  <label>
                    <span>path</span>
                    <input
                      value={activeBrowser.pathDraft}
                      onChange={(event) =>
                        setBrowserSessions((current) =>
                          current.map((session) =>
                            session.id === activeBrowser.id ? { ...session, pathDraft: event.target.value } : session
                          )
                        )
                      }
                      placeholder="."
                    />
                  </label>
                </div>
                <button type="submit" className="browser-refresh-button" disabled={busyBrowser} title="Refresh">
                  <RefreshCw className={`browser-refresh-icon ${busyBrowser ? 'spinning' : ''}`} size={16} aria-hidden="true" />
                </button>
                <button type="button" className="browser-put-button" onClick={() => setShowPutModal(true)}>
                  Put
                </button>
              </form>
              {showPutModal ? (
                <div className="modal-backdrop" role="presentation" onClick={() => setShowPutModal(false)}>
                  <section className="modal-card" role="dialog" aria-modal="true" aria-label="Put file" onClick={(event) => event.stopPropagation()}>
                    <header className="modal-card__header">
                      <h3>Put File</h3>
                      <button type="button" className="modal-close" onClick={() => setShowPutModal(false)} aria-label="Close put dialog">
                        x
                      </button>
                    </header>
                    <form className="session-form session-form--compact browser-transfer-form" onSubmit={queuePut}>
                      <div className="inline-field inline-field--grow browser-file-picker">
                        <label>
                          <span>stored files</span>
                        </label>
                        <div className="browser-file-picks" role="listbox" aria-label="Stored files">
                          {(storedFiles.data ?? []).slice(0, 24).map((file) => (
                            <button
                              key={file._id}
                              type="button"
                              className={`browser-file-pick ${putFileId === file._id ? 'active' : ''}`}
                              onClick={() => {
                                setPutFileId(file._id);
                                if (!putTarget.trim()) {
                                  setPutTarget(file.filename);
                                }
                              }}
                              title={file.filename}
                            >
                              <span>{file.filename}</span>
                              <small>{formatFileSize(file.length)}</small>
                            </button>
                          ))}
                          {(storedFiles.data ?? []).length === 0 ? <p className="muted">No stored files yet.</p> : null}
                        </div>
                      </div>
                      <div className="inline-field inline-field--grow">
                        <label>
                          <span>remote target</span>
                          <input value={putTarget} onChange={(event) => setPutTarget(event.target.value)} placeholder="defaults to file name" />
                        </label>
                        {selectedPutFile ? <span className="muted">Selected: {selectedPutFile.filename}</span> : null}
                      </div>
                      <div className="modal-actions">
                        <button type="button" onClick={() => setShowPutModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" disabled={busyTransfer || !putFileId}>
                          {busyTransfer ? 'Queuing...' : 'Put'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}
              {transferMessage ? <p className="muted">{transferMessage}</p> : null}
              <section className="panel panel--table browser-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="table-link"
                          onClick={async () => {
                            const nextPath = parentBrowserPath(activeBrowser.cwd);
                            setBrowserSessions((current) =>
                              current.map((session) =>
                                session.id === activeBrowser.id ? { ...session, pathDraft: nextPath } : session
                              )
                            );
                            await browsePath(nextPath, false);
                          }}
                        >
                          ..
                        </button>
                      </td>
                      <td>directory</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                    {orderedBrowserListing === undefined ? (
                      <tr>
                        <td className="empty-cell" colSpan={4}>
                          No cached listing for this path yet. Use refresh.
                        </td>
                      </tr>
                    ) : (
                      orderedBrowserListing.map((entry) => (
                        <tr key={`${entry.type}:${entry.name}`}>
                          <td>
                            {entry.type === 'directory' ? (
                              <button
                                type="button"
                                className="browser-link"
                                onClick={async () => {
                                  const nextPath = joinBrowserPath(activeBrowser.cwd, entry.name);
                                  setBrowserSessions((current) =>
                                    current.map((session) =>
                                      session.id === activeBrowser.id ? { ...session, pathDraft: nextPath } : session
                                    )
                                  );
                                  await browsePath(nextPath, false);
                                }}
                              >
                                {entry.name}
                              </button>
                            ) : (
                              entry.name
                            )}
                          </td>
                          <td>{entry.type}</td>
                          <td>{entry.type === 'file' ? formatFileSize(entry.size) : '-'}</td>
                          <td>
                            {entry.type === 'file' ? (
                              <button type="button" onClick={() => queueGet(entry.name)} disabled={busyTransfer}>
                                Get
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </>
          }
        />
      ) : null}

      {activeSubtab === 'modules' ? (
        <SessionPane
          title="Modules"
          body={
            <>
              <form className="session-form session-form--compact" onSubmit={runModule}>
                <div className="inline-field inline-field--grow">
                  <label>
                    <span>module</span>
                    <select value={selectedModule?._id ?? ''} onChange={(event) => setSelectedModuleId(event.target.value)}>
                      {compatibleModules.map((module) => (
                        <option key={module._id} value={module._id}>
                          {module.name ?? module._id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit" disabled={busyModuleRun || !selectedModule}>
                  {busyModuleRun ? 'Running...' : 'Run module'}
                </button>
              </form>
              {selectedModule?.description ? <p className="muted">{selectedModule.description}</p> : null}
              {compatibleModules.length === 0 ? <p className="muted">No modules are compatible with this implant.</p> : null}
              {selectedModule ? (
                <section className="panel panel--table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Option</th>
                        <th>Value</th>
                        <th>Required</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedModule.options ?? {})
                        .filter(([key]) => key !== 'implant')
                        .map(([key, definition]) => {
                          const normalizedKey = key.toLowerCase();
                          const isFileOption = normalizedKey === 'file';
                          const selectedFile = (storedFiles.data ?? []).find((file) => file._id === moduleOptionDrafts[key]);

                          return (
                            <tr key={key}>
                              <td>{key}</td>
                              <td>
                                <div className="session-results">
                                  <input
                                    value={moduleOptionDrafts[key] ?? ''}
                                    onChange={(event) => setModuleOptionDrafts((current) => ({ ...current, [key]: event.target.value }))}
                                  />
                                  {isFileOption ? (
                                    <select
                                      value={moduleOptionDrafts[key] ?? ''}
                                      onChange={(event) => setModuleOptionDrafts((current) => ({ ...current, [key]: event.target.value }))}
                                    >
                                      <option value="">Select stored file...</option>
                                      {(storedFiles.data ?? []).map((file) => (
                                        <option key={file._id} value={file._id}>
                                          {file.filename} ({file._id.slice(0, 8)})
                                        </option>
                                      ))}
                                    </select>
                                  ) : null}
                                  {isFileOption && selectedFile ? <span className="muted">Selected: {selectedFile.filename}</span> : null}
                                </div>
                              </td>
                              <td>{definition.required ? 'Yes' : 'No'}</td>
                              <td>{definition.description ?? '—'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </section>
              ) : null}
              {moduleMessage ? <p className="muted">{moduleMessage}</p> : null}
              <section className="panel panel--table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Status</th>
                      <th>Result</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {implantModuleRuns.length === 0 ? (
                      <tr>
                        <td className="empty-cell" colSpan={4}>No module runs for this implant yet.</td>
                      </tr>
                    ) : (
                      implantModuleRuns.map((run, index) => {
                        const runId = String(run._id ?? '');
                        const runLogs = runId ? moduleLogsByRun.get(runId) ?? [] : [];
                        const latestLog = runLogs[0];
                        const statusNumber = typeof run.runStatus === 'number' ? run.runStatus : Number(run.runStatus);
                        const statusLabel = describeRunStatus(statusNumber);
                        const resultLabel = latestLog?.message
                          ? String(latestLog.message)
                          : statusNumber === 4
                            ? 'Failed, no module log returned'
                            : statusNumber === 3
                              ? 'Completed'
                              : 'Pending output';

                        return (
                          <tr key={String(run._id ?? index)}>
                            <td>{String(run.moduleName ?? run.moduleId ?? '—')}</td>
                            <td>{statusLabel}</td>
                            <td>
                              {runLogs.length > 0 ? (
                                <details className="result-collapsible">
                                  <summary>
                                    <span className="result-summary-type">{resultLabel}</span>
                                  </summary>
                                  <pre>{runLogs.map((entry) => `[${entry.type === 1 ? 'ERROR' : entry.type === 2 ? 'SUCCESS' : 'INFO'}] ${entry.message ?? ''}`).join('\n')}</pre>
                                </details>
                              ) : (
                                resultLabel
                              )}
                            </td>
                            <td>{run.lastUpdated ? new Date(Number(run.lastUpdated)).toLocaleString() : '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </section>
            </>
          }
        />
      ) : null}

      {activeSubtab === 'tunnels' ? (
        <TunnelsPane implantId={implantId} tunnels={tunnels.data ?? []} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['tunnels'] })} app={app} />
      ) : null}

      {activeSubtab === 'configure' ? (
        <SessionPane
          title="Configure"
          body={
            <div className="session-results">
              <div className="row-actions">
                <button type="button" onClick={refreshConfig} disabled={busyConfigRefresh}>
                  {busyConfigRefresh ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {configMessage ? <p className="muted">{configMessage}</p> : null}
              <section className="implant-details-grid">
                {implantDetails.map(([label, value]) => (
                  <article key={label} className="implant-detail-item">
                    <span className="implant-detail-item__label">{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </section>
              <section className="panel panel--table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Current value</th>
                      <th>New value</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configEntries.length === 0 ? (
                      <tr>
                        <td className="empty-cell" colSpan={4}>
                          No config cached yet. Use Refresh.
                        </td>
                      </tr>
                    ) : (
                      configEntries.map(([key, value]) => {
                        const nextValue = configDraftValues[key] ?? value;
                        const unchanged = String(nextValue) === String(value);
                        return (
                          <tr key={key}>
                            <td>{key}</td>
                            <td>{String(value)}</td>
                            <td>
                              <input
                                value={nextValue}
                                onChange={(event) => setConfigDraftValues((current) => ({ ...current, [key]: event.target.value }))}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                disabled={busyReconfigure || unchanged}
                                onClick={() => applyConfigPatch({ [key]: String(nextValue) }, `Reconfigure job queued for ${key}`)}
                              >
                                Apply
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </section>
              <form className="session-form session-form--compact" onSubmit={reconfigureImplant}>
                <div className="inline-field">
                  <label>
                    <span>new key</span>
                    <input value={configKey} onChange={(event) => setConfigKey(event.target.value)} placeholder="sleep" />
                  </label>
                </div>
                <div className="inline-field inline-field--grow">
                  <label>
                    <span>new value</span>
                    <input value={configValue} onChange={(event) => setConfigValue(event.target.value)} placeholder="30" />
                  </label>
                </div>
                <button type="submit" disabled={busyReconfigure || !configKey.trim()}>
                  {busyReconfigure ? 'Sending...' : 'Add/Update Key'}
                </button>
              </form>
            </div>
          }
        />
      ) : null}

      {activeSubtab === 'history' ? (
        <SessionPane
          title="Job History"
          body={
            <div className="session-results">
              {(jobs.data ?? []).map((job, index) => (
                <details key={job._id} className="result-collapsible" open={index === 0}>
                  <summary>
                    <span className="result-summary-id">{job._id.slice(0, 8)}</span>
                    <StatusBadge value={describeJobStatus(job.jobStatus)} />
                    <span className="result-summary-type">{String((job.payload as { type?: string } | undefined)?.type ?? 'job')}</span>
                  </summary>
                  <pre>{job.result ?? 'No output yet.'}</pre>
                </details>
              ))}
              {(jobs.data ?? []).length === 0 ? (
                <p className="muted">No jobs yet for this implant.</p>
              ) : null}
            </div>
          }
        />
      ) : null}

    </div>
  );
}

export function JobSessionPage() {
  const { jobId } = useParams();
  const { app } = useNuages();
  const job = useServiceCollection<JobRecord>('jobs', jobId ? { _id: jobId } : {});

  if (!jobId) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="page-stack">
      <PageHeader title={`Job session ${jobId.slice(0, 8)}`} subtitle="Track the job timeline, output, and final result." />
      <SessionPane title="Metadata" body={<pre className="monospace-block">{JSON.stringify(job.data?.[0] ?? {}, null, 2)}</pre>} />
      <SessionPane
        title="Result"
        body={
          <div className="session-results">
            <pre className="monospace-block">{job.data?.[0]?.result ?? 'No result yet.'}</pre>
            <button type="button" onClick={() => app.service('jobs').find({ query: { _id: jobId } })}>
              Refresh
            </button>
          </div>
        }
      />
    </div>
  );
}

export function ModulesPage() {
  return <ServiceTable<Record<string, unknown>> title="Modules" subtitle="Loaded modules, metadata, and execution state." serviceName="modules" columns={[{ key: 'name', label: 'Name' }, { key: 'supportedOS', label: 'Supported OS' }, { key: 'description', label: 'Description' }]} />;
}

export function HandlersPage() {
  return <ServiceTable<Record<string, unknown>> title="Handlers" subtitle="Handler registry and configuration surface." serviceName="handlers" columns={[{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'external', label: 'External' }, { key: 'description', label: 'Description' }]} />;
}

export function ListenersPage() {
  const { app } = useNuages();
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedHandlerId, setSelectedHandlerId] = useState('');
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  const [busyCreate, setBusyCreate] = useState(false);
  const [createMessage, setCreateMessage] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handlers = useServiceCollection<Record<string, unknown>>('handlers', { $limit: 50 }, 60_000);
  const listenerRows = useServiceCollection<Record<string, unknown>>('listeners', { $limit: 100 });
  const selectedHandler = (handlers.data ?? []).find((h) => h._id === selectedHandlerId);
  const handlerOptions = selectedHandler?.options as Record<string, { required?: boolean; description?: string; value?: string }> | undefined;

  async function createListener(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedHandlerId) { setCreateMessage('Select a handler first.'); return; }
    setBusyCreate(true);
    setCreateMessage('');
    try {
      const builtOptions: Record<string, { value: string }> = {};
      for (const [key, def] of Object.entries(handlerOptions ?? {})) {
        builtOptions[key] = { value: optionValues[key] ?? def.value ?? '' };
      }
      await app.service('listeners').create({ handlerId: selectedHandlerId, options: builtOptions });
      queryClient.invalidateQueries({ queryKey: ['listeners'] });
      setCreateMessage('Listener created.');
      setShowNewForm(false);
      setSelectedHandlerId('');
      setOptionValues({});
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : 'Failed to create listener');
    } finally {
      setBusyCreate(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Listeners"
        subtitle="Start, stop, and inspect listener state."
        action={
          <button type="button" onClick={() => { setShowNewForm((v) => !v); setCreateMessage(''); }}>
            {showNewForm ? 'Cancel' : '+ New Listener'}
          </button>
        }
      />
      {showNewForm ? (
        <section className="panel">
          <h2>New Listener</h2>
          <form className="listener-create-form" onSubmit={createListener}>
            <div className="listener-create-form__section">
              <span className="listener-create-form__label">Handler</span>
              <div className="handler-picker">
                {(handlers.data ?? []).length === 0 ? (
                  <span className="muted">No handlers available.</span>
                ) : (
                  (handlers.data ?? []).map((h) => (
                    <button
                      key={String(h._id)}
                      type="button"
                      className={`handler-pick ${selectedHandlerId === String(h._id) ? 'active' : ''}`}
                      onClick={() => { setSelectedHandlerId(String(h._id)); setOptionValues({}); }}
                    >
                      <span className="handler-pick__name">{String(h.name ?? h._id)}</span>
                      {h.description ? <small className="handler-pick__desc">{String(h.description).slice(0, 60)}</small> : null}
                    </button>
                  ))
                )}
              </div>
            </div>
            {handlerOptions && Object.keys(handlerOptions).length > 0 ? (
              <div className="listener-options-grid">
                {Object.entries(handlerOptions).map(([key, def]) => (
                  <div key={key} className="inline-field">
                    <label>
                      <span>{key}{def.required ? ' *' : ''}</span>
                      <input
                        value={optionValues[key] ?? def.value ?? ''}
                        onChange={(e) => setOptionValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={def.description ?? key}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="listener-create-form__actions">
              {createMessage ? <span className="muted">{createMessage}</span> : null}
              <button type="submit" disabled={busyCreate || !selectedHandlerId}>
                {busyCreate ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
      {createMessage && !showNewForm ? <p className="muted">{createMessage}</p> : null}
      <section className="panel panel--table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Config</th>
              <th>Implants</th>
              <th>Status</th>
              <th>Handler</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(listenerRows.data ?? []).length === 0 ? (
              <tr><td className="empty-cell" colSpan={5}>No listeners yet.</td></tr>
            ) : (
              (listenerRows.data ?? []).flatMap((row, i) => {
                const id = String(row._id ?? i);
                const isExpanded = expandedId === id;
                const opts = row.options as Record<string, { value?: unknown }> | undefined;
                return [
                  <tr key={id}>
                    <td>
                      <button
                        type="button"
                        className="table-link"
                        onClick={() => setExpandedId(isExpanded ? null : id)}
                        title="Show config"
                      >
                        {String(row.name ?? '—')}
                      </button>
                    </td>
                    <td>{String(row.implantNo ?? 0)}</td>
                    <td>{describeListenerStatus(typeof row.runStatus === 'number' ? row.runStatus : Number(row.runStatus))}</td>
                    <td>{String(row.handlerName ?? '—')}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => app.service('listeners/startstop').create({ id: row._id, wantedStatus: 3 })}>Start</button>
                        <button type="button" onClick={() => app.service('listeners/startstop').create({ id: row._id, wantedStatus: 2 })}>Stop</button>
                        <button type="button" className="btn-danger" onClick={() => { app.service('listeners').remove(String(row._id)); queryClient.invalidateQueries({ queryKey: ['listeners'] }); }}>Remove</button>
                      </div>
                    </td>
                  </tr>,
                  isExpanded ? (
                    <tr key={`${id}-config`} className="listener-config-row">
                      <td colSpan={5}>
                        <div className="listener-config-grid">
                          {opts && Object.keys(opts).length > 0 ? (
                            Object.entries(opts).map(([key, def]) => (
                              <div key={key} className="listener-config-item">
                                <span className="listener-config-item__key">{key}</span>
                                <code className="listener-config-item__val">{String(def?.value ?? '—')}</code>
                              </div>
                            ))
                          ) : (
                            <span className="muted">No options configured.</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null
                ].filter(Boolean);
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function TunnelsPage() {
  return <ServiceTable<Record<string, unknown>> title="Tunnels" subtitle="Tunnel sessions and their transport state." serviceName="tunnels" columns={[{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }, { key: 'implantId', label: 'Implant' }, { key: 'port', label: 'Port' }]} />;
}

export function ChannelsPage() {
  return <ServiceTable<Record<string, unknown>> title="Channels" subtitle="Interactive pipes and streaming outputs." serviceName="pipes" columns={[{ key: '_id', label: 'ID' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'implantId', label: 'Implant' }]} />;
}

export function WebhooksPage() {
  const { app } = useNuages();
  const queryClient = useQueryClient();
  const webhooks = useServiceCollection<Record<string, unknown>>('webhooks', { $limit: 200, $sort: { createdAt: -1 } });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [url, setUrl] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [ignoreCertErrors, setIgnoreCertErrors] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);
  const [message, setMessage] = useState('');

  async function createWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyCreate) {
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setMessage('Webhook URL is required.');
      return;
    }

    setBusyCreate(true);
    setMessage('Creating webhook...');
    try {
      await app.service('webhooks').create({
        type: 'mattermost',
        url: trimmedUrl,
        customMessage: customMessage,
        ignoreCertErrors
      });
      setMessage('Webhook created.');
      setUrl('');
      setCustomMessage('');
      setIgnoreCertErrors(false);
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create webhook');
    } finally {
      setBusyCreate(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Webhooks"
        subtitle="Outgoing notifications and event bridges."
        action={
          <button type="button" onClick={() => setShowCreateForm((current) => !current)}>
            {showCreateForm ? 'Cancel' : 'Add webhook'}
          </button>
        }
      />
      {showCreateForm ? (
        <section className="panel">
          <form className="session-form session-form--compact" onSubmit={createWebhook}>
            <div className="inline-field inline-field--grow">
              <label>
                <span>Webhook URL</span>
                <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
              </label>
            </div>
            <div className="inline-field inline-field--grow">
              <label>
                <span>Custom message (optional)</span>
                <input value={customMessage} onChange={(event) => setCustomMessage(event.target.value)} placeholder="### New Implant! :fire:" />
              </label>
            </div>
            <label className="inline-checkbox">
              <input type="checkbox" checked={ignoreCertErrors} onChange={(event) => setIgnoreCertErrors(event.target.checked)} />
              <span>Ignore TLS certificate errors</span>
            </label>
            <button type="submit" disabled={busyCreate}>{busyCreate ? 'Creating...' : 'Create webhook'}</button>
          </form>
        </section>
      ) : null}
      {message ? <p className="muted">{message}</p> : null}
      <section className="panel panel--table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>URL</th>
              <th>Ignore TLS</th>
              <th>Custom message</th>
            </tr>
          </thead>
          <tbody>
            {(webhooks.data ?? []).length === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={4}>No webhooks found.</td>
              </tr>
            ) : (
              (webhooks.data ?? []).map((row, index) => (
                <tr key={String(row._id ?? index)}>
                  <td>{String(row.type ?? '—')}</td>
                  <td>{String(row.url ?? '—')}</td>
                  <td>{row.ignoreCertErrors ? 'Yes' : 'No'}</td>
                  <td>{String(row.customMessage ?? '') || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function SettingsPage() {
  const profiles = useWorkspaceStore((state) => state.profiles);
  const activeProfileId = useWorkspaceStore((state) => state.activeProfileId);
  const setConnectionState = useWorkspaceStore((state) => state.setConnectionState);
  const resetSensitiveState = useWorkspaceStore((state) => state.resetSensitiveState);
  const clearEventLog = useWorkspaceStore((state) => state.clearEventLog);

  return (
    <div className="page-stack">
      <PageHeader title="Settings" subtitle="Manage local workspace state and saved server profiles." />
      <section className="panel">
        <h2>Profiles</h2>
        <div className="profile-list profile-list--stacked">
          {profiles.map((profile) => (
            <div key={profile.id} className={`profile-card ${profile.id === activeProfileId ? 'active' : ''}`}>
              <strong>{profile.name}</strong>
              <span>{profile.url}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Local actions</h2>
        <div className="row-actions">
          <button type="button" onClick={() => setConnectionState('disconnected')}>
            Mark disconnected
          </button>
          <button type="button" onClick={clearEventLog}>
            Clear event log
          </button>
          <button type="button" onClick={resetSensitiveState}>
            Reset sensitive state
          </button>
        </div>
      </section>
    </div>
  );
}

export function NotFoundPage() {
  return <Navigate to="/overview" replace />;
}

function parseSessionJobIds(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

type ShellSessionState = {
  id: string;
  title: string;
  cwd: string;
  commandDraft: string;
  commandJobIds: string[];
};

type BrowserFileEntry = {
  name: string;
  size: number | null;
  type: 'file' | 'directory' | 'other';
};

type BrowserSessionState = {
  id: string;
  title: string;
  pathDraft: string;
  cwd: string;
  resolved: boolean;
  cache: Record<string, BrowserFileEntry[]>;
};

function defaultShellSession(index = 1): ShellSessionState {
  return {
    id: createId('shell'),
    title: `Shell ${index}`,
    cwd: '.',
    commandDraft: '',
    commandJobIds: []
  };
}

function parseShellSessions(raw: string | undefined, legacy?: { cwd?: string; commandDraft?: string; commandJobIds?: string[] }): ShellSessionState[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const sessions = parsed
          .map((entry, index) => {
            if (!entry || typeof entry !== 'object') {
              return null;
            }

            const source = entry as Record<string, unknown>;
            const id = typeof source.id === 'string' && source.id.length > 0 ? source.id : createId('shell');
            const title = typeof source.title === 'string' && source.title.length > 0 ? source.title : `Shell ${index + 1}`;
            const cwd = typeof source.cwd === 'string' && source.cwd.length > 0 ? source.cwd : '.';
            const commandDraft = typeof source.commandDraft === 'string' ? source.commandDraft : '';
            const commandJobIds = Array.isArray(source.commandJobIds)
              ? source.commandJobIds.filter((value): value is string => typeof value === 'string')
              : [];

            return { id, title, cwd, commandDraft, commandJobIds: commandJobIds.slice(0, 300) };
          })
          .filter((entry): entry is ShellSessionState => Boolean(entry));

        if (sessions.length > 0) {
          return sessions;
        }
      }
    } catch {
      // fall through
    }
  }

  return [
    {
      ...defaultShellSession(1),
      cwd: legacy?.cwd ?? '.',
      commandDraft: legacy?.commandDraft ?? '',
      commandJobIds: (legacy?.commandJobIds ?? []).slice(0, 300)
    }
  ];
}

function parseLsResult(raw: unknown): { cwd: string; files: BrowserFileEntry[] } {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { cwd: '.', files: [] };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const files = parsed
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const source = entry as Record<string, unknown>;
          const name = typeof source.name === 'string' ? source.name : '';
          const typeRaw = typeof source.type === 'string' ? source.type : 'other';
          const type: BrowserFileEntry['type'] = typeRaw === 'directory' || typeRaw === 'file' ? typeRaw : 'other';
          const size = typeof source.size === 'number' ? source.size : null;

          if (!name) {
            return null;
          }

          return { name, type, size };
        })
        .filter((entry): entry is BrowserFileEntry => Boolean(entry));

      return { cwd: '.', files };
    }

    if (parsed && typeof parsed === 'object') {
      const source = parsed as Record<string, unknown>;
      const cwd = typeof source.cwd === 'string' && source.cwd.trim().length > 0 ? source.cwd : '.';
      const filesSource = Array.isArray(source.files) ? source.files : [];
      const files = filesSource
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const item = entry as Record<string, unknown>;
          const name = typeof item.name === 'string' ? item.name : '';
          const typeRaw = typeof item.type === 'string' ? item.type : 'other';
          const type: BrowserFileEntry['type'] = typeRaw === 'directory' || typeRaw === 'file' ? typeRaw : 'other';
          const size = typeof item.size === 'number' ? item.size : null;

          if (!name) {
            return null;
          }

          return { name, type, size };
        })
        .filter((entry): entry is BrowserFileEntry => Boolean(entry));

      return { cwd, files };
    }
  } catch {
    return { cwd: '.', files: [] };
  }

  return { cwd: '.', files: [] };
}

function defaultBrowserSession(index = 1): BrowserSessionState {
  return {
    id: createId('browser'),
    title: `Browser ${index}`,
    pathDraft: '.',
    cwd: '.',
    resolved: false,
    cache: {}
  };
}

function parseBrowserSessions(raw: string | undefined): BrowserSessionState[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const sessions = parsed
          .map((entry, index) => {
            if (!entry || typeof entry !== 'object') {
              return null;
            }

            const source = entry as Record<string, unknown>;
            const id = typeof source.id === 'string' && source.id.length > 0 ? source.id : createId('browser');
            const title = typeof source.title === 'string' && source.title.length > 0 ? source.title : `Browser ${index + 1}`;
            const pathDraft = typeof source.pathDraft === 'string' && source.pathDraft.length > 0 ? source.pathDraft : '.';
            const cwd = typeof source.cwd === 'string' && source.cwd.length > 0 ? source.cwd : '.';
            const resolvedFromState = typeof source.resolved === 'boolean' ? source.resolved : undefined;

            const cache: Record<string, BrowserFileEntry[]> = {};
            if (source.cache && typeof source.cache === 'object' && !Array.isArray(source.cache)) {
              for (const [key, value] of Object.entries(source.cache as Record<string, unknown>)) {
                if (!Array.isArray(value)) {
                  continue;
                }

                const entries = value
                  .map((file) => {
                    if (!file || typeof file !== 'object') {
                      return null;
                    }

                    const item = file as Record<string, unknown>;
                    const name = typeof item.name === 'string' ? item.name : '';
                    const typeRaw = typeof item.type === 'string' ? item.type : 'other';
                    const type: BrowserFileEntry['type'] = typeRaw === 'directory' || typeRaw === 'file' ? typeRaw : 'other';
                    const size = typeof item.size === 'number' ? item.size : null;

                    if (!name) {
                      return null;
                    }

                    return { name, type, size };
                  })
                  .filter((file): file is BrowserFileEntry => Boolean(file));

                cache[key] = entries;
              }
            }

            const resolved = resolvedFromState ?? Object.keys(cache).length > 0;
            return { id, title, pathDraft, cwd, resolved, cache };
          })
          .filter((entry): entry is BrowserSessionState => Boolean(entry));

        if (sessions.length > 0) {
          return sessions;
        }
      }
    } catch {
      // fall through
    }
  }

  return [defaultBrowserSession(1)];
}

function joinBrowserPath(basePath: string, childName: string): string {
  const base = (basePath || '.').trim();
  const child = childName.trim();
  if (!child) {
    return base || '.';
  }

  if (base === '.' || base === './') {
    return child;
  }

  const separator = base.includes('\\') ? '\\' : '/';
  const normalizedBase = base.endsWith('/') || base.endsWith('\\') ? base.slice(0, -1) : base;
  return `${normalizedBase}${separator}${child}`;
}

function browserCacheKey(pathValue: string): string {
  const trimmed = (pathValue || '.').trim();
  if (!trimmed) {
    return '.';
  }

  return trimmed.replace(/[\\/]+$/g, '') || (trimmed.includes('\\') ? '\\' : '/');
}

function parentBrowserPath(pathValue: string): string {
  const path = (pathValue || '.').trim();
  if (!path || path === '.') {
    return '..';
  }

  const normalized = path.replace(/[\\/]+$/g, '');
  if (!normalized) {
    return '/';
  }

  if (normalized.length === 2 && /^[A-Za-z]:$/.test(normalized)) {
    return normalized;
  }

  const separatorMatch = normalized.includes('\\') ? '\\' : '/';
  const lastIndex = normalized.lastIndexOf(separatorMatch);
  if (lastIndex <= 0) {
    return normalized.includes(':') ? normalized : '.';
  }

  return normalized.slice(0, lastIndex);
}
