const VIEWPORT_PADDING_PX = 12;
const PREVIEW_GAP_PX = 14;
const MIN_BALLOON_WIDTH_PX = 280;
const MAX_PREVIEW_WIDTH_PX = 440;
const MAX_PREVIEW_HEIGHT_PX = 480;
const POINTER_INSET_PX = 18;
const POINTER_BOTTOM_OFFSET_PX = 22;

export interface PreviewPosition {
    readonly id: string;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly maxHeight: number;
    readonly anchorTop: number;
    readonly hasPointer: boolean;
}

interface PreviewAnchor {
    readonly right: number;
    readonly top: number;
}

interface Viewport {
    readonly width: number;
    readonly height: number;
}

export interface PreviewPlacement {
    readonly top: number;
    readonly pointerTop: number;
}

export function getPreviewPosition(
    requestId: string,
    anchor: PreviewAnchor,
    viewport: Viewport,
): PreviewPosition {
    const availableWidth = viewport.width - anchor.right - VIEWPORT_PADDING_PX - PREVIEW_GAP_PX;
    const hasPointer = availableWidth >= MIN_BALLOON_WIDTH_PX;
    const width = Math.min(
        MAX_PREVIEW_WIDTH_PX,
        hasPointer ? availableWidth : viewport.width - VIEWPORT_PADDING_PX * 2,
    );
    const maxHeight = Math.min(MAX_PREVIEW_HEIGHT_PX, viewport.height - VIEWPORT_PADDING_PX * 2);
    const anchorTop = anchor.top + POINTER_INSET_PX;

    return {
        id: requestId,
        width,
        maxHeight,
        hasPointer,
        anchorTop,
        left: hasPointer
            ? anchor.right + PREVIEW_GAP_PX
            : viewport.width - width - VIEWPORT_PADDING_PX,
        top: Math.max(VIEWPORT_PADDING_PX, anchorTop - maxHeight),
    };
}

export function getPreviewPlacement(
    position: PreviewPosition,
    panelHeight: number,
    viewportHeight: number,
): PreviewPlacement {
    const top = Math.max(
        VIEWPORT_PADDING_PX,
        Math.min(
            position.anchorTop - panelHeight + POINTER_BOTTOM_OFFSET_PX,
            viewportHeight - panelHeight - VIEWPORT_PADDING_PX,
        ),
    );

    return {
        top,
        pointerTop: Math.max(
            POINTER_INSET_PX,
            Math.min(position.anchorTop - top, panelHeight - POINTER_INSET_PX),
        ),
    };
}
