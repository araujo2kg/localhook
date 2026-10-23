import { useEffect, useRef, useState } from 'react';

import { isResponseDelay } from '../../shared/validation';
import { getReceiverSettings, updateReceiverSettings } from '../api';

export function useResponseDelay() {
    const [delayDraft, setDelayDraft] = useState('');
    const [activeDelayMs, setActiveDelayMs] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const controller = useRef<AbortController | null>(null);

    useEffect(() => {
        const requestController = new AbortController();

        controller.current = requestController;

        async function loadSettings(): Promise<void> {
            try {
                const settings = await getReceiverSettings(requestController.signal);

                if (!requestController.signal.aborted) {
                    setDelayDraft(String(settings.responseDelayMs));
                    setActiveDelayMs(settings.responseDelayMs);
                }
            } catch (cause) {
                if (!requestController.signal.aborted) {
                    setError(
                        cause instanceof Error ? cause.message : 'Unable to load response delay',
                    );
                }
            }
        }

        void loadSettings();

        return () => {
            requestController.abort();
        };
    }, []);

    async function applyDelay(): Promise<void> {
        const signal = controller.current?.signal;
        const responseDelayMs = Number(delayDraft);

        if (!signal || isSaving || activeDelayMs === null) {
            return;
        }

        if (delayDraft.trim() === '' || !isResponseDelay(responseDelayMs)) {
            setError('Enter a whole number of milliseconds within the allowed range.');

            return;
        }

        setIsSaving(true);
        setError('');

        try {
            const settings = await updateReceiverSettings(responseDelayMs, signal);

            if (!signal.aborted) {
                setActiveDelayMs(settings.responseDelayMs);
                setDelayDraft(String(settings.responseDelayMs));
            }
        } catch (cause) {
            if (!signal.aborted) {
                setError(cause instanceof Error ? cause.message : 'Unable to save response delay');
            }
        } finally {
            if (!signal.aborted) {
                setIsSaving(false);
            }
        }
    }

    return { delayDraft, setDelayDraft, activeDelayMs, isSaving, error, applyDelay };
}
