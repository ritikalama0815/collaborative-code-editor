/**
 * @fileoverview CI smoke test: boot the API on SMOKE_PORT and POST /run.
 * Expects `{ ok: true, output }` containing `42`.
 */

const { spawn } = require('child_process')
const http = require('http')

/** @type {number|string} Isolated port so this test does not clash with a local 8080 server. */
const PORT = process.env.SMOKE_PORT || 18080

/** @type {import('child_process').ChildProcess} Child running `index.js`. */
const child = spawn(process.execPath, ['index.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
})

/** @type {boolean} True after stdout contains "server running OK". */
let ready = false

/**
 * Logs an error, stops the child server, and exits non-zero.
 *
 * @param {string} message Why the smoke test failed.
 */
const fail = (message) => {
  console.error(message)
  child.kill('SIGTERM')
  process.exit(1)
}

/**
 * POSTs sample Python to `/run` and asserts the process printed 42.
 */
const requestRun = () => {
  /** @type {string} JSON body for a trivial print. */
  const data = JSON.stringify({ code: 'print(42)' })
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: PORT,
      path: '/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    },
    (res) => {
      /** @type {string} Accumulated response body. */
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        child.kill('SIGTERM')
        try {
          const parsed = JSON.parse(body)
          if (res.statusCode === 200 && parsed.ok && String(parsed.output).includes('42')) {
            console.log('Python runner smoke test passed')
            process.exit(0)
          }
          fail(`Unexpected /run response: ${res.statusCode} ${body}`)
        } catch (err) {
          fail(`Invalid /run JSON: ${body}`)
        }
      })
    }
  )

  req.on('error', (err) => fail(`Could not reach /run: ${err.message}`))
  req.write(data)
  req.end()
}

child.stdout.on('data', (chunk) => {
  /** @type {string} Latest stdout from the server process. */
  const text = chunk.toString()
  process.stdout.write(text)
  if (!ready && text.includes('server running OK')) {
    ready = true
    requestRun()
  }
})

child.stderr.on('data', (chunk) => process.stderr.write(chunk))

child.on('exit', (code) => {
  if (!ready) {
    fail(`Server exited before becoming ready (code ${code})`)
  }
})

setTimeout(() => {
  if (!ready) {
    fail('Timed out waiting for the server to start')
  }
}, 8000)
