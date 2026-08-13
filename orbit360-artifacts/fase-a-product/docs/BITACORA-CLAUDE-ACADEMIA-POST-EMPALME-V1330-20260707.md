# Bitácora Claude + Academia post-empalme v1330 — 2026-07-07

## Estado del PR

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
Head verificado antes de esta bitácora: 33634f411dd9b3d2e76da7dea735d16a73d1af5d
```

## Cambios/hotfixes que Claude debe conservar

### 1. Auth LAB restaurado

Archivo:

```txt
orbit360-platform/core/auth.js
```

Situación:

- El empalme v1330 reemplazó `core/auth.js` por una versión demo/local de prototipo.
- Se restauró desde baseline remoto previo para conservar Auth LAB / Firestore LAB.

Claude debe conservar:

- `?orbitBackend=firestore-lab`
- `loginFirebase`
- `fbAuth`
- `fbUser`
- `mapFbUser`
- validación de contraseña LAB
- `onAuthStateChanged`

No debe simplificar Auth a login demo/local ni sobrescribir `core/auth.js` sin revisión ChatGPT/Codex.

### 2. Importador estados-cuenta blindado

Archivo:

```txt
orbit360-platform/core/importa.js
```

Hotfix aplicado por Codex:

```txt
33634f4 fix(importa): blindar conciliacion estados cuenta
```

Regla preservada:

- `estados-cuenta` entra por `applyConciliacion()`.
- No aplica pagos directos.
- No marca cobros como `Pagado` desde importación.
- No asigna `fechaPago` desde estado de cuenta importado.
- Reporte de pago leído queda como pendiente/propuesta/requiere validación.
- No escribe `finmovs`.
- No crea clientes ni pólizas desde estados de cuenta.

Claude debe conservar esta lógica en cualquier nueva candidata de importador/UX.

### 3. Separación cobros / finmovs / conciliación

Regla viva que debe conservarse:

```txt
Cobros/recaudos NO son finmovs.
Estado de cuenta bancario NO escribe cobros ni cartera sin conciliación.
Estado de cuenta de aseguradora NO aplica pagos directos.
Planilla de comisión se lee desde filas reales y no simula tarifas.
```

Cualquier diseño de Claude debe mostrar estados honestos:

- Reportado por cliente
- En revisión
- Validada por aplicar
- Pendiente de conciliación
- Conciliado
- Requiere validación
- Bloqueado/rechazado

No usar etiquetas que parezcan productivas si no hay conexión o validación real.

## Pendientes Claude acumulados relevantes

### P1 — Proteger archivos backend-críticos ampliados

Además de protegidos formales, Claude debe tratar como backend-críticos:

```txt
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
orbit360-platform/core/queries.js
orbit360-platform/core/integraciones.js
orbit360-platform/core/integraciones-panel.js
orbit360-platform/core/comisiones-eng.js
```

No debe reemplazarlos sin diff y revisión.

### P1 — UX del importador

Claude puede mejorar visualmente el importador, pero debe preservar:

- banner de alcance por fuente;
- dry-run antes de guardar;
- reporte CSV de importación;
- trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo;
- botón Iterar/mejorar;
- distinción inteligente/documental;
- bloqueo explícito de creación fuera de alcance;
- mensajes honestos de validación.

### P1 — Cobros y conciliación

Claude puede mejorar diseño de Cobros, pero no debe convertir:

```txt
reportado por cliente = pagado
estado de cuenta = pago aplicado
conciliación propuesta = cobro aplicado
```

Debe conservar separación entre confirmar cobro manual autorizado y conciliar soporte/factura.

## Impacto en Academia

El hotfix no cambia rutas visuales de Academia, pero sí genera contenido obligatorio de capacitación porque cambia/precisa reglas operativas.

### Pendiente Academia A1 — Nueva cápsula/ruta de importación segura

Crear o actualizar una lección para roles Dirección/Admin/Operaciones:

```txt
Tema: Importación segura y conciliación
```

Debe explicar:

- fuentes separadas;
- qué crea cada fuente;
- qué queda bloqueado;
- diferencia entre estado de cuenta de aseguradora, estado bancario, cobros, recaudos y finmovs;
- por qué un pago reportado o leído no es pago aplicado;
- cuándo se genera propuesta de conciliación;
- cuándo se confirma manualmente un cobro;
- cuándo se considera conciliado.

### Pendiente Academia A2 — Evaluación práctica

Agregar quiz/caso práctico por rol:

1. Importar estado de cuenta de aseguradora con recibos pagados.
2. Ver que no se marcan como `Pagado` directo.
3. Revisar propuestas de conciliación.
4. Validar/rechazar propuesta.
5. Confirmar qué módulo impacta y cuál no.

Respuesta esperada:

```txt
No impacta finmovs.
No crea pólizas/clientes.
No aplica pagos sin validación.
```

### Pendiente Academia A3 — Certificación interna

Actualizar certificado/ruta para usuarios con permisos de importación:

- Importador operativo
- Conciliación de cobros
- Estados bancarios
- Planillas de comisión
- Documentos soporte

Certificado no debe aprobar si el usuario confunde pagos reportados con pagos aplicados.

## Estado de pendientes para Claude

Aún no hay paquete grande para Claude. Hay instrucciones críticas de conservación.

Enviar paquete Claude solo cuando se acumulen varios pendientes visuales/UX o cuando Claude vaya a generar nueva candidata. En ese paquete incluir este documento junto con:

```txt
AUDITORIA-POST-EMPALME-V1330-20260707.md
AUDITORIA-BLOQUE-IMPORTA-COBROS-POST-EMPALME-V1330-20260707.md
```

## Nota de continuidad

Antes de cualquier nueva candidata Claude:

1. Leer documento maestro y adendum de Academia.
2. Confirmar PR #5 y rama activa.
3. Auditar ZIP antes de empalmar.
4. No sobrescribir Auth LAB ni importador blindado.
5. Revisar impacto en Academia y documentarlo.
