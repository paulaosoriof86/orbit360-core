# Cierre M5 — runtime 5.0.28 y remediación de causa raíz 5.0.29

Fecha: 2026-07-29  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open

## Corte

- M1–M4: cerrados.
- M5 5.0.27: PASS schema-driven previo.
- M5 5.0.28: runtime único ejecutado y cerrado en stop-line.
- M5 5.0.29: remediación estática de causa raíz PASS.
- Revisión visual: bloqueada.
- Producción/main/merge/Functions/Rules: no tocados.
- Pólizas: bloqueado.

## Runtime 5.0.28

Package PASS:
- commit `026afb9ce56e9ba4391446e1ea42a925a11681cb`
- run `30486115750`
- job `90692090038`
- artifact `8737683206`
- digest `sha256:a82b3a4f7b5b0ec5c624b639620fad8e5eafcabb6df2a8d33d5b4ff2cda57cd2`

Request/runtime:
- authorized parent `447277782933d4c62d67947c88c32146c8c72b57`
- request commit `20112278f7c4360b8fe307fd7dca5f84bdaf0750`
- run `30486294373`
- job `90692697335`
- artifact `8737783811`
- digest `sha256:66b1fedc6415c896fe1b8d2bef62c7432023c86817e24ecc04a9343e66407b5e`

Primer fallo: `MOBILE_MENU_INCOMPLETE:11`.

Antes del stop-line ya habían pasado preview, policy owner, bootstrap, autenticación, legal, access boundary, baseline, Dirección desktop y Operativo tablet.

Seguridad:
- snapshots 11/11 before + 11/11 after;
- counts estables: true;
- digests estables: true;
- Firestore writes: 0;
- operational writes: 0;
- network write candidates: 0;
- Hosting/Functions/Rules/producción/main/merge: 0.

La autorización runtime quedó consumida y el workflow 5.0.28 congelado. No hubo rerun.

## Causa raíz

Clasificación: `FUNCTIONAL_DEFECT`.

El runtime descargó `core/session-multirol-visibility-v20260716.js` con HTTP 200 y sintaxis válida, pero el loader registró `contract-load-error:data-orbit-multirol-runtime-v20260716`.

La incompatibilidad era entre owners:

1. `core/access-role-session-owner-v20260728.js` publica el owner canónico `Orbit.session` como objeto congelado.
2. El contrato multirol heredado intentaba sobrescribir `Orbit.session.set`, `Orbit.session.canSee` y añadir propiedades directamente.
3. En modo estricto la mutación del owner inmutable falla antes de instalar la visibilidad consultiva Asesor → Aseguradoras.
4. Ese contrato era además responsable de repintar el selector/módulos derivados al cambiar rol.
5. El Service Worker conservaba los contratos runtime con estrategia cache-first y clave canónica por pathname; sin nueva generación de caché era posible servir el contrato anterior aun después del cambio fuente.

No fue defecto de datos, membership, aseguradoras importadas, Firebase, backend, CSS ni del validador responsive.

## Remediación 5.0.29

Cambios funcionales exactos:
- `core/session-multirol-visibility-v20260716.js`
- `sw.js`

La nueva compatibilidad:
- no muta el owner `Orbit.session` recibido;
- crea una fachada inmutable delegada;
- conserva el owner canónico versión `20260729.3`;
- instala compatibilidad versión `20260729.2`;
- permite `aseguradoras` a Asesor/Comercial solo en lectura consultiva;
- respeta `modulesRestricted/modulosRestringidos`;
- conserva permisos base y fail-closed para módulos no declarados;
- delega `set()` al owner canónico;
- reconstruye sidebar al recibir `orbit:session`;
- no reemplaza Auth, store, membership ni data scopes.

PWA:
- nueva generación de caché `orbit360-v20260729-11-multirol-owner`;
- el contrato multirol permanece en `RUNTIME_CONTRACT_PATHS` y se precarga al instalar el nuevo worker.

## Evidencia estática 5.0.29

Intento 1:
- run `30487774731`;
- clasificación `PIPELINE_MECHANISM_FAILURE`;
- error exclusivamente del fixture: `SyntaxError: Missing initializer in const declaration`;
- producto no evaluado ni modificado por esa falla.

Se corrigió únicamente el fixture.

Intento 2/final:
- commit `f1f0949c7a566afae95e60b1a5a9fe9081011045`;
- run `30488008331`;
- job `90698445393`;
- artifact `8738464262`;
- digest `sha256:2407462c6fdd7a890c85148a1d751485815a6900af313d4b4cd5f2535d049a4d`;
- preflight 19/19 PASS;
- fixture 13/13 PASS;
- failed 0.

El fixture prueba:
- import sobre owner congelado;
- owner canónico preservado;
- fachada congelada;
- marker listo;
- Aseguradoras visible para Asesor;
- restricción explícita prevalece;
- permisos base preservados;
- módulo no declarado denegado;
- `set()` delegado;
- `orbit:session` reconstruye sidebar;
- ausencia del patrón de mutación directa;
- nueva caché PWA;
- precache del contrato.

El Access owner canónico, Router y la candidata runtime histórica 5.0.25 quedaron sin cambios.

## Carriles

### A — frontend / UX / Academia
Avance visible: causa del menú móvil corregida en owner de compatibilidad, no con CSS ni hardcode visual. La revisión visual sigue bloqueada hasta runtime `ok:true` sobre una candidata entregada.

### B — backend / seguridad / Access
No hubo escrituras backend. La remediación respeta el owner Access inmutable y mantiene membership/scopes fail-closed. El runtime 5.0.28 dejó snapshots estables y cero writes.

### C — datos reales / migración
Sin cambios. Baseline sigue 414 clientes, 26 aseguradoras, 7 asesores; GT/CO 398/16; Persona/Empresa 391/23; missing currency 0; target-only 0/0. No se reimportó nada.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`:
- owner canónico inmutable + fachada de compatibilidad delegada;
- un contrato legacy no debe mutar un owner nuevo;
- el loader debe diferenciar HTTP/sintaxis de ejecución/import;
- navegación se reconstruye desde permisos efectivos al cambiar rol;
- restricciones explícitas siempre prevalecen;
- cambios en contratos cache-first requieren coordinación con owner PWA/cache;
- stop-line y no-rerun después de una autorización one-shot consumida.

## Academia

`ACADEMIA_ACTUALIZAR`:
- diferencia entre archivo disponible, sintaxis válida y contrato realmente instalado;
- `FUNCTIONAL_DEFECT` vs `VALIDATOR_STALE` vs `PIPELINE_MECHANISM_FAILURE`;
- owners Access/Router/PWA y por qué se corrigen juntos;
- visibilidad multirol = owner base + extensiones permitidas - restricciones;
- cache-first y riesgo de validar una versión anterior;
- autorización recibida ≠ request creado ≠ autorización consumida.

## Estado y siguiente acción

La RC previa `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61` queda superada por el cambio funcional 5.0.29. Todavía no se declara un nuevo hash ni paridad remota porque no se ha realizado Hosting.

Siguiente acción exacta: solicitar autorización separada para **una sola entrega Hosting LAB de la nueva candidata post-5.0.29**, recalcular/verificar la candidata y comprobar paridad pública. Solo después de esa entrega podrá solicitarse una nueva autorización runtime. Producción y Pólizas continúan bloqueados.
