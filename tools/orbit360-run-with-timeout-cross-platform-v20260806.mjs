#!/usr/bin/env node
'use strict';

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
if (separator < 0 || separator === args.length - 1) {
  console.error('USAGE: node orbit360-run-with-timeout-cross-platform-v20260806.mjs --timeout-ms <ms> --grace-ms <ms> -- <command> [args...]');
  process.exit(64);
}

const optionArgs = args.slice(0, separator);
const command = args.slice(separator + 1);
const readOption = (name, fallback) => {
  const index = optionArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(optionArgs[index + 1]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const timeoutMs = readOption('--timeout-ms', 60_000);
const graceMs = readOption('--grace-ms', 10_000);
const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: false
});

let finished = false;
let timedOut = false;
let killTimer;

const forwardSignal = signal => {
  if (finished) return;
  try { child.kill(signal); } catch {}
};

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => {
    forwardSignal(signal);
    setTimeout(() => {
      if (!finished) {
        try { child.kill('SIGKILL'); } catch {}
      }
    }, graceMs).unref();
  });
}

const timeoutTimer = setTimeout(() => {
  if (finished) return;
  timedOut = true;
  forwardSignal('SIGTERM');
  killTimer = setTimeout(() => {
    if (!finished) {
      try { child.kill('SIGKILL'); } catch {}
    }
  }, graceMs);
  killTimer.unref();
}, timeoutMs);
timeoutTimer.unref();

child.on('error', error => {
  finished = true;
  clearTimeout(timeoutTimer);
  if (killTimer) clearTimeout(killTimer);
  console.error(String(error && error.message || error));
  process.exit(127);
});

child.on('exit', (code, signal) => {
  finished = true;
  clearTimeout(timeoutTimer);
  if (killTimer) clearTimeout(killTimer);
  if (timedOut) process.exit(124);
  if (typeof code === 'number') process.exit(code);
  if (signal === 'SIGTERM') process.exit(143);
  if (signal === 'SIGINT') process.exit(130);
  if (signal === 'SIGHUP') process.exit(129);
  process.exit(1);
});
