import type { FocusEvent, PointerEvent } from 'react';

import type { CapturedRequest } from '../../shared/types';
import { bodyPreview, formatBytes, formatTime } from '../format';

export function Method({ method }: { method: string }) {
    return <span className={`method method-${method.toLowerCase()}`}>{method}</span>;
}

export function RequestIdentifier({ id }: { id: string }) {
    return (
        <code
            className="row-identifier"
            title={`Request ID: ${id}`}
            aria-label={`Request ID: ${id}`}
        >
            #{id.slice(0, 8)}
        </code>
    );
}

interface RequestRowProps {
    readonly request: CapturedRequest;
    readonly isSelected: boolean;
    readonly isStriped?: boolean;
    readonly onSelect: (requestId: string) => void;
    readonly onPreviewStart: (requestId: string, element: HTMLElement) => void;
    readonly onPreviewLeave: () => void;
}

export function RequestRow({
    request,
    isSelected,
    isStriped = false,
    onSelect,
    onPreviewStart,
    onPreviewLeave,
}: RequestRowProps) {
    const preview = bodyPreview(request);
    const [contentType = ''] = request.contentType.split(';');

    function handlePointerEnter(event: PointerEvent<HTMLButtonElement>): void {
        if (event.pointerType === 'mouse') {
            onPreviewStart(request.id, event.currentTarget);
        }
    }

    function handleFocus(event: FocusEvent<HTMLButtonElement>): void {
        if (event.currentTarget.matches(':focus-visible')) {
            onPreviewStart(request.id, event.currentTarget);
        }
    }

    return (
        <button
            className={`request-row ${isStriped ? 'striped' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => {
                onSelect(request.id);
            }}
            aria-pressed={isSelected}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={onPreviewLeave}
            onFocus={handleFocus}
            onBlur={onPreviewLeave}
        >
            <div className="row-top">
                <Method method={request.method} />
                <RequestIdentifier id={request.id} />
                <time
                    dateTime={request.timestamp}
                    title={new Date(request.timestamp).toLocaleString()}
                >
                    {formatTime(request.timestamp)}
                </time>
            </div>
            <div
                className="row-path"
                title={request.url}
            >
                <span>{request.url}</span>
                {preview !== undefined && (
                    <code
                        className="row-preview"
                        title={`Body: ${preview}`}
                    >
                        {preview}
                    </code>
                )}
            </div>
            <div className="row-bottom">
                <span>{contentType.length > 0 ? contentType : 'No content type'}</span>
                <span>{formatBytes(request.size)}</span>
            </div>
        </button>
    );
}

export function KeyValueTable({ entries }: { entries: readonly [string, string][] }) {
    if (!entries.length) {
        return <div className="content-empty">No query parameters on this request.</div>;
    }

    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                {entries.map(([key, value], index) => (
                    <tr key={`${key}-${index}`}>
                        <td>{key}</td>
                        <td>{value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
