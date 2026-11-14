// Starts the API server and the Vite dev server together. Works on Windows, macOS and Linux.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (...args) => spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
const children = [run('server/index.mjs'), run(path.join('node_modules', 'vite', 'bin', 'vite.js'))];
const stop = () => { for (const c of children) c.kill(); process.exit(); };
for (const c of children) c.on('exit', stop);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
