#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value == null ? '' : value)
  .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
  .replace(/\b\d{6,}\b/g, '[id]')
  .slice(0, 500);

function captureToken(target) {
  const name = path.basename(String(target || 'capture'), path.extname(String(target || '')))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  return (name || 'CAPTURE') + '_CAPTURE';
}

function writeCheckpoint(evidencePath, checkpoint, detail = {}) {
  if (!evidencePath || !fs.existsSync(evidencePath)) return;
  try {
    const value = JSON.parse(fs.readFileSync(evidencePath, 'utf8').replace(/^\uFEFF/, ''));
    value.currentCheckpoint = checkpoint;
    value.checkpoints = Array.isArray(value.checkpoints) ? value.checkpoints : [];
    value.checkpoints.push({ checkpoint, at: new Date().toISOString(), ...detail });
    const temp = evidencePath + '.capture-watchdog.tmp';
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.renameSync(temp, evidencePath);
  } catch {
    // Fail closed in the caller; checkpoint persistence must never modify product state.
  }
}

function maskExpression() {
  return `(() => {
    if (document.getElementById('orbit-observable-evidence-mask')) return true;
    const style = document.createElement('style');
    style.id = 'orbit-observable-evidence-mask';
    style.textContent = '.tb-user,.fh-contact,.fichahdr,.tbl tbody,table tbody,.cards,.card-list,.mono,.vp-v,input,textarea,[data-client],[data-policy]{filter:blur(8px)!important}.tb-user{opacity:.5!important}';
    document.head.appendChild(style);
    return true;
  })()`;
}

export function patchChromiumCaptureWatchdog({
  chromium,
  evidencePath,
  hardTimeoutMs = 12000,
  heartbeatMs = 2500,
  detachTimeoutMs = 600
}) {
  if (!chromium || typeof chromium.launch !== 'function') throw new Error('CAPTURE_WATCHDOG_CHROMIUM_REQUIRED');
  if (chromium.__orbit360CaptureWatchdogV20260806) return chromium;

  const originalLaunch = chromium.launch.bind(chromium);
  Object.defineProperty(chromium, '__orbit360CaptureWatchdogV20260806', { value: true, configurable: false });
  chromium.launch = async (...launchArgs) => {
    const browser = await originalLaunch(...launchArgs);
    const originalNewContext = browser.newContext.bind(browser);

    browser.newContext = async (...contextArgs) => {
      const context = await originalNewContext(...contextArgs);
      const originalNewPage = context.newPage.bind(context);

      context.newPage = async (...pageArgs) => {
        const page = await originalNewPage(...pageArgs);
        page.screenshot = async (options = {}) => {
          const target = options && options.path ? String(options.path) : '';
          const token = captureToken(target);
          let session = null;
          let timer = null;
          let heartbeat = null;
          let timedOut = false;
          let heartbeatSequence = 0;

          writeCheckpoint(evidencePath, token + '_START');
          heartbeat = setInterval(() => {
            heartbeatSequence += 1;
            writeCheckpoint(evidencePath, token + '_HEARTBEAT_' + heartbeatSequence);
          }, Math.max(250, heartbeatMs));
          if (typeof heartbeat.unref === 'function') heartbeat.unref();

          const deadline = new Promise((_, reject) => {
            timer = setTimeout(() => {
              timedOut = true;
              reject(new Error('CAPTURE_HARD_TIMEOUT_' + hardTimeoutMs + 'MS'));
            }, Math.max(1, hardTimeoutMs));
          });

          try {
            session = await context.newCDPSession(page);
            const work = (async () => {
              await session.send('Runtime.evaluate', {
                expression: maskExpression(),
                awaitPromise: true,
                returnByValue: true
              });
              const response = await session.send('Page.captureScreenshot', {
                format: 'png',
                fromSurface: true,
                captureBeyondViewport: false
              });
              if (!response || typeof response.data !== 'string' || !response.data) {
                throw new Error('CAPTURE_CDP_EMPTY_PAYLOAD');
              }
              const buffer = Buffer.from(response.data, 'base64');
              if (target) {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, buffer);
              }
              return buffer;
            })();

            const buffer = await Promise.race([work, deadline]);
            writeCheckpoint(evidencePath, token + '_PASS', { bytes: buffer.length });
            return buffer;
          } catch (error) {
            writeCheckpoint(evidencePath, token + (timedOut ? '_TIMEOUT' : '_WARN'), {
              captureError: clean(error && error.message || error),
              blocking: false
            });
            throw error;
          } finally {
            if (timer) clearTimeout(timer);
            if (heartbeat) clearInterval(heartbeat);
            if (session && typeof session.detach === 'function') {
              await Promise.race([
                Promise.resolve().then(() => session.detach()).catch(() => undefined),
                sleep(Math.max(1, detachTimeoutMs))
              ]).catch(() => undefined);
            }
          }
        };
        return page;
      };
      return context;
    };
    return browser;
  };
  return chromium;
}
