import type { CopyText } from '../constants';

export function Welcome({ receiver, copy }: { receiver: string; copy: CopyText }) {
    const example = `curl -X POST ${receiver} -H "Content-Type: application/json" -d '{"hello":"LocalHook"}'`;
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
                <code>{example}</code>
                <button onClick={() => copy(example, 'Example')}>Copy example</button>
            </div>
            <div className="privacy">● Local by default. In memory. Yours to inspect.</div>
        </div>
    );
}
