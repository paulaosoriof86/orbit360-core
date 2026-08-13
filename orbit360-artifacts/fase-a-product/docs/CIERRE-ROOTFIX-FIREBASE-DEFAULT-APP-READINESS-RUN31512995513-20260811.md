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
- B · control-plane/harness: rootfix source-only de readiness Firebase cerrado PASS.
- C · datos/migración: intacto; cero reimportación y cero escrituras operacionales.

## Evidencia del runtime detenido

El run `31512995513` pasó request fresco/parent-bound, gate canónico, source PASS fail-closed previo, `GO_GATE_CONTRACT`, safety backup, restore del baseline `visual-matrix-corrected-backup-31135532118`, exactamente un deploy de Hosting LAB y precheck `INICIO_READY_PASS`.

La matriz se detuvo durante Dirección antes de ejecutar pruebas funcionales de rol. La secuencia observable alcanzó `DIRECCION_BOOTSTRAP_FIREBASE_SDK_PASS` y posteriormente `firebase.auth().signInWithCustomToken(...)` falló porque aún no existía la app Firebase `[DEFAULT]`.

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

El checkpoint anterior trataba dos estados distintos como equivalentes:

`firebase.auth` disponible → Firebase lista para autenticación.

Eso es falso. El SDK compat puede exponer `firebase.auth` mientras `firebase.apps.length === 0` y la app `[DEFAULT]` todavía no está inicializada.

Causa raíz canónica:

`FIREBASE_SDK_PRESENCE_MISTAKEN_FOR_DEFAULT_APP_READINESS`

Familias asociadas:

- `AUTH_SIGNIN_CALLED_BEFORE_FIREBASE_DEFAULT_APP_INITIALIZATION`;
- `BOOTSTRAP_OWNER_MISSING_DEFAULT_APP_AND_AUTH_INSTANCE_STATE`.

No existe evidencia de defecto funcional de Dirección, Operativo, Asesor, Cliente 360 o Aseguradoras en ese run: la matriz no alcanzó esas pruebas.

## Rootfix source-only aplicado

Commit atómico:

`dc01efd2351849fedf54c7be31732da8a5067273`

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

La espera de app `[DEFAULT]` tiene checkpoint independiente y diagnóstico sanitizado. El contexto Playwright conserva cierre fail-safe si cualquier etapa falla.

## Fixture anti-bucle

El fixture demuestra simultáneamente:

- `sdkLoaded=true`, `appsCount=0` → readiness `false` y login bloqueado;
- `sdkLoaded=true`, `appsCount=1`, `defaultAppName='[DEFAULT]'`, `authAppName='[DEFAULT]'` → readiness `true`;
- los rootfix previos de `DOMContentLoaded`, rendimiento, detalle Cliente 360 y menú móvil continúan preservados.

## Source gate fail-closed · PASS

Ejecución única del paquete atómico:

- run: `31517185967`;
- job: `93865157095`;
- head: `dc01efd2351849fedf54c7be31732da8a5067273`;
- artifact: `9111534320`;
- artifact digest: `sha256:d8f9a05627ecb6f2dd1defb80b18ba9a09ca6b594dcda7b4f9631bf1fc6544b5`;
- resultado: `PASS_BLOCK1_FINAL_NATIVE_VISUAL_SOURCE`;
- todos los pasos 1–12: `success`, incluidos validación semántica, preflight offline, boundaries del runtime futuro, `Seal` y publicador fail-closed.

Contrato v6 demostrado:

- `bootstrapSyntheticPass:true`;
- `firebaseSdkWithoutDefaultAppBlocked:true`;
- `firebaseDefaultAppAuthReady:true`;
- `canonicalBootstrapSyntheticHandoff:true`;
- `sourceStatusFailClosed:true`;
- `runtimeAuthorized:false`;
- `secretsRead:false`;
- `firestoreReads:0`;
- `firestoreWrites:0`;
- `authWrites:0`;
- `operationalWrites:0`;
- `browserExecuted:false`;
- `hostingTouched:false`;
- `deployExecuted:false`;
- `productionTouched:false`.

La evidencia v6 fue persistida posteriormente en repo sin disparar otro source gate.

## Estado anti-bucle

La autorización del run `31512995513` quedó consumida. No hubo segundo request, rerun ni segundo deploy. El rootfix source-only cerró PASS en su primer source run; no hubo iteración adicional de esta etapa.

## Contrato futuro runtime

No existe request nuevo todavía. El próximo request, solo tras autorización humana fresca, será:

`.github/orbit360-requests/block1-final-visual-firebase-default-app-ready-v20260811-authorization.json`

Versión:

`20260811.block1-final-visual-firebase-default-app-ready`

Mensaje exacto futuro:

`runtime: authorize Block1 firebase-default-app-ready visual matrix`

El workflow futuro exige antes de secretos:

- source PASS v6 fail-closed;
- `bootstrapSyntheticPass:true`;
- `firebaseSdkWithoutDefaultAppBlocked:true`;
- `firebaseDefaultAppAuthReady:true`;
- owners SDK/app/Auth anteriores;
- request fresco, exclusivo, parent-bound e inmutable;
- `GO_GATE_CONTRACT`;
- máximo un deploy Hosting LAB;
- cero escrituras y snapshot final idéntico.

No se reutiliza el request del run `31512995513`.

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

Estado: `SOURCE_PASS_AWAITING_FRESH_EXCLUSIVE_REQUEST`.

Solicitar autorización humana fresca para crear exactamente un request nuevo y ejecutar una sola matriz runtime Firebase default-app-ready. Hasta `PASS_VISUAL_POST_AUTH`, el avance global permanece en `72%`; únicamente ese PASS puede moverlo a `80%`.
