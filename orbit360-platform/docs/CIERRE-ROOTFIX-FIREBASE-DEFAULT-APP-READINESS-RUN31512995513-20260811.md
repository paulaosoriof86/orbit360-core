# Orbit 360 A&S — Cierre de causa raíz Firebase default-app readiness · Block 1

Fecha: 2026-08-11  
Gate: `block1-client360-insurers-lab-v20260717` · contrato `1.0.41`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Runtime origen: `31512995513` · job `93851162313`  
Request consumido: commit `673bab8d4e75ca43b5689a7c1f1631a56c1b7037`  
Clasificación: `PIPELINE_MECHANISM_FAILURE`  
Estado porcentual congelado: `72%` · no se gana avance hasta `PASS_VISUAL_POST_AUTH`.

## Bloque y carriles

- A · frontend/UX: producto congelado; no se corrigió UI ni módulos funcionales.
- B · control-plane/harness: activo; rootfix source-only de readiness Firebase.
- C · datos/migración: intacto; cero reimportación y cero escrituras operacionales.

## Evidencia del runtime detenido

El run `31512995513` pasó antes de secretos/request runtime:

1. request fresco, exclusivo, parent-bound e inmutable;
2. gate canónico source;
3. source PASS fail-closed previo;
4. `GO_GATE_CONTRACT`;
5. safety backup;
6. restore del baseline `visual-matrix-corrected-backup-31135532118`;
7. exactamente un deploy de Hosting LAB;
8. precheck `INICIO_READY_PASS`.

La matriz se detuvo durante Dirección antes de ejecutar pruebas funcionales de rol. La secuencia observable alcanzó `DIRECCION_BOOTSTRAP_FIREBASE_SDK_PASS` y posteriormente el intento de `firebase.auth().signInWithCustomToken(...)` falló porque aún no existía la app Firebase `[DEFAULT]`.

Cierre seguro del run:

- rollback Hosting: `success`;
- snapshot: `VERIFIED_UNCHANGED`;
- Firestore writes: `0`;
- Auth writes: `0`;
- operational writes: `0`;
- Functions/Rules: `0`;
- reimportación: `0`;
- producción/main/merge: `0`.

## Causa raíz

El checkpoint anterior trataba dos estados diferentes como si fueran equivalentes:

`firebase.auth` disponible → Firebase lista para autenticación.

Eso es falso. El SDK compat puede estar cargado y exponer `firebase.auth` mientras `firebase.apps.length === 0` y la app `[DEFAULT]` aún no está inicializada.

Causa raíz canónica:

`FIREBASE_SDK_PRESENCE_MISTAKEN_FOR_DEFAULT_APP_READINESS`

Familias asociadas:

- `AUTH_SIGNIN_CALLED_BEFORE_FIREBASE_DEFAULT_APP_INITIALIZATION`;
- `BOOTSTRAP_OWNER_MISSING_DEFAULT_APP_AND_AUTH_INSTANCE_STATE`.

No existe evidencia de defecto funcional de Dirección, Operativo, Asesor, Cliente 360 o Aseguradoras en este run: la matriz no llegó a esas pruebas.

## Rootfix source-only

Owner de bootstrap actualizado:

`document-commit-login-form-firebase-sdk-default-app-auth-readiness-segmented`

Owners explícitos:

- SDK: `firebase-compat-sdk-present`;
- app: `firebase-default-app-initialized`;
- Auth: `firebase-default-app-auth-instance-ready`.

Secuencia requerida antes del custom-token sign-in:

1. main document `commit`;
2. `#login-form` adjunto;
3. SDK Firebase compat presente;
4. `firebase.apps.length > 0`;
5. `firebase.app().name === '[DEFAULT]'`;
6. `firebase.auth().app.name === '[DEFAULT]'`;
7. solo entonces custom-token sign-in.

La espera de app `[DEFAULT]` tiene checkpoint independiente y diagnóstico sanitizado de recursos fallidos. El contexto Playwright conserva cierre fail-safe si cualquier etapa falla.

## Fixture anti-bucle

El fixture debe demostrar simultáneamente:

- `sdkLoaded=true`, `appsCount=0` → readiness `false` y login bloqueado;
- `sdkLoaded=true`, `appsCount=1`, `defaultAppName='[DEFAULT]'`, `authAppName='[DEFAULT]'` → readiness `true`;
- el rootfix de `DOMContentLoaded`, rendimiento, detalle Cliente 360 y menú móvil continúa preservado.

Ninguna prueba source-only usa secretos, Firebase LAB, browser runtime, Hosting o writes.

## Contrato futuro runtime

No existe request nuevo en este cierre. El próximo request, únicamente después de source PASS fail-closed, será:

`.github/orbit360-requests/block1-final-visual-firebase-default-app-ready-v20260811-authorization.json`

Versión:

`20260811.block1-final-visual-firebase-default-app-ready`

Mensaje exacto futuro:

`runtime: authorize Block1 firebase-default-app-ready visual matrix`

El workflow futuro debe exigir antes de secretos:

- `bootstrapSyntheticPass:true`;
- `firebaseSdkWithoutDefaultAppBlocked:true`;
- `firebaseDefaultAppAuthReady:true`;
- owners Firebase anteriores;
- `GO_GATE_CONTRACT`;
- request fresco y one-shot.

No se reutiliza el request del run `31512995513`.

## Anti-bucle

La autorización del run `31512995513` quedó consumida. Ante su STOP no se generó segundo request, rerun ni segundo deploy. El trabajo posterior es un rootfix source-only basado en causa raíz demostrada, no un reintento del runtime.

Si el source gate de este rootfix falla dos veces en la misma etapa/código, se aplica `STOP_RETRY` y no se abre un tercer parche.

## Claude / reutilización

`REPLICABLE_CLAUDE_ACUMULADO`:

- distinguir disponibilidad de SDK de readiness de instancia/app;
- usar checkpoints de bootstrap por owner observable;
- evitar que una función global presente se convierta en proxy de inicialización completa;
- exigir fixtures negativos y positivos para estados intermedios.

No enviar datos reales, secretos, credenciales, IDs de usuarios ni backend protegido.

## Academia

`ACADEMIA_ACTUALIZAR`:

- diferencia entre `PIPELINE_MECHANISM_FAILURE` y `FUNCTIONAL_DEFECT`;
- una librería cargada no implica que su contexto de aplicación esté inicializado;
- un gate debe validar el owner que la siguiente operación realmente necesita;
- los fixtures deben incluir el estado intermedio que produjo el falso positivo;
- STOP_RETRY evita convertir una falla del instrumento en múltiples cambios de producto.

## Siguiente acción exacta

Ejecutar un único source gate fail-closed del paquete atómico. Solo si obtiene PASS se persiste la evidencia v6 y se solicita autorización humana fresca para un único runtime. Hasta entonces `PASS_VISUAL_POST_AUTH=NO` y el avance global permanece en `72%`.
