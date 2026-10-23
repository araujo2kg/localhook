import { useEffect, useMemo, useState } from 'react';

import { API_ROUTES } from '../../shared/constants';
import { clearRequestHistory } from '../api';
import { NOTICE_DURATION_MS } from '../constants';
import { useRequestHistory } from './useRequestHistory';

export function useDashboard() {
    const [isPaused, setIsPaused] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [notice, setNotice] = useState('');
    const [isClearing, setIsClearing] = useState(false);
    const [sidebarVersion, setSidebarVersion] = useState(0);
    const { snapshot, isConnected, error, setError, resetHistory } = useRequestHistory(isPaused);
    const receiver = `${location.origin}${API_ROUTES.receiver}`;

    useEffect(() => {
        if (!notice) {
            return;
        }

        const timeout = setTimeout(() => {
            setNotice('');
        }, NOTICE_DURATION_MS);

        return () => {
            clearTimeout(timeout);
        };
    }, [notice]);

    const selectedRequest =
        snapshot.requests.find((request) => request.id === selectedId) ?? snapshot.requests[0];
    const visibleRequests = useMemo(() => {
        const query = filter.toLowerCase().trim();

        return snapshot.requests.filter((request) =>
            `${request.id} ${request.method} ${request.url} ${request.contentType}`
                .toLowerCase()
                .includes(query.replace(/^#/, '')),
        );
    }, [snapshot.requests, filter]);

    async function copyText(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            setNotice(`${label} copied`);
        } catch {
            setError('Clipboard unavailable. Select the text and copy it manually.');
        }
    }

    async function handleClearHistory() {
        setIsClearing(true);
        try {
            await clearRequestHistory();

            resetHistory();
            setSidebarVersion((value) => value + 1);
            setSelectedId(null);
            setNotice('History cleared');
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to clear history');
        } finally {
            setIsClearing(false);
        }
    }

    function handleTogglePause(): void {
        setIsPaused((wasPaused) => !wasPaused);
    }

    function handleDismissError(): void {
        setError('');
    }

    return {
        snapshot,
        isPaused,
        isClearing,
        isConnected,
        selectedRequest,
        visibleRequests,
        filter,
        notice,
        error,
        sidebarVersion,
        receiver,
        copyText,
        handleClearHistory,
        handleTogglePause,
        handleDismissError,
        onFilter: setFilter,
        onSelect: setSelectedId,
    };
}
