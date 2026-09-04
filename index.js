/**
 * @fileoverview Express + Socket.IO backend for CoCo Editor.
 * Serves CORS-enabled REST (Python runner) and real-time room sync.
 */

const express = require('express')
const cors = require('cors')
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { Server } = require('socket.io')

/** @type {import('express').Express} HTTP app (JSON API + Socket.IO attach). */
const app = express()

/** @type {number|string} Listen port from env, or 8080 for local dev. */
const PORT = process.env.PORT || 8080

/** @type {string} Document given to the first person who joins an empty room. */
const DEFAULT_CODE = '# start coding\nprint("hello")\n'

/** @type {number} Max milliseconds a Python process may run before SIGKILL. */
const RUN_TIMEOUT_MS = 5000

/** @type {number} Max characters kept from stdout or stderr. */
const MAX_OUTPUT = 50000

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json({ limit: '200kb' }))

/** @type {import('http').Server} Shared HTTP server for Express and Socket.IO. */
const server = http.createServer(app)

/**
 * Socket.IO server bound to the same HTTP port as Express.
 * @type {import('socket.io').Server}
 */
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

/**
 * Maps Socket.IO connection id → display name.
 * @type {Object<string, string>}
 */
const userSocketMap = {}

/**
 * Maps room id → latest shared source text.
 * @type {Object<string, string>}
 */
const roomCodeMap = {}

/**
 * Lists everyone currently in a Socket.IO room.
 *
 * @param {string} roomId Collaborative room identifier from the URL.
 * @returns {{ socketId: string, username: string }[]} Connected clients.
 */
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      username: userSocketMap[socketId],
    }
  })
}

/**
 * Runs submitted Python and returns stdout or an error payload.
 *
 * @param {import('express').Request} req Body must include `{ code: string }`.
 * @param {import('express').Response} res JSON `{ ok, output }` or `{ ok, error }`.
 */
app.post('/run', (req, res) => {
  /** @type {unknown} Raw editor text from the client. */
  const code = req.body?.code
  if (typeof code !== 'string') {
    return res.status(400).json({ ok: false, error: 'No Python code provided' })
  }

  /** @type {string} Unique temp file so concurrent runs do not collide. */
  const file = path.join(
    os.tmpdir(),
    `coco-${Date.now()}-${Math.random().toString(16).slice(2)}.py`
  )

  try {
    fs.writeFileSync(file, code, 'utf8')
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Could not write temp file' })
  }

  /** @type {string} Captured standard output. */
  let stdout = ''
  /** @type {string} Captured standard error. */
  let stderr = ''
  /** @type {boolean} Guards against sending two HTTP responses. */
  let finished = false

  /** @type {import('child_process').ChildProcess} Unbuffered python3 process. */
  const child = spawn('python3', ['-u', file], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })

  /**
   * Ends the request once: JSON body, clear timer, delete temp file.
   *
   * @param {{ ok: boolean, output?: string, error?: string }} payload Result for the UI.
   */
  const done = (payload) => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    fs.unlink(file, () => {})
    res.json(payload)
  }

  /** @type {NodeJS.Timeout} Kills hung programs (infinite loops, blocking input). */
  const timer = setTimeout(() => {
    child.kill('SIGKILL')
    done({ ok: false, error: `Timed out after ${RUN_TIMEOUT_MS / 1000} seconds` })
  }, RUN_TIMEOUT_MS)

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
    if (stdout.length > MAX_OUTPUT) {
      stdout = stdout.slice(0, MAX_OUTPUT) + '\n...output truncated'
      child.kill('SIGKILL')
    }
  })

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
    if (stderr.length > MAX_OUTPUT) {
      stderr = stderr.slice(0, MAX_OUTPUT) + '\n...error truncated'
    }
  })

  child.on('error', (err) => {
    done({
      ok: false,
      error: err.code === 'ENOENT'
        ? 'Python 3 is not installed on the server'
        : err.message,
    })
  })

  child.on('close', (exitCode, signal) => {
    if (finished) return
    if (signal === 'SIGKILL') {
      done({ ok: false, error: `Timed out after ${RUN_TIMEOUT_MS / 1000} seconds` })
      return
    }
    if (exitCode === 0) {
      done({ ok: true, output: stdout || '(no output)' })
      return
    }
    done({
      ok: false,
      error: (stderr || stdout || `Python exited with code ${exitCode}`)
        .trim()
        .replace(/File "[^"]+\.py", /g, ''),
    })
  })
})

/**
 * Wires join, document sync, and leave for a single browser connection.
 *
 * @param {import('socket.io').Socket} socket New Socket.IO connection.
 */
io.on('connection', (socket) => {
  console.log('user connected successfully', socket.id)

  /**
   * Adds the user to a room, broadcasts the member list, and sends the current document.
   *
   * @param {{ roomId: string, username: string }} payload Join request from the client.
   */
  socket.on('join', async ({ roomId, username }) => {
    userSocketMap[socket.id] = username
    await socket.join(roomId)

    /** @type {{ socketId: string, username: string }[]} Everyone in this room after join. */
    const clients = getAllConnectedClients(roomId)
    io.in(roomId).emit('joined', {
      clients,
      username,
      socketId: socket.id,
    })

    socket.emit('code-change', {
      code: roomCodeMap[roomId] ?? DEFAULT_CODE,
    })
    console.log(`${username} joined room ${roomId}`)
  })

  /**
   * Stores the latest document and relays it to everyone else in the room.
   *
   * @param {{ roomId: string, code: string }} payload Full editor text from one client.
   */
  socket.on('code-change', ({ roomId, code }) => {
    roomCodeMap[roomId] = code
    socket.to(roomId).emit('code-change', { code })
  })

  /**
   * Notifies remaining members before the socket leaves its rooms.
   */
  socket.on('disconnecting', () => {
    /** @type {string[]} Rooms this socket is in (includes its private room). */
    const rooms = [...socket.rooms]
    rooms.forEach((roomId) => {
      if (roomId === socket.id) return
      socket.to(roomId).emit('disconnected', {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      })
    })
  })

  /**
   * Drops the username mapping and deletes empty rooms from `roomCodeMap`.
   */
  socket.on('disconnect', () => {
    /** @type {string|undefined} Name recorded at join, if any. */
    const username = userSocketMap[socket.id]
    delete userSocketMap[socket.id]
    console.log('user disconnected', username, socket.id)

    for (const roomId of Object.keys(roomCodeMap)) {
      const room = io.sockets.adapter.rooms.get(roomId)
      if (!room || room.size === 0) {
        delete roomCodeMap[roomId]
      }
    }
  })
})

server.listen(PORT, () => console.log('server running OK on port', PORT))
