# Orbit 360 A&S — cierre M5 5.0.36 runtime / 5.0.37 inventario estático

Fecha: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open  
Gate: `block5-release-candidate-visualization-v20260728`

## 1. Runtime 5.0.36

La autorización `user_autorizado_runtime_5_0_35_20260729` se consumió exactamente una vez.

Evidencia:
- run `30500309087`;
- job `90738308918`;
- artifact `8743229256`;
- digest `sha256:6e6e045c8c10e4873d1d6db669122323460d9c6f47c47ddf743078dde0ef9680`;
- resultado: STOP-LINE.

Seguridad preservada:
- snapshots before/after estables;
- Firestore writes `0`;
- operational writes `0`;
- network write candidates `0`;
- no Hosting, Functions, Rules, producción, main ni merge.

Avance funcional confirmado antes del stop:
- Dirección desktop PASS;
- Operativo tablet PASS;
- Asesor móvil PASS;
- menú Asesor PASS;
- Aseguradoras: 26 visibles al Asesor y sin edición/guardado;
- responsive title resolver PASS;
- cero copy técnico visible.

## 2. Causa raíz

Clasificación primaria: `FUNCTIONAL_DEFECT`.

5.0.34 había corregido `data/academia-plus.js`, pero el runtime 5.0.36 demostró que quedaba otro `insert('cursos')` sin versión. El inventario posterior identificó la fuente: `data/seed.js` declara los cursos base (`cur1...cur_master`) sin `_cv`.

La política `core/academia-static-content-write-policy-v20260729.js` actuó correctamente: un curso sin versión se considera `durable_operational` y el write guard lo bloquea antes de persistir. No se relajó la política.

La causa metodológica fue inventario incompleto de productores estáticos en 5.0.34. Se corrigió la invariante completa, no otro síntoma aislado.

## 3. Remediación 5.0.37

El primer bridge cargado después de `seed.js` y antes de `Orbit.store.init` (`data/academia-v1197-bridge.js`) normaliza únicamente `Orbit.SEED.cursos` sin versión a `_cv=1`.

Los cursos creados por usuario desde `modules/academia.js` permanecen sin marcador estático y por tanto siguen siendo durables.

El inventario cubre:
- seed base;
- Academia PLUS;
- v1197;
- v1199;
- v1200;
- v1201;
- v1202;
- v1203;
- rutas operativas de creación manual/IA;
- política fail-closed.

La candidata canónica incluye ahora tanto `data/seed.js` como `data/academia-v1197-bridge.js` para que esta dependencia no vuelva a quedar fuera de hash/paridad.

## 4. Gate estático 5.0.37

Intento 1:
- run `30501234478`;
- job `90741137000`;
- artifact `8743556226`;
- digest `sha256:0eebd460a09a28c2b38a12bc0fefa2767d3dcc41d02b0dad9ced639198194a82`;
- clasificación `PIPELINE_MECHANISM_FAILURE`;
- causa: el fixture ejecutó todo `seed.js` sin el contrato `Orbit.primas`, dependencia ajena al objetivo del fixture;
- producto congelado.

Diagnóstico aislado confirmó la excepción en `Orbit.primas.cuotasDe`.

Corrección del fixture: dejó de simular todo el seed y prueba la invariante exacta sobre un `Orbit.SEED.cursos` sintético mínimo.

Intento 2/final:
- run `30501531194`;
- job `90742043113`;
- artifact `8743660777`;
- digest `sha256:0d8ed0a9278c96440edae93b357b804f05479b06cf6d043a0c1c5ace569768ff`;
- preflight `9/9 PASS`;
- fixture `18/18 PASS`;
- cero capacidades operativas.

## 5. Nueva candidata

RC:
`097d4e85b37e3c26406e856d94fe156e1f40723b9dec40ba567334c573cc855a`

Contrato:
- críticos: `46`;
- públicos: `29`;
- LAB matched: `28/29`;
- mismatch: `data/academia-v1197-bridge.js`;
- Hosting requerido: sí;
- runtime listo: no, hasta 29/29.

## 6. Carriles

### A — frontend / UX / Academia
- multirol y responsive preservados;
- normalización de contenido estático corregida;
- revisión visual sigue bloqueada hasta runtime `ok:true`.

### B — backend / seguridad / store
- política fail-closed preservada con blob `fa4c29d30a82673a7bf2d3d55efce52eaf4cccf3`;
- cero writes;
- runtime authorization consumida;
- gate volvió a cero capacidades.

### C — datos / migración
- baseline 414/26/7 intacto;
- no reimportación;
- Pólizas siguen bloqueadas.

## 7. Claude / Academia

`REPLICABLE_CLAUDE_ACUMULADO`:
- inventariar todos los productores de una misma entidad antes de declarar causa raíz cerrada;
- contenido estático necesita versión explícita antes de entrar al store;
- no relajar fail-closed para acomodar seed incompleto;
- todo asset funcional y dependencia causal debe entrar en descriptor/hash/paridad;
- un fixture debe simular solo el contrato que prueba, no dependencias irrelevantes.

`ACADEMIA_ACTUALIZAR`:
- write guard bloqueado no equivale a write persistido;
- contenido estático versionado vs curso creado por usuario;
- `FUNCTIONAL_DEFECT` vs `PIPELINE_MECHANISM_FAILURE`;
- inventario completo de productores como parte del diagnóstico de causa raíz;
- autorización runtime consumida aunque el runtime termine FAIL.

## 8. Siguiente acción exacta

Solicitar una nueva autorización explícita one-shot de Hosting LAB para la RC `097d4e85...855a`.

La entrega deberá demostrar 29/29. Solo después podrá solicitarse una nueva autorización runtime. Producción, revisión visual y Pólizas continúan bloqueadas.
