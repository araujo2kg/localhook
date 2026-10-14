import { useMemo, useState } from 'react';
import type { CapturedRequest } from '../../shared/types';
import { DETAIL_TABS, type DetailTab, type CopyText } from '../constants';
import { formatBytes, formatTime, JSON_INDENT_SPACES } from '../format';
import { Method, KeyValueTable } from './RequestPrimitives';
import { RequestBody } from './RequestBody';
import { Welcome } from './Welcome';

interface Props {
    selected?: CapturedRequest;
    receiver: string;
    copy: CopyText;
}

export function RequestDetails({ selected, receiver, copy }: Props) {
    //#region Content selection
    const [tab, setTab] = useState<DetailTab>('body');
    const [raw, setRaw] = useState(false);
    const body = useMemo(() => {
        if (!selected) return '';
        return !raw && selected.jsonValid ? JSON.stringify(JSON.parse(selected.rawBody), null, JSON_INDENT_SPACES) : selected.rawBody;
    }, [selected, raw]);
    //#endregion

    return (
        <main className="details">
            {selected ? (
                <>
                    <div className="detail-heading">
                        <div className="eyebrow">REQUEST DETAILS</div>
                        <div className="request-title">
                            <Method method={selected.method} />
                            <h2>{selected.url}</h2>
                        </div>
                        <div className="request-id">{selected.id}</div>
                    </div>
                    <dl className="metadata">
                        <div>
                            <dt>Received</dt>
                            <dd>
                                {formatTime(selected.timestamp)}
                                <small>{new Date(selected.timestamp).toLocaleDateString()}</small>
                            </dd>
                        </div>
                        <div>
                            <dt>Remote address</dt>
                            <dd>{selected.remoteIp}</dd>
                        </div>
                        <div>
                            <dt>Content type</dt>
                            <dd>{selected.contentType || 'Not specified'}</dd>
                        </div>
                        <div>
                            <dt>Body size</dt>
                            <dd>{formatBytes(selected.size)}</dd>
                        </div>
                    </dl>
                    <div className="tabs" role="tablist" aria-label="Request content">
                        {DETAIL_TABS.map(({ id: value, label }) => (
                            <button key={value} id={`tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="content-panel" onClick={() => setTab(value)}>
                                {label}
                                <span>{value === 'headers' ? Object.keys(selected.headers).length : value === 'query' ? selected.query.length : ''}</span>
                            </button>
                        ))}
                    </div>
                    <section className="content-panel" id="content-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
                        {tab === 'body' ? (
                            <RequestBody selected={selected} body={body} raw={raw} setRaw={setRaw} copy={copy} />
                        ) : (
                            <KeyValueTable entries={tab === 'headers' ? Object.entries(selected.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value]) : selected.query} />
                        )}
                    </section>
                </>
            ) : (
                <Welcome receiver={receiver} copy={copy} />
            )}
        </main>
    );
}
