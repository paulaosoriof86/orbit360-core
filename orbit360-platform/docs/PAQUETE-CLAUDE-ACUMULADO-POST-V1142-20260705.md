# Paquete acumulado para Claude — post candidata v1.142

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama viva de ChatGPT/Codex:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Última candidata Claude auditada/aceptada:** `Prototype Development Request - 2026-07-05T140141.297.zip` / v1.142  
**Objetivo para Claude:** producir nueva candidata frontend/UX/prototipo priorizando pendientes críticos y preservando todo lo avanzado.

---

## 1. Leer primero

Claude debe trabajar bajo estas reglas:

1. Leer primero el documento maestro consolidado y el addendum de Academia profunda.
2. Trabajar sobre la última candidata auditada/aceptada, no sobre versiones viejas.
3. No sobrescribir backend protegido de ChatGPT/Codex.
4. No introducir datos reales, secretos, credenciales ni textos técnicos visibles al cliente.
5. No presentar como conectado/productivo nada que todavía está pendiente.
6. Mantener Orbit 360 como plataforma comercializable, white-label y multi-tenant.
7. A&S es primer tenant, pero no debe hardcodearse en lógica de producto.

---

## 2. Archivos que Claude NO debe tocar ni reemplazar

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

Si Claude entrega `index.html`, debe conservar los scripts backend LAB existentes y no reemplazar el index bruto sin revisión.

---

## 3. Cambios ya empalmados después de v1.142

ChatGPT/Codex empalmó de forma controlada:

```txt
orbit360-platform/core/integraciones-panel.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/modules/inicio.js
orbit360-platform/modules/portal-v1142-copyfix.js
orbit360-platform/index.html
```

Reglas preservadas:

- Integraciones: `Pendiente de conexión`, no “sin conexión real”.
- Conciliaciones: no aplica pagos, no modifica cobros, no toca cartera ni producción.
- Inicio: `Recaudo confirmado` y `cobros confirmados`, no “aplicado”.
- Portal: pago reportado queda `pendiente de revisión/conciliación`.
- `index.html`: cache-bust puntual y carga de hotfix Portal, preservando backend LAB.

---

## 4. Pendientes críticos para Claude — prioridad P0

### P0.1 — Consolidar copy honesto en Portal Cliente

Objetivo: que el Portal Cliente nunca muestre pago reportado como pago aplicado.

Debe verse:

```txt
Recibimos tu reporte · pendiente de revisión/conciliación
```

Debe evitarse:

```txt
Pago aplicado
Pagado
Cobro aplicado
Recaudo aplicado
```

El adjunto de pago reportado debe presentarse como soporte/evidencia, no como pago aplicado.

### P0.2 — Conciliaciones: estados honestos y sin aplicación directa

Conciliaciones debe mostrar propuestas/listas para revisión técnica. `VALIDADA` no significa pagada. No debe existir CTA visible que prometa aplicar pago, modificar cobro, actualizar cartera, producción, comisiones ni `finmovs`.

Copy recomendado:

```txt
Lista para revisión técnica
Pendiente de validación
Validada para proceso posterior autorizado
No aplica pagos ni modifica cobros desde esta bandeja
```

### P0.3 — Inicio / Dirección

Preservar:

```txt
Recaudo confirmado
Cobros confirmados
```

No usar:

```txt
Recaudo aplicado
Cobros aplicados
```

Producción, metas y comisiones deben explicarse sobre prima neta recaudada. No sumar GTQ y COP en crudo.

### P0.4 — Integraciones

Todas las integraciones no conectadas deben decir:

```txt
Pendiente de conexión
Pendiente de configuración
```

No mostrar conexión real si no existe. No mostrar secretos, credenciales, Firebase, Firestore, backend, LAB, mock o localStorage en UI cliente.

### P0.5 — Academia profunda por rol

Actualizar Academia/manuales para reflejar los cambios recientes:

- Cliente: reportar pago no significa pago aplicado.
- Asesor: documentos soporte solo proponen datos.
- Cobros/Finanzas: conciliación validada no aplica pago por sí sola.
- Dirección/Admin: producción sobre prima neta recaudada, integraciones honestas y moneda por país.
- Documentos/adjuntos: soporte, propuesta, diferencia revisable y confirmación.
- `auditLog`: explicar como trazabilidad de transición, no como acción productiva.

La Academia debe ser interactiva, profunda, por rol, con rutas, lecciones, evaluaciones útiles, progreso y certificados.

---

## 5. Mejoras backend/documentales que Claude debe respetar, pero NO implementar

ChatGPT/Codex agregó contratos/tooling para:

```txt
Modelo documentos + adjuntos + Storage futuro
Revisión visual/operativa por roles
Runner local de validaciones acumuladas
Readiness backend conciliaciones/auditLog
Plan/preflight implementación LAB controlada
```

Claude debe respetar estas reglas en UX, textos, Academia y documentación frontend, pero no debe implementar backend, Firestore, Storage, Auth real ni `auditLog` real.

Reglas principales:

- Documentos y adjuntos solo proponen datos.
- No guardar archivos reales ni binarios.
- Adjuntos de pago reportado quedan pendientes de revisión.
- Escritura futura requiere diferencia revisable, confirmación, trazabilidad y auditoría.
- Cobros no aplica pagos desde conciliaciones.
- `VALIDADA` no significa pagada.
- `APLICADA` queda bloqueada hasta fase posterior autorizada.

---

## 6. Limpieza de UI obligatoria

No deben aparecer en UI cliente/operativa:

```txt
backend
Firebase
Firestore
LAB
mock
demo técnico
localStorage
credenciales
secreto
token
API key
smoke
```

En documentación técnica interna pueden aparecer si es necesario; en UI cliente no.

---

## 7. Revisión por roles que debe pasar la nueva candidata

### Cliente / Portal

- Portal abre sin bloqueo.
- Pago reportado queda pendiente de revisión/conciliación.
- Adjunto se ve como soporte.
- No se muestra pago aplicado por reportar.
- No se expone texto técnico.

### Asesor

- Cliente360, Pólizas y Cobros se entienden sin mezclar fuentes.
- Documentos soporte se ven como propuestas/evidencia.
- No se crean clientes/pólizas/cobros desde documentos sin diff y confirmación.

### Cobros / Finanzas

- Conciliaciones no aplica pagos.
- Banco solo propone conciliación.
- Pago reportado no se convierte automáticamente en cobro confirmado.
- Cobros/recaudos no se presentan como `finmovs`.

### Dirección / Admin

- Integraciones pendientes se muestran como pendientes.
- Producción honesta sobre prima neta recaudada.
- Moneda por país.
- No copy técnico visible.

---

## 8. Entregables esperados de Claude

Claude debe entregar una nueva candidata/ZIP con:

1. Cambios frontend/UX aplicados.
2. Documentación de cambios en `docs/BITACORA-CAMBIOS.md` o nota equivalente.
3. Lista de archivos tocados.
4. Confirmación de que no tocó backend protegido.
5. Confirmación de sintaxis JS sin errores.
6. Notas de impacto en Academia/manuales.
7. Pendientes que no alcanzó a resolver.

Si tiene poca capacidad, priorizar P0.1 a P0.5 antes que mejoras cosméticas.

---

## 9. Lo que ChatGPT/Codex auditará al recibir la candidata

ChatGPT/Codex auditará:

- que no se reemplazó backend protegido;
- que `index.html` conserva loader/init/store/storeLAB/guard;
- que no hay copy de pago aplicado indebido;
- que Portal, Inicio, Conciliaciones e Integraciones conservan estados honestos;
- que Academia refleja cambios por rol;
- que no hay textos técnicos visibles;
- que JS no tiene errores;
- que no se simulan integraciones reales;
- que no se mezclan monedas;
- que no se hardcodea A&S ni datos reales.

---

## 10. Instrucción final para Claude

Trabaja únicamente frontend/UX/prototipo/documentación frontend/Academia. No implementes backend. No inventes conexión real. No cambies archivos protegidos. Mantén todo comercializable, multi-tenant y white-label. Prioriza claridad operativa, estados honestos y experiencia por rol.