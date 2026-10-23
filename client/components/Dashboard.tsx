import { useDashboard } from '../hooks/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { RequestDetails } from './RequestDetails';
import { RequestSidebar } from './RequestSidebar';

export function Dashboard() {
    const {
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
        onFilter,
        onSelect,
    } = useDashboard();

    return (
        <div className="app">
            <DashboardHeader
                isConnected={isConnected}
                isPaused={isPaused}
                isClearing={isClearing}
                receiver={receiver}
                onTogglePause={handleTogglePause}
                onClear={handleClearHistory}
                copyText={copyText}
            />
            {error && (
                <div
                    className="banner"
                    role="alert"
                >
                    {error}
                    <button onClick={handleDismissError}>Dismiss</button>
                </div>
            )}
            {isPaused && (
                <div className="pause-banner">
                    Live updates paused. Requests are still being captured. Resume to synchronize.
                </div>
            )}
            <div className="workspace">
                <RequestSidebar
                    key={sidebarVersion}
                    snapshot={snapshot}
                    visibleRequests={visibleRequests}
                    selectedId={selectedRequest?.id}
                    filter={filter}
                    onFilter={onFilter}
                    onSelect={onSelect}
                />
                <RequestDetails
                    selected={selectedRequest}
                    receiver={receiver}
                    copy={copyText}
                />
            </div>
            <footer className="app-footer">
                <span>
                    <span className="footer-dot" /> 127.0.0.1 · Private workspace
                </span>
                <span>
                    GET · POST · PUT · PATCH<span className="footer-divider">|</span>History resets
                    on restart
                </span>
            </footer>
            {notice && (
                <div
                    className="toast"
                    role="status"
                >
                    ✓ {notice}
                </div>
            )}
        </div>
    );
}
