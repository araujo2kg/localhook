export interface CapturedRequest {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    query: [string, string][];
    rawBody: string;
    bodyBase64: string;
    jsonValid: boolean;
    parsedJson?: unknown;
    contentType: string;
    size: number;
    remoteIp: string;
}

export interface Snapshot {
    requests: CapturedRequest[];
    total: number;
    capacity: number;
}

export interface ReceiverSettings {
    responseDelayMs: number;
    getResponse: GetResponse;
}

export interface GetResponse {
    readonly statusCode: number;
    readonly contentType: string;
    readonly body: string;
}
