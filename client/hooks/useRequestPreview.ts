import { useCallback, useEffect, useRef, useState } from 'react';
import { REQUEST_PREVIEW_DELAY_MS, REQUEST_PREVIEW_LEAVE_MS } from '../constants';

export interface PreviewPosition {
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    anchorTop: number;
    showPointer: boolean;
}

export function useRequestPreview(historyKey: string, selectedId?: string) {
    const [preview, setPreview] = useState<PreviewPosition & { id: string }>();
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cancelTimer = useCallback(() => {
        clearTimeout(timer.current);
        timer.current = undefined;
    }, []);
    const dismiss = useCallback(() => {
        cancelTimer();
        setPreview(undefined);
    }, [cancelTimer]);
    const start = useCallback(
        (id: string, element: HTMLElement) => {
            dismiss();
            timer.current = setTimeout(() => {
                if (!element.isConnected) return;
                const rect = element.getBoundingClientRect();
                const availableWidth = window.innerWidth - rect.right - 26;
                const showPointer = availableWidth >= 280;
                const width = Math.min(440, showPointer ? availableWidth : window.innerWidth - 24);
                const maxHeight = Math.min(480, window.innerHeight - 24);
                setPreview({ id, width, maxHeight, showPointer, anchorTop: rect.top + 18, left: showPointer ? rect.right + 14 : window.innerWidth - width - 12, top: Math.max(12, rect.top + 18 - maxHeight) });
            }, REQUEST_PREVIEW_DELAY_MS);
        },
        [dismiss],
    );
    const leave = useCallback(() => {
        cancelTimer();
        timer.current = setTimeout(dismiss, REQUEST_PREVIEW_LEAVE_MS);
    }, [cancelTimer, dismiss]);

    useEffect(() => {
        dismiss();
    }, [historyKey, selectedId, dismiss]);
    useEffect(() => {
        const onScroll = (event: Event) => {
            // Scrolling the preview itself should leave it open for longer bodies.
            if (event.target instanceof Element && event.target.closest('.request-hover-preview')) return;
            dismiss();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') dismiss();
        };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', dismiss);
        window.addEventListener('blur', dismiss);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            cancelTimer();
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', dismiss);
            window.removeEventListener('blur', dismiss);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [cancelTimer, dismiss]);
    return { preview, start, leave, keepOpen: cancelTimer, dismiss };
}
