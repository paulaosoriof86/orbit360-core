# CIERRE M5 5.0.12 — Membership projection y nueva RC

Fecha: 2026-07-29
Repositorio: `paulaosoriof86/orbit360-core`
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `block5-release-candidate-visualization-v20260728`
Contrato: `5.0.12`

## Estado

`M5_MEMBERSHIP_PROJECTION_512_STATIC_CLOSED_NEW_RC_READY_FOR_HOSTING`

M1–M4 permanecen cerrados. M5 no está cerrado todavía: falta entregar la nueva RC a Hosting LAB, obtener paridad pública 25/25, ejecutar un runtime smoke independiente autorizado y realizar una única revisión visual con Paula.

## Origen del bloque

El runtime 5.0.11 sobre la RC anterior `f6dfa37e…` fue consumido una sola vez y se detuvo en `MEMBERSHIP_BOUNDARY_NOT_ACTIVE`.

Evidencia del intento:
- request commit: `136cca57600c0aef146ad5b121aeb746a7d0dd4c`
- run: `30457847993`
- job: `90595950599`
- artifact: `8726316517`
- preflight: 17/17
- contrato: 42/42
- snapshots: 11/11 antes y después
- conteos/digests: estables
- Firestore writes: 0
- operational writes: 0
- autorización: consumida

Clasificación de causa raíz: `FUNCTIONAL_DEFECT` + `DATA_CONTRACT_FAILURE`.

El Access owner fail-closed requería una proyección productiva derivada de membership, mientras la ruta LAB anterior llegaba solo con identidad Firebase y atajos legacy de rol/asesor. La membership canónica sí existía; no correspondía reimportar ni modificar clientes/aseguradoras.

## Corrección de propietario

Owner corregido: `core/access-role-session-owner-v20260728.js`
Versión: `20260729.3`

Contrato final:
- membership: `tenants/{tenantId}/members/{authenticatedUid}`;
- tenant derivado del runtime;
- UID derivado de la identidad autenticada;
- lectura solamente;
- `Orbit.auth.productUser` como proyección, sin reemplazar `auth.user()`;
- roles, active/default role, advisor y scopes derivados de membership;
- fail-closed si membership/tenant/uid/rol activo no cumplen contrato;
- sin fallback hardcodeado de tenant, UID, asesor o rol;
- `writeAuthorized:false`;
- `membershipWrites:false`.

Archivos backend protegidos permanecieron intactos, incluyendo `auth.js`, `store.js`, store Firestore LAB, backend LAB init/loader/guard, `core/importa.js` y `firestore.rules`.

## Control de causa raíz del pipeline

Primer intento estático: `VALIDATOR_STALE`.
- fixture funcional: 22/23;
- el único fallo funcional aparente era un falso positivo del validador que confundía `===` con asignación de `auth.user`;
- el producto se congeló y se corrigió únicamente el validador.

Segundo intento en la misma etapa: `PIPELINE_MECHANISM_FAILURE`.
- error: `fatal: bad object 136cca57…`;
- causa: checkout con `fetch-depth:2` impedía comparar contra el commit histórico requerido;
- se detuvieron reintentos y cambios de módulo;
- causa raíz del pipeline diagnosticada;
- mecanismo corregido a historial completo (`fetch-depth:0`) + `git cat-file` previo.

La verificación del mecanismo terminó PASS; el workflow quedó nuevamente congelado para evitar reejecución automática.

## Evidencia de cierre 5.0.12

Evidencia canónica:
- verification commit: `6c01e6cbff97aa67a598fc68f43b3671bd5661b6`
- run: `30460202680`
- job: `90603978220`
- artifact: `8727238222`
- digest: `sha256:51e1e36221fecf121bc2c121b445abf5d78f6fb2de8c0cff8376a86c56f74378`
- workflow safety: 13/13
- preflight: 36/36
- fixture: 23/23
- protected files unchanged: true

Verificación adicional del mecanismo:
- run: `30460630942`
- job: `90605462148`
- artifact: `8727418792`
- digest: `sha256:ff435ad2f517a5bb7c6d2b4861a10ea913b5aea1d8250c5ebd45e815a1996a80`
- resultado: SUCCESS

## Nueva release candidate

RC anterior: `f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324`

RC nueva: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`

Estado:
- activos críticos: 42/42;
- LAB remoto: 24/25;
- mismatch: 1;
- único mismatch: `core/access-role-session-owner-v20260728.js`;
- paridad remota: false, como se espera antes del Hosting de la RC nueva;
- ready for Hosting LAB delivery: true;
- ready for runtime smoke: false.

## Carriles

### Carril A — frontend / UX / Academia
No se modificó UX visual. Se preserva el requisito de revisar Dirección desktop, Operativo tablet y Asesor móvil solo después de un runtime `ok:true`.

### Carril B — backend / seguridad / Orbit.store
Avance visible: la autorización multirol queda derivada de membership real y fail-closed, eliminando el atajo legacy de rol/asesor sin tocar `auth.js`, Rules ni stores protegidos.

### Carril C — datos A&S
No hubo reimportación ni escrituras. Se conservaron 414 clientes, 26 aseguradoras, 7 asesores, 398/16 GT/CO, 391/23 Persona/Empresa y cero moneda faltante.

## Impacto Claude / prototipo reutilizable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Acumular para el siguiente paquete a Claude:
- roles visibles/seleccionables deben venir de membership/configuración, no de listas globales hardcodeadas;
- rol activo/default y advisor deben ser proyecciones del usuario, no valores quemados;
- scopes propios/equipo/todos deben reflejar autorización real;
- ausencia o inconsistencia de membership debe fallar cerrado con estado honesto no técnico;
- una corrección de acceso no debe reintroducir hardcodes para satisfacer un gate.

No enviar a Claude: rutas Firestore, implementación del owner, workflows, artifacts, secrets, reglas ni datos reales A&S (`BACKEND_PROTEGIDO_NO_CLAUDE`).

## Impacto Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Acumular:
- diferencia entre autenticación e autorización/membership;
- rol asignado vs rol activo/default;
- scopes propios/equipo/todos;
- fail-closed cuando la membership no es válida;
- diferencia entre defecto funcional, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`;
- regla de detener reintentos después de dos fallos en la misma etapa.

## Autorizaciones vigentes

- Hosting deploy: false / 0 ejecuciones
- Runtime smoke: false / 0 ejecuciones
- Visual review: false
- Firestore write: false
- Operational writes: false
- Functions/Rules: false
- Producción: false
- main/merge: false
- Pólizas: false

## Siguiente acción exacta

Requiere autorización explícita nueva para **una sola entrega Hosting LAB** de la RC `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`.

Esa entrega debe:
1. ejecutar preflight antes de secretos/deploy;
2. desplegar exactamente una vez;
3. verificar 25/25 activos públicos;
4. aceptar únicamente mismatch 0;
5. no leer/escribir Firestore;
6. no ejecutar navegador/runtime;
7. no tocar Functions, Rules, producción, main, merge ni Pólizas.

Solo después de paridad 25/25 se podrá solicitar una autorización independiente para un único runtime smoke LAB sobre la misma RC.

## Pólizas

Pólizas continúa bloqueado hasta cierre de M5 y del go-live controlado. La fuente real vigente de Pólizas todavía debe recibirse/validarse en su bloque; `Listado producción 2025-2026` no sustituye automáticamente la fuente canónica.
