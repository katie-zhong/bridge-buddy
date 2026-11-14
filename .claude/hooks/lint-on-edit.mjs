#!/usr/bin/env node
// PostToolUse hook for Edit|Write: runs `eslint --fix` on the file Claude just changed.
// Unfixable errors are sent back to Claude (exit 2) so it fixes them before moving on.
// Warnings and non-JS/TS files pass silently. Never crashes the session on bad input.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const file = input.tool_input?.file_path;
if (!file || !/\.(tsx?|mjs|js)$/.test(file)) process.exit(0);

const abs = path.resolve(root, file);
const rel = path.relative(root, abs);
if (rel.startsWith('..') || /(^|\/)(node_modules|dist)\//.test(rel) || !existsSync(abs)) process.exit(0);

const bin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
if (!existsSync(bin)) process.exit(0); // deps not installed yet; nothing to do

const r = spawnSync(bin, ['--fix', '--quiet', rel], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
if (r.status === 1) {
  process.stderr.write(`eslint found errors it could not auto-fix in ${rel}:\n${r.stdout}${r.stderr}`);
  process.exit(2);
}
process.exit(0);
