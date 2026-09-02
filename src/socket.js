import { io } from 'socket.io-client'

export const initSocket = () => {
  const options = {
    forceNew: true,
    transports: ['websocket'],
    timeout: 20000,
    reconnectionAttempts: Infinity,
  }
  return io(process.env.REACT_APP_BACKEND_URL, options)
}
