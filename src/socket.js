/**
 * @fileoverview Factory for the Socket.IO client used by the editor room.
 */

import { io } from 'socket.io-client'

/**
 * Opens a new WebSocket connection to `REACT_APP_BACKEND_URL`.
 * `forceNew` avoids reusing a stale socket after Leave / remount.
 *
 * @returns {import('socket.io-client').Socket} Connected (or connecting) client.
 */
export const initSocket = () => {
  /**
   * Socket.IO client options for this app.
   * @type {import('socket.io-client').ManagerOptions}
   */
  const options = {
    forceNew: true,
    transports: ['websocket'],
    timeout: 20000,
    reconnectionAttempts: Infinity,
  }
  return io(process.env.REACT_APP_BACKEND_URL, options)
}
