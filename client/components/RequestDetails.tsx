import { useMemo, useState } from 'react';

import type { CapturedRequest } from '../../shared/types';
import { type CopyText, DETAIL_TABS, type DetailTab } from '../constants';
import { formatBytes, formatRequestBody, formatTime } from '../format';
import { RequestBody } from './RequestBody';
import { KeyValueTable, Method } from './RequestPrimitives';
import { Welcome } from './Welcome';

interface Props {
    readonly selected?: CapturedRequest;
    readonly receiver: string;
    readonly copy: CopyText;
}

export function RequestDetails({ selected, receiver, copy }: Props) {
    const [tab, setTab] = useState<DetailTab>('body');
    const [isRaw, setIsRaw] = useState(false);
    const tabCounts: Record<DetailTab, number | ''> = {
        body: '',
        headers: selected ? Object.keys(selected.headers).length : 0,
        query: selected?.query.length ?? 0,
    };
    const body = useMemo(() => {
        if (!selected) {
            return '';
        }

        return formatRequestBody(selected, isRaw);
    }, [selected, isRaw]);

    if (!selected) {
        return (
            <main className="details">
                <Welcome
                    receiver={receiver}
                    copy={copy}
                />
            </main>
        );
    }

    const headerEntries: [string, string][] = Object.entries(selected.headers).map(
        ([name, value]) => [name, Array.isArray(value) ? value.join(', ') : value],
    );
    const entries = tab === 'headers' ? headerEntries : selected.query;

    return (
        <main className="details">
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
            <div
                className="tabs"
                role="tablist"
                aria-label="Request content"
            >
                {DETAIL_TABS.map(({ id: value, label }) => (
                    <button
                        key={value}
                        id={`tab-${value}`}
                        role="tab"
                        aria-selected={tab === value}
                        aria-controls="content-panel"
                        onClick={() => {
                            setTab(value);
                        }}
                    >
                        {label}
                        <span>{tabCounts[value]}</span>
                    </button>
                ))}
            </div>
            <section
                className="content-panel"
                id="content-panel"
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
            >
                {tab === 'body' ? (
                    <RequestBody
                        selected={selected}
                        body={body}
                        isRaw={isRaw}
                        onRawChange={setIsRaw}
                        copy={copy}
                    />
                ) : (
                    <KeyValueTable entries={entries} />
                )}
            </section>
        </main>
    );
}
