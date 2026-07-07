# Prompt Codex — Empalme real última candidata Orbit 360 A&S — 2026-07-07

## Objetivo

Hacer empalme físico real de la última candidata compatible sobre la rama activa, preservando backend protegido y sin convertir el trabajo en más documentación.

## Repo y rama

Repo: `paulaosoriof86/orbit360-core`  
Carpeta: `orbit360-platform/`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy.

## Base de empalme correcta

Usar como base de candidata más reciente:

```txt
Prototype Development Request - 2026-07-06T182633.902.zip
```

Verificación local de esta candidata:

```txt
archivos: 98
index: versión interna máxima v1330
incluye modules/conciliaciones.js: sí
incluye data/academia-plus.js: sí
```

No usar como base completa:

```txt
Prototype Development Request - 2026-07-05T062855.313.zip
Prototype Development Request (89).zip
```

Motivo: la primera es anterior a la fuente más reciente; la segunda usa versión interna v1217 y omite piezas vigentes como `modules/conciliaciones.js` y `data/academia-plus.js`.

## Prohibido sobrescribir

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
orbit360-platform/index.html completo del ZIP
```

## Empalme requerido

Copiar desde la candidata a la rama activa, de forma aditiva:

```txt
orbit360-platform/core/*.js
orbit360-platform/modules/*.js
orbit360-platform/styles/*.css
orbit360-platform/data/seed.js
orbit360-platform/data/academia-plus.js
orbit360-platform/docs relevantes del prototipo
```

Excepto los protegidos listados arriba.

Preservar archivos existentes no presentes o más nuevos en ZIP, especialmente:

```txt
modules/portal-v1142-copyfix.js
modules/conciliaciones.js si la versión viva está más nueva o ya empalmada
core/backend-lab-*.js
data/store-firestore-lab.local.js
docs backend vivos 20260707
tools backend vivos
```

## Correcciones obligatorias antes de commit

Buscar y neutralizar en archivos fuente UI:

```txt
Todo cuadra — nada por crear.
Todo cuadra con las tarifas vigentes — sin desviaciones.
pago aplicado
cobro aplicado
backend productivo
Firestore activo
mock/demo/smoke visible al cliente
credenciales visibles
```

Corrección mínima obligatoria:

```txt
Todo cuadra — nada por crear. -> Sin diferencias detectadas.
Todo cuadra con las tarifas vigentes — sin desviaciones. -> Sin diferencias detectadas.
```

No eliminar menciones técnicas si están únicamente en docs internas.

## Index

No copiar `index.html` completo de la ZIP.

Usar el index vivo de la rama y solo ajustar carga de scripts si falta un módulo seguro. Debe conservar:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
modules/conciliaciones.js
```

## Validaciones obligatorias

Ejecutar:

```powershell
node --check orbit360-platform/core/*.js
node --check orbit360-platform/data/*.js
node --check orbit360-platform/modules/*.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Si existe runner local:

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-run-flujo-ays-lab-v99.ps1
```

## Reporte esperado

Entregar en el PR o en reporte:

```txt
Base usada:
Archivos copiados:
Archivos protegidos preservados:
Archivos fuente corregidos:
Index preservado: SI/NO
JS check: PASS/FAIL
Backend LAB contrato: PASS/FAIL
Runner local: PASS/FAIL/NO EJECUTADO
Smoke visual: PASS/FAIL/NO EJECUTADO
Pendientes:
Commit:
```

## Restricciones finales

No merge.
No deploy.
No producción.
No datos reales.
No secretos.
No paquetes descargables salvo solicitud de Paula.
