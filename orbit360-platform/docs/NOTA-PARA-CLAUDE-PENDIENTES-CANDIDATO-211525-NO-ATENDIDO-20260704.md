# Nota para Claude — pendientes no atendidos del candidato 211525

**Fecha:** 2026-07-04  
**Candidato base vivo:** `Prototype Development Request - 2026-07-04T211525.464.zip`  
**Situación:** Claude perdió capacidad y no alcanzó a atender el último prompt de cierre.  
**Uso:** conservar estos pendientes acumulados hasta que Paula pida el próximo paquete Claude.

---

## 1. Decisión de continuidad

Se acepta `211525.464` como avance incremental real porque corrigió lo más crítico:

- Cobros: validar reporte ya no aplica pago.
- Cliente360: muestra `Validada (por aplicar)` y separa Validar de Aplicar pago.
- Importador/conciliación: `applyConciliacion()` ya no marca cobros como `Pagado` ni llama `postRecaudo`.
- Planilla de comisión: ya no usa fallback `cur || 'GTQ'` dentro de `planillaFlujo()`.
- Score visual de planilla usa etiquetas compatibles con backend: `MATCH_EXACTO`, `MATCH_PROBABLE`, `REQUIERE_VALIDACION`, `BLOQUEADO`.
- Academia conserva `CONTENT_V=5` y la lección de conciliación.

No se declara candidato final cerrado porque quedaron pendientes documentales, copy residual y conexión real con bandeja `conciliaciones`.

---

## 2. Pendientes que Claude NO alcanzó a atender

### P0-DOC — Documentación global realmente alineada

Actualizar en la próxima candidata:

```txt
README.md
CHANGELOG.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
docs/BITACORA-CAMBIOS.md
```

Debe quedar claro:

```txt
Candidata actual auditada: 2026-07-04T211525.464
Base comparada: 2026-07-04T205210.456
Academia: CONTENT_V=5
P0 cerrado: Pólizas gastosFinan; Cobros validar≠aplicar; Cliente360 validado por aplicar; Importador no aplica pagos directo; planilla sin fallback GTQ
Pendiente honesto: bandeja/persistencia real conciliaciones backend; producto-por-ramo en Academia; smoke visual real posterior
```

Corregir cualquier encabezado viejo que todavía diga:

```txt
193658.630
CONTENT_V=3
v1.126 como candidata activa
```

### P0-COPY-IMPORTADOR — Estados de cuenta

En `core/importa.js`, cambiar el texto de `KINDS['estados-cuenta'].desc`.

Texto problemático:

```txt
permite aplicar pagos por póliza
```

Texto esperado:

```txt
propone pagos para validación por póliza
```

Regla: no debe sonar a aplicación directa.

### P0-COPY-PLANILLA — Planilla de comisión

En `planillaFlujo()`, cambiar:

```txt
Pendiente de aplicar
```

por:

```txt
Propuesta pendiente
```

o:

```txt
Pendiente de validación
```

Regla: planilla/importador muestran propuestas, no pagos aplicados.

### P0-DOC-CONCILIACION — Limitación de `conciliacionPropuesta`

Documentar explícitamente:

```txt
En este prototipo, la conciliación se refleja como conciliacionPropuesta en el cobro para visualización; la persistencia real en colección/bandeja conciliaciones queda para backend ChatGPT/Codex.
```

Claude NO debe implementar backend real ni Firestore; solo dejar UI/prototipo coherente y documentación honesta.

### ACADEMIA-PROFUNDA — producto por ramo

Academia ya cubre conciliación, pero sigue pendiente profundizar por ramo/producto:

```txt
Vida
Gastos médicos
Hogar
Fianzas
Responsabilidad Civil
Transporte/Carga
```

Esto no debe bloquear backend crítico. Debe quedar como pendiente acumulado para el próximo paquete Claude si no cabe en la próxima iteración.

---

## 3. Restricciones para la próxima candidata Claude

No tocar ni reemplazar backend protegido:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-* backend/preflight/manifest/score/dryrun/conciliaciones/pipeline/diff
```

No reescribir módulos ya corregidos. El siguiente cierre debe ser documental + copy residual, no reconstrucción.

---

## 4. Regla para ChatGPT/Codex

Hasta que Paula pida nuevo paquete Claude, mantener estos pendientes vivos en documentación y continuar backend sobre la base auditada `211525.464`, preservando el backend LAB y las herramientas de importador/conciliación ya agregadas.