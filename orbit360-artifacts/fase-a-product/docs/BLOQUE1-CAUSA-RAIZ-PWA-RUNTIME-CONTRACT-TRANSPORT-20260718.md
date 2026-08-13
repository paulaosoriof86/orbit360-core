# Bloque 1 — causa raíz del transporte PWA de contratos runtime

Fecha: 2026-07-18  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block1-client360-insurers-lab-v20260717`  
Contrato objetivo: `1.0.16`  
Producción/main/merge: no autorizados

## 1. Evidencia de entrada

Run: `29647346324`  
Commit: `0ee8950042fe532d1f2ba7ddcd5b446ee02aaf96`  
Contrato: `1.0.15`

Confirmaciones:

- preflight: `GO_GATE_CONTRACT`;
- conteos LAB: 414 clientes, 26 aseguradoras y 7 asesores;
- proyección canónica: aprobada aproximadamente a los 199 segundos;
- errores de sintaxis: 0;
- excepciones del navegador: 0;
- Router owner-aware: activo;
- `tenant-insurer-config-p10.js`: solicitud iniciada;
- respuesta del script: no observada dentro del check;
- owner `Orbit.tenantInsurerConfigP10`: no registrado;
- primer error preservado correctamente: `page.waitForFunction: Timeout 12000ms exceeded`;
- `failureStage`: `canonical_tenant_insurer_core_ready`;
- watchdog global: no excedido;
- resultado: `ok:false`.

El contrato 1.0.15 corrigió la cadena del Router y la preservación del primer error. El nuevo fallo pertenece al transporte PWA.

## 2. Clasificación

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Owner: PWA — Service Worker, caché y registro.

No corresponde modificar:

- Cliente 360;
- Aseguradoras renderer;
- datos A&S;
- `Orbit.store`;
- Auth;
- Legal;
- proyección canónica;
- reglas Firestore.

## 3. Causa raíz

El Service Worker aplicaba red primero para todos los recursos del mismo origen:

```txt
fetch(request, { cache: 'no-store' })
→ fallback de caché únicamente en catch
```

No existía timeout. Si la solicitud permanecía pendiente, el fallback nunca se ejecutaba.

La validación directa del gate había demostrado que `tenant-insurer-config-p10.js` existía, respondía HTTP 200 y tenía sintaxis válida. Sin embargo, la solicitud del navegador a través del Service Worker quedó iniciada sin respuesta, error ni parseo dentro del check.

Adicionalmente, `pwa.js` registraba el Service Worker en `DOMContentLoaded`, mientras `Orbit.router.init()` se ejecutaba en el bloque inline final. Por tanto, los contratos dinámicos podían comenzar antes de que el worker actualizado instalara su caché.

## 4. Corrección

### Service Worker

`sw.js` ahora:

1. declara los contratos genéricos del runtime;
2. los precarga durante `install`;
3. usa una clave canónica sin depender del query de versión;
4. responde desde caché de inmediato cuando existe;
5. actualiza la caché en segundo plano;
6. limita la red a 8 segundos con `AbortController`;
7. conserva fallback offline;
8. mantiene `CACHE` y `BUILD` en `20260717-2` para no romper la paridad vigente.

Contratos precargados:

- `session-multirol-visibility-v20260716.js`;
- `client-canonical-view-projection-v20260716.js`;
- `tenant-insurer-config-p10.js`;
- `tenant-runtime-config-index.js`.

### Registro PWA

`pwa.js` ahora:

1. registra y actualiza el Service Worker al evaluarse el archivo;
2. no espera `DOMContentLoaded` para iniciar la actualización;
3. espera de forma acotada hasta 15 segundos la activación del worker nuevo;
4. expone `window.OrbitPwaWorkerReady` sin mostrar información técnica en UI;
5. conserva manifest, branding e instalación PWA sin cambios visibles.

## 5. Presupuestos preservados

Sin ampliaciones:

```txt
watchdog global: 900.000 ms
canonical_client_projection_ready: 450.000 ms
captura final: 5.000 ms
```

La corrección cambia el mecanismo de transporte; no relaja los checks.

## 6. Carriles

### Carril A — frontend/UX

Sin cambios visuales y sin sustitución de renderers.

### Carril B — PWA/pipeline

Avance:

- transporte de contratos acotado;
- precaché explícito;
- actualización temprana del worker;
- fallback alcanzable;
- primer error preservado.

### Carril C — datos A&S

Preservados:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- cero reimportación;
- cero inferencia de pólizas, vehículos, cartera o cobros.

## 7. Claude

Clasificación: `REPLICABLE_CLAUDE_INMEDIATO` para el patrón PWA genérico.

Patrones:

- red primero debe tener timeout;
- fallback de caché debe ser alcanzable;
- contratos críticos se precargan por build;
- query de versión no debe impedir recuperar la clave canónica;
- el worker debe registrarse antes del bootstrap que depende de él;
- transport success, parse success y owner readiness siguen siendo estados separados.

No se comparte:

- URL LAB;
- Firebase;
- credenciales;
- datos A&S;
- artefactos sanitizados internos.

## 8. Academia

Caso aplicado:

> El archivo existe y pasa sintaxis, pero el navegador inicia la solicitud mediante Service Worker y nunca recibe respuesta. ¿Se aumenta el timeout del owner?

Respuesta:

1. identificar el owner PWA;
2. comprobar si la red tiene límite;
3. comprobar si el caché puede responder antes de la red;
4. verificar cuándo se registra/activa el worker;
5. corregir transporte y orden de bootstrap;
6. no tocar datos, renderer ni owner funcional del contrato.

## 9. Siguiente acción exacta

```txt
1. Registrar contrato 1.0.16.
2. Ejecutar preflight vinculante.
3. Ejecutar el mismo gate una sola vez.
4. Aceptar únicamente resultado sanitizado ok:true.
```

Si vuelve a fallar:

```txt
NO REINTENTAR
LEER failureStage, error, contractResponses y routerRuntimeContracts
CLASIFICAR LA CAUSA EXACTA
NO MODIFICAR OTRO PRESUPUESTO SIN EVIDENCIA
```

Solo después de `ok:true` corresponde la revisión visual única y el cierre de M1.
