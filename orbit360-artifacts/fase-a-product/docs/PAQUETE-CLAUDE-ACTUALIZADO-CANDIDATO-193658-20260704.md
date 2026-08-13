# Paquete Claude actualizado — candidato 2026-07-04T193658.630

**Fecha:** 2026-07-04  
**Candidato nuevo auditado:** `Prototype Development Request - 2026-07-04T193658.630.zip`  
**Base anterior:** `Prototype Development Request - 2026-07-04T152321.882.zip`  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Uso:** entregar a Claude para corrección incremental mientras mantiene capacidad.

---

## 1. Instrucción principal

Claude debe continuar sobre `Prototype Development Request - 2026-07-04T193658.630.zip`.

No reiniciar, no volver a una versión anterior, no tocar backend protegido y no incluir datos reales.

Leer antes de modificar:

- `DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md`.
- `ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md`.
- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260704-193658.md`.
- `orbit360-platform/docs/CONTRATO-SCORE-CONFIANZA-CONCILIACION-AYS-20260704.md`.
- `orbit360-platform/docs/CONTRATO-POLIZAS-RECIBOS-CARTERA-CONCILIACION-AYS-20260704.md`.

---

## 2. Conservar del candidato nuevo

- Academia v1.125 con lecciones “Paso a paso”.
- `CONTENT_V = 3` y actualización de cursos preservando progreso/certificado.
- Cambios de moneda ya hechos en Inicio, Cliente360, Pólizas, Cobros, Cancelaciones, Comisiones, Finanzas, Insights, Equipo y Reportes.
- Cache-bust actualizado.
- Importador de candidata anterior con fuentes separadas, país/moneda sin default, planillas de comisión, documentos como parches pendientes y estado bancario como conciliación.
- Integraciones/marketing ya incorporados.

---

## 3. Corregir ahora

### P0-01 — Documentación/versionado

Actualizar:

```txt
CHANGELOG.md
README.md
docs/PENDIENTES-Y-MEJORAS.md
docs/REPORTE-SMOKE.md
docs/BITACORA-CAMBIOS.md
```

Debe quedar claro:

```txt
Candidata activa auditada: 2026-07-04T193658.630
Base anterior comparada: 2026-07-04T152321.882
Frontend base: v1.117
Avances importador/documentos/comisiones: v1.118-v1.123
Moneda por país: v1.124
Academia paso a paso + CONTENT_V=3: v1.125
```

### P0-02 — Completar moneda por país

No marcar P0-02 como cerrado total todavía.

Quedan displays/fallbacks `GTQ` en:

```txt
cancelaciones.js
cliente360.js
configuracion.js
finanzas.js
ia.js
insights.js
leads.js
notificaciones.js
portal.js
renovaciones.js
siniestros.js
```

Revisar especialmente:

- Leads: prima estimada y pronóstico ponderado.
- Renovaciones: prima en juego.
- Siniestros: indemnización pagada.
- Portal: monto reclamado.
- Configuración: metaPrima.
- Finanzas: lotes de pago con `cur: 'GTQ'`.
- Cliente360: fallbacks y creación manual diferenciada de importación real.

Validar GT, CO y TODOS. En vista global mixta, si se normaliza a moneda declarada debe mostrarse; si no, separar por país.

### P0-03 — Pólizas

Agregar vista/detalle con:

```txt
prima neta
gastos
IVA/impuestos
prima total
recibos generados
fuente de importación
estado de validación
```

### P0-04 — Estados históricos

Incluir correctamente:

```txt
Vigente
Por renovar
Cancelada
Vencida
Anulada
Rechazada
```

Solo Vigente/Por renovar generan cartera.

### P0-05 — Estados Portal/Cliente360/Cobros

Distinguir:

```txt
Pendiente
Vencido
Reportado por cliente
En revisión
Pagado
Conciliado
Requiere validación
Bloqueado
Anulado
```

No decir “pago aplicado” si solo fue reportado.

### P0-06 — Score conciliación

Reflejar en UI el contrato backend:

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

No aplicar pagos automáticamente.

### P0-07 — Planillas de comisión

Mostrar:

```txt
comisión esperada
comisión pagada
diferencia
retención
ajuste
periodo
aseguradora
asesor
póliza/recibo asociado
score/estado de conciliación
```

### P0-08 — Academia

Conservar v1.125 y completar “Paso a paso” en cursos restantes. Agregar lección aplicada sobre conciliación/score.

---

## 4. Backend protegido

No tocar ni reemplazar:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-* backend/preflight/manifest/score/pipeline/diff
```

El ZIP trae `data/store.js` de prototipo. No debe pisar el de la rama backend.

---

## 5. Criterio de entrega siguiente

Claude debe entregar:

- ZIP completo de `orbit360-platform/`.
- Inventario de archivos modificados.
- Resumen de mejoras cerradas.
- Pendientes actualizados.
- Bitácora/CHANGELOG/README/smoke alineados.
- Smoke visual por rutas críticas.
- Confirmación de GT/CO/TODOS.
- Confirmación de no datos reales.
- Confirmación de no backend protegido.

---

## 6. Regla para ChatGPT/Codex al recibir la próxima entrega

Comparar contra `Prototype Development Request - 2026-07-04T193658.630.zip`, no contra versiones anteriores. Auditar archivos reales, validar JS, revisar moneda, documentación, importador, Portal, Cliente360, Pólizas, Cobros, Comisiones, Finanzas, Academia y backend protegido.
