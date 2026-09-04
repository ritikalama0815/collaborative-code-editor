# CoCo Editor — client

React (Create React App) UI for the collaborative Python editor.

Full setup, environment variables, socket events, and troubleshooting live in the **[root README](../README.md)**.

## Quick start

From this directory, after copying `../client/.env.example` to `.env`:

```bash
npm install
npm start
```

The app is at [http://localhost:3000](http://localhost:3000). The backend must already be running on port **8080** (`cd ../server && npm start`).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Dev server |
| `npm test` | Jest (watch mode) |
| `npm run build` | Production bundle in `build/` |

## Source map

| File | Role |
| --- | --- |
| `src/App.js` | Routes `/` and `/editor/:roomId` |
| `src/socket.js` | Socket.IO factory (`REACT_APP_BACKEND_URL`) |
| `src/components/Home.jsx` | Join / create room |
| `src/components/Editor.jsx` | Room, Run Python, output panel |
| `src/components/EditorAct.jsx` | CodeMirror 5 |
| `src/components/UserBar.jsx` | Avatar stack |

Functions and notable variables are documented with JSDoc in those files.
