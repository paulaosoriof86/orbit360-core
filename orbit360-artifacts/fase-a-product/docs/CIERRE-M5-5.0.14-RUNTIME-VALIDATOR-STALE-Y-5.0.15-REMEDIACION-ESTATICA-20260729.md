# Cierre M5 · 5.0.14 runtime consumido + 5.0.15 remediación estática

Fecha: 2026-07-29  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block5-release-candidate-visualization-v20260728`

## Corte ejecutivo

La autorización de usuario para **un único runtime smoke LAB** sobre la RC `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61` fue consumida exactamente una vez.

El runtime no demostró un defecto nuevo de producto. Llegó a bootstrap canónico, autenticación, aceptación legal y datos reales; se detuvo cuando el validador esperaba `Orbit.session.VERSION === 20260728.2`, mientras el owner vigente y previamente aceptado expone `20260729.3`.

Clasificación: **`VALIDATOR_STALE`**.

No hubo rerun. Se congeló producto, se cerró la autorización y se realizó una remediación exclusivamente estática 5.0.15.

## Fuente/base preservada

- RC: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`.
- Activos críticos: 42/42.
- Hosting LAB: 25/25, mismatches 0.
- Clientes fuente/canónicos: 414/414.
- Aseguradoras fuente/canónicas: 26/26.
- Asesores: 7.
- País: GT 398 / CO 16 / requiere validación 0.
- Tipo: Persona 391 / Empresa 23.
- Moneda faltante: 0.
- Target-only: 0/0.

## M5 5.0.14 · package previo

```text
Commit: 83a756a92ecb4b143ea37e9d917b676e7c1e12df
Run: 30463967369
Job: 90616924986
Artifact: 8728776931
Digest: sha256:b856998a41adc975ba2cc9dbe29713c909eeaa06de4b9f832925582937248850
Conclusion: SUCCESS
```

El package no resolvió secretos, no leyó Firestore, no abrió navegador y no ejecutó runtime.

## M5 5.0.14 · runtime único consumido

```text
Authorized base: fc0bb19d8916c1ba4e1e8a266ff344e8a8b5f94f
Request commit: 0702b42346054158b7268348d6a2c2d2ffdfdad0
Run: 30464282843
Job: 90617993590
Artifact: 8728921997
Digest: sha256:04beee344614f2a051b8f7e75a8ffcdd01714c7d58e0ca28a17da44361dc41ba
Contract: 39/39
Snapshots: 11/11 before + 11/11 after
All counts stable: true
All digests stable: true
Firestore writes: 0
Operational writes: 0
Network write candidates: 0
Hosting deploy: false
Functions/Rules: false/false
Production/main/merge: false/false/false
Pólizas: false
```

### Avance real observado antes del stop-line

- Preview LAB redirigió al runtime canónico.
- Política estática Academia estuvo disponible.
- Bootstrap canónico y contratos runtime estuvieron listos.
- Auth owner handoff estuvo listo.
- Autenticación fue exitosa.
- Acuerdo legal fue aceptado una sola vez.
- Se alcanzó `real_tenant_data`.

### Primer fallo

```text
ACCESS_OWNER_VERSION_MISMATCH:20260729.3
```

El validador 5.0.14 todavía exigía `20260728.2`. El owner de producto vigente declara `20260729.3`; por lo tanto el stop-line fue **`VALIDATOR_STALE`**, no `FUNCTIONAL_DEFECT` ni `DATA_CONTRACT_FAILURE`.

## Causa raíz y remediación 5.0.15

Se corrigió exclusivamente el predicado del gate:

```text
antes: state.sessionVersion === '20260728.2'
después: state.sessionVersion === '20260729.3'
```

No se modificó `orbit360-platform/core/access-role-session-owner-v20260728.js` ni otro activo funcional para satisfacer el gate.

### Verificación estática

```text
Run: 30465169158
Job: 90620977128
Artifact: 8729232905
Digest: sha256:e0405c810e176bec52f53f221c11efe1762b79954e5ac2051823d8352829bd69
Canonical preflight/engine: 17/17
Failed checks: 0
Owner vigente: 20260729.3
Predicado gate: 20260729.3
Predicado obsoleto 20260728.2: ausente
Producto owner desde runtime 5.0.14: sin cambios
RC local: misma ae6bb2a3…
Runtime/browser/Firestore/deploy en 5.0.15: no/no/no/no
```

El job tuvo conclusión técnica `failure` únicamente en el post-check `jq`, después de que el engine había pasado 17/17: se repitió el selector inseguro `.pólizas` para una propiedad JSON con Unicode.

## Control de causa raíz del mecanismo jq

Como el mismo mecanismo ya había aparecido en 5.0.13, se aplicó la regla de dos fallos:

1. no se hizo rerun;
2. no se tocó producto;
3. se diagnosticó la causa raíz del pipeline;
4. se creó `tools/orbit360-jq-selector-safety-contract-v20260729.json`;
5. el workflow 5.0.15 quedó congelado en `workflow_dispatch`;
6. el post-check fue corregido a selector seguro `.["pólizas"]`;
7. el próximo runtime deberá incorporar el control de selectores jq antes de ejecutar cualquier paso con secretos/runtime.

Clasificación del segundo incidente de post-check: `VALIDATOR_STALE` con causa raíz de mecanismo de pipeline ya controlada.

## Carriles

### Carril A · Frontend / prototipo / UX / Academia

- No se modificó producto visual durante 5.0.14/5.0.15.
- La revisión visual continúa bloqueada hasta un runtime completo `ok:true`.
- El próximo runtime deberá completar Dirección desktop, Operativo tablet y Asesor móvil antes de habilitar revisión humana.

### Carril B · Backend / seguridad / Auth / Orbit.store

- Firestore solo lectura fue utilizada en el runtime autorizado.
- Snapshots antes/después quedaron idénticos.
- Firestore writes: 0.
- Operational writes: 0.
- No Functions, Rules, producción ni políticas.
- El owner membership vigente no fue modificado.

### Carril C · Datos reales / migración A&S

- 414 clientes, 26 aseguradoras y 7 asesores permanecen estables.
- No reimportación.
- No escrituras de datos.
- Pólizas no fue abierto ni transformado.

## Claude

### `REPLICABLE_CLAUDE_ACUMULADO`

- Los gates deben validar la versión del owner realmente vigente y no conservar constantes obsoletas después de una remediación aceptada.
- Los validadores deben fallar cerrados, pero nunca inducir cambios de producto para satisfacer un predicado stale.
- Propiedades JSON con caracteres no ASCII usadas en `jq` deben accederse mediante selector entre corchetes/comillas.
- Después de dos fallos del mismo mecanismo se congela producto y se corrige el pipeline, no se encadenan reintentos.

### `BACKEND_PROTEGIDO_NO_CLAUDE`

No enviar a Claude: identidad Firebase, rutas Firestore, secretos, workflows operativos, artifacts, evidencia real A&S ni implementación backend protegida.

## Academia

### `ACADEMIA_ACTUALIZAR`

Incorporar:

- diferencia entre autenticación, membership/autorización y rol efectivo;
- diferencia entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`;
- cómo un gate obsoleto puede fallar aunque el producto tenga la versión correcta;
- por qué una autorización one-shot se considera consumida aunque el fallo sea de validador;
- regla de dos fallos y corrección de causa raíz del pipeline;
- selectores seguros para propiedades Unicode en validadores `jq`;
- snapshots/digests antes/después como evidencia de cero cambios.

## Estado

```text
M1–M4: CERRADOS
M5 5.0.13 Hosting: CERRADO / 25 de 25
M5 5.0.14 runtime: CERRADO EN STOP-LINE / autorización consumida
M5 5.0.15 remediación estática: CERRADA
RC: ae6bb2a3… sin cambios
ready for new runtime authorization: true
runtime currently authorized: false
visual review authorized: false
production authorized: false
Pólizas: bloqueado
```

## Siguiente acción exacta

Solicitar una **nueva autorización explícita e independiente para un único runtime smoke LAB** sobre la misma RC `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`.

La nueva ejecución deberá:

- usar owner normalizado;
- validar primero el contrato de selectores `jq`;
- realizar snapshots read-only antes/después;
- mantener cero escrituras;
- completar Dirección desktop, Operativo tablet y Asesor móvil;
- validar Cliente 360, Aseguradoras y menú móvil;
- no ejecutar Hosting, Functions, Rules, producción, main, merge ni Pólizas.

Solo con evidencia sanitizada `ok:true` se habilita la revisión visual única con Paula antes de cerrar M5.
