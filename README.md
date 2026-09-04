# CoCo Editor — server

Express + Socket.IO backend: room membership, live document sync, and `POST /run` (Python 3).

Full architecture, event table, and runner limits are in the **[root README](../README.md)**.

## Quick start

Requires `python3` on your PATH.

```bash
npm install
npm start
```

Listens on **8080** (or `PORT`). CORS allows `http://localhost:3000`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | HTTP + WebSocket server |
| `npm test` | Syntax check `index.js`, then `smoke-test.js` |

`smoke-test.js` starts a temporary instance on port **18080** (`SMOKE_PORT`), POSTs `print(42)`, and expects that value in the JSON output.

## Source map

| File | Role |
| --- | --- |
| `index.js` | Socket.IO rooms, `roomCodeMap`, Python subprocess |
| `smoke-test.js` | CI / local smoke test for `/run` |

JSDoc comments document each function and notable variable in those files.
