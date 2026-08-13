# Hallazgo y fix — validadores ESM y puerto 5000 — CRM OP-1

Fecha: 2026-07-12  
Módulos: CRM OP-1, Cotizador/Comparativo, pipeline local  
Carril: B — validación técnica y seguridad del pipeline

## Hallazgo 1 — `.mjs` usando `require()`

### Necesidad

Los validadores deben ejecutarse con Node 20 antes del smoke visual y bloquear cambios inválidos.

### Esperado

Un archivo con extensión `.mjs` debe usar sintaxis ESM real:

```js
import fs from 'node:fs';
import path from 'node:path';
```

### Encontrado

Los archivos:

```txt
tools/orbit360-validar-crm-op1.mjs
tools/orbit360-validar-cierre-cotizador-comparativo-v1215.mjs
```

usaban:

```js
const fs = require('fs');
```

### Causa raíz

Los validadores se redactaron con estructura CommonJS, pero se guardaron con extensión `.mjs`. GitHub todavía no mostraba una ejecución observable del workflow, por lo que el error no había sido expuesto por CI.

### Impacto

Node podía detener el flujo antes de ejecutar cualquier validación con un error equivalente a:

```txt
ReferenceError: require is not defined in ES module scope
```

Eso habría producido un bloqueo falso y reproceso durante la validación visual.

### Fix

Se convirtieron ambos archivos a ESM real:

```js
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
```

No cambió la lógica de negocio ni los hashes protegidos.

### Estado

```txt
Corregido
Pendiente de ejecución local/CI observable
```

## Hallazgo 2 — listeners duplicados en localhost:5000

### Necesidad

La validación visual debe utilizar el puerto habitual `localhost:5000` sin cerrar procesos ajenos ni fallar por un servidor Orbit previo.

### Riesgo inicial

`Get-NetTCPConnection` puede devolver más de un listener asociado al mismo proceso. Detener el mismo PID dos veces podía generar un falso bloqueo en la segunda iteración.

### Fix

El ejecutor:

```txt
tools/orbit360-run-crm-op1-visual.ps1
```

ahora:

1. obtiene listeners del puerto 5000;
2. deduplica `OwningProcess`;
3. inspecciona nombre y línea de comando;
4. detiene únicamente servidores conocidos de Orbit/Firebase/dev;
5. bloquea sin cerrar nada si el puerto pertenece a otra aplicación.

### Impacto

- evita abrir rutas alternativas de validación;
- mantiene `localhost:5000`;
- reduce carga manual;
- no mata aplicaciones no relacionadas;
- deja trazabilidad en el reporte maestro.

### Estado

```txt
Corregido
Pendiente de ejecución local
```

## Pruebas de regresión obligatorias

- `node --check` sobre ambos validadores;
- ejecutar ambos validadores con Node 20;
- puerto 5000 libre: smoke inicia;
- puerto 5000 ocupado por servidor Orbit: cierre controlado y smoke inicia;
- puerto 5000 ocupado por aplicación ajena: bloqueo seguro sin detenerla;
- reporte registra proceso, PID y decisión;
- no deploy, commit o push automático.

## Aplicación reusable

Este patrón aplica a todos los validadores y smokes futuros de Orbit 360:

```txt
extensión .mjs → ESM real
puerto compartido → inspección + allowlist + deduplicación de PID
```

No aplica a Claude como lógica de UI. Sí debe registrarse en documentación de continuidad/pipeline para que los paquetes futuros incluyan validadores ejecutables y no solo manifiestos.
