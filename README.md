# LocalHook

Local HTTP request inspector with live history, headers, query parameters, and body previews.
Supports incoming GET, POST, PUT, and PATCH requests.

## Run

Requires Node.js 22.13.0+ and npm.

```sh
npm install
npm run dev
```

Dashboard: **http://127.0.0.1:17381** Receiver: **http://127.0.0.1:17381/webhook**

Use **Delay** to simulate slow responses and **GET Response** to set the returned status, content
type, and body. Defaults: no delay; GET returns HTTP 200 with `{ "ok": true }`.

History holds 500 requests in memory. History and response settings reset on restart.

## Configuration

Copy `.env.example` to `.env`. Defaults: `PORT=17381`, `BODY_LIMIT=1mb`, `RESPONSE_DELAY_MS=0`.
Restart after editing; shell environment variables take precedence.

## Commands

- Production: `npm run build` then `npm start`.
- Quality checks: `npm run check`.
