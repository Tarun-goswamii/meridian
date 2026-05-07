import { spawn } from 'node:child_process'

const children = [
  spawn('npm', ['run', 'dev:web'], {
    stdio: 'inherit',
    shell: true,
  }),
  spawn('npm', ['run', 'dev:convex'], {
    stdio: 'inherit',
    shell: true,
  }),
]

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }

  process.exit(code)
}

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))