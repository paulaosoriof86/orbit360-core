# Runbook — auditoría candidata Claude v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Dejar listo el procedimiento para recibir la candidata que Claude entregue a partir del paquete integral v1330.

## Flujo recomendado

### 1. Recepción

- Guardar ZIP/candidata con nombre versionado.
- No empalmar.
- No copiar encima del repo.
- Extraer en carpeta aislada.

### 2. Auditoría estática inicial

Usar, cuando corresponda localmente:

```powershell
node tools/orbit360-auditar-candidata-claude-v1330.mjs "RUTA_CANDIDATA_EXTRAIDA"
```

Este comando no modifica archivos. Solo escanea.

### 3. Revisión manual obligatoria

Aunque el auditor salga apto preliminar, revisar:

```txt
index.html
modules/portal.js
modules/cobros.js
modules/cliente360.js
modules/finanzas.js
modules/equipo.js
modules/configuracion.js
modules/academia.js
modules/documentos.js si existe
core/
styles/
data/seed.js
docs/
```

### 4. Comparación contra baseline

Separar:

- mejoras UX reales;
- documentación;
- cambios en módulos;
- cambios de rutas;
- cambios que requieren index;
- intentos de tocar protegidos;
- cambios que deben ser reescritos como patch aditivo.

### 5. Criterios de bloqueo inmediato

Bloquear si detecta:

```txt
backend protegido modificado
data/store.js reemplazado
store-firestore-lab.local.js reemplazado
core/auth.js modificado
core/importa.js modificado
firestore.rules modificado
tools/orbit360-* modificado
index.html cambiado sin justificación
localStorage operativo
datos reales
secretos
base64
Storage real simulado
copy técnico visible
CXOrbia/T&A/mystery shopping
Academia omitida
```

### 6. Plan de empalme

Si candidata pasa auditoría:

1. Crear plan de empalme por archivo.
2. Identificar protegidos que se descartan.
3. Empalmar módulos aditivamente.
4. Validar JS.
5. Validar contrato backend LAB.
6. Preparar smoke visual.
7. Documentar cierre.

## Resultado esperado

Un reporte de auditoría con:

```txt
candidata auditada
archivos revisados
mejoras aceptables
riesgos
regresiones
pendientes Claude
pendientes ChatGPT/Codex
recomendación: aceptar / aceptar parcial / rechazar
```

## Estado

Runbook listo. No requiere acción de Paula hasta que Claude entregue candidata.