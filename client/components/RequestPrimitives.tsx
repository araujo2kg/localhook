import type { CapturedRequest } from '../../shared/types';
import { bodyPreview, formatBytes, formatTime } from '../format';

export function Method({ method }: { method: string }) {
    return <span className={`method method-${method.toLowerCase()}`}>{method}</span>;
}

export function RequestRow({ request, selected, striped = false, onClick }: { request: CapturedRequest; selected: boolean; striped?: boolean; onClick: () => void }) {
    const preview = bodyPreview(request);
    return (
        <button className={`request-row ${striped ? 'striped' : ''} ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected}>
            <div className="row-top">
                <Method method={request.method} />
                <time dateTime={request.timestamp} title={new Date(request.timestamp).toLocaleString()}>
                    {formatTime(request.timestamp)}
                </time>
            </div>
            <div className="row-path" title={request.url}>
                <span>{request.url}</span>
                {preview !== undefined && (
                    <code className="row-preview" title={`Body: ${preview}`}>
                        {preview}
                    </code>
                )}
            </div>
            <div className="row-bottom">
                <span>{request.contentType.split(';')[0] || 'No content type'}</span>
                <span>{formatBytes(request.size)}</span>
            </div>
        </button>
    );
}

export function KeyValueTable({ entries }: { entries: [string, string][] }) {
    if (!entries.length) return <div className="content-empty">No query parameters on this request.</div>;
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
