import type { Snapshot } from '../shared/types';
import { HISTORY_CAPACITY } from '../shared/constants';

export const EMPTY_SNAPSHOT: Snapshot = { requests: [], total: 0, capacity: HISTORY_CAPACITY };
export const HISTORY_RETRY_MS = 10_000;
export const NOTICE_DURATION_MS = 2_500;
export const DETAIL_TABS = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers' },
    { id: 'query', label: 'Query parameters' },
] as const;
export type DetailTab = (typeof DETAIL_TABS)[number]['id'];
export type CopyText = (value: string, label: string) => Promise<void>;
