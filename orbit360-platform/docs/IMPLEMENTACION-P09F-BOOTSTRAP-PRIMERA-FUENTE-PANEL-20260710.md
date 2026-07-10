# Implementación P0.9f — bootstrap, primera fuente y panel Aseguradoras

Fecha: 2026-07-10  
Módulo: Aseguradoras  
Carriles: B + C, con impacto A  
Estado: `IMPLEMENTADO_EN_RAMA / INDEX_NO_APLICADO / FIRESTORE_LAB_NO_ESCRITO`

## 1. Necesidad

P0.9e dejó listos el runtime, snapshots profundos, gate LAB y bindings, pero la SPA todavía requería numerosas etiquetas de scripts en `index.html`. Esto aumentaba el riesgo de:

- orden incorrecto;
- etiquetas duplicadas;
- edición directa del index;
- regresiones de codificación;
- carga parcial de contratos;
- confundir runtime listo con provider conectado.

También faltaba una representación visible dentro de Aseguradoras y un orquestador específico para la primera fuente real metadata-only.

## 2. Solución

Se implementó un único entrypoint:

```text
core/aseguradoras-runtime-bootstrap-p09f.js
```

El index solo necesitará cargar:

```text
core/backend-lab-security-guard.js
core/aseguradoras-runtime-bootstrap-p09f.js
```

El bootstrap carga secuencialmente los contratos P0.4–P0.10, configuración A&S, registry, bridge, runtime, snapshots, gate, servicio, primera fuente y panel.

## 3. Restricciones del bootstrap

Solo inicia cuando:

```text
orbitBackend=firestore-lab
tenant=alianzas-soluciones
```

Fuera de ese contexto devuelve:

```text
FIRESTORE_LAB_REQUIRED
LAB_TENANT_NOT_ALLOWED
```

No modifica ni reemplaza:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- loader/init LAB;
- security guard;
- Auth;
- reglas Firestore.

No escribe `Orbit.store` y no habilita Cotizador o Comparativo.

## 4. Estado y reintento

Estados principales:

```text
idle
loading
ready
requires_runtime_preflight
load_failed
blocked_context
```

El método `retry()` permite reevaluar Auth, guard, snapshots y bridge sin volver a insertar scripts ya cargados.

Esto corrige el caso en que el navegador termina de inicializar Firebase/Auth después del primer intento.

## 5. Primera fuente A&S

Se registró:

```text
data/tenant-alianzas-soluciones-first-source-p09f.js
```

Plan:

```text
ays_aseguate_tarifario_first_source_v1
```

Fuente:

```text
Tasas AseGuate.xlsx
Aseguradora Guatemalteca
GT / GTQ
Vehículos
versión 2026-v1
```

El archivo no incluye una ruta real. La referencia deberá ser entregada por backend como `drive://`, `upload://` o `backend-ref://`.

No contiene tasas, PII, binarios ni secretos.

## 6. Orquestador de primera fuente

Se implementó:

```text
core/aseguradoras-first-source-orchestrator-p09f.js
```

Flujo:

```text
plan tenant
→ referencia backend
→ bootstrap
→ resolución de aseguradora
→ provider/inspector
→ manifiesto y propuesta
→ plan metadata-only
→ dry-run
→ confirmación administrativa
→ gate Firestore LAB
→ read model
```

Validaciones obligatorias:

- plan y tenant;
- actor;
- rol activo;
- tenant del actor;
- documento;
- referencia backend;
- motivo;
- confirmación del plan;
- confirmación de persistencia independiente.

`prepare()` nunca persiste. `run()` permanece dry-run salvo `confirmPersistence: true`.

## 7. Panel visible

Se implementó:

```text
modules/aseguradoras-knowledge-panel-p09f.js
```

El panel se monta aditivamente en `#/aseguradoras` y muestra:

- estado del runtime;
- provider/backend;
- preflight LAB;
- snapshots profundos;
- fuentes;
- manifiestos;
- propuestas;
- reglas;
- presentaciones;
- bindings;
- revisiones;
- primera fuente planificada.

El botón “Actualizar estado” usa `retry()` y no escribe datos.

El panel utiliza únicamente lecturas `Orbit.store.all`.

## 8. Integrador del index

Se simplificó:

```text
tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs
```

Ahora inserta solo security guard + bootstrap antes de `modules/aseguradoras.js`.

Continúa con:

- dry-run por defecto;
- rama obligatoria;
- UTF-8;
- detección de mojibake;
- duplicados;
- orden;
- backup;
- rollback;
- sin commit, push ni deploy.

## 9. Pruebas

```text
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
tools/orbit360-test-aseguradoras-first-source-p09f.mjs
tools/orbit360-test-aseguradoras-knowledge-panel-p09f.mjs
tools/orbit360-test-integrar-aseguradoras-knowledge-p09-index.mjs
```

Cubren:

- contexto LAB permitido/bloqueado;
- carga secuencial;
- deduplicación;
- provider `BACKEND_REQUIRED` honesto;
- retry;
- primera fuente dry-run;
- confirmación separada;
- referencia requerida;
- motivo y plan confirmados;
- read model;
- panel visible y filtrado tenant;
- cero escrituras del panel;
- index con solo dos etiquetas.

Workflow:

```text
.github/workflows/orbit360-aseguradoras-runtime-p09f-smoke.yml
```

## 10. Estado real

Implementado:

- bootstrap;
- primera fuente;
- orquestador;
- panel;
- integrador simplificado;
- smokes;
- workflow.

No ejecutado todavía:

- `--apply` sobre el index;
- conexión real del provider;
- referencia Drive/upload;
- persistencia Firestore LAB;
- recarga real;
- bindings persistidos;
- segundo gate.

## 11. Próximo paso

P0.9g:

1. validar CI visible;
2. aplicar integrador en entorno LAB controlado;
3. abrir Aseguradoras y comprobar panel;
4. confirmar Auth/guard/snapshots;
5. resolver referencia backend AseGuate;
6. ejecutar dry-run;
7. persistir metadata-only;
8. recargar y verificar read model;
9. preparar lote de once fuentes;
10. mantener segundo gate cerrado.
