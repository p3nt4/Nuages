export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticating' | 'authenticated' | 'degraded' | 'error';

export type TabKind =
  | 'overview'
  | 'implants'
  | 'jobs'
  | 'files'
  | 'modules'
  | 'handlers'
  | 'listeners'
  | 'tunnels'
  | 'channels'
  | 'webhooks'
  | 'settings'
  | 'implant-session'
  | 'job-session';

export interface ServerProfile {
  id: string;
  name: string;
  url: string;
  allowInsecure?: boolean;
}

export interface WorkspaceTab {
  id: string;
  scope: string;
  kind: TabKind;
  title: string;
  route: string;
  entityId?: string;
  state: Record<string, string | number | boolean | null>;
  createdAt: number;
}

export interface EventLogEntry {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  time: number;
}

export interface CollectionResult<T> {
  total: number;
  limit?: number;
  skip?: number;
  data: T[];
}

export interface ImplantRecord {
  _id: string;
  os?: string;
  hostname?: string;
  username?: string;
  localIp?: string;
  handler?: string;
  lastSeen?: string | number;
  listener?: string;
  supportedPayloads?: string[];
  [key: string]: unknown;
}

export interface JobRecord {
  _id: string;
  createdAt?: number;
  lastUpdated?: number;
  jobStatus?: number;
  result?: string;
  creator?: string;
  timeout?: number;
  implantId?: string;
  payload?: Record<string, unknown>;
  moduleName?: string;
  [key: string]: unknown;
}

export interface FileRecord {
  _id: string;
  mongoId?: string;
  filename: string;
  length: number;
  chunkSize: number;
  uploadDate?: number;
  metadata?: {
    path?: string;
    uploadedBy?: string;
    implantId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ListItem {
  name: string;
  kind: 'file' | 'folder';
  path: string;
  file?: FileRecord;
  count?: number;
}