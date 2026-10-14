import type { CopyText } from '../constants';

interface Props {
    connected: boolean;
    paused: boolean;
    clearing: boolean;
    receiver: string;
    onTogglePause: () => void;
    onClear: () => Promise<void>;
    copy: CopyText;
}

export function DashboardHeader({ connected, paused, clearing, receiver, onTogglePause, onClear, copy }: Props) {
    return (
        <>
            <header className="header">
                <div className="brand">
                    <span className="logo" aria-hidden="true">
                        ↳
                    </span>
                    <div>
                        <h1>LocalHook</h1>
                        <span className="subtitle">LOCAL REQUEST INSPECTOR</span>
                    </div>
                </div>
                <div className={`status ${connected ? 'online' : ''}`}>
                    <span className="dot" />
                    {paused ? 'Paused' : connected ? 'Listening' : 'Reconnecting…'}
                </div>
                <div className="header-actions">
                    <button onClick={() => onTogglePause()}>{paused ? '▶ Resume' : 'Ⅱ Pause'}</button>
                    <button disabled={clearing} onClick={onClear}>
                        {clearing ? 'Clearing…' : 'Clear history'}
                    </button>
                </div>
            </header>
            <section className="receiver" aria-label="Webhook receiver">
                <span className="eyebrow">SEND REQUESTS TO</span>
                <code>{receiver}</code>
                <button className="accent" onClick={() => copy(receiver, 'Receiver URL')}>
                    Copy URL
                </button>
                <span className="local-tag">↗ Localhost only</span>
            </section>
        </>
    );
}
