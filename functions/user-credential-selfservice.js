'use strict';

const PASSWORD_MIN = 8;

function passwordValid(value) {
  const password = String(value == null ? '' : value);
  return password.length >= PASSWORD_MIN && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function safeResult(operation, extra) {
  return Object.assign({
    ok: true,
    operation,
    containsPassword: false,
    containsTemporaryPassword: false,
    containsActionLink: false,
    containsSecrets: false
  }, extra || {});
}

async function resolveTargetUser({ auth, advisor, currentAdvisor, text, normalizeEmail, HttpsError }) {
  const boundUid = text(currentAdvisor && (currentAdvisor.authUid || currentAdvisor.uid || currentAdvisor.userId), 160);
  if (boundUid) {
    try { return await auth.getUser(boundUid); }
    catch (error) { if (!error || error.code !== 'auth/user-not-found') throw error; }
  }
  const email = normalizeEmail(advisor && advisor.email);
  if (!email) throw new HttpsError('failed-precondition', 'El usuario no tiene correo válido.');
  try { return await auth.getUserByEmail(email); }
  catch (error) {
    if (error && error.code === 'auth/user-not-found') throw new HttpsError('failed-precondition', 'La identidad todavía no está creada.');
    throw error;
  }
}

async function setTemporaryPassword(context) {
  const {
    request, tenantId, advisorId, advisor, currentAdvisor, located, actor,
    db, auth, FieldValue, HttpsError, sha, text, normalizeEmail
  } = context;
  const password = String(request.data && request.data.temporaryPassword || '');
  const reason = text(request.data && request.data.reason, 500);
  if (!passwordValid(password)) {
    throw new HttpsError('invalid-argument', 'La contraseña temporal debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo.');
  }
  if (reason.length < 5) throw new HttpsError('invalid-argument', 'El restablecimiento requiere un motivo claro.');
  const user = await resolveTargetUser({ auth, advisor, currentAdvisor, text, normalizeEmail, HttpsError });
  const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(user.uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) throw new HttpsError('failed-precondition', 'La identidad no tiene membership activa.');
  const member = memberSnap.data() || {};
  if (text(member.advisorId, 160) && text(member.advisorId, 160) !== advisorId) {
    throw new HttpsError('failed-precondition', 'La identidad pertenece a otro registro del equipo.');
  }

  await auth.updateUser(user.uid, { password, disabled: false });
  try {
    const auditRef = db.collection('tenants').doc(tenantId).collection('auditEvents').doc();
    await db.runTransaction(async (tx) => {
      const latestMember = await tx.get(memberRef);
      const latestAdvisor = await tx.get(located.ref);
      if (!latestMember.exists || !latestAdvisor.exists) throw new HttpsError('failed-precondition', 'El usuario cambió durante el restablecimiento.');
      tx.set(memberRef, {
        mustChangePassword: true,
        credentialState: 'temporary',
        passwordResetAt: FieldValue.serverTimestamp(),
        passwordResetByHash: sha(actor.uid),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.set(located.ref, {
        mustChangePassword: true,
        credentialState: 'temporary',
        accessErrorCode: '',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      tx.set(auditRef, {
        schemaVersion: 'orbit360-access-audit-v1',
        tenantId,
        action: 'team_access.set_temporary_password',
        actorUidHash: sha(actor.uid),
        actorEmailHash: actor.emailHash,
        activeRole: actor.activeRole,
        advisorIdHash: sha(advisorId),
        targetUidHash: sha(user.uid),
        targetEmailHash: sha(normalizeEmail(user.email)),
        reason,
        forcePasswordChange: true,
        createdAt: FieldValue.serverTimestamp(),
        containsPII: false,
        containsSecrets: false
      });
    });
  } catch (error) {
    try { await auth.updateUser(user.uid, { disabled: true }); } catch (_) {}
    throw error;
  }
  return safeResult('set_temporary_password', {
    advisorId,
    uidHash: sha(user.uid),
    emailHash: sha(normalizeEmail(user.email)),
    state: 'temporary_password',
    mustChangePassword: true
  });
}

async function completePasswordChange(context) {
  const { request, tenantId, db, FieldValue, HttpsError, sha, text, locateAdvisor } = context;
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const uid = text(request.auth.uid, 160);
  const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) throw new HttpsError('permission-denied', 'Membresía requerida.');
  const member = memberSnap.data() || {};
  if (text(member.tenantId, 160) !== tenantId) throw new HttpsError('permission-denied', 'Membresía incompatible.');
  const advisorId = text(member.advisorId, 160);
  if (!advisorId) throw new HttpsError('failed-precondition', 'La membresía no está vinculada con Equipo.');
  const located = await locateAdvisor(tenantId, advisorId);
  if (!located.snap) throw new HttpsError('failed-precondition', 'El registro de Equipo no existe.');
  const auditRef = db.collection('tenants').doc(tenantId).collection('auditEvents').doc();
  await db.runTransaction(async (tx) => {
    const latestMember = await tx.get(memberRef);
    const latestAdvisor = await tx.get(located.ref);
    if (!latestMember.exists || !latestAdvisor.exists) throw new HttpsError('failed-precondition', 'El acceso cambió durante la confirmación.');
    tx.set(memberRef, {
      mustChangePassword: false,
      credentialState: 'active',
      passwordChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    tx.set(located.ref, {
      mustChangePassword: false,
      credentialState: 'active',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    tx.set(auditRef, {
      schemaVersion: 'orbit360-access-audit-v1',
      tenantId,
      action: 'team_access.password_changed_by_user',
      actorUidHash: sha(uid),
      advisorIdHash: sha(advisorId),
      createdAt: FieldValue.serverTimestamp(),
      containsPII: false,
      containsSecrets: false
    });
  });
  return safeResult('complete_password_change', {
    advisorId,
    uidHash: sha(uid),
    state: 'active',
    mustChangePassword: false
  });
}

module.exports = {
  passwordValid,
  setTemporaryPassword,
  completePasswordChange
};
