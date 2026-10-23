import type { SyntheticEvent } from 'react';

import { MAX_GET_RESPONSE_BYTES } from '../../shared/constants';
import { useGetResponse } from '../hooks/useGetResponse';
import { Method } from './RequestPrimitives';

export function GetResponseSettings() {
    const {
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
    } = useGetResponse();

    function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
        event.preventDefault();
        void applyResponse();
    }

    return (
        <details
            className="response-setting get-response-settings"
            name="receiver-settings"
        >
            <summary className="settings-trigger">
                <span className="get-response-title">
                    <Method method="GET" />
                    Response
                </span>
                <span className="setting-value">
                    {activeResponse ? `HTTP ${activeResponse.statusCode}` : 'Loading...'}
                </span>
                <span
                    className="settings-chevron"
                    aria-hidden="true"
                />
            </summary>
            <form
                className="settings-menu"
                aria-label="Response for incoming GET requests"
                onSubmit={handleSubmit}
            >
                <h3>GET response</h3>
                <p>
                    Applies to all new GET requests received at /webhook. Requests appear in history
                    immediately; the response uses the configured delay.
                </p>
                <fieldset disabled={activeResponse === null || isSaving}>
                    <div className="get-response-fields">
                        <label>
                            HTTP status
                            <input
                                type="number"
                                min={200}
                                max={599}
                                step={1}
                                required
                                value={statusDraft}
                                onChange={(event) => {
                                    setStatusDraft(event.target.value);
                                }}
                            />
                        </label>
                        <label>
                            Content type
                            <input
                                type="text"
                                required
                                maxLength={256}
                                value={contentTypeDraft}
                                onChange={(event) => {
                                    setContentTypeDraft(event.target.value);
                                }}
                            />
                        </label>
                    </div>
                    <label className="get-response-body">
                        Response body
                        <textarea
                            rows={4}
                            maxLength={MAX_GET_RESPONSE_BYTES}
                            value={bodyDraft}
                            onChange={(event) => {
                                setBodyDraft(event.target.value);
                            }}
                            aria-describedby="get-response-help"
                        />
                    </label>
                    <p id="get-response-help">
                        Sent exactly as entered, up to 64 KiB of UTF-8 text. Status 204, 205 and 304
                        require an empty body.
                    </p>
                    <div className="get-response-actions">
                        <button
                            className="accent"
                            type="submit"
                            disabled={!hasChanges}
                        >
                            {isSaving ? 'Applying...' : 'Apply GET response'}
                        </button>
                        <button
                            type="button"
                            onClick={resetDraftToDefault}
                        >
                            Use default
                        </button>
                    </div>
                </fieldset>
                <span role="status">
                    {activeResponse === null
                        ? 'Loading GET response settings...'
                        : 'Changes affect new GET requests only. Settings reset on server restart.'}
                </span>
                {error && <span role="alert">{error}</span>}
            </form>
        </details>
    );
}
