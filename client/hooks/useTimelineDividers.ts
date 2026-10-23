import { useEffect, useRef, useState } from 'react';

import type { Snapshot } from '../../shared/types';
import { DIVIDER_COLORS } from '../constants';

export interface RequestDivider {
    readonly id: string;
    readonly beforeId: string | null;
    readonly label: string;
    readonly color: string;
}

export function useTimelineDividers(snapshot: Snapshot) {
    const [dividers, setDividers] = useState<RequestDivider[]>([]);
    const previousTotal = useRef(snapshot.total);

    useEffect(() => {
        const requestIds = new Set(snapshot.requests.map((request) => request.id));
        const wasHistoryCleared = snapshot.total === 0 && previousTotal.current > 0;

        previousTotal.current = snapshot.total;
        setDividers((currentDividers) => {
            if (wasHistoryCleared) {
                return [];
            }

            return currentDividers.filter(
                (divider) => divider.beforeId === null || requestIds.has(divider.beforeId),
            );
        });
    }, [snapshot.requests, snapshot.total]);

    function addDivider(): void {
        const divider: RequestDivider = {
            id: crypto.randomUUID(),
            beforeId: snapshot.requests[0]?.id ?? null,
            label: '',
            color: DIVIDER_COLORS[0].value,
        };

        setDividers((currentDividers) => [divider, ...currentDividers]);
    }

    function updateDivider(updatedDivider: RequestDivider): void {
        setDividers((currentDividers) =>
            currentDividers.map((divider) =>
                divider.id === updatedDivider.id ? updatedDivider : divider,
            ),
        );
    }

    function removeDivider(dividerId: string): void {
        setDividers((currentDividers) =>
            currentDividers.filter((divider) => divider.id !== dividerId),
        );
    }

    return { dividers, addDivider, updateDivider, removeDivider };
}
