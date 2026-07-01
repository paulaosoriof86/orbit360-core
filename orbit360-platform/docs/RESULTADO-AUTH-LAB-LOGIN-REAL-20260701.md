# Resultado Auth LAB Login Real

- Fecha local: 2026-07-01 01:49:32
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD inicial: 6fe1c7d fix(lab): separar store Firestore de fallback demo
- Restricciones: sin push, sin Hosting deploy, sin produccion, sin datos reales
- Estado: EN PROGRESO

## Cambio aplicado

- core/auth-lab-gate.local.js ahora intercepta el formulario de login LAB.
- El formulario llama a irebase.auth().signInWithEmailAndPassword(email, password).
- Si Chrome tiene contraseña guardada/autocompletada, el botón puede iniciar Firebase Auth real.
- No se guarda ni se versiona la contraseña.
- Se mantiene el bloqueo de sesión demo/local.
- No se tocaron módulos.

## Resultado esperado

- Sin contraseña válida: la app permanece en login LAB.
- Con Firebase Auth LAB válido: la app abre con sesión Orbit LAB y el siguiente smoke puede leer documentos lab_... desde Firestore.

## Si falla

Si Firebase responde wrong-password o invalid-credential, el siguiente paso NO es inventar contraseña: se debe restablecer el usuario orbit.lab@demo.com en Firebase Auth LAB sin guardar el secreto en Git.
