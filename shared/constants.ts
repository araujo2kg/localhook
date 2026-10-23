export const DEFAULT_PORT = 17381;
export const DEFAULT_BODY_LIMIT = '1mb';
export const DEFAULT_RESPONSE_DELAY_MS = 0;
export const MAX_RESPONSE_DELAY_MS = 3_600_000;
export const HISTORY_CAPACITY = 500;
export const LOOPBACK_HOST = '127.0.0.1';
export const API_ROUTES = {
    receiver: '/webhook',
    requests: '/api/requests',
    events: '/api/events',
    settings: '/api/settings',
} as const;
export const CAPTURE_METHODS = ['GET', 'POST', 'PUT', 'PATCH'] as const;
export const REFRESH_EVENT = 'refresh';
