import type { CapturedRequest, Snapshot } from '../shared/types';

export interface RequestHistory {
    add: (request: CapturedRequest) => void;
    clear: () => void;
    snapshot: () => Snapshot;
}

export function createRequestHistory(capacity: number): RequestHistory {
    const requests: CapturedRequest[] = [];
    let total = 0;

    function add(request: CapturedRequest): void {
        requests.unshift(request);

        if (requests.length > capacity) {
            requests.pop();
        }

        total += 1;
    }

    function clear(): void {
        requests.length = 0;
        total = 0;
    }

    function snapshot(): Snapshot {
        return { requests, total, capacity };
    }

    return { add, clear, snapshot };
}
