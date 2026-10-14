import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CapturedRequest, Snapshot } from '../../shared/types';
import { RequestRow } from './RequestPrimitives';
import { RequestHoverPreview } from './RequestHoverPreview';
import { useRequestPreview } from '../hooks/useRequestPreview';

const DIVIDER_COLORS = [
    { name: 'Blue', value: '#80b7f1' },
    { name: 'Teal', value: '#75cbbb' },
    { name: 'Purple', value: '#b6a0e8' },
    { name: 'Amber', value: '#dfb76f' },
];

interface Divider {
    id: string;
    beforeId: string | null;
    label: string;
    color: string;
}

function TimelineDivider({ divider, onChange, onRemove }: { divider: Divider; onChange: (divider: Divider) => void; onRemove: () => void }) {
    const [editing, setEditing] = useState(false);
    return (
        <div className="timeline-divider" style={{ '--divider-color': divider.color } as CSSProperties}>
            <button className="divider-label" onClick={() => setEditing(!editing)} aria-expanded={editing} title="Edit divider label and color">
                <span>{divider.label || 'Scenario divider'}</span>
                <span aria-hidden="true">{editing ? '−' : '✎'}</span>
            </button>
            {editing && (
                <div className="divider-editor">
                    <label>
                        Label
                        <input
                            autoFocus
                            maxLength={60}
                            value={divider.label}
                            placeholder="Scenario divider"
                            onChange={(event) => onChange({ ...divider, label: event.target.value })}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === 'Escape') setEditing(false);
                            }}
                        />
                    </label>
                    <div className="divider-colors" role="group" aria-label="Divider color">
                        {DIVIDER_COLORS.map(({ name, value }) => (
                            <button key={value} aria-label={name} aria-pressed={divider.color === value} style={{ background: value }} onClick={() => onChange({ ...divider, color: value })} />
                        ))}
                    </div>
                    <div className="divider-actions">
                        <button onClick={onRemove}>Remove</button>
                        <button onClick={() => setEditing(false)}>Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface Props {
    snapshot: Snapshot;
    visible: CapturedRequest[];
    selectedId?: string;
    filter: string;
    onFilter: (value: string) => void;
    onSelect: (id: string | null) => void;
}

export function RequestSidebar({ snapshot, visible, selectedId, filter, onFilter, onSelect }: Props) {
    const [dividers, setDividers] = useState<Divider[]>([]);
    const { preview, start, leave, keepOpen, dismiss } = useRequestPreview(visible.map((request) => request.id).join(','), selectedId);
    const previewRequest = preview && visible.find((request) => request.id === preview.id);
    const previousTotal = useRef(snapshot.total);
    useEffect(() => {
        const ids = new Set(snapshot.requests.map((request) => request.id));
        const cleared = snapshot.total === 0 && previousTotal.current > 0;
        previousTotal.current = snapshot.total;
        setDividers((current) => (cleared ? [] : current.filter((divider) => divider.beforeId === null || ids.has(divider.beforeId))));
    }, [snapshot.requests, snapshot.total]);

    const visibleIndices = new Map(visible.map((request, index) => [request.id, index]));
    function renderDividers(beforeId: string | null) {
        return dividers
            .filter((divider) => divider.beforeId === beforeId)
            .map((divider) => <TimelineDivider key={divider.id} divider={divider} onChange={(updated) => setDividers((current) => current.map((item) => (item.id === updated.id ? updated : item)))} onRemove={() => setDividers((current) => current.filter((item) => item.id !== divider.id))} />);
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-title">
                <h2>
                    Requests <span className="count">{snapshot.requests.length}</span>
                </h2>
                <button className="text-button" onClick={() => onSelect(null)} title="Automatically follow new requests">
                    Follow latest
                </button>
            </div>
            <div className="search-wrap">
                <span aria-hidden="true">⌕</span>
                <input aria-label="Filter requests" placeholder="Filter by ID, method, URL, type…" value={filter} onChange={(event) => onFilter(event.target.value)} />
            </div>
            <div className="sidebar-tools">
                <button className="add-divider" title="Mark a boundary here; new requests will appear above it" onClick={() => setDividers((current) => [{ id: crypto.randomUUID(), beforeId: snapshot.requests[0]?.id ?? null, label: '', color: DIVIDER_COLORS[0].value }, ...current])}>
                    + Add divider
                </button>
            </div>
            <div className="request-list">
                {snapshot.requests.map((request) => (
                    <Fragment key={request.id}>
                        {renderDividers(request.id)}
                        {visibleIndices.has(request.id) && (
                            <RequestRow
                                request={request}
                                striped={visibleIndices.get(request.id)! % 2 === 1}
                                selected={selectedId === request.id}
                                onClick={() => {
                                    dismiss();
                                    onSelect(request.id);
                                }}
                                onPointerEnter={(event) => {
                                    if (event.pointerType === 'mouse') start(request.id, event.currentTarget);
                                }}
                                onPointerLeave={leave}
                                onFocus={(event) => {
                                    if (event.currentTarget.matches(':focus-visible')) start(request.id, event.currentTarget);
                                }}
                                onBlur={leave}
                            />
                        )}
                    </Fragment>
                ))}
                {renderDividers(null)}
                {!visible.length && (
                    <div className="list-empty">
                        <span className="empty-icon" aria-hidden="true">
                            ⇣
                        </span>
                        <h3>{filter ? 'No matching requests' : 'Ready when you are'}</h3>
                        <p>{filter ? 'Try another search.' : 'Incoming requests will appear here.'}</p>
                    </div>
                )}
            </div>
            <footer className="sidebar-footer">
                <span>{snapshot.total.toLocaleString()} captured</span>
                <span>Latest {snapshot.capacity}</span>
            </footer>
            {preview && previewRequest && <RequestHoverPreview request={previewRequest} position={preview} onEnter={keepOpen} onLeave={leave} onClose={dismiss} />}
        </aside>
    );
}
