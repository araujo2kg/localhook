import { useEffect, useState } from 'react';

import { API_ROUTES, REFRESH_EVENT } from '../../shared/constants';
import type { Snapshot } from '../../shared/types';
import { getRequestHistory } from '../api';
import { EMPTY_SNAPSHOT, HISTORY_RETRY_MS } from '../constants';

export function useRequestHistory(isPaused: boolean) {
    const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (isPaused) {
            return;
        }

        let isActive = true;
        let isLoading = false;
        let needsRefresh = false;
        const controller = new AbortController();
        const refresh = async () => {
            needsRefresh = true;
            if (isLoading) {
                return;
            }

            isLoading = true;
            try {
                while (needsRefresh && isActive) {
                    needsRefresh = false;
                    const next = await getRequestHistory(controller.signal);

                    if (controller.signal.aborted) {
                        return;
                    }

                    setSnapshot(next);
                    setError('');
                }
            } catch (cause) {
                if (isActive) {
                    setError(cause instanceof Error ? cause.message : 'Unable to load history');
                }
            } finally {
                isLoading = false;
            }
        };

        const events = new EventSource(API_ROUTES.events);

        events.onopen = () => {
            setIsConnected(true);
        };

        events.onerror = () => {
            setIsConnected(false);
        };

        const handleRefresh = () => {
            void refresh();
        };

        events.addEventListener(REFRESH_EVENT, handleRefresh);
        void refresh();
        const retry = window.setInterval(handleRefresh, HISTORY_RETRY_MS);

        return () => {
            isActive = false;
            controller.abort();
            events.close();
            clearInterval(retry);
            setIsConnected(false);
        };
    }, [isPaused, revision]);

    function resetHistory() {
        setSnapshot(EMPTY_SNAPSHOT);
        setRevision((value) => value + 1);
    }

    return { snapshot, isConnected, error, setError, resetHistory };
}
