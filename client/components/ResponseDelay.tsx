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
        <details
            className="response-setting response-delay-settings"
            name="receiver-settings"
        >
            <summary className="settings-trigger">
                <span>Delay</span>
                <span className="setting-value">
                    {isLoading ? 'Loading...' : `${activeDelayMs} ms`}
                </span>
                <span
                    className="settings-chevron"
                    aria-hidden="true"
                />
            </summary>
            <form
                className="settings-menu response-delay"
                aria-label="Response delay"
                onSubmit={handleSubmit}
            >
                <h3>Response timing</h3>
                <p id="response-delay-help">
                    Applies to all incoming requests. Set to 0 for an immediate response.
                </p>
                <label htmlFor="response-delay">Delay in milliseconds</label>
                <div className="response-delay-controls">
                    <div className="delay-input">
                        <input
                            id="response-delay"
                            type="number"
                            aria-label="Response delay in milliseconds"
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
                        <span aria-hidden="true">ms</span>
                    </div>
                    <button
                        className="accent"
                        type="submit"
                        disabled={!canApply}
                    >
                        {isSaving ? 'Applying...' : 'Apply'}
                    </button>
                </div>
                <span
                    className="setting-value"
                    role="status"
                    title="Active response delay"
                >
                    {isLoading ? 'Loading...' : `Active: ${activeDelayMs} ms`}
                </span>
                {error && <span role="alert">{error}</span>}
            </form>
        </details>
    );
}
