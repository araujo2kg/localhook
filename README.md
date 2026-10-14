# LocalHook

A lightweight, local-first HTTP request inspector. Send requests to a fixed local endpoint and inspect headers, query parameters, and payloads as they arrive.

## Getting started

Requires **Node.js 22+** and npm.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:17381**. Send requests to **http://127.0.0.1:17381/webhook** using POST, PUT, or PATCH.

## Production

```sh
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env` in the project root, then edit the values:

```dotenv
PORT=17381
BODY_LIMIT=1mb
```

`PORT` sets the dashboard and receiver port. `BODY_LIMIT` sets the maximum request body size, such as `512kb` or `2mb`.

Both `npm run dev` and `npm start` load `.env` automatically. Restart the application after changing it. Without a `.env` file, the defaults above apply. Existing shell environment variables override `.env` values.

## Send a request

PowerShell:

```powershell
Invoke-RestMethod -Method Post `
    -Uri 'http://127.0.0.1:17381/webhook?source=demo' `
    -ContentType 'application/json' `
    -Headers @{ 'X-Example' = 'LocalHook' } `
    -Body (@{ event = 'order.created'; id = 42 } | ConvertTo-Json)
```

curl (Bash / zsh):

```sh
curl -X POST 'http://127.0.0.1:17381/webhook?source=demo' \
    -H 'Content-Type: application/json' \
    -d '{"event":"order.created","id":42}'
```

Plain text:

```sh
curl -X POST http://127.0.0.1:17381/webhook -H 'Content-Type: text/plain' -d 'Hello, LocalHook'
```

## Inspecting requests

- The latest **500** requests are retained, newest first; older entries are evicted.
- Headers, repeated query parameters, timestamp, byte size, content type, and remote address are captured.
- Valid JSON can be formatted; malformed JSON, text, forms, and empty bodies remain inspectable.
- Hover over a request for 700 ms to preview its body without changing the open request.
- Each request has a unique UUID. A short ID beside its method badge identifies it in history and previews.
- **Add divider** marks a boundary above the latest captured request; future requests appear above it. Click a divider to rename it, choose an accent color, or remove it. Dividers live only in the current dashboard tab and disappear on reload, history clear, or when their boundary request is evicted.
- The dashboard shows a UTF-8 preview. The API includes `bodyBase64` to preserve original bytes for binary payloads.
- Live updates use batched SSE notifications and fetch a bounded snapshot. Reconnection resynchronizes history.
- The newest request is selected automatically. Select an older request to keep it open; **Follow latest** restores automatic selection. Evicted selections fall back to the latest request.
- Pause stops dashboard synchronization while capture continues. Resume retrieves the current history.
- Clear history resets captured requests and the count for every connected dashboard.
- Storage is in memory only. Restarting the application clears all history.
- Oversized bodies receive HTTP **413**. Compressed request bodies receive **415**; send uncompressed payloads to retain exact bytes.

## API

| Endpoint               | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `POST /webhook`        | Capture a request; PUT and PATCH also supported            |
| `GET /api/requests`    | `{ requests, total, capacity }` snapshot                   |
| `DELETE /api/requests` | Clear history; returns 204                                 |
| `GET /api/events`      | SSE `refresh` events; fetch a new snapshot on notification |

Successful capture returns `{ "ok": true, "id": "..." }` with HTTP 200. JSON parsing validity is indicated by `jsonValid`; `rawBody` contains the original UTF-8 text and can be parsed when valid.

## Project structure

```text
client/     React dashboard and plain CSS
server/     Express receiver, history, and SSE
shared/     API types and constants
scripts/    esbuild build and watch workflow
tests/      Backend integration tests
```
