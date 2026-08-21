# PLAN CONGELADO — CIERRE F2 Y GO-LIVE ORBIT 360 A&S

**Fecha de congelación:** 2026-08-20 (America/Guatemala)  
**Estado:** VIGENTE / NO RECONSTRUIR / NO ABRIR RAMAS PARALELAS  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Alcance:** cierre de F2, promoción de candidata corregida, autorización fresca, F2 final, go-live autorizado y smoke productivo inmediato.

---

## 1. Qué del plan anterior está realmente cerrado

El plan de hardening/control-plane anterior **sí completó CP-00 a CP-11** y el package quedó `CLOSED_PASS`.

Eso NO significa que el plan total hasta producción haya terminado. Después del cierre CP-11:

1. se materializó una autorización F2 fresca ligada al digest `d1d79fdf5c07d7067ef5ed75dd715eddae0dd25b4d7b14c6933ca3257dd7973d`;
2. se materializó un único request one-shot;
3. se identificó y corrigió un `PIPELINE_MECHANISM_FAILURE` de GitHub Actions: un push generado con `GITHUB_TOKEN` no debía asumirse como disparador del siguiente workflow;
4. F2 llegó a ejecutar realmente gate, identidad, Firestore read-only, browser e integridad;
5. el runtime `32444530576` terminó `FUNCTIONAL_DEFECT` por `F2_UNDEFINED_NAN_VISIBLE:desktopDirection:polizas`;
6. autorización y request de ese F2 quedaron consumidos, históricos y sin replay;
7. la causa raíz funcional se localizó en `core/crmkit.js::clienteCell()`, que renderizaba `c.tipo` y `c.pais` sin fallback y sin proyección canónica;
8. se corrigió el origen y se certificó una nueva candidata source-only.

Por tanto: **hardening anterior cerrado; ruta total a producción todavía abierta en F2**.

---

## 2. Candidata vigente que debe promoverse

Nueva candidata certificada:

- artifact: `9433944723`
- source: `c3bb825da2b1ecae08dabc2034c753482b086fec`
- artifact digest: `25228e96490004de39dfba685673c80247ce9e7046d7eeff1cde642e4c673643`
- zip SHA-256: `1951cc7c2d3390ea1c2a6b3d9ce0bb48e26a6f95d5d10d69b7c31a0027cfbbac`
- manifest SHA-256: `580921077a88badab6e4076c42e9ef88f9de7936e1b6bad0f62410b39aec6397`
- archivos: 194
- deltaCount: 1
- único delta permitido: `core/crmkit.js`
- unchangedFileCount: 193
- synthetic rootfix: PASS
- full rehash: PASS
- runtime/browser/secrets/Firestore durante build: false
- writes/deploy/production: 0 / false

Evidencia canónica:
`orbit360-platform/runtime-gate-crm-v20260716/f2-successor-client-projection-rootfix-v20260820.json`

La candidata anterior `9395391426` pasa a histórica para runtime una vez se publique la promoción.

---

## 3. Problemas actuales que este plan cubre expresamente

### A. `PIPELINE_MECHANISM_FAILURE` — recursión GitHub Actions / `GITHUB_TOKEN`
No depender de que un commit realizado por un workflow con `GITHUB_TOKEN` dispare automáticamente otro workflow. La continuación crítica debe ocurrir en la misma ejecución o mediante un trigger externo explícito admitido.

### B. `VALIDATOR_STALE` — readiness de rutas
Ya corregido: una captura independiente de ruta visible/renderizada puede contradecir un timeout obsoleto. No reabrir este diagnóstico sin evidencia nueva.

### C. `PIPELINE_MECHANISM_FAILURE` — proyección/CAS/documentación
Mantener single writer, final CAS, proyección atómica y evidencia monotónica. No publicar proyecciones concurrentes.

### D. `VALIDATOR_STALE` — candidata hardcodeada
El composite invariant no puede fijar literalmente artifact/source históricos. Debe derivar la candidata vigente de la autoridad canónica. Corrección ya preparada antes de promover `9433944723`.

### E. Lifecycle one-shot / replay
El digest `d1d79fdf...` y su request ya fueron consumidos por run `32444530576`. `allowedExecutions=0`, `consumed=true`, `historical=true`, `replayAllowed=false`. No reutilizar.

### F. `FUNCTIONAL_DEFECT` — Pólizas muestra `undefined/NaN`
Causa raíz: `core/crmkit.js::clienteCell()` leía cliente bruto y renderizaba `c.tipo · c.pais` sin fallback/proyección canónica. Fix mínimo aplicado y nueva candidata certificada.

### G. Sincronización documental
Ledger, package, authority, registry, lifecycles, boundary, live-state, current index, PR-state y checkpoint deben cambiar juntos con la promoción. El body real del PR #5 se sincroniza después de PASS de promoción; no es autoridad mientras esté desactualizado.

### H. Seguridad y datos
No reimportar Clientes/Aseguradoras ni tocar datos para resolver visualización. No tocar `Orbit.store`, Auth, reglas, writers o backend protegido por este defecto. Cero writes durante F2. Producción continúa cerrada hasta autorización explícita separada.

---

## 4. Secuencia congelada — no cambiar salvo nueva evidencia material

### MACRO-ITERACIÓN 1 — Promoción source-only de candidata `9433944723`

Objetivo único: convertir `9433944723` en candidata canónica vigente.

Debe ejecutar:

1. validar terminal `32444530576` y clasificación `FUNCTIONAL_DEFECT`;
2. verificar authorization/request consumidos y replay=false;
3. validar evidencia de candidata `9433944723`;
4. promover candidata mediante owner source-only revisionado;
5. ledger `24 → 25`;
6. package `18 → 19`;
7. actualizar authority + registry + source/runtime lifecycle;
8. generar nueva authorization boundary ligada exclusivamente a la candidata `9433944723`;
9. ejecutar proyección atómica;
10. CP11 boundary audit + composite invariant + independent readback;
11. publicar evidencia sanitizada `ok:true`;
12. sincronizar body real del PR #5 después del PASS.

**Salida obligatoria:** candidata `9433944723` canónica + digest de autorización fresco + runtime todavía cerrado.

**No permitido:** browser, secrets, Firestore, runtime, writes, deploy, producción.

---

### MACRO-ITERACIÓN 2 — Autorización fresca + F2 FINAL

Requiere autorización explícita del usuario ligada al digest nuevo producido en la macro-iteración 1.

Secuencia:

1. persistir autorización exacta;
2. materializar un único request one-shot;
3. gate contractual obligatorio primero;
4. verificar artifact exacto `9433944723` y digest/source;
5. abrir únicamente capacidades read-only autorizadas;
6. ejecutar matriz funcional real F2 sobre Dirección desktop, Operativo tablet y Asesor móvil;
7. verificar rutas/superficies vigentes, incluida Pólizas;
8. verificar ausencia visible de `undefined`/`NaN`;
9. integridad before/after;
10. cero Firestore/auth/operational writes;
11. evidence artifact sanitizado;
12. terminal seal.

**Salida PASS:** `F2_TERMINAL_PASS`.

**Regla de no bucle:** si falla la misma etapa/código dos veces, `STOP_RETRY`. No crear otro request, no otro parche y no otro workflow paralelo hasta causa raíz demostrada.

---

### MACRO-ITERACIÓN 3 — GO-LIVE autorizado

Solo existe si macro-iteración 2 termina `F2_TERMINAL_PASS`.

Requiere autorización explícita y separada para producción. La autorización F2 nunca autoriza deploy.

Secuencia mínima:

1. cierre/readback de pre-go-live;
2. backup/snapshot aplicable;
3. verificar rollback exacto;
4. validar rama/commit/artifact exactos;
5. ejecutar deploy productivo únicamente sobre la candidata aceptada;
6. no merge/main salvo autorización expresa separada si fuera requerido por la arquitectura;
7. capturar evidencia de publicación.

**Salida:** Orbit 360 A&S publicado en producción.

---

### MACRO-ITERACIÓN 4 — Smoke productivo y cierre inmediato

No se considera cierre completo de go-live sin esta macro-iteración.

1. autenticación real;
2. navegación crítica;
3. roles/scopes Dirección, Operativo, Asesor;
4. Cliente 360;
5. Aseguradoras;
6. Pólizas y superficies integradas;
7. Ops y Leads si forman parte del paquete productivo aceptado;
8. validaciones de sincronización/read-only donde corresponda;
9. cero copy técnico en UI cliente;
10. before/after y cleanup de datos sintéticos si se usan;
11. evidencia sanitizada;
12. cierre o rollback según resultado.

---

## 5. Presupuesto de iteraciones

Definición: una macro-iteración solo cuenta si deja commit verificable, evidencia PASS/FAIL, transición de package/ledger, consumo de gate/autorización o cierre de milestone. Una respuesta de diagnóstico sin avance material NO cuenta.

### Ruta limpia desde este documento

- **3 macro-iteraciones para estar publicado en producción**: promoción → F2 final → go-live.
- **4 macro-iteraciones para quedar publicado y cerrado con smoke productivo**.

No prometer producción si F2 detecta otro `FUNCTIONAL_DEFECT`, `SECURITY_FAILURE` o `DATA_CONTRACT_FAILURE` real. En ese caso se detiene go-live y se corrige la única causa raíz demostrada. Lo que queda prohibido es convertir esa falla en una sucesión indefinida de parches/retries.

### Techo metodológico

En ruta limpia, no superar 4 macro-iteraciones hasta cierre productivo.

Si aparece un fallo nuevo material, se permite **una sola macro-iteración adicional de causa raíz + fix + nueva candidata** antes de volver al gate correspondiente. Si el mismo stage/code vuelve a fallar por segunda vez: `STOP_RETRY` y auditoría del mecanismo, no un tercer intento.

---

## 6. Regla de continuidad obligatoria

Al reanudar en cualquier conversación:

1. leer este plan;
2. leer ledger/package/authority/boundary y HEAD vivo;
3. localizar la primera macro-iteración no cerrada;
4. continuar exactamente desde ella;
5. no reconstruir el roadmap;
6. no reabrir CP-00→CP-11 sin evidencia nueva;
7. no reutilizar `d1d79fdf...`;
8. no volver a ejecutar artifact `9395391426` como candidata vigente;
9. no adelantar deploy antes de `F2_TERMINAL_PASS`;
10. no afirmar producción sin evidencia de publicación + smoke.

---

## 7. Primera acción exacta al reanudar

`EXECUTE_F2_FUNCTIONAL_DEFECT_SUCCESSOR_PROMOTION_SOURCE_ONLY_FOR_ARTIFACT_9433944723`

Workflow preparado:
`.github/workflows/orbit360-f2-functional-defect-successor-promotion-sourceonly-v20260820.yml`

Owner preparado:
`tools/orbit360-f2-functional-defect-successor-promotion-v20260820.mjs`

Estado al congelar: workflow/owner creados; **request de promoción todavía no materializado**. No saltar directamente a autorización F2.

---

## 8. Estado de carriles

- **Carril A — frontend/UX/Academia:** congelado salvo el rootfix ya certificado de `core/crmkit.js`; no abrir mejoras laterales antes de go-live.
- **Carril B — backend/seguridad/gates:** activo únicamente para promoción → nueva boundary → F2 → go-live.
- **Carril C — datos reales/migración:** congelado; no reimportar ni mutar datos para resolver este cierre.

---

## 9. Resultado esperado

El plan no busca seguir diagnosticando indefinidamente. Busca una secuencia binaria y auditable:

`9433944723 PROMOTED` → `FRESH AUTH DIGEST` → `F2_TERMINAL_PASS` → `AUTHORIZED GO-LIVE` → `PRODUCTION SMOKE PASS`.

Cualquier desviación debe clasificarse antes de corregir y debe volver a esta secuencia, no crear una ruta paralela.
