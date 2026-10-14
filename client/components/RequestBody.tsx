import type { CapturedRequest } from '../../shared/types';
import type { CopyText } from '../constants';

interface Props {
    selected: CapturedRequest;
    body: string;
    raw: boolean;
    setRaw: (raw: boolean) => void;
    copy: CopyText;
}

export function RequestBody({ selected, body, raw, setRaw, copy }: Props) {
    return (
        <>
            <div className="body-toolbar">
                <span className="payload-label">{selected.jsonValid ? 'JSON' : selected.size ? 'RAW PAYLOAD' : 'EMPTY BODY'}</span>
                <div className="body-actions">
                    <div className="segmented">
                        <button aria-pressed={!raw} onClick={() => setRaw(false)}>
                            Formatted
                        </button>
                        <button aria-pressed={raw} onClick={() => setRaw(true)}>
                            Raw
                        </button>
                    </div>
                    <button onClick={() => copy(body, 'Body')} disabled={!selected.size}>
                        Copy body
                    </button>
                </div>
            </div>
            {selected.size ? (
                <pre className="body-code">
                    <code>{body}</code>
                </pre>
            ) : (
                <div className="content-empty">This request has no body.</div>
            )}
            <div className="body-note">{selected.jsonValid ? 'Valid JSON · formatted locally' : /json/i.test(selected.contentType) && selected.size ? 'Invalid JSON · original payload preserved' : 'UTF-8 text preview · original bytes available in the API as bodyBase64'}</div>
        </>
    );
}
