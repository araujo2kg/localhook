import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_GET_RESPONSE } from '../../shared/constants';
import type { GetResponse } from '../../shared/types';
import { parseGetResponse } from '../../shared/validation';
import { getReceiverSettings, updateGetResponse } from '../api';

export function useGetResponse() {
    const [activeResponse, setActiveResponse] = useState<GetResponse | null>(null);
    const [statusDraft, setStatusDraft] = useState(String(DEFAULT_GET_RESPONSE.statusCode));
    const [contentTypeDraft, setContentTypeDraft] = useState<string>(
        DEFAULT_GET_RESPONSE.contentType,
    );
    const [bodyDraft, setBodyDraft] = useState<string>(DEFAULT_GET_RESPONSE.body);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const controller = useRef<AbortController | null>(null);

    const setDraft = useCallback((response: GetResponse): void => {
        setStatusDraft(String(response.statusCode));
        setContentTypeDraft(response.contentType);
        setBodyDraft(response.body);
    }, []);

    useEffect(() => {
        const requestController = new AbortController();

        controller.current = requestController;

        async function loadResponse(): Promise<void> {
            try {
                const settings = await getReceiverSettings(requestController.signal);

                if (!requestController.signal.aborted) {
                    setActiveResponse(settings.getResponse);
                    setDraft(settings.getResponse);
                }
            } catch (cause) {
                if (!requestController.signal.aborted) {
                    setError(
                        cause instanceof Error ? cause.message : 'Unable to load GET response',
                    );
                }
            }
        }

        void loadResponse();

        return () => {
            requestController.abort();
        };
    }, [setDraft]);

    async function applyResponse(): Promise<void> {
        const signal = controller.current?.signal;

        if (!signal || !activeResponse || isSaving) {
            return;
        }

        setError('');
        setIsSaving(true);

        try {
            const response = parseGetResponse({
                statusCode: Number(statusDraft),
                contentType: contentTypeDraft,
                body: bodyDraft,
            });
            const settings = await updateGetResponse(response, signal);

            if (!signal.aborted) {
                setActiveResponse(settings.getResponse);
                setDraft(settings.getResponse);
            }
        } catch (cause) {
            if (!signal.aborted) {
                setError(cause instanceof Error ? cause.message : 'Unable to save GET response');
            }
        } finally {
            if (!signal.aborted) {
                setIsSaving(false);
            }
        }
    }

    const hasChanges =
        activeResponse !== null &&
        (Number(statusDraft) !== activeResponse.statusCode ||
            contentTypeDraft !== activeResponse.contentType ||
            bodyDraft !== activeResponse.body);

    function resetDraftToDefault(): void {
        setDraft(DEFAULT_GET_RESPONSE);
    }

    return {
        activeResponse,
        statusDraft,
        setStatusDraft,
        contentTypeDraft,
        setContentTypeDraft,
        bodyDraft,
        setBodyDraft,
        isSaving,
        error,
        hasChanges,
        applyResponse,
        resetDraftToDefault,
    };
}
