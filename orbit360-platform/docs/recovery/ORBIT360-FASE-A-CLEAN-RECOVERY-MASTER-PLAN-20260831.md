# Orbit 360 A&S — Plan Maestro Congelado de Recuperación Limpia Fase A v1.1

**Fecha de congelación:** 2026-08-31  
**Rama de recuperación:** `recovery/fase-a-clean-20260831`  
**SHA forense de origen:** `9c95f31461f2eabe9804625b5659bee772f5602a`  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Estado:** VIGENTE / ANTI-DESVIACIÓN / sustituye como plan operativo de recuperación a planes previos que queden incompatibles con este corte.

## 1. Objetivo no negociable

Recuperar y publicar una Fase A estable que sirva **exactamente la última versión aprobada de cada módulo/capacidad Fase A**, sin reconstruir módulos funcionales, sin reimportar datos durante la recuperación del software y sin seguir acumulando overlays/rootfixes sobre el mecanismo anterior.

Cadena obligatoria de verdad:

`aceptación aprobada -> source exacto -> owner/dependencias -> entrypoint alcanzable -> artifact inmutable -> preview exacto -> prueba individual del módulo -> matriz transversal -> mismo artifact en producción -> pruebas en vivo -> data refresh`.

La mera presencia de un archivo, un ZIP o un hash de paquete NO demuestra que la capacidad aprobada se ejecute.

## 2. Autoridad y continuidad

Las conversaciones de ChatGPT, Codex, PR bodies y mensajes narrativos son contexto, no autoridad de estado.

Autoridades únicas de la recuperación:
1. `orbit360-recovery-state-v1.json`: único estado mutable.
2. `orbit360-approved-capability-manifest-v1.json`: versión/capability aprobada.
3. este Plan Maestro v1.1: orden, gates y prohibiciones.
4. `ORBIT360-RECOVERY-ANTI-DERAILMENT-ADDENDUM-20260831.md`: protocolo obligatorio de retorno si aparece un desvío.

El Proyecto ChatGPT **Orbit 360** puede y debe usarse como contenedor de continuidad. Sus instrucciones y fuentes deben apuntar a estas autoridades; no se necesita crear otro proyecto de ChatGPT para esta recuperación.

## 3. Reglas duras

1. Mismo repositorio GitHub; recuperación en rama independiente.
2. Mismo proyecto Firebase para esta salida; preview/channel aislado antes de producción.
3. No tocar producción durante iteraciones 0–4.
4. No actualizar datos de negocio durante iteraciones 0–5; corte funcional de validación: 2026-07-31.
5. Prohibido volver a publicar mediante `baseline histórico + overlays` como mecanismo normal.
6. Build una vez; el artifact certificado no se modifica ni recompone.
7. No reabrir trabajo funcional cerrado sin regresión demostrada.
8. Un solo entrypoint productivo canónico; el `index.html` LAB no es autoridad productiva.
9. Runtime scratch/evidencias temporales fuera del árbol publicable.
10. No usar `main` como requisito de release mientras no sea autoridad reconciliada.
11. No reimportar Clientes/Aseguradoras ni otras fuentes para corregir defectos de visualización, caché, routing, composición o permisos.
12. No pedir trabajo manual local a Paula salvo que sea técnicamente indispensable y no exista ruta automatizable.
13. No confundir source, build, preview, producción, validación técnica, validación humana y uso real.
14. Cada fallo permanece dentro de su iteración; no crea otra metodología ni otro plan.
15. Codex es recurso limitado: usar solo cuando reduzca materialmente trabajo mecánico de gran volumen; no para documentación ni tareas que puedan resolverse desde ChatGPT/GitHub.

## 4. Regla funcional Aseguradoras

El directorio operativo completo debe ser visible y operable para:
- `Operativo`
- `Admin` / `AdminTenant`
- `SuperAdmin`
- `Dirección`

Incluye usuario, contraseña/revelado y cuentas conforme a la última funcionalidad aprobada. No se acepta ocultamiento accidental de UI ni el DOM como mecanismo de seguridad. `Asesor` no recibe esa visibilidad completa salvo evidencia aprobada posterior.

## 5. Alcance mínimo Fase A

La Iteración 1 debe reconstruir la lista final desde evidencia; como mínimo:
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
- relaciones y sincronizaciones entre módulos
- shell/router/navegación
- hidratación de datos
- PWA/service worker sin bloqueo de startup
- CRUD/escrituras que pertenezcan a la última versión aprobada

Cualquier capacidad adicional formalmente aprobada para Fase A se agrega antes del build limpio.

## 6. Prueba obligatoria módulo por módulo

**No existe aprobación transversal sin aprobación individual.** Por cada módulo/capability Fase A se genera una fila canónica con:
- última aceptación comprobable;
- run/commit/artifact de origen;
- source/blob SHA exacto;
- owner final y bridges imprescindibles;
- dependencias runtime;
- rol(es) aplicables;
- lectura/escritura aprobada;
- comportamiento visual/funcional esperado;
- prueba original de aceptación;
- `runtimeVersion/buildId` esperado;
- evidencia de preview;
- evidencia de producción.

Cada módulo debe ejecutar, individualmente y antes de la matriz transversal:
1. carga/ruta;
2. comprobación de build/version exacta;
3. render de la última UI aprobada;
4. datos esperados sin `undefined/NaN`;
5. acciones principales;
6. persistencia/recarga si aplica;
7. permisos por rol;
8. dependencias y relaciones;
9. 404/console/page errors;
10. responsive aplicable.

Estado válido por módulo: `LATEST_APPROVED_VERSION_PREVIEW_PASS`. Ningún módulo con estado pendiente permite avanzar a producción.

## 7. Causa arquitectónica que se elimina

La rama histórica ha tenido bifurcación entre source/entrypoint LAB y entrypoint productivo materializado, múltiples bridges/owners y una ruta de arranque extensa. La recuperación crea **un único entrypoint productivo reproducible**, absorbe deltas aprobados en owners finales y elimina la recomposición posterior a la prueba.

La performance es parte del gate: login y primer render no pueden depender del control del service worker ni de esperas artificiales de 30/120 s como flujo exitoso normal.

## 8. Iteraciones cerradas

### ITERACIÓN 0 — FREEZE FORENSE Y AUTORIDAD — PASS
- rama independiente;
- SHA de origen fijo;
- estado/manifiesto/plan presentes;
- release path antiguo fuera de la recuperación.

### ITERACIÓN 1 — LINEAGE DE ÚLTIMA VERSIÓN APROBADA
Por cada capability reconstruir aceptación, source exacto, owner, dependencias, roles y write semantics.

**Gate:**
- 100% capacidades Fase A con lineage único;
- cero owners ambiguos;
- cero aprobados huérfanos/no alcanzables;
- cada módulo identifica su prueba individual y su última versión aprobada;
- cada módulo declara `READ_ONLY` o operaciones de escritura aprobadas.

### ITERACIÓN 2 — CLEAN SOURCE + INDEX ÚNICO + STARTUP
- árbol limpio de producto;
- un solo `index.html` productivo generado desde el capability manifest;
- excluir LAB/seeds/auth LAB del entrypoint;
- absorber overlays aprobados en owners finales;
- retirar/shadow-disable duplicados;
- dependency/reachability graph;
- assets por build/digest;
- separar pre-auth de post-auth cuando sea seguro;
- service worker fuera de la ruta crítica de login;
- required hydration mínima;
- capa de escritura productiva separada de writers LAB.

**Gate:** clean source PASS + reachability PASS + startup PASS + write contract PASS.

### ITERACIÓN 3 — BUILD ÚNICO + FIREBASE PREVIEW
- build una sola vez;
- manifest SHA-256 completo;
- digest único;
- mismo artifact a Hosting Preview/Channel;
- full remote readback;
- writes/rules en emulador o harness aislado antes de producción.

**Gate:** artifact/readback exacto PASS.

### ITERACIÓN 4 — QA PREVIEW EN DOS NIVELES

#### 4A. Prueba individual de cada módulo
Cada módulo debe alcanzar `LATEST_APPROVED_VERSION_PREVIEW_PASS` según sección 6.

#### 4B. Matriz E2E transversal
Módulos Fase A × roles aplicables × desktop/tablet/mobile, incluyendo:
- login;
- navegación;
- Inicio;
- Cliente 360;
- Aseguradoras;
- Ops;
- Leads;
- Pólizas;
- Vehículos;
- Recibos/cartera;
- Cobros;
- relaciones Cliente–Póliza–Vehículo–Recibo/Cobro;
- scopes/permisos;
- roles autorizados de Aseguradoras sin ocultamiento indebido;
- ausencia de controles indebidos para roles no autorizados;
- buildId/digest runtime;
- 404/page/console errors;
- SW/caché sin versión anterior;
- integridad before/after;
- writers aprobados probados en harness.

**Gate:** 100% módulos individuales PASS + 100% matriz transversal PASS.

### ITERACIÓN 5 — MISMO ARTIFACT A PRODUCCIÓN + PRUEBAS EN VIVO

Precondición: Iteraciones 0–4 PASS y autorización explícita sobre digest exacto.

1. promover exactamente el artifact certificado;
2. aplicar únicamente rules/endpoints/commands aprobados;
3. full remote rehash;
4. smoke postdeploy;
5. **prueba en vivo módulo por módulo sobre producción**, no solo smoke agregado;
6. prueba en vivo de login, navegación, roles/scopes y relaciones;
7. prueba controlada de escrituras aprobadas con before/after y cleanup/rollback;
8. verificación de persistencia/recarga;
9. verificación de buildId/digest servido;
10. integridad before/after;
11. rollback automático al último release aceptado si falla un gate.

Cada módulo debe alcanzar `LATEST_APPROVED_VERSION_LIVE_PASS`.

**Solo después de que todos los módulos estén `LIVE_PASS` se declara `PRODUCTION_ACCEPTED`.** Esta es la misma filosofía de validación en vivo usada en Finanzas: la publicación no sustituye la comprobación real del navegador y del comportamiento productivo.

### ITERACIÓN 6 — DATA REFRESH 2026-08-01 A 2026-08-31

No empieza únicamente por haber desplegado. Precondición absoluta:
- `PRODUCTION_ACCEPTED=true`;
- todos los módulos Fase A `LATEST_APPROVED_VERSION_LIVE_PASS`;
- integridad postprod PASS.

Luego, por fuente separada:
`perfilado -> dry-run -> diff -> deduplicación -> validación -> autorización -> escritura -> auditoría -> smoke -> integrity -> rollback disponible`.

No pedir/cargar la información de agosto antes de cerrar producción, salvo que una prueba funcional no pueda ejecutarse con el dataset al 31-jul.

## 9. Benchmarking y criterio de producto

Se preserva el benchmarking B97/B97-DR de la tesis/Gravicentra; no se rehace. Su lectura estratégica se incorpora como principio:
- integralidad, CRM/Cliente 360, renovaciones, comisiones, portal, automatización, IA, integraciones y capacitación son capacidades de mercado, no diferenciadores demostrados por sí solos;
- el valor a perseguir/probar está en adaptación a mercados con estandarización desigual, interoperabilidad progresiva, trazabilidad, gobierno de información, configuración/localización, implementación acompañada y resultados medibles;
- la recuperación de hoy no añade features por benchmarking; primero recupera fielmente lo aprobado.

## 10. Definición de terminado

Fase A termina únicamente con:
1. capability manifest completo;
2. lineage 100%;
3. clean source;
4. index único;
5. artifact inmutable;
6. preview/readback exacto;
7. cada módulo `LATEST_APPROVED_VERSION_PREVIEW_PASS`;
8. matriz E2E transversal PASS;
9. mismo artifact en producción;
10. cada módulo `LATEST_APPROVED_VERSION_LIVE_PASS`;
11. roles/scopes/relaciones PASS;
12. writes aprobados PASS cuando apliquen;
13. integridad before/after PASS;
14. rollback probado/disponible;
15. estado `PRODUCTION_ACCEPTED`.

## 11. Política anti-loop

- fallo funcional ≠ permiso para reabrir infraestructura;
- fallo de infraestructura ≠ permiso para reescribir módulos;
- fallo del validator ≠ defecto de producto hasta reproducción causal;
- fallo después de build => corregir source y producir digest nuevo;
- nunca parchear directamente el artifact certificado;
- una desviación obliga a aplicar el Addendum Anti-Derailment y regresar al último gate PASS;
- no crear ramas one-shot por validación ordinaria;
- no cambiar plan silenciosamente: modificación material exige versión sucesora, motivo, antes/después e impacto.

## 12. Número de iteraciones

Producción Fase A: **6 iteraciones (0–5)**.  
Actualización agosto: **Iteración 6 posterior a producción**.

Un bug no crea una iteración adicional; se resuelve dentro del gate en el que fue detectado.

## 13. Herramientas y uso de Codex

- ChatGPT + GitHub: auditoría, documentación, decisiones, lectura de repo, seguimiento y tareas que no requieran cómputo mecánico masivo.
- GitHub Actions: CI reproducible.
- Firebase Preview/Hosting: preview y producción.
- Browser E2E/Playwright: preview y pruebas live.
- Firebase Emulator/harness: writers/rules antes de producción.
- **Codex: solo cuando sea claramente más eficiente por volumen**, principalmente: reconstrucción mecánica del lineage a gran escala, inventario/grafo de dependencias, búsqueda de owners/bridges duplicados/shadowed y consolidación de clean tree. No usar Codex para redactar documentos, resumir, decidir el plan ni ejecutar comprobaciones pequeñas que puedan resolverse aquí.

## 14. Reporte obligatorio por iteración

Toda continuidad debe declarar:
- iteración/gate;
- última autoridad leída;
- SHA/branch/artifact aplicable;
- módulos cerrados y pendientes;
- pruebas/evidencias;
- desviaciones y retorno al plan;
- producción tocada sí/no;
- datos tocados sí/no;
- siguiente acción exacta.

Sin estos campos no se considera handoff completo.