import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bodyPreview, formatRequestBody } from '../client/format';
import { getPreviewPlacement, getPreviewPosition } from '../client/previewPosition';

void test('preserves original text in raw mode and when JSON metadata disagrees with the body', () => {
    const validBody = { jsonValid: true, rawBody: '{ "event" : "example" }' };
    const malformedBody = { jsonValid: true, rawBody: '{broken' };

    assert.equal(formatRequestBody(validBody, true), validBody.rawBody);
    assert.equal(formatRequestBody(validBody), '{\n    "event": "example"\n}');
    assert.equal(formatRequestBody(malformedBody), malformedBody.rawBody);
    assert.equal(bodyPreview(malformedBody), undefined);
});

void test('inline previews show small JSON primitives and leave objects and multiline text in the detail view', () => {
    assert.equal(bodyPreview({ jsonValid: true, rawBody: '42' }), '42');
    assert.equal(bodyPreview({ jsonValid: true, rawBody: 'null' }), 'null');
    assert.equal(bodyPreview({ jsonValid: true, rawBody: '{"id":42}' }), undefined);
    assert.equal(bodyPreview({ jsonValid: true, rawBody: '"first\\nsecond"' }), undefined);
});

void test('preview uses the space beside a request when available', () => {
    const viewport = { width: 1200, height: 800 };
    const anchor = { right: 330, top: 200 };
    const position = getPreviewPosition('request-id', anchor, viewport);
    const placement = getPreviewPlacement(position, 200, viewport.height);

    assert.equal(position.id, 'request-id');
    assert.equal(position.hasPointer, true);
    assert.ok(position.left > anchor.right);
    assert.ok(position.left + position.width <= viewport.width);
    assert.ok(placement.top >= 0);
    assert.ok(placement.top + 200 <= viewport.height);
});

void test('preview fits a narrow viewport and keeps its pointer within the panel', () => {
    const viewport = { width: 300, height: 240 };
    const position = getPreviewPosition('request-id', { right: 250, top: 210 }, viewport);
    const panelHeight = 180;
    const placement = getPreviewPlacement(position, panelHeight, viewport.height);

    assert.equal(position.hasPointer, false);
    assert.ok(position.left >= 0);
    assert.ok(position.left + position.width <= viewport.width);
    assert.ok(position.maxHeight <= viewport.height);
    assert.ok(placement.top >= 0);
    assert.ok(placement.top + panelHeight <= viewport.height);
    assert.ok(placement.pointerTop > 0 && placement.pointerTop < panelHeight);
});
