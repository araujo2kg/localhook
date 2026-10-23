const BYTES_PER_KILOBYTE = 1024;
const SIZE_DECIMAL_PLACES = 1;
const MAX_PREVIEW_BODY_LENGTH = 100;
const MAX_PREVIEW_TEXT_LENGTH = 48;

export const JSON_INDENT_SPACES = 4;

interface RequestBodyContent {
    readonly jsonValid: boolean;
    readonly rawBody: string;
}

export function formatBytes(size: number): string {
    return size < BYTES_PER_KILOBYTE
        ? `${size} B`
        : `${(size / BYTES_PER_KILOBYTE).toFixed(SIZE_DECIMAL_PLACES)} KB`;
}

export function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

export function formatRequestBody(request: RequestBodyContent, isRaw = false): string {
    if (isRaw || !request.jsonValid) {
        return request.rawBody;
    }

    try {
        const parsedBody: unknown = JSON.parse(request.rawBody);

        return JSON.stringify(parsedBody, null, JSON_INDENT_SPACES);
    } catch {
        // Keep captured text inspectable if JSON metadata and payload disagree.
        return request.rawBody;
    }
}

export function bodyPreview(request: RequestBodyContent): string | undefined {
    if (!request.jsonValid || request.rawBody.length > MAX_PREVIEW_BODY_LENGTH) {
        return;
    }

    try {
        const value: unknown = JSON.parse(request.rawBody);

        if (value !== null && typeof value === 'object') {
            return;
        }

        const preview = JSON.stringify(value);

        return preview.length <= MAX_PREVIEW_TEXT_LENGTH && !/[\r\n]/.test(String(value))
            ? preview
            : undefined;
    } catch {
        // A metadata mismatch should not prevent the request list from rendering.
        return;
    }
}
