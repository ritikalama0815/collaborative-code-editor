const express = require('express')
const cors = require('cors')
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { Server } = require('socket.io')

const app = express()
const PORT = process.env.PORT || 8080
const DEFAULT_CODE = '# start coding\nprint("hello")\n'
const RUN_TIMEOUT_MS = 5000
const MAX_OUTPUT = 50000

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json({ limit: '200kb' }))

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

const userSocketMap = {}
const roomCodeMap = {}

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      username: userSocketMap[socketId],
    }
  })
}

app.post('/run', (req, res) => {
  const code = req.body?.code
  if (typeof code !== 'string') {
    return res.status(400).json({ ok: false, error: 'No Python code provided' })
  }

  const file = path.join(
    os.tmpdir(),
    `coco-${Date.now()}-${Math.random().toString(16).slice(2)}.py`
  )

  try {
    fs.writeFileSync(file, code, 'utf8')
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Could not write temp file' })
  }

  let stdout = ''
  let stderr = ''
  let finished = false

  const child = spawn('python3', ['-u', file], {
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })

  const done = (payload) => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    fs.unlink(file, () => {})
    res.json(payload)
  }

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

io.on('connection', (socket) => {
  console.log('user connected successfully', socket.id)

  socket.on('join', async ({ roomId, username }) => {
    userSocketMap[socket.id] = username
    await socket.join(roomId)

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

  socket.on('code-change', ({ roomId, code }) => {
    roomCodeMap[roomId] = code
    socket.to(roomId).emit('code-change', { code })
  })

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms]
    rooms.forEach((roomId) => {
      if (roomId === socket.id) return
      socket.to(roomId).emit('disconnected', {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      })
    })
  })

  socket.on('disconnect', () => {
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
