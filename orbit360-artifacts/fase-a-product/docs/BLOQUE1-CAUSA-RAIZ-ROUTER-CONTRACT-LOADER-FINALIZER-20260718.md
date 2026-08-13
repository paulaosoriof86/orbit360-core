# Bloque 1 — causa raíz del cargador secuencial Router y preservación del primer error

Fecha: 2026-07-18  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block1-client360-insurers-lab-v20260717`  
Contrato objetivo: `1.0.15`  
Producción/main/merge: no autorizados

## 1. Evidencia de entrada

Run analizado: `29646474785`  
Commit: `b9a764661955773ac8efb9db550fa0a5b9d27d65`  
Contrato: `1.0.14`

Resultados confirmados:

- preflight vinculante: `GO_GATE_CONTRACT`;
- checks del preflight: 381/381 aprobados;
- publicación y verificación LAB: aprobadas;
- clientes: 414;
- aseguradoras: 26;
- asesores: 7;
- `canonical_client_projection_ready`: aprobado;
- señal `Orbit.clientProjection.get`: observada aproximadamente a los 265 segundos;
- errores de sintaxis del navegador: 0;
- excepciones del navegador: 0;
- etapa final reportada: `canonical_tenant_insurer_core_ready`;
- resultado sanitizado: `ok:false`;
- error final visible: `GATE_TIMEOUT:canonical_tenant_insurer_core_ready`.

La corrección del presupuesto de la proyección funcionó. No corresponde volver a modificar ese presupuesto.

## 2. Clasificación

Clasificación principal: `PIPELINE_MECHANISM_FAILURE`.

No es un defecto de:

- Cliente 360;
- datos A&S;
- `Orbit.store`;
- Auth;
- Legal;
- renderers;
- proyección canónica;
- sintaxis o MIME de scripts.

## 3. Causa raíz — Router

El Router cargaba sus contratos dinámicos de forma secuencial, pero la transición al siguiente contrato dependía únicamente de:

```txt
script.onload
script.onerror
```

La evidencia demostró que la proyección estaba registrada y disponible, pero el contrato siguiente —`tenant-insurer-config-p10.js`— no fue solicitado. Por tanto, el owner estaba listo sin que la cadena secuencial liberara `next()`.

Además, el loader anterior trataba la presencia de un marcador DOM como equivalente a owner listo:

```txt
script[marker] presente → avanzar
```

Ese criterio no es seguro. Un marcador solo demuestra que existe o existió una etiqueta de script; no demuestra que la API esperada esté registrada.

### Corrección

`core/router.js` ahora:

1. evalúa el predicado `ready()` de cada contrato;
2. observa `load` y `error`;
3. consulta el owner cada 100 ms;
4. no considera un marcador existente como éxito;
5. avanza cuando el owner real está listo;
6. conserva un límite de 15 s por contrato para evitar bloqueo infinito;
7. expone `Orbit.router.runtimeContractState` con estado sanitizable por contrato.

El Router sigue siendo el único owner de rutas, menú y bootstrap de contratos.

## 4. Causa raíz — finalizador del gate

El ejecutor capturaba el primer error en `catch`, pero después realizaba en `finally` una llamada `page.evaluate` sin límite. Si el canal CDP quedaba bloqueado, el watchdog global vencía y reemplazaba el error original por un `GATE_TIMEOUT` genérico.

### Corrección

El contrato `1.0.15`:

- guarda `failureStage` y `error` inmediatamente;
- persiste el JSON sanitizado desde `catch`;
- configura `OBSERVER_CAPTURE_TIMEOUT_MS=5000`;
- limita la captura final con `Promise.race`;
- captura también `Orbit.router.runtimeContractState`;
- registra `watchdogExceeded` y `watchdogStage`;
- solo escribe `GATE_TIMEOUT` cuando todavía no existe un error previo;
- mantiene `WATCHDOG_BUDGET_MS=900000`.

## 5. Archivos modificados

- `orbit360-platform/core/router.js`
- `tools/orbit360-gate-runtime-crm-v20260716.mjs`
- `tools/orbit360-gate-contract-registry-v20260717.json`
- este documento.

Archivos preservados:

- `orbit360-platform/data/store.js`;
- `orbit360-platform/data/store-firestore-lab.local.js`;
- `orbit360-platform/core/auth.js`;
- `orbit360-platform/core/legal.js`;
- `orbit360-platform/core/access-scope.js`;
- `orbit360-platform/core/client-canonical-view-projection-v20260716.js`;
- `orbit360-platform/modules/cliente360.js`;
- `orbit360-platform/modules/aseguradoras.js`;
- `firestore.rules`.

## 6. Carriles

### Carril A — frontend/prototipo/UX

Sin cambios visuales, sin sustitución de renderers y sin reimportación.

### Carril B — backend/seguridad/gates

Avance visible:

- loader secuencial basado en owner real;
- marcadores separados de readiness;
- estado por contrato disponible para evidencia;
- primer error preservado;
- finalizador acotado.

### Carril C — datos A&S

Preservados:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- cero carga o inferencia de pólizas, vehículos, cobros o cartera.

## 7. Claude

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Patrones reutilizables:

- un marcador DOM no equivale a owner disponible;
- un loader secuencial debe avanzar por contrato funcional, no solo por evento de red;
- cada contrato debe declarar `src`, marcador, predicado de readiness y estado;
- `load` exitoso sin API registrada no constituye cierre;
- los errores de pipeline deben preservar la primera causa y limitar el diagnóstico final;
- un timeout global nunca debe borrar un error local ya capturado.

No se entrega a Claude:

- credenciales;
- información Firebase/LAB;
- datos reales A&S;
- reglas o backend protegido;
- artefactos de ejecución.

## 8. Academia

Caso aplicado:

> El script de proyección ya está servido y el owner aparece, pero el Router nunca solicita el contrato siguiente. ¿Debe aumentarse otra vez el timeout?

Respuesta correcta:

1. comprobar que el owner anterior está realmente disponible;
2. verificar si el loader liberó el siguiente contrato;
3. diferenciar marcador, evento `load`, owner registrado y cadena avanzada;
4. clasificar como `PIPELINE_MECHANISM_FAILURE` cuando la transición secuencial depende de una señal insuficiente;
5. corregir el owner del pipeline, no datos ni renderers;
6. preservar siempre el primer error antes de ejecutar diagnósticos finales.

## 9. Estado y siguiente acción exacta

Estado: causa raíz implementada; evidencia pendiente.

Siguiente acción única:

```txt
1. Registrar contrato 1.0.15.
2. Ejecutar preflight vinculante.
3. Ejecutar el mismo gate una sola vez.
4. Aceptar exclusivamente resultado-sanitizado.json con ok:true.
```

Si vuelve a fallar:

```txt
NO REINTENTAR
LEER failureStage + error + routerRuntimeContracts
CLASIFICAR LA CAUSA EXACTA
NO AUMENTAR OTRO TIMEOUT SIN EVIDENCIA
```

Solo después de `ok:true` corresponde una revisión visual única con Paula. M2 y Pólizas permanecen bloqueados hasta cerrar M1.
