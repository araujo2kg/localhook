import { useState } from 'react';
import type { CopyText } from '../constants';

export function Welcome({ receiver, copy }: { receiver: string; copy: CopyText }) {
    const [shell, setShell] = useState<'powershell' | 'curl'>(() => (navigator.userAgent.includes('Windows') ? 'powershell' : 'curl'));
    const examples = {
        powershell: `Invoke-RestMethod -Method Post -Uri '${receiver}' -ContentType 'application/json' -Body '{"hello":"LocalHook"}'`,
        curl: `curl -X POST '${receiver}' -H 'Content-Type: application/json' -d '{"hello":"LocalHook"}'`,
    };
    const example = examples[shell];
    return (
        <div className="welcome">
            <div className="welcome-symbol" aria-hidden="true">{`{ }`}</div>
            <span className="eyebrow">YOUR NEXT REQUEST STARTS HERE</span>
            <h2>A little clarity for every request.</h2>
            <p>
                Send a request to your local endpoint, then inspect
                <br />
                its headers, query parameters, and body in real time.
            </p>
            <div className="example">
                <span>TRY IT IN YOUR TERMINAL</span>
                <div className="segmented" role="group" aria-label="Example shell">
                    <button aria-pressed={shell === 'powershell'} onClick={() => setShell('powershell')}>
                        PowerShell
                    </button>
                    <button aria-pressed={shell === 'curl'} onClick={() => setShell('curl')}>
                        curl (Bash / zsh)
                    </button>
                </div>
                <code>{example}</code>
                <button onClick={() => copy(example, 'Example')}>Copy example</button>
            </div>
            <div className="privacy">● Local by default. In memory. Yours to inspect.</div>
        </div>
    );
}
