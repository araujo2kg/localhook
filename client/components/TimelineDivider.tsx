import { type CSSProperties, type KeyboardEvent, useState } from 'react';

import { DIVIDER_COLORS } from '../constants';
import type { RequestDivider } from '../hooks/useTimelineDividers';

interface DividerStyle extends CSSProperties {
    '--divider-color': string;
}

interface Props {
    readonly divider: RequestDivider;
    readonly onChange: (divider: RequestDivider) => void;
    readonly onRemove: () => void;
}

export function TimelineDivider({ divider, onChange, onRemove }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const dividerStyle: DividerStyle = { '--divider-color': divider.color };

    function handleLabelKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === 'Enter' || event.key === 'Escape') {
            setIsEditing(false);
        }
    }

    return (
        <div
            className="timeline-divider"
            style={dividerStyle}
        >
            <button
                className="divider-label"
                onClick={() => {
                    setIsEditing((isCurrentlyEditing) => !isCurrentlyEditing);
                }}
                aria-expanded={isEditing}
                title="Edit divider label and color"
            >
                <span>{divider.label || 'Scenario divider'}</span>
                <span aria-hidden="true">{isEditing ? '−' : '✎'}</span>
            </button>
            {isEditing && (
                <div className="divider-editor">
                    <label>
                        Label
                        <input
                            autoFocus
                            maxLength={60}
                            value={divider.label}
                            placeholder="Scenario divider"
                            onChange={(event) => {
                                onChange({ ...divider, label: event.target.value });
                            }}
                            onKeyDown={handleLabelKeyDown}
                        />
                    </label>
                    <div
                        className="divider-colors"
                        role="group"
                        aria-label="Divider color"
                    >
                        {DIVIDER_COLORS.map(({ name, value }) => (
                            <button
                                key={value}
                                aria-label={name}
                                aria-pressed={divider.color === value}
                                style={{ background: value }}
                                onClick={() => {
                                    onChange({ ...divider, color: value });
                                }}
                            />
                        ))}
                    </div>
                    <div className="divider-actions">
                        <button onClick={onRemove}>Remove</button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
