import type { AlertButton, AlertOptions } from 'react-native';

export interface AppAlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

interface AlertSnapshot {
  requests: AppAlertRequest[];
  hosts: { id: string; depth: number }[];
}

let nextId = 0;
let snapshot: AlertSnapshot = { requests: [], hosts: [] };
const listeners = new Set<() => void>();

function publish(next: AlertSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export const appAlertStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  getSnapshot: () => snapshot,
  registerHost(id: string, depth = 0) {
    publish({ ...snapshot, hosts: [...snapshot.hosts, { id, depth }].sort((left, right) => left.depth - right.depth) });
    return () => {
      publish({ ...snapshot, hosts: snapshot.hosts.filter((host) => host.id !== id) });
    };
  },
  press(id: number, buttonIndex: number) {
    const request = snapshot.requests[0];
    const button = request?.buttons[buttonIndex];
    if (request?.id !== id || !button) return;
    publish({ ...snapshot, requests: snapshot.requests.slice(1) });
    button.onPress?.();
  },
  dismiss(id: number) {
    const request = snapshot.requests[0];
    if (request?.id !== id || !request.options?.cancelable) return;
    publish({ ...snapshot, requests: snapshot.requests.slice(1) });
    request.options.onDismiss?.();
  },
};

/** Keeps the existing button callbacks, but renders all app messages in our UI. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    const request: AppAlertRequest = {
      id: ++nextId,
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'Đã hiểu' }],
      options,
    };
    publish({ ...snapshot, requests: [...snapshot.requests, request] });
  },
};
