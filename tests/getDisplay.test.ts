import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RequestDetails } from '../client/components/RequestDetails';
import { RequestSidebar } from '../client/components/RequestSidebar';
import type { CapturedRequest } from '../shared/types';

void test('GET requests with empty bodies render in history and expose metadata in the detail panel', () => {
    const request: CapturedRequest = {
        id: 'incoming-get-request',
        timestamp: '2026-10-23T12:00:00.000Z',
        method: 'GET',
        url: '/webhook?key=one&key=two',
        headers: { 'x-sender': 'external-application' },
        query: [
            ['key', 'one'],
            ['key', 'two'],
        ],
        rawBody: '',
        bodyBase64: '',
        jsonValid: false,
        contentType: '',
        size: 0,
        remoteIp: '127.0.0.1',
    };
    const listMarkup = renderToStaticMarkup(
        createElement(RequestSidebar, {
            snapshot: { requests: [request], total: 1, capacity: 500 },
            visibleRequests: [request],
            selectedId: request.id,
            filter: '',
            onFilter: () => undefined,
            onSelect: () => undefined,
        }),
    );
    const detailMarkup = renderToStaticMarkup(
        createElement(RequestDetails, {
            selected: request,
            receiver: 'http://127.0.0.1:17381/webhook',
            copy: () => Promise.resolve(),
        }),
    );

    assert.match(listMarkup, />GET</);
    assert.match(listMarkup, /\/webhook\?key=one&amp;key=two/);
    assert.doesNotMatch(listMarkup, /Ready when you are/);
    assert.match(detailMarkup, />GET</);
    assert.match(detailMarkup, /127\.0\.0\.1/);
    assert.match(detailMarkup, /Headers/);
    assert.match(detailMarkup, /Query/);
    assert.match(detailMarkup, /This request has no body/);
});
