import { Fragment } from 'react';

import type { CapturedRequest, Snapshot } from '../../shared/types';
import { useRequestPreview } from '../hooks/useRequestPreview';
import { useTimelineDividers } from '../hooks/useTimelineDividers';
import { RequestHoverPreview } from './RequestHoverPreview';
import { RequestRow } from './RequestPrimitives';
import { TimelineDivider } from './TimelineDivider';

interface Props {
    readonly snapshot: Snapshot;
    readonly visibleRequests: readonly CapturedRequest[];
    readonly selectedId?: string;
    readonly filter: string;
    readonly onFilter: (value: string) => void;
    readonly onSelect: (id: string | null) => void;
}

export function RequestSidebar({
    snapshot,
    visibleRequests,
    selectedId,
    filter,
    onFilter,
    onSelect,
}: Props) {
    const { dividers, addDivider, updateDivider, removeDivider } = useTimelineDividers(snapshot);
    const { preview, startPreview, scheduleDismiss, keepOpen, dismissPreview } = useRequestPreview(
        visibleRequests.map((request) => request.id).join(','),
        selectedId,
    );
    const previewRequest = preview && visibleRequests.find((request) => request.id === preview.id);
    const visibleIndices = new Map(visibleRequests.map((request, index) => [request.id, index]));

    function handleSelectRequest(requestId: string): void {
        dismissPreview();
        onSelect(requestId);
    }

    function renderDividers(beforeId: string | null) {
        return dividers
            .filter((divider) => divider.beforeId === beforeId)
            .map((divider) => (
                <TimelineDivider
                    key={divider.id}
                    divider={divider}
                    onChange={updateDivider}
                    onRemove={() => {
                        removeDivider(divider.id);
                    }}
                />
            ));
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-title">
                <h2>
                    Requests <span className="count">{snapshot.requests.length}</span>
                </h2>
                <button
                    className="text-button"
                    onClick={() => {
                        onSelect(null);
                    }}
                    title="Automatically follow new requests"
                >
                    Follow latest
                </button>
            </div>
            <div className="search-wrap">
                <span aria-hidden="true">⌕</span>
                <input
                    aria-label="Filter requests"
                    placeholder="Filter by ID, method, URL, type…"
                    value={filter}
                    onChange={(event) => {
                        onFilter(event.target.value);
                    }}
                />
            </div>
            <div className="sidebar-tools">
                <button
                    className="add-divider"
                    title="Mark a boundary here; new requests will appear above it"
                    onClick={addDivider}
                >
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
                                isStriped={(visibleIndices.get(request.id) ?? 0) % 2 === 1}
                                isSelected={selectedId === request.id}
                                onSelect={handleSelectRequest}
                                onPreviewStart={startPreview}
                                onPreviewLeave={scheduleDismiss}
                            />
                        )}
                    </Fragment>
                ))}
                {renderDividers(null)}
                {!visibleRequests.length && (
                    <div className="list-empty">
                        <span
                            className="empty-icon"
                            aria-hidden="true"
                        >
                            ⇣
                        </span>
                        <h3>{filter ? 'No matching requests' : 'Ready when you are'}</h3>
                        <p>
                            {filter ? 'Try another search.' : 'Incoming requests will appear here.'}
                        </p>
                    </div>
                )}
            </div>
            <footer className="sidebar-footer">
                <span>{snapshot.total.toLocaleString()} captured</span>
                <span>Latest {snapshot.capacity}</span>
            </footer>
            {preview && previewRequest && (
                <RequestHoverPreview
                    request={previewRequest}
                    position={preview}
                    onEnter={keepOpen}
                    onLeave={scheduleDismiss}
                    onClose={dismissPreview}
                />
            )}
        </aside>
    );
}
