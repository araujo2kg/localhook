import type { CapturedRequest } from '../../shared/types';
import type { CopyText } from '../constants';

interface Props {
    readonly selected: CapturedRequest;
    readonly body: string;
    readonly isRaw: boolean;
    readonly onRawChange: (isRaw: boolean) => void;
    readonly copy: CopyText;
}

export function RequestBody({ selected, body, isRaw, onRawChange, copy }: Props) {
    let payloadLabel = 'EMPTY BODY';
    let bodyNote = 'UTF-8 text preview - original bytes available in the API as bodyBase64';

    if (selected.jsonValid) {
        payloadLabel = 'JSON';
        bodyNote = 'Valid JSON - formatted locally';
    } else if (selected.size > 0) {
        payloadLabel = 'RAW PAYLOAD';

        if (/json/i.test(selected.contentType)) {
            bodyNote = 'Invalid JSON - original payload preserved';
        }
    }

    return (
        <>
            <div className="body-toolbar">
                <span className="payload-label">{payloadLabel}</span>
                <div className="body-actions">
                    <div className="segmented">
                        <button
                            aria-pressed={!isRaw}
                            onClick={() => {
                                onRawChange(false);
                            }}
                        >
                            Formatted
                        </button>
                        <button
                            aria-pressed={isRaw}
                            onClick={() => {
                                onRawChange(true);
                            }}
                        >
                            Raw
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            void copy(body, 'Body');
                        }}
                        disabled={!selected.size}
                    >
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
            <div className="body-note">{bodyNote}</div>
        </>
    );
}
