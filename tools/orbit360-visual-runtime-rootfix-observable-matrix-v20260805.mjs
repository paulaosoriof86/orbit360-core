#!/usr/bin/env node
'use strict';

import { chromium } from 'playwright';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';

const CAPTURE_TIMEOUT_MS = 12000;
// Contract markers: fullPage: false; blocking: false.

patchChromiumCaptureWatchdog({
  chromium,
  evidencePath: process.env.ORBIT360_VISUAL_EVIDENCE || process.env.ORBIT360_MATRIX_EVIDENCE || '',
  hardTimeoutMs: Number(process.env.ORBIT360_CAPTURE_HARD_TIMEOUT_MS || CAPTURE_TIMEOUT_MS),
  heartbeatMs: Number(process.env.ORBIT360_CAPTURE_HEARTBEAT_MS || 2500),
  detachTimeoutMs: Number(process.env.ORBIT360_CAPTURE_DETACH_TIMEOUT_MS || 600)
});

await import('./orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs');
