import { HISTORY_CAPACITY } from '../shared/constants';
import type { Snapshot } from '../shared/types';

export const EMPTY_SNAPSHOT: Snapshot = { requests: [], total: 0, capacity: HISTORY_CAPACITY };
export const HISTORY_RETRY_MS = 10_000;
export const NOTICE_DURATION_MS = 2_500;
export const REQUEST_PREVIEW_DELAY_MS = 700;
export const REQUEST_PREVIEW_LEAVE_MS = 350;
export const DETAIL_TABS = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers' },
    { id: 'query', label: 'Query parameters' },
] as const;
export type DetailTab = (typeof DETAIL_TABS)[number]['id'];
export type CopyText = (value: string, label: string) => Promise<void>;

export const DIVIDER_COLORS = [
    { name: 'Blue', value: '#80b7f1' },
    { name: 'Teal', value: '#75cbbb' },
    { name: 'Purple', value: '#b6a0e8' },
    { name: 'Amber', value: '#dfb76f' },
] as const;
