const BYTES_PER_KILOBYTE = 1024;
const SIZE_DECIMAL_PLACES = 1;
export const JSON_INDENT_SPACES = 4;

export const formatBytes = (size: number) => (size < BYTES_PER_KILOBYTE ? `${size} B` : `${(size / BYTES_PER_KILOBYTE).toFixed(SIZE_DECIMAL_PLACES)} KB`);
export const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function bodyPreview(request: { jsonValid: boolean; rawBody: string }): string | undefined {
    if (!request.jsonValid || request.rawBody.length > 100) return;
    const value: unknown = JSON.parse(request.rawBody);
    if (value !== null && typeof value === 'object') return;
    const preview = JSON.stringify(value);
    return preview.length <= 48 && !/[\r\n]/.test(String(value)) ? preview : undefined;
}
