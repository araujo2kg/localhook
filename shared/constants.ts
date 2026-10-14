export const DEFAULT_PORT = 17381;
export const DEFAULT_BODY_LIMIT = '1mb';
export const HISTORY_CAPACITY = 500;
export const LOOPBACK_HOST = '127.0.0.1';
export const API_ROUTES = { receiver: '/webhook', requests: '/api/requests', events: '/api/events' } as const;
export const CAPTURE_METHODS = ['POST', 'PUT', 'PATCH'] as const;
export const REFRESH_EVENT = 'refresh';
