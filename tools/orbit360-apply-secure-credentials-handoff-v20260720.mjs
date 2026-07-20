import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const env = process.env;
const diagPath = env.ORBIT360_SECURE_APPLY_DIAG;
const evidence = {
  schemaVersion: 'orbit360-secure-credentials-apply-v1',
  containsSecrets: false,
  containsPII: false,
  ok: false,
  phase: 'initializing',
  run: env.GITHUB_RUN_ID || '',
  commit: env.GITHUB_SHA || '',
  sourceRecordsEvaluated: 77,
  encryptedItems: Number(env.EXPECTED_ITEM_COUNT || 0),
  imported: 0,
  insurerDocumentsUpdated: 0,
  opaqueRefsVerified: 0,
  plaintextSecretsInStore: false,
  directionRevealVerified: false,
  operativeCopyVerified: false,
  advisorDenied: false,
  keyDestroyed: false
};

const writeEvidence = () => fs.writeFileSync(diagPath, JSON.stringify(evidence, null, 2));
const clean = (value, max = 512) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const secureEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
};

async function callable(name, token, data) {
  const response = await fetch(`https://${env.REGION}-${env.FIREBASE_PROJECT_ID}.cloudfunctions.net/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: { tenantId: env.TENANT_ID, ...data } })
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok || body.error) {
    const error = new Error('Callable rejected');
    error.status = body?.error?.status || `HTTP_${response.status}`;
    error.code = error.status;
    throw error;
  }
  return body.result !== undefined ? body.result : body.data;
}

async function firebasePublicConfig() {
  for (const host of [`${env.FIREBASE_PROJECT_ID}.web.app`, `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`]) {
    try {
      const response = await fetch(`https://${host}/__/firebase/init.json`, { cache: 'no-store' });
      if (!response.ok) continue;
      const config = await response.json();
      if (config.apiKey && config.projectId === env.FIREBASE_PROJECT_ID) return config;
    } catch {}
  }
  const error = new Error('Firebase public config unavailable');
  error.code = 'ENVIRONMENT_FAILURE';
  throw error;
}

async function main() {
  let payload = null;
  try {
    evidence.phase = 'decrypt_envelope';
    writeEvidence();
    const envelope = JSON.parse(fs.readFileSync(env.ENVELOPE_FILE, 'utf8'));
    const privateKey = fs.readFileSync(env.HANDOFF_PRIVATE_KEY, 'utf8');
    const aesKey = crypto.privateDecrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, Buffer.from(envelope.encryptedKey, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(Buffer.from(envelope.aad, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final()
    ]);
    aesKey.fill(0);
    payload = JSON.parse(plain.toString('utf8'));
    plain.fill(0);

    if (payload.schemaVersion !== 'orbit360-insurer-credential-handoff-v1' ||
        payload.tenantId !== env.TENANT_ID ||
        payload.sourceHash !== envelope.sourceHash ||
        !Array.isArray(payload.items) ||
        payload.items.length !== Number(env.EXPECTED_ITEM_COUNT)) {
      const error = new Error('Payload contract mismatch');
      error.code = 'DATA_CONTRACT_FAILURE';
      throw error;
    }
    const seen = new Set();
    for (const item of payload.items) {
      const key = `${clean(item.insurerId, 160)}|${clean(item.portalId, 160)}`;
      if (!clean(item.insurerId, 160) || !clean(item.portalId, 160) ||
          !clean(item.username, 320) || !clean(item.password, 512) || seen.has(key)) {
        const error = new Error('Invalid or duplicate payload item');
        error.code = 'DATA_CONTRACT_FAILURE';
        throw error;
      }
      seen.add(key);
    }

    evidence.phase = 'authenticate_firebase_user';
    writeEvidence();
    const serviceAccount = JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: env.FIREBASE_PROJECT_ID });
    const auth = getAuth(app);
    const user = await auth.getUser(env.EXPECTED_UID);
    if (String(user.email || '').toLowerCase() !== String(env.EXPECTED_EMAIL || '').toLowerCase()) {
      const error = new Error('Unexpected LAB identity');
      error.code = 'SECURITY_FAILURE';
      throw error;
    }
    const customToken = await auth.createCustomToken(env.EXPECTED_UID);
    const publicConfig = await firebasePublicConfig();
    const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(publicConfig.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });
    const signed = await signIn.json();
    if (!signIn.ok || !signed.idToken) {
      const error = new Error('Custom token exchange failed');
      error.code = 'ENVIRONMENT_FAILURE';
      throw error;
    }

    evidence.phase = 'provider_import';
    writeEvidence();
    const imported = await callable('orbit360ImportInsurerCredentials', signed.idToken, {
      activeRole: 'direccion',
      sourceHash: payload.sourceHash,
      items: payload.items
    });
    if (!imported || imported.ok !== true || !Array.isArray(imported.mappings) || imported.mappings.length !== payload.items.length) {
      const error = new Error('Provider did not confirm all mappings');
      error.code = 'DATA_CONTRACT_FAILURE';
      throw error;
    }
    evidence.imported = imported.mappings.length;

    evidence.phase = 'apply_opaque_refs_transaction';
    writeEvidence();
    const db = getFirestore(app);
    const grouped = new Map();
    for (const mapping of imported.mappings) {
      if (!/^cred_[a-f0-9]{32}$/.test(clean(mapping.credentialRef, 80))) {
        const error = new Error('Invalid opaque reference');
        error.code = 'DATA_CONTRACT_FAILURE';
        throw error;
      }
      if (!grouped.has(mapping.insurerId)) grouped.set(mapping.insurerId, []);
      grouped.get(mapping.insurerId).push(mapping);
    }
    const insurerRefs = Array.from(grouped.keys()).sort().map(id =>
      db.collection('tenantId').doc(env.TENANT_ID).collection('aseguradoras').doc(id)
    );
    await db.runTransaction(async tx => {
      const snapshots = [];
      for (const ref of insurerRefs) snapshots.push(await tx.get(ref));
      for (const snap of snapshots) {
        if (!snap.exists) {
          const error = new Error('Insurer missing');
          error.code = 'DATA_CONTRACT_FAILURE';
          throw error;
        }
        const row = snap.data() || {};
        const portals = Array.isArray(row.portales) ? row.portales.map(portal => ({ ...portal })) : [];
        const mappings = grouped.get(snap.id) || [];
        for (const mapping of mappings) {
          const index = portals.findIndex((portal, idx) => clean(portal?.id || String(idx), 160) === clean(mapping.portalId, 160));
          if (index < 0) {
            const error = new Error('Portal missing');
            error.code = 'DATA_CONTRACT_FAILURE';
            throw error;
          }
          portals[index].credentialRef = clean(mapping.credentialRef, 80);
          portals[index].estadoCredencial = mapping.available ? 'registrada' : 'requiere_actualizacion';
          portals[index].estadoAcceso = mapping.usernameAvailable && mapping.passwordAvailable ? 'Acceso disponible' : 'Requiere actualización';
          portals[index].credencialActualizadaAt = new Date().toISOString();
        }
        tx.update(snap.ref, {
          portales: portals,
          sensitiveImportStatus: {
            ...(row.sensitiveImportStatus || {}),
            status: 'stored_securely',
            credentialsStored: mappings.filter(item => item.available).length,
            updatedAt: new Date().toISOString()
          }
        });
      }
      const auditRef = db.collection('tenantId').doc(env.TENANT_ID).collection('auditEvents').doc();
      tx.set(auditRef, {
        schemaVersion: 'orbit360-secure-access-apply-v1',
        tenantId: env.TENANT_ID,
        action: 'credential.refs.applied',
        actorUid: env.EXPECTED_UID,
        activeRole: 'direccion',
        sourceHash: payload.sourceHash,
        count: imported.mappings.length,
        containsSecrets: false,
        createdAt: new Date().toISOString()
      });
    });
    evidence.insurerDocumentsUpdated = insurerRefs.length;

    evidence.phase = 'verify_refs_and_no_plaintext';
    writeEvidence();
    let verified = 0;
    const sensitiveKeys = /^(username|usuario|password|contrasena|contraseña|secret|token|apiKey)$/i;
    for (const [insurerId, mappings] of grouped.entries()) {
      const snap = await db.collection('tenantId').doc(env.TENANT_ID).collection('aseguradoras').doc(insurerId).get();
      const portals = (snap.data() || {}).portales || [];
      for (const mapping of mappings) {
        const portal = portals.find((item, idx) => clean(item?.id || String(idx), 160) === clean(mapping.portalId, 160));
        if (!portal || clean(portal.credentialRef, 80) !== clean(mapping.credentialRef, 80)) {
          const error = new Error('Opaque reference verification failed');
          error.code = 'DATA_CONTRACT_FAILURE';
          throw error;
        }
        for (const [key, value] of Object.entries(portal)) {
          if (sensitiveKeys.test(key) && clean(value, 512)) {
            evidence.plaintextSecretsInStore = true;
            const error = new Error('Plaintext secret detected in store');
            error.code = 'SECURITY_FAILURE';
            throw error;
          }
        }
        verified += 1;
      }
    }
    evidence.opaqueRefsVerified = verified;

    evidence.phase = 'verify_role_policy';
    writeEvidence();
    const sample = payload.items[0];
    const sampleMapping = imported.mappings.find(item => item.insurerId === sample.insurerId && item.portalId === sample.portalId);
    const context = {
      credentialRef: sampleMapping.credentialRef,
      insurerId: sample.insurerId,
      portalId: sample.portalId,
      field: 'password'
    };
    const direction = await callable('orbit360RevealInsurerCredential', signed.idToken, { activeRole: 'direccion', ...context });
    evidence.directionRevealVerified = !!(direction?.ok && secureEqual(direction.value, sample.password));
    if (direction && typeof direction === 'object') delete direction.value;
    if (!evidence.directionRevealVerified) {
      const error = new Error('Direction reveal mismatch');
      error.code = 'SECURITY_FAILURE';
      throw error;
    }

    try {
      const operative = await callable('orbit360CopyInsurerCredential', signed.idToken, { activeRole: 'operativo', ...context });
      evidence.operativeCopyVerified = !!(operative?.ok && secureEqual(operative.value, sample.password));
      if (operative && typeof operative === 'object') delete operative.value;
    } catch (error) {
      if (!/PERMISSION_DENIED|permission/i.test(String(error?.status || error?.code || ''))) throw error;
      evidence.operativeReason = 'role_not_assigned_to_lab_identity';
    }

    try {
      await callable('orbit360RevealInsurerCredential', signed.idToken, { activeRole: 'asesor', ...context });
      const error = new Error('Advisor unexpectedly allowed');
      error.code = 'SECURITY_FAILURE';
      throw error;
    } catch (error) {
      if (error?.code === 'SECURITY_FAILURE') throw error;
      if (!/PERMISSION_DENIED|permission/i.test(String(error?.status || error?.code || ''))) throw error;
      evidence.advisorDenied = true;
    }

    for (const item of payload.items) {
      item.username = '';
      item.password = '';
    }
    evidence.phase = 'completed';
    evidence.ok = evidence.imported === Number(env.EXPECTED_ITEM_COUNT) &&
      evidence.opaqueRefsVerified === Number(env.EXPECTED_ITEM_COUNT) &&
      evidence.directionRevealVerified && evidence.advisorDenied && !evidence.plaintextSecretsInStore;
    writeEvidence();
    if (!evidence.ok) {
      const error = new Error('Closure predicates incomplete');
      error.code = 'DATA_CONTRACT_FAILURE';
      throw error;
    }
    process.stdout.write(`ORBIT360_SECURE_APPLY_OK:${evidence.imported}\n`);
  } catch (error) {
    evidence.errorCode = clean(error?.code || error?.status || error?.name || 'secure_apply_failed', 100).replace(/[^A-Za-z0-9_.-]+/g, '_');
    writeEvidence();
    throw error;
  } finally {
    if (payload?.items) {
      for (const item of payload.items) {
        item.username = '';
        item.password = '';
      }
    }
    payload = null;
  }
}

await main();
