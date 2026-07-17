# Bloque 1 — Causa raíz de la carrera Runtime/Auth y contrato 1.0.6

Fecha: 2026-07-17  
Gate: `block1-client360-insurers-lab-v20260717`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Contrato: `1.0.6`  
Runtime canónico: `20260717-2`  
Producción: no autorizada

## 1. Bloque y carriles

- Bloque activo: **Cliente 360 + Aseguradoras LAB**.
- Carril A: frontend, renderers y UX preservados.
- Carril B: corrección de bootstrap, PWA, contrato y mecanismo del gate.
- Carril C: datos A&S preservados: 414 clientes, 26 aseguradoras y 7 asesores; sin reimportación ni escritura.

## 2. Evidencia

El run `29607332004`, intento 2, aprobó:

- preflight `GO_GATE_CONTRACT`;
- owners y validación estática;
- cuenta de servicio y usuario LAB;
- conteos 414/26/7;
- publicación y verificación del canal LAB;
- instalación del navegador.

El primer bloqueo runtime fue:

`PIPELINE_STEP_TIMEOUT:authentication_observe_signin`

La misma etapa había avanzado de forma intermitente en ejecuciones anteriores. Conforme al Addendum de Control de Causa Raíz, se detuvieron reintentos y parches sobre Auth.

## 3. Causa raíz

La autenticación no era la capa defectuosa.

El preview ya navegaba a:

`runtime=20260717-2`

pero `core/backend-lab-loader.js` todavía exigía:

`20260716-2`

Por ello, al abrir el canal ocurría esta secuencia:

1. `ays-lab-preview.html` redirigía a `index.html` con runtime `20260717-2`;
2. el loader consideraba esa URL no canónica y ordenaba otra redirección a `20260716-2`;
3. el gate comprobaba únicamente `index.html`, backend y tenant, pero no el runtime;
4. mientras la primera página todavía terminaba de cargar, el gate podía declararla canónica y disparar el login;
5. la segunda redirección destruía ese documento y también `window.__orbitGateAuthStatus`;
6. el controlador quedaba observando un login pendiente que pertenecía a una página ya reemplazada.

La variabilidad temporal explica por qué Auth algunas veces alcanzó Legal y otras veces expiró sin devolver `AUTH_SIGNIN_TIMEOUT`.

## 4. Clasificación

### `PIPELINE_MECHANISM_FAILURE`

El gate aceptaba una URL incompleta como canónica y no comprobaba estabilidad de navegación antes de Auth.

### `FUNCTIONAL_DEFECT`

Preview, loader, Service Worker y PWA no compartían la misma versión runtime.

### `VALIDATOR_STALE`

El preflight validaba owners y grafo, pero no la paridad de versión entre todas las capas que participan en la navegación.

No se clasificó como fallo de credenciales, Firebase, Auth, datos, Cliente 360 ni Aseguradoras.

## 5. Implementación

### Runtime unificado

Se fijó `20260717-2` en:

- `ays-lab-preview.html`;
- `core/backend-lab-loader.js`;
- `sw.js`;
- `core/pwa.js`;
- workflow del gate;
- gate runtime;
- registro contractual.

### Gate runtime

`tools/orbit360-gate-runtime-crm-v20260716.mjs` ahora exige antes de Auth:

- `index.html`;
- backend `firestore-lab`;
- tenant `alianzas-soluciones`;
- runtime `20260717-2` en URL;
- `OrbitBackend.runtimeVersion` igual al contrato;
- Firebase loader solicitado;
- Firebase inicializado;
- owners Store/Auth/Router disponibles;
- estabilidad continua del mismo contexto por al menos 1.2 segundos.

El resultado sanitizado registra versión, estado de Firebase y estabilidad, sin PII ni secretos.

### Preflight

El preflight v4 valida antes del entorno:

- versión runtime declarada;
- tokens exactos de preview, loader, Service Worker, PWA, gate y workflow;
- contrato `1.0.6`;
- ausencia de referencias retiradas.

### Workflow

El workflow:

- expone `ORBIT360_EXPECTED_RUNTIME=20260717-2`;
- sella la versión en `runtime-build.json`;
- verifica la versión desplegada en loader, preview, Service Worker y PWA;
- solo después instala navegador y ejecuta el gate.

## 6. Archivos protegidos no modificados

- `core/auth.js`;
- `core/legal.js`;
- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- Firestore Rules;
- credenciales, secrets y configuración Firebase;
- datos e importadores canónicos;
- renderers Cliente 360 y Aseguradoras.

## 7. Claude / prototipo comercializable

### `REPLICABLE_CLAUDE_INMEDIATO`

- Preview, loader, PWA y Service Worker deben consumir una sola versión de runtime.
- Un gate no puede declarar una página canónica si aún existe una redirección pendiente.
- Auth se ejecuta solo después de verificar estabilidad del documento.

### `REPLICABLE_CLAUDE_ACUMULADO`

Patrón reusable:

> Toda candidata debe declarar una versión única de runtime y el preflight debe comprobar su paridad en cada consumidor. La navegación canónica incluye URL, tenant, backend, build efectivo, owners listos y estabilidad temporal.

### `BACKEND_PROTEGIDO_NO_CLAUDE`

No se entrega a Claude:

- URL de canal LAB;
- credenciales y secrets;
- configuración Firebase;
- Playwright;
- reglas y detalles del guard de identidad.

### `TEMPORAL_RETIRO`

Las versiones anteriores `20260716-2` y `20260717-1` quedan fuera del runtime canónico y no deben reaparecer en preview, loader, PWA, Service Worker o gate.

## 8. Academia

`ACADEMIA_ACTUALIZAR` con el caso:

**“El login falla, pero la causa está en una navegación transitoria.”**

La lección debe enseñar:

- a no atribuir un timeout al módulo visible sin comprobar el contexto;
- a detectar carreras entre redirecciones y acciones automatizadas;
- a diferenciar versión declarada, versión desplegada y versión efectiva;
- a aplicar el cortacircuitos tras la repetición de una etapa;
- a corregir contrato, owners, workflow, evidencia y Academia en el mismo cierre.

## 9. Estado del plan y siguiente acción exacta

### Avance visible

- causa raíz documentada;
- runtime unificado;
- gate estabilizado antes de Auth;
- preflight con paridad de versión;
- workflow con verificación de despliegue;
- Auth, datos y módulos preservados.

### Siguiente acción exacta

Ejecutar una sola vez el mismo gate sobre el HEAD que contiene contrato `1.0.6`.

- Si el preflight no devuelve `GO_GATE_CONTRACT`, corregir únicamente el check exacto.
- Si Auth vuelve a fallar con runtime estable probado, detener y reclasificar con la nueva evidencia; no reintentar.
- Solo con evidencia sanitizada `ok:true` se habilita la revisión visual única de Dirección escritorio, Operativo tableta y Asesor móvil.

No se abre Bloque 2 ni producción sin ese cierre.
