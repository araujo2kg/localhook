import type { CapturedRequest, Snapshot } from '../../shared/types';
import { RequestRow } from './RequestPrimitives';

interface Props {
    snapshot: Snapshot;
    visible: CapturedRequest[];
    selectedId?: string;
    filter: string;
    onFilter: (value: string) => void;
    onSelect: (id: string | null) => void;
}

export function RequestSidebar({ snapshot, visible, selectedId, filter, onFilter, onSelect }: Props) {
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
                <input aria-label="Filter requests" placeholder="Filter by method, URL, type…" value={filter} onChange={(event) => onFilter(event.target.value)} />
            </div>
            <div className="request-list">
                {visible.map((request, index) => (
                    <RequestRow key={request.id} request={request} striped={index % 2 === 1} selected={selectedId === request.id} onClick={() => onSelect(request.id)} />
                ))}
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
        </aside>
    );
}
