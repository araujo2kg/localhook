import {
    type CSSProperties,
    type FocusEvent,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { CapturedRequest } from '../../shared/types';
import { formatRequestBody, formatTime } from '../format';
import {
    getPreviewPlacement,
    type PreviewPlacement,
    type PreviewPosition,
} from '../previewPosition';
import { Method, RequestIdentifier } from './RequestPrimitives';

interface Props {
    readonly request: CapturedRequest;
    readonly position: PreviewPosition;
    readonly onEnter: () => void;
    readonly onLeave: () => void;
    readonly onClose: () => void;
}

interface PreviewStyle extends CSSProperties {
    '--pointer-top': string;
}

export function RequestHoverPreview({ request, position, onEnter, onLeave, onClose }: Props) {
    let bodyLabel = 'Empty body';

    if (request.jsonValid) {
        bodyLabel = 'Formatted JSON';
    } else if (request.size > 0) {
        bodyLabel = 'Original UTF-8 payload';
    }

    const body = useMemo(() => formatRequestBody(request), [request]);
    const panel = useRef<HTMLElement>(null);
    const [placement, setPlacement] = useState<PreviewPlacement>(() =>
        getPreviewPlacement(position, position.maxHeight, window.innerHeight),
    );

    useLayoutEffect(() => {
        if (!panel.current) {
            return;
        }

        const height = panel.current.getBoundingClientRect().height;

        setPlacement(getPreviewPlacement(position, height, window.innerHeight));
    }, [position, body]);

    const previewStyle: PreviewStyle = {
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        top: placement.top,
        '--pointer-top': `${placement.pointerTop}px`,
    };

    function handleBlur(event: FocusEvent<HTMLElement>): void {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            onLeave();
        }
    }

    return createPortal(
        <section
            ref={panel}
            className={`request-hover-preview ${position.hasPointer ? 'preview-balloon' : ''}`}
            style={previewStyle}
            role="region"
            aria-label="Request body preview"
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            onFocus={onEnter}
            onBlur={handleBlur}
        >
            <header className="preview-heading">
                <span className="eyebrow">BODY PREVIEW</span>
                <button
                    aria-label="Close body preview"
                    onClick={onClose}
                >
                    ×
                </button>
            </header>
            <div className="preview-request">
                <Method method={request.method} />
                <RequestIdentifier id={request.id} />
                <strong title={request.url}>{request.url}</strong>
                <time dateTime={request.timestamp}>{formatTime(request.timestamp)}</time>
            </div>
            <div
                className="preview-body"
                tabIndex={0}
                aria-label="Preview body"
            >
                {request.size ? (
                    <pre>
                        <code>{body}</code>
                    </pre>
                ) : (
                    <p>This request has no body.</p>
                )}
            </div>
            <footer>
                {bodyLabel}
                <span>Esc to dismiss</span>
            </footer>
        </section>,
        document.body,
    );
}
