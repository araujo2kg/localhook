import type { CopyText } from '../constants';

interface Props {
    readonly isConnected: boolean;
    readonly isPaused: boolean;
    readonly isClearing: boolean;
    readonly receiver: string;
    readonly onTogglePause: () => void;
    readonly onClear: () => Promise<void>;
    readonly copyText: CopyText;
}

export function DashboardHeader({
    isConnected,
    isPaused,
    isClearing,
    receiver,
    onTogglePause,
    onClear,
    copyText,
}: Props) {
    let statusLabel = 'Reconnecting...';

    if (isPaused) {
        statusLabel = 'Paused';
    } else if (isConnected) {
        statusLabel = 'Listening';
    }

    return (
        <>
            <header className="header">
                <div className="brand">
                    <span
                        className="logo"
                        aria-hidden="true"
                    >
                        ↳
                    </span>
                    <div>
                        <h1>LocalHook</h1>
                        <span className="subtitle">LOCAL REQUEST INSPECTOR</span>
                    </div>
                </div>
                <div className={`status ${isConnected ? 'online' : ''}`}>
                    <span className="dot" />
                    {statusLabel}
                </div>
                <div className="header-actions">
                    <button onClick={onTogglePause}>{isPaused ? '▶ Resume' : 'Ⅱ Pause'}</button>
                    <button
                        disabled={isClearing}
                        onClick={() => {
                            void onClear();
                        }}
                    >
                        {isClearing ? 'Clearing…' : 'Clear history'}
                    </button>
                </div>
            </header>
            <section
                className="receiver"
                aria-label="Webhook receiver"
            >
                <span className="eyebrow">SEND REQUESTS TO</span>
                <code>{receiver}</code>
                <button
                    className="accent"
                    onClick={() => {
                        void copyText(receiver, 'Receiver URL');
                    }}
                >
                    Copy URL
                </button>
                <span className="local-tag">↗ Localhost only</span>
            </section>
        </>
    );
}
