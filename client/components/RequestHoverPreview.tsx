import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { CapturedRequest } from '../../shared/types';
import { formatTime, JSON_INDENT_SPACES } from '../format';
import { Method } from './RequestPrimitives';
import type { PreviewPosition } from '../hooks/useRequestPreview';

interface Props {
    request: CapturedRequest;
    position: PreviewPosition;
    onEnter: () => void;
    onLeave: () => void;
    onClose: () => void;
}

export function RequestHoverPreview({ request, position, onEnter, onLeave, onClose }: Props) {
    const body = useMemo(() => (request.jsonValid ? JSON.stringify(JSON.parse(request.rawBody), null, JSON_INDENT_SPACES) : request.rawBody), [request]);
    const panel = useRef<HTMLElement>(null);
    const [placement, setPlacement] = useState({ top: position.top, pointerTop: 18 });
    useLayoutEffect(() => {
        if (!panel.current) return;
        const height = panel.current.getBoundingClientRect().height;
        const top = Math.max(12, Math.min(position.anchorTop - height + 22, window.innerHeight - height - 12));
        setPlacement({ top, pointerTop: Math.max(18, Math.min(position.anchorTop - top, height - 18)) });
    }, [position, body]);
    return createPortal(
        <section
            ref={panel}
            className={`request-hover-preview ${position.showPointer ? 'preview-balloon' : ''}`}
            style={{ left: position.left, width: position.width, maxHeight: position.maxHeight, top: placement.top, '--pointer-top': `${placement.pointerTop}px` } as CSSProperties}
            role="region"
            aria-label="Request body preview"
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            onFocus={onEnter}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) onLeave();
            }}
        >
            <header className="preview-heading">
                <span className="eyebrow">BODY PREVIEW</span>
                <button aria-label="Close body preview" onClick={onClose}>
                    ×
                </button>
            </header>
            <div className="preview-request">
                <Method method={request.method} />
                <strong title={request.url}>{request.url}</strong>
                <time dateTime={request.timestamp}>{formatTime(request.timestamp)}</time>
            </div>
            <div className="preview-body" tabIndex={0} aria-label="Preview body">
                {request.size ? (
                    <pre>
                        <code>{body}</code>
                    </pre>
                ) : (
                    <p>This request has no body.</p>
                )}
            </div>
            <footer>
                {request.jsonValid ? 'Formatted JSON' : request.size ? 'Original UTF-8 payload' : 'Empty body'}
                <span>Esc to dismiss</span>
            </footer>
        </section>,
        document.body,
    );
}
