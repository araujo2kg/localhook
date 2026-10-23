import { useCallback, useEffect, useRef, useState } from 'react';

import { REQUEST_PREVIEW_DELAY_MS, REQUEST_PREVIEW_LEAVE_MS } from '../constants';
import { getPreviewPosition, type PreviewPosition } from '../previewPosition';

export function useRequestPreview(historyKey: string, selectedId?: string) {
    const [preview, setPreview] = useState<PreviewPosition>();
    const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cancelTimer = useCallback(() => {
        clearTimeout(previewTimer.current);
        previewTimer.current = undefined;
    }, []);
    const dismissPreview = useCallback(() => {
        cancelTimer();
        setPreview(undefined);
    }, [cancelTimer]);
    const startPreview = useCallback(
        (id: string, element: HTMLElement) => {
            dismissPreview();
            previewTimer.current = setTimeout(() => {
                if (!element.isConnected) {
                    return;
                }

                const position = getPreviewPosition(id, element.getBoundingClientRect(), {
                    width: window.innerWidth,
                    height: window.innerHeight,
                });

                setPreview(position);
            }, REQUEST_PREVIEW_DELAY_MS);
        },
        [dismissPreview],
    );
    const scheduleDismiss = useCallback(() => {
        cancelTimer();
        previewTimer.current = setTimeout(dismissPreview, REQUEST_PREVIEW_LEAVE_MS);
    }, [cancelTimer, dismissPreview]);

    useEffect(() => {
        dismissPreview();
    }, [historyKey, selectedId, dismissPreview]);

    useEffect(() => {
        const handleScroll = (event: Event) => {
            // Scrolling the preview itself should leave it open for longer bodies.
            if (event.target instanceof Element && event.target.closest('.request-hover-preview')) {
                return;
            }

            dismissPreview();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                dismissPreview();
            }
        };

        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', dismissPreview);
        window.addEventListener('blur', dismissPreview);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            cancelTimer();
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', dismissPreview);
            window.removeEventListener('blur', dismissPreview);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [cancelTimer, dismissPreview]);

    return { preview, startPreview, scheduleDismiss, keepOpen: cancelTimer, dismissPreview };
}
