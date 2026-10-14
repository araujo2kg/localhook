import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { API_ROUTES, CAPTURE_METHODS, LOOPBACK_HOST } from '../shared/constants';
import { NOTICE_DURATION_MS } from './constants';
import { DashboardHeader } from './components/DashboardHeader';
import { RequestSidebar } from './components/RequestSidebar';
import { RequestDetails } from './components/RequestDetails';
import { useRequestHistory } from './hooks/useRequestHistory';
import './styles.css';

function App() {
    //#region Dashboard state
    const [paused, setPaused] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [notice, setNotice] = useState('');
    const [clearing, setClearing] = useState(false);
    const [sidebarVersion, setSidebarVersion] = useState(0);
    const { snapshot, connected, error, setError, resetHistory } = useRequestHistory(paused);
    const receiver = `${location.origin}${API_ROUTES.receiver}`;
    //#endregion

    //#region Notifications and request selection
    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(() => setNotice(''), NOTICE_DURATION_MS);
        return () => clearTimeout(timeout);
    }, [notice]);

    const selected = snapshot.requests.find((request) => request.id === selectedId) ?? snapshot.requests[0];
    const visible = useMemo(() => {
        const query = filter.toLowerCase().trim();
        return snapshot.requests.filter((request) => `${request.id} ${request.method} ${request.url} ${request.contentType}`.toLowerCase().includes(query.replace(/^#/, '')));
    }, [snapshot.requests, filter]);
    //#endregion

    //#region Dashboard actions
    async function copy(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            setNotice(`${label} copied`);
        } catch {
            setError('Clipboard unavailable. Select the text and copy it manually.');
        }
    }

    async function clearHistory() {
        setClearing(true);
        try {
            const response = await fetch(API_ROUTES.requests, { method: 'DELETE' });
            if (!response.ok) throw new Error('Unable to clear history');
            resetHistory();
            setSidebarVersion((value) => value + 1);
            setSelectedId(null);
            setNotice('History cleared');
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to clear history');
        } finally {
            setClearing(false);
        }
    }

    //#endregion

    return (
        <div className="app">
            <DashboardHeader connected={connected} paused={paused} clearing={clearing} receiver={receiver} onTogglePause={() => setPaused((value) => !value)} onClear={clearHistory} copy={copy} />
            {error && (
                <div className="banner" role="alert">
                    {error}
                    <button onClick={() => setError('')}>Dismiss</button>
                </div>
            )}
            {paused && <div className="pause-banner">Live updates paused. Requests are still being captured. Resume to synchronize.</div>}
            <div className="workspace">
                <RequestSidebar key={sidebarVersion} snapshot={snapshot} visible={visible} selectedId={selected?.id} filter={filter} onFilter={setFilter} onSelect={setSelectedId} />
                <RequestDetails selected={selected} receiver={receiver} copy={copy} />
            </div>
            <footer className="app-footer">
                <span>
                    <span className="footer-dot" /> 127.0.0.1 · Private workspace
                </span>
                <span>
                    POST · PUT · PATCH<span className="footer-divider">|</span>History resets on restart
                </span>
            </footer>
            {notice && (
                <div className="toast" role="status">
                    ✓ {notice}
                </div>
            )}
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
