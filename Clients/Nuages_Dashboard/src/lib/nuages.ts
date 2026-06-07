import feathers, { authentication, socketio } from '@feathersjs/client';
import { io, Socket } from 'socket.io-client';
import type { ServerProfile } from '@/types';

export interface NuagesClient {
  profile: ServerProfile;
  socket: Socket;
  app: any;
}

export function createNuagesClient(profile: ServerProfile): NuagesClient {
  const socket = io(profile.url, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    withCredentials: false
  });

  const app = feathers();
  app.configure(authentication({ storage: window.localStorage }));
  app.configure(socketio(socket));

  return { profile, socket, app };
}

export async function authenticate(app: any, username: string, password: string): Promise<unknown> {
  return app.authenticate({ strategy: 'local', username, password });
}

const IMPLANT_ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function normalizePath(input: string): string {
  const trimmed = input.trim().replace(/\\/g, '/');
  if (!trimmed || trimmed === '.') {
    return '/';
  }

  const collapsed = trimmed.replace(/\/+/g, '/');
  const prefixed = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  return prefixed.replace(/\/+$/g, '') || '/';
}

export function describeJobStatus(status?: number): string {
  switch (status) {
    case 0:
      return 'queued';
    case 1:
      return 'running';
    case 2:
      return 'waiting';
    case 3:
      return 'complete';
    case 4:
      return 'failed';
    default:
      return 'unknown';
  }
}

export function describeRunStatus(status?: number): string {
  switch (status) {
    case 0:
      return 'queued';
    case 1:
      return 'received';
    case 2:
      return 'running';
    case 3:
      return 'complete';
    case 4:
      return 'failed';
    default:
      return 'unknown';
  }
}

export function describeListenerStatus(status?: number): string {
  switch (status) {
    case 1:
      return 'Submitted';
    case 2:
      return 'Stopped';
    case 3:
      return 'Running';
    case 4:
      return 'Failed';
    default:
      return 'Unknown';
  }
}

export function exitJobPayload(implantId: string): Record<string, unknown> {
  const timeoutAt = Date.now() + 300_000;
  return {
    implantId,
    timeout: timeoutAt,
    payload: {
      type: 'exit',
      options: {}
    }
  };
}

export function jobPayload(command: string, cwd: string, implantId: string): Record<string, unknown> {
  const timeoutAt = Date.now() + 300_000;
  return {
    implantId,
    timeout: timeoutAt,
    payload: {
      type: 'command',
      options: {
        cmd: command,
        path: cwd
      }
    }
  };
}

export function cdJobPayload(targetDir: string, cwd: string, implantId: string): Record<string, unknown> {
  const timeoutAt = Date.now() + 300_000;
  return {
    implantId,
    timeout: timeoutAt,
    payload: {
      type: 'cd',
      options: {
        path: cwd,
        dir: targetDir
      }
    }
  };
}

export function lsJobPayload(path: string, implantId: string): Record<string, unknown> {
  const timeoutAt = Date.now() + 300_000;
  return {
    implantId,
    timeout: timeoutAt,
    payload: {
      type: 'ls',
      options: {
        path
      }
    }
  };
}

export function uploadJobPayload(file: string, cwd: string, implantId: string): Record<string, unknown> {
  const timeoutAt = Date.now() + 300_000;
  return {
    implantId,
    timeout: timeoutAt,
    payload: {
      type: 'upload',
      options: {
        file,
        path: cwd
      }
    }
  };
}

export function uploadPipePayload(source: string, filename: string, implantId: string): Record<string, unknown> {
  return {
    type: 'upload',
    source,
    implantId,
    filename
  };
}

export function downloadJobPayload(target: string, filename: string, length: number, cwd: string, implantId: string): Record<string, unknown> {
  const timeoutAt = Date.now() + 300_000;
  return {
    implantId,
    timeout: timeoutAt,
    payload: {
      type: 'download',
      options: {
        file: target,
        filename,
        length,
        path: cwd
      }
    }
  };
}

export function downloadPipePayload(source: string, destination: string, implantId: string): Record<string, unknown> {
  return {
    type: 'download',
    source,
    destination,
    implantId
  };
}

export function formatFileSize(size: number | null | undefined): string {
  if (typeof size !== 'number' || Number.isNaN(size) || size < 0) {
    return '-';
  }

  if (size === 0) {
    return '0 B';
  }

  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;
  return `${value.toFixed(2)} ${units[index]}`;
}

export function formatLastSeen(value?: string | number): string {
  if (!value) {
    return 'unknown';
  }

  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return 'unknown';
  }

  const delta = Date.now() - timestamp;
  if (delta < 60_000) {
    return 'just now';
  }

  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isImplantActive(lastSeen?: string | number): boolean {
  if (!lastSeen) {
    return false;
  }

  const timestamp = typeof lastSeen === 'number' ? lastSeen : Date.parse(lastSeen);
  return !Number.isNaN(timestamp) && Date.now() - timestamp < IMPLANT_ACTIVE_WINDOW_MS;
}

export function normalizeMaybeArray<T>(value: { data?: T[] } | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : value.data ?? [];
}