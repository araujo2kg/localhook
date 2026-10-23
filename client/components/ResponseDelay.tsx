import type { SyntheticEvent } from 'react';

import { MAX_RESPONSE_DELAY_MS } from '../../shared/constants';
import { useResponseDelay } from '../hooks/useResponseDelay';

export function ResponseDelay() {
    const { delayDraft, setDelayDraft, activeDelayMs, isSaving, error, applyDelay } =
        useResponseDelay();
    const isLoading = activeDelayMs === null;
    const canApply =
        !isLoading && !isSaving && delayDraft.trim() !== '' && Number(delayDraft) !== activeDelayMs;

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
        event.preventDefault();
        void applyDelay();
    }

    return (
        <form
            className="response-delay"
            aria-label="Receiver response settings"
            onSubmit={handleSubmit}
        >
            <label htmlFor="response-delay">Response delay (ms)</label>
            <input
                id="response-delay"
                type="number"
                min={0}
                max={MAX_RESPONSE_DELAY_MS}
                step={1}
                required
                value={delayDraft}
                disabled={isLoading || isSaving}
                onChange={(event) => {
                    setDelayDraft(event.target.value);
                }}
                aria-describedby="response-delay-help"
            />
            <button
                type="submit"
                disabled={!canApply}
            >
                {isSaving ? 'Applying...' : 'Apply'}
            </button>
            <span
                id="response-delay-help"
                role="status"
            >
                {isLoading
                    ? 'Loading settings...'
                    : `Active: ${activeDelayMs} ms. Applies to new GET, POST, PUT and PATCH requests. 0 responds immediately.`}
            </span>
            {error && <span role="alert">{error}</span>}
        </form>
    );
}
