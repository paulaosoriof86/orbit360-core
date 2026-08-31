# Orbit 360 A&S — Plan Maestro de Recuperación Limpia Fase A v1.2

**Fecha:** 2026-08-31  
**Rama:** `recovery/fase-a-clean-20260831`  
**SHA forense de origen:** `9c95f31461f2eabe9804625b5659bee772f5602a`  
**Estado:** VIGENTE / PREVALENTE junto con el Addendum de Frontera ChatGPT.

## 1. Objetivo no negociable

Recuperar y publicar una Fase A estable que sirva **exactamente la última versión aprobada de cada módulo/capacidad Fase A**, preservando el producto desarrollado, sin reimportar datos durante la recuperación del software y sin volver al mecanismo `baseline histórico + overlays/rootfixes`.

Cadena obligatoria:

`aprobación comprobable -> source exacto -> owner/dependencias -> entrypoint alcanzable -> build único -> artifact inmutable -> preview exacto -> prueba individual por módulo -> E2E transversal -> mismo artifact a producción -> prueba live individual -> PRODUCTION_ACCEPTED -> data refresh`.

Un archivo presente, un ZIP válido o un deploy exitoso no bastan para demostrar la versión funcional correcta.

## 2. Frontera de contexto ChatGPT

Se crea un proyecto nuevo:

`Orbit 360 — Recovery Producción 2026-08-31`

Configuración obligatoria: **Memoria solo del proyecto**.

El proyecto histórico `Orbit 360` queda como archivo de contexto y genealogía; no se utiliza para ejecutar la recuperación. No se mueven chats históricos ni esta conversación al proyecto nuevo. La recuperación empieza con un chat limpio y fuentes curadas.

El archivo `ADDENDUM_PREVALENTE_CHATGPT_PROJECT_BOUNDARY_20260831.md` prevalece sobre cualquier instrucción anterior que diga usar el proyecto histórico.

## 3. Autoridades únicas

1. `orbit360-recovery-state-v1.json` — único estado mutable.
2. `orbit360-approved-capability-manifest-v1.json` — verdad de versiones/capabilities aprobadas.
3. Este Plan Maestro v1.2 — secuencia y gates.
4. `ADDENDUM_PREVALENTE_CHATGPT_PROJECT_BOUNDARY_20260831.md` — frontera de contexto.
5. `ORBIT360-RECOVERY-ANTI-DERAILMENT-ADDENDUM-20260831.md` — retorno obligatorio al plan.
6. `ORBIT360-FASE-A-MODULE-VALIDATION-MATRIX-v1.md` — evidencia módulo por módulo.

Chats, PR bodies, comentarios y documentos históricos son evidencia/contexto, no estado rector.

## 4. Decisiones estructurales congeladas

- **Repositorio:** mismo `paulaosoriof86/orbit360-core`; no crear otro repo.
- **Rama de recovery:** `recovery/fase-a-clean-20260831`.
- **Firebase:** mismo proyecto para esta salida; Hosting Preview/Channel aislado antes de producción. No crear otro Firebase hoy.
- **ChatGPT:** nuevo proyecto aislado con memoria solo del proyecto.
- **Codex:** limitado a trabajo mecánico de alto volumen cuando el ahorro sea material.
- **Producción:** no tocar durante Iteraciones 0–4.
- **Datos:** no actualizar durante Iteraciones 0–5; validar software con corte conocido 2026-07-31.
- **Release:** build una sola vez; preview y producción usan el mismo artifact/digest.
- **Entrypoint:** un solo `index.html` productivo canónico; source LAB no gobierna producción.
- **Runtime evidence/scratch:** fuera del árbol publicable.
- **main:** no es requisito de release mientras no sea autoridad reconciliada.

## 5. Reglas anti-regresión

1. No reabrir un módulo cerrado sin regresión causal reproducible.
2. No usar reimportación para resolver visualización, routing, cache, permisos, composition o validator.
3. No parchar directamente un artifact certificado.
4. Si cambia source después del build, nace un digest nuevo y se repiten gates aplicables.
5. Un fallo se corrige dentro del gate activo; no crea una nueva metodología.
6. Un fallo de validator no se etiqueta como defecto de producto hasta reproducir causalidad.
7. Un fallo funcional no autoriza tocar infraestructura no relacionada.
8. Un fallo de infraestructura no autoriza reescribir módulos.
9. No crear ramas one-shot por validaciones ordinarias.
10. No pedir trabajo manual local a Paula salvo imposibilidad técnica real.

## 6. Regla funcional Aseguradoras

El directorio operativo completo debe ser visible/operable para:
- `Operativo`
- `Admin` / `AdminTenant`
- `SuperAdmin`
- `Dirección`

Incluye usuario, contraseña/revelado y cuentas según la última funcionalidad aprobada. No se acepta ocultamiento accidental de UI ni usar DOM como seguridad. `Asesor` no recibe visibilidad completa salvo evidencia posterior aprobada.

## 7. Alcance mínimo Fase A

Iteración 1 debe reconstruir la lista final desde evidencia. Como mínimo:
- Login/acceso
- Inicio
- Cliente 360
- Aseguradoras
- Ops
- Leads
- Pólizas
- Vehículos
- Recibos/cartera
- Cobros
- Roles/scopes
- relaciones y sincronizaciones
- shell/router/navegación
- hidratación de datos
- PWA/service worker sin bloqueo de startup
- CRUD/escrituras que pertenezcan a capacidades Fase A aprobadas

Cualquier otra capacidad formalmente aprobada se incorpora antes del clean build.

## 8. Prueba obligatoria módulo por módulo

No existe aprobación transversal sin aprobación individual. Cada fila canónica debe contener:
- última aceptación comprobable;
- run/commit/artifact de origen;
- source/blob SHA;
- owner final;
- dependencias runtime;
- roles aplicables;
- semántica read/write y roles de escritura;
- UI/comportamiento esperado;
- prueba original de aceptación;
- buildId/runtimeVersion esperado;
- evidencia preview;
- evidencia producción;
- alternativas descartadas y motivo.

Test individual mínimo:
1. ruta/carga;
2. build/version exacta;
3. última UI aprobada;
4. datos sin `undefined/NaN`;
5. acciones principales;
6. persistencia/recarga si aplica;
7. permisos por rol;
8. dependencias/relaciones;
9. 404/page/console errors;
10. responsive aplicable.

Estados requeridos:
- preview: `LATEST_APPROVED_VERSION_PREVIEW_PASS`;
- producción: `LATEST_APPROVED_VERSION_LIVE_PASS`.

## 9. Performance y acceso

La lentitud es parte del recovery. El clean source debe conseguir que:
- login/shell pre-auth aparezca sin depender del service worker;
- autenticación no espere PWA;
- módulos no esenciales no bloqueen primer render;
- hydration requerida sea mínima;
- colecciones opcionales degraden sin bloquear;
- ningún timeout de 30/120 s forme parte del flujo exitoso normal;
- assets estén ligados a build/digest para impedir mezcla de versiones.

## 10. Iteraciones congeladas

### ITERACIÓN 0 — FREEZE FORENSE Y AUTORIDAD — PASS
Rama, SHA, plan, state, manifest, addenda y matriz establecidos. El mecanismo histórico queda fuera del release path.

### ITERACIÓN 1 — LINEAGE DE ÚLTIMA VERSIÓN APROBADA — IN_PROGRESS
Por capability: aprobación, source exacto, owner, dependencias, roles, write semantics y test.

**Gate:** 100% Fase A con lineage único; cero owners ambiguos; cero aprobados huérfanos; cada capability declara `READ_ONLY` o escrituras aprobadas.

### ITERACIÓN 2 — CLEAN SOURCE + INDEX ÚNICO + STARTUP
- árbol productivo limpio;
- único index canónico;
- excluir LAB/seeds/auth LAB del entrypoint;
- absorber deltas aprobados en owners finales;
- retirar/shadow-disable duplicados;
- dependency/reachability graph;
- build/versioning coherente;
- optimización de startup;
- capa de escritura productiva separada de writers LAB.

**Gate:** source + reachability + startup + write contract PASS.

### ITERACIÓN 3 — BUILD ÚNICO + FIREBASE PREVIEW
- build una vez;
- manifest SHA-256;
- digest único;
- deploy del mismo artifact a Preview/Channel;
- remote readback exacto;
- rules/writers en emulador o harness aislado cuando apliquen.

**Gate:** artifact/readback exacto PASS.

### ITERACIÓN 4A — PRUEBA INDIVIDUAL PREVIEW
Cada módulo/capability debe alcanzar `LATEST_APPROVED_VERSION_PREVIEW_PASS`.

### ITERACIÓN 4B — MATRIZ E2E TRANSVERSAL
Fase A × roles × desktop/tablet/mobile, con navegación, relaciones, scopes, errores, buildId, SW/cache, integridad y writes en harness.

**Gate:** 100% individual + 100% transversal PASS.

### ITERACIÓN 5 — MISMO ARTIFACT A PRODUCCIÓN + PRUEBAS LIVE
Precondición: 0–4 PASS y autorización explícita sobre digest exacto.

1. promover el mismo artifact;
2. aplicar únicamente rules/endpoints/commands aprobados;
3. remote full rehash;
4. smoke postdeploy;
5. prueba live módulo por módulo;
6. roles/scopes/relaciones;
7. escrituras aprobadas con before/after y cleanup/rollback;
8. persistencia/recarga;
9. buildId/digest servido;
10. integridad before/after;
11. rollback automático si falla gate.

Solo cuando **todos** los módulos sean `LATEST_APPROVED_VERSION_LIVE_PASS` se declara `PRODUCTION_ACCEPTED`.

### ITERACIÓN 6 — DATA REFRESH 2026-08-01 A 2026-08-31
Precondición: `PRODUCTION_ACCEPTED=true`, todos los módulos live PASS e integridad postprod PASS.

Por fuente:
`perfilado -> dry-run -> diff -> deduplicación -> validación -> autorización -> escritura -> auditoría -> smoke -> integrity -> rollback`.

No cargar agosto antes.

## 11. Benchmarking y producto

Se preserva B97/B97-DR; no se repite. Integralidad, CRM/Cliente360, renovaciones, comisiones, portal, IA, automatización, integraciones y capacitación son capacidades de mercado y no diferenciadores suficientes por sí solos. La recuperación no agrega features por benchmarking; recupera primero lo aprobado. Los ejes estratégicos posteriores son adaptación/localización, interoperabilidad en entornos heterogéneos, trazabilidad, gobierno de información, implementación acompañada y valor medible.

## 12. Uso de Codex

Codex se usa solo si reduce materialmente trabajo mecánico de gran volumen, especialmente:
- lineage masivo;
- grafo de dependencias/reachability;
- detección de owners/bridges duplicados/shadowed;
- consolidación mecánica de clean source.

No usar para documentación, decisiones, resúmenes, auditorías pequeñas ni pruebas ordinarias que podamos ejecutar con ChatGPT/GitHub.

## 13. Definición de terminado

Fase A termina solo con:
1. lineage 100%;
2. clean source;
3. index único;
4. artifact inmutable;
5. preview/readback exacto;
6. cada módulo preview PASS;
7. E2E transversal PASS;
8. mismo artifact en producción;
9. cada módulo live PASS;
10. roles/scopes/relaciones PASS;
11. writes aprobados PASS cuando apliquen;
12. integridad before/after PASS;
13. rollback disponible/probado;
14. `PRODUCTION_ACCEPTED`.

## 14. Retorno obligatorio

Ante interrupción/desvío: leer state + capability manifest + Plan v1.2 + Addendum Prevalente de Frontera + Addendum Anti-Descarrilamiento; identificar último gate PASS y ejecutar únicamente el primer gate incompleto.

## 15. Reporte obligatorio

Cada continuidad declara:
- iteración/gate;
- autoridades leídas;
- rama/SHA/artifact;
- módulos PASS/PENDING;
- pruebas/evidencias;
- desviaciones y retorno;
- producción tocada sí/no;
- datos tocados sí/no;
- Codex usado sí/no y motivo;
- siguiente acción exacta.
