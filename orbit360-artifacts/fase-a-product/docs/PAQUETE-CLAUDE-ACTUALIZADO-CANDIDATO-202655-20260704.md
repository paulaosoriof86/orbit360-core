# Paquete Claude actualizado — candidato Orbit 360 A&S 2026-07-04T202655.833

**Fecha:** 2026-07-04  
**Candidato auditado:** `Prototype Development Request - 2026-07-04T202655.833.zip`  
**Base comparada:** `Prototype Development Request - 2026-07-04T193658.630.zip`  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy.

---

## 1. Instrucción principal para Claude

Continuar sobre:

```txt
Prototype Development Request - 2026-07-04T202655.833.zip
```

No reiniciar, no volver a una versión anterior, no tocar backend protegido y no incluir datos reales.

Este ZIP sí es Orbit 360: raíz `orbit360-platform/`.

Leer antes de modificar:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260704-202655.md
```

---

## 2. Conservar

### Academia

Conservar:

- `CONTENT_V=4`.
- Las 13 lecciones “Paso a paso”.
- Las 8 nuevas lecciones de v1.127: Insights, Técnico avanzado, Siniestros, Venta consultiva, Liderazgo, Cumplimiento, Servicio/CX y Digital/IA.

### Módulos

Conservar:

- moneda corregida en Leads/Renovaciones/Siniestros/Portal;
- filtro de estados de Pólizas;
- drawer `Desglose` de Pólizas;
- `renovacionesProximas()` limitado a `Vigente` o `Por renovar`;
- badges visuales en Cobros;
- columnas periodo/retención/ajuste en Comisiones;
- badge visual de score en Comisiones.

---

## 3. Corregir ahora

### P0-DOC — Documentación desalineada

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
Candidata activa auditada: 2026-07-04T202655.833
Base anterior comparada: 2026-07-04T193658.630
v1.127 Academia CONTENT_V=4 + paso a paso extendido
v1.128 Pólizas desglose
v1.129 Estados históricos
v1.130 Cobros estados de validación
v1.131 Score visual de conciliación en Comisiones
v1.132 Textos técnicos por rol — verificación pendiente por smoke
v1.133 Planillas comisión columnas periodo/retención/ajuste
```

No escribir “todos los P0 cerrados” si no se corrigen los puntos siguientes.

### P0-03-FIX — Pólizas: gastos financieros

En `modules/polizas.js`, cambiar en `verDesglose()`:

```js
p.gastosFinancieros
```

por:

```js
p.gastosFinan
```

El modelo canónico usa `gastosFinan`.

### P0-05-FIX — Reportado no es aplicado

Separar flujo:

```txt
Reportado por cliente -> En revisión -> Validado/Rechazado -> Aplicado/Conciliado
```

Ahora el botón “Validar” llama `aplicarPago()` y puede pasar el recibo a `Pagado`. Se requiere:

1. crear acción separada `validarReporte()`;
2. no convertir reportado en pagado sin confirmación;
3. reflejar el mismo modelo en Cliente360;
4. Portal debe seguir mostrando reportado/en validación;
5. dejar listo para integrarse con la bandeja `conciliaciones`.

### P0-06-FIX — Score de conciliación conectado a backend futuro

El score en Comisiones es visual/heurístico. Preparar UI para leer desde:

```txt
dryRunReport -> propuestas conciliaciones
```

Mostrar estados en:

```txt
Importar
Cobros
Comisiones
Bandeja conciliaciones
```

Estados:

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

Nunca aplicar automáticamente.

### P0-07-FIX — Planillas de comisión con flujo completo

Agregar trazabilidad visible:

```txt
archivo
hoja
fila/bloque
periodo
comisión esperada
comisión pagada
retención
ajuste
diferencia
score
acción propuesta
estado de validación
impacto pendiente/no aplicado
```

No mostrar como aplicado si solo es propuesta.

### P0-02-REV — Moneda residual

Auditar y corregir/justificar los usos restantes de fallback GTQ en:

```txt
core/crmkit.js
core/importa.js
modules/cancelaciones.js
modules/cliente360.js
modules/configuracion.js
modules/finanzas.js
modules/ia.js
modules/insights.js
modules/notificaciones.js
modules/siniestros.js
```

### ACADEMIA-FIX — Conciliación y productos

Agregar lección/evaluación aplicada:

```txt
Importar fuente -> dry-run -> score -> propuesta conciliaciones -> validación -> aplicación controlada
```

Profundizar paso a paso por producto/ramo:

```txt
Vida
Gastos médicos
Hogar
Fianzas
Responsabilidad Civil
Transporte/Carga
```

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
tools/orbit360-* backend/preflight/manifest/score/dryrun/conciliaciones/pipeline/diff
```

Claude solo debe reflejar visualmente los estados backend ya documentados por ChatGPT/Codex.

---

## 5. Criterio de entrega siguiente

Claude debe entregar:

- ZIP completo de `orbit360-platform/`.
- Inventario de archivos modificados.
- Resumen honesto de qué quedó cerrado y qué queda pendiente.
- Smoke visual por Academia, Pólizas, Cobros, Cliente360, Portal, Comisiones, Importar y roles.
- Documentación alineada.
- Confirmación de no backend protegido y no datos reales.

---

## 6. Regla para ChatGPT/Codex al recibir la próxima entrega

Comparar contra:

```txt
Prototype Development Request - 2026-07-04T202655.833.zip
```

Auditar otra vez: raíz/proyecto, inventario, JS, módulos/rutas, Academia, docs, moneda, Pólizas, Cobros/Cliente360/Portal, Comisiones/planillas, score/propuestas conciliación y backend protegido.