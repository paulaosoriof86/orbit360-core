# Orbit 360 A&S · cierre M5 5.0.39 runtime y 5.0.40 legacy seed marker

Fecha: 2026-07-30  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open

## Bloque y carriles
- A · frontend/UX/Academia: corrección del contrato de contenido estático legado.
- B · backend/seguridad/store: política fail-closed preservada; cero escrituras.
- C · datos/migración A&S: sin cambios ni reimportaciones.

## Runtime 5.0.39
Autorización one-shot consumida. Run `30504465098`, job `90751082824`, artifact `8744778362`, digest `sha256:d417f4b9db0c7dc664743525731198c55b2470abcb3d7336a00e25cc3f752e7f`.

Evidencia: preflight PASS, contrato operativo PASS, paridad pública 29/29 preservada, snapshots before/after estables, 62 llamadas de contenido estático reconocidas, 1 llamada `insert('cursos')` bloqueada, Firestore writes 0, operational writes 0, network write candidates 0. Dirección desktop, Operativo tablet, Asesor móvil, multirol, Aseguradoras y responsive habían avanzado antes del stop.

Clasificación primaria: `FUNCTIONAL_DEFECT`.

## Causa raíz
Los cursos históricos de `Orbit.SEED.cursos` conservan IDs como `cur1`, `cur2`, `cur3`, etc. La policy 20260729.2 exigía prefijo estático moderno `cur_`, `curso_base_` o `academia_`, además de versión y forma de contenido. El normalizador 5.0.37 añadía `_cv=1`, pero no declaraba procedencia estática explícita. El runtime se detenía en el primer ID legado bloqueado.

No se amplió el patrón a `cur*`, porque los cursos creados por usuario usan IDs de ese tipo y deben seguir siendo durables. Tampoco se renombraron IDs históricos, para preservar progreso, certificados y referencias.

## Fix 5.0.40
- Policy version `20260730.1`.
- `Orbit.SEED.cursos` recibe `_staticCourse:true` y `_cv` antes de `Orbit.store.init`.
- La policy acepta `_staticCourse:true` solo junto con marcador de versión y forma válida de curso.
- Cursos de usuario sin `_staticCourse` continúan `durable_operational`.
- `index.html` y fallback v1230 apuntan a la versión nueva de policy.
- Sin cambios a Store protegido, Firestore, Rules, Functions ni producción.

## Evidencia estática 5.0.40
Run `30505323377`, job `90753710960`, artifact `8745076533`, digest `sha256:df8d5744396624d47233840f09b0cde72fd27e38408426cd45aadb1f1f69de8e`.

Resultado: PASS en primer intento, cero capacidades operativas.

Nueva RC: `9bd2c847a2884be900283f86802dbbd0390ae5bc6ccc17b3a5cf4d389c78a4ee`.

Contrato: 46 críticos / 29 públicos. LAB actual: 25/29. Mismatches esperados y exclusivos:
1. `index.html`
2. `data/academia-v1230-operational-directory-v20260722.js`
3. `core/academia-static-content-write-policy-v20260729.js`
4. `data/academia-v1197-bridge.js`

## Estado
5.0.39 runtime: STOPPED, autorización consumida, rerun prohibido.  
5.0.40 estático: CLOSED/PASS.  
Hosting: no autorizado. Runtime: no autorizado. Visual: bloqueada. Producción: bloqueada. Pólizas: bloqueado según secuencia M5/M6.

## Claude / Academia
`REPLICABLE_CLAUDE_ACUMULADO`: contenido estático legado debe declarar procedencia explícita; no ampliar patrones de IDs de forma que absorban contenido creado por usuario.  
`ACADEMIA_ACTUALIZAR`: distinguir contenido estático versionado de cursos creados por usuario y explicar que write guard bloqueado no equivale a write persistido.

## Siguiente acción exacta
Solicitar una nueva autorización one-shot de Hosting LAB para la RC `9bd2c847...`. Exigir 29/29. Solo después solicitar un runtime independiente final; `ok:true` habilita la revisión visual única de M5.
