# Gravicentra Insurance — Plan Maestro de Recuperación Fase A v1.3

**Fecha:** 2026-08-31  
**Marca de producto:** `Gravicentra Insurance`  
**Identificadores técnicos heredados:** `Orbit 360` / `orbit360-*` pueden conservarse por compatibilidad técnica; no representan un segundo producto.  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `recovery/fase-a-clean-20260831`  
**SHA forense de origen:** `9c95f31461f2eabe9804625b5659bee772f5602a`  
**Estado:** VIGENTE / PREVALENTE.

## 1. Objetivo no negociable

Publicar hoy una Fase A estable de **Gravicentra Insurance** que sirva exactamente la última versión aprobada de cada módulo/capacidad Fase A, preservando el trabajo ya desarrollado, sin reimportar datos durante la recuperación del software y sin volver al mecanismo `baseline histórico + overlays/rootfixes`.

Cadena obligatoria:

`aprobación comprobable -> source exacto -> owner/dependencias -> entrypoint alcanzable -> build único -> artifact inmutable -> preview exacto -> prueba individual por módulo -> E2E transversal -> mismo artifact a producción -> prueba live individual -> PRODUCTION_ACCEPTED -> data refresh`.

Un archivo presente, ZIP válido, hash correcto o deploy exitoso NO bastan para demostrar que la última versión aprobada funciona.

## 2. Frontera de contexto ChatGPT

Se crea un proyecto ChatGPT NUEVO y aislado llamado exactamente:

`Gravicentra Insurance`

Configuración obligatoria: **Memoria solo del proyecto**.

El proyecto histórico `Orbit 360` queda como archivo de genealogía/contexto. No se usa para ejecutar recovery. No se mueven chats históricos ni la conversación donde se decidió esta recuperación. El nuevo proyecto inicia con un chat limpio y fuentes curadas.

## 3. Autoridades únicas y precedencia

1. `ADDENDUM_PREVALENTE_CHATGPT_PROJECT_BOUNDARY_20260831.md` — frontera de contexto y nombre del proyecto.
2. `orbit360-recovery-state-v1.json` — único estado mutable.
3. Este Plan Maestro v1.3 — secuencia y gates.
4. `orbit360-approved-capability-manifest-v1.json` — verdad de versiones/capabilities aprobadas.
5. `ORBIT360-RECOVERY-ANTI-DERAILMENT-ADDENDUM-20260831.md` — retorno obligatorio al plan.
6. `ORBIT360-FASE-A-MODULE-VALIDATION-MATRIX-v1.md` — evidencia módulo por módulo.

Versiones v1.1/v1.2 y cualquier texto que ordene usar el Proyecto histórico Orbit 360 quedan `SUPERSEDED`.

## 4. Decisiones estructurales congeladas

- **GitHub:** mismo repositorio; no crear otro.
- **Recovery:** rama `recovery/fase-a-clean-20260831`.
- **Firebase:** mismo proyecto para esta salida; Preview/Channel aislado antes de producción. No crear otro Firebase hoy.
- **ChatGPT:** proyecto nuevo `Gravicentra Insurance` con Memoria solo del proyecto.
- **Codex:** limitado a trabajo mecánico de alto volumen con ahorro material.
- **Producción:** no tocar durante Iteraciones 0–4.
- **Datos:** no actualizar durante Iteraciones 0–5; validar software con corte conocido 2026-07-31.
- **Release:** build una sola vez; preview y producción usan el mismo artifact/digest.
- **Entrypoint:** un solo `index.html` productivo canónico; source LAB no gobierna producción.
- **Runtime scratch/evidencia temporal:** fuera del árbol publicable.
- **main:** no es autoridad de release mientras no esté reconciliado.

## 5. Alcance mínimo Fase A

Iteración 1 reconstruye la lista final desde evidencia. Como mínimo:
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
- hidratación
- PWA/service worker sin bloquear startup
- CRUD/escrituras que pertenezcan a capacidades Fase A aprobadas

Cualquier otra capacidad formalmente aprobada se agrega antes del clean build.

## 6. Regla funcional Aseguradoras

El directorio operativo completo debe ser visible y operable para:
- `Operativo`
- `Admin` / `AdminTenant`
- `SuperAdmin`
- `Dirección`

Incluye usuario, contraseña/revelado y cuentas según la última funcionalidad aprobada. No se acepta ocultamiento accidental de UI ni usar DOM como seguridad. `Asesor` no recibe visibilidad completa salvo aprobación posterior demostrada.

## 7. Prueba obligatoria módulo por módulo

No existe aprobación transversal sin aprobación individual. Cada capability debe contener:
- última aceptación comprobable;
- run/commit/artifact;
- source/blob SHA;
- owner final;
- dependencias runtime;
- roles;
- semántica read/write y roles de escritura;
- UI/comportamiento esperado;
- prueba original de aceptación;
- buildId/runtimeVersion esperado;
- evidencia preview;
- evidencia live;
- alternativas descartadas y razón.

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

Estados obligatorios:
- preview: `LATEST_APPROVED_VERSION_PREVIEW_PASS`;
- producción: `LATEST_APPROVED_VERSION_LIVE_PASS`.

## 8. Performance y acceso

La lentitud es parte del recovery:
- login/shell pre-auth no depende del service worker;
- autenticación no espera PWA;
- módulos no esenciales no bloquean primer render;
- hydration requerida se reduce al mínimo real;
- optional data degrada sin bloquear;
- ningún timeout de 30/120 s forma parte del flujo exitoso normal;
- assets están ligados a build/digest para impedir mezcla de versiones.

## 9. Iteraciones congeladas

### Iteración 0 — FREEZE FORENSE Y AUTORIDAD — PASS
Rama, SHA y autoridades de recovery establecidos. Release path histórico fuera de uso.

### Iteración 1 — LINEAGE DE ÚLTIMA VERSIÓN APROBADA — IN_PROGRESS
Por capability: aprobación, source exacto, owner, dependencias, roles, write semantics y prueba.

**Gate:** 100% Fase A con lineage único; cero owners ambiguos; cero aprobados huérfanos; cada capability declara `READ_ONLY` o escrituras aprobadas.

### Iteración 2 — CLEAN SOURCE + INDEX ÚNICO + STARTUP
Árbol limpio, entrypoint único, exclusión LAB/seeds/auth LAB, absorción de deltas aprobados en owners finales, retiro de duplicados, dependency/reachability graph, versioning coherente, startup optimizado y capa de escritura productiva separada de writers LAB.

**Gate:** source + reachability + startup + write contract PASS.

### Iteración 3 — BUILD ÚNICO + FIREBASE PREVIEW
Build una vez, manifest SHA-256, digest único, mismo artifact a Preview/Channel, remote readback exacto y writers/rules probados en emulador/harness si aplican.

**Gate:** artifact/readback exacto PASS.

### Iteración 4A — QA INDIVIDUAL PREVIEW
Cada módulo/capability alcanza `LATEST_APPROVED_VERSION_PREVIEW_PASS`.

### Iteración 4B — E2E TRANSVERSAL
Fase A × roles × desktop/tablet/mobile, con navegación, relaciones, scopes, errores, buildId, SW/cache, integridad y writes en harness.

**Gate:** 100% individual + 100% transversal PASS.

### Iteración 5 — MISMO ARTIFACT A PRODUCCIÓN + QA LIVE
Precondición: Iteraciones 0–4 PASS y autorización explícita sobre digest exacto.

1. promover mismo artifact;
2. aplicar únicamente rules/endpoints/commands aprobados;
3. remote full rehash;
4. smoke postdeploy;
5. prueba live módulo por módulo;
6. roles/scopes/relaciones;
7. escrituras aprobadas con before/after y cleanup/rollback;
8. persistencia/recarga;
9. buildId/digest servido;
10. integridad before/after;
11. rollback automático si falla cualquier gate.

Solo con todos los módulos `LATEST_APPROVED_VERSION_LIVE_PASS` se declara `PRODUCTION_ACCEPTED`.

### Iteración 6 — DATA REFRESH 2026-08-01 A 2026-08-31
Solo después de `PRODUCTION_ACCEPTED`, todos los módulos live PASS e integridad postprod PASS.

Por fuente:
`perfilado -> dry-run -> diff -> deduplicación -> validación -> autorización -> escritura -> auditoría -> smoke -> integrity -> rollback`.

## 10. Reglas anti-regresión

1. No reabrir un módulo PASS sin regresión causal reproducible.
2. No usar reimportación para reparar visualización, routing, cache, composición, permisos o validator.
3. No parchar artifact certificado.
4. Cambio source después del build => digest nuevo.
5. Un fallo se resuelve dentro del gate activo; no crea metodología nueva.
6. Validator failure no equivale a producto defectuoso sin reproducción causal.
7. Fallo funcional no autoriza infraestructura no relacionada.
8. Fallo de infraestructura no autoriza reescritura de módulos.
9. No crear ramas one-shot por validación ordinaria.
10. No pedir trabajo manual local a Paula salvo imposibilidad técnica real.

## 11. Codex

Usar solo si reduce materialmente trabajo mecánico amplio:
- lineage masivo;
- grafo de dependencias/reachability;
- owners/bridges duplicados/shadowed;
- consolidación mecánica de clean source.

No usar para documentación, decisiones, resúmenes, auditorías pequeñas ni QA ordinario ejecutable con ChatGPT/GitHub.

## 12. Benchmarking

Se preserva B97/B97-DR; no se repite. Integralidad, CRM/Cliente360, renovaciones, comisiones, portal, IA, automatización, integraciones y capacitación son capacidades de mercado, no diferenciadores suficientes por sí solos. La recuperación no añade features por benchmarking; recupera primero lo aprobado. Los ejes estratégicos posteriores son adaptación/localización, interoperabilidad en entornos heterogéneos, trazabilidad, gobierno de información, implementación acompañada y valor medible.

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

Ante cualquier interrupción/desvío:
`leer Addendum Prevalente + state + Plan v1.3 + capability manifest + Addendum Anti-Descarrilamiento + matriz -> identificar último gate PASS -> ejecutar únicamente primer gate incompleto`.

## 15. Meta temporal

La meta operativa es **cerrar producción el 31 de agosto de 2026**. Esta es una prioridad de ejecución, no una autorización para saltar gates ni una garantía ficticia. Si un gate crítico no pasa, se corrige dentro de su iteración y no se declara producción aceptada sin evidencia.

## 16. Reporte obligatorio

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
