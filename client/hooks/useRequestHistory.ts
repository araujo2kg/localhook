import { useEffect, useState } from 'react';
import type { Snapshot } from '../../shared/types';
const API_ROUTES = { receiver: '/webhook', requests: '/api/requests', events: '/api/events' } as const;
const REFRESH_EVENT = 'refresh';
import { EMPTY_SNAPSHOT, HISTORY_RETRY_MS } from '../constants';

export function useRequestHistory(paused: boolean) {
    const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);

    //#region Live synchronization
    useEffect(() => {
        if (paused) return;
        let active = true;
        let loading = false;
        let dirty = false;
        const controller = new AbortController();
        const refresh = async () => {
            dirty = true;
            if (loading) return;
            loading = true;
            try {
                while (dirty && active) {
                    dirty = false;
                    const response = await fetch(API_ROUTES.requests, { signal: controller.signal, cache: 'no-store' });
                    if (!response.ok) throw new Error('Unable to load request history. Retrying…');
                    const next: Snapshot = await response.json();
                    if (active) {
                        setSnapshot(next);
                        setError('');
                    }
                }
            } catch (cause) {
                if (active) setError(cause instanceof Error ? cause.message : 'Unable to load history');
            } finally {
                loading = false;
            }
        };
        const events = new EventSource(API_ROUTES.events);
        events.onopen = () => setConnected(true);
        events.onerror = () => setConnected(false);
        events.addEventListener(REFRESH_EVENT, refresh);
        void refresh();
        const retry = window.setInterval(refresh, HISTORY_RETRY_MS);
        return () => {
            active = false;
            controller.abort();
            events.close();
            clearInterval(retry);
            setConnected(false);
        };
    }, [paused, revision]);

    //#endregion

    function resetHistory() {
        setSnapshot(EMPTY_SNAPSHOT);
        setRevision((value) => value + 1);
    }

    return { snapshot, connected, error, setError, resetHistory };
}
