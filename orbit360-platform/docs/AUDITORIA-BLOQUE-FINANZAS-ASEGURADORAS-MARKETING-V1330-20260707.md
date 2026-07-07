# Auditoría bloque Finanzas/Aseguradoras/Marketing post-empalme v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
```

## Archivos revisados

```txt
orbit360-platform/modules/finanzas.js
orbit360-platform/modules/aseguradoras.js
orbit360-platform/modules/marketing.js
```

## Resultado ejecutivo

Se detectaron hallazgos importantes nuevos:

```txt
P0/P1 Seguridad: Aseguradoras persiste usuario/contraseña de portales en frontend.
P1 Visual/operativo: Conciliación bancaria muestra KPIs hardcodeados.
P2 Precisión: función producciónNeta usa prima total/compat en vez de primaNeta.
```

Con esto ya hay varios pendientes importantes para Claude/Codex acumulados junto con el P1 de Renovaciones.

---

## Finanzas — validaciones positivas

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

### Movimientos y estados financieros

- `finmovs` se maneja como movimientos reales/históricos de caja/banco.
- Los botones de importación separan `movimientos-finanzas` y `estados-banco`.
- `periodoEstado()` usa cierre relativo/configuración tenant, no fecha fija quemada.
- `crearMes()` crea partidas presupuestadas, no movimientos ejecutados.

### Facturación de comisiones

Validación positiva:

- Emitir factura de comisión genera una `factura` en estado `por_cobrar`.
- No crea `finmovs` al emitir factura.
- El ingreso real nace solo cuando se registra el cobro de la factura con respaldo bancario.
- El flujo documenta que factura emitida es CxC, no caja.

Regla preservada:

```txt
Factura emitida ≠ ingreso real.
Ingreso real en finmovs solo cuando hay cobro/conciliación.
```

### Financiación

Validación positiva:

- La financiación se rotula como ingreso no operativo.
- No debe inflar producción ni utilidad operativa.

---

## P1 — Conciliación bancaria con KPIs hardcodeados

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

Hallazgo en `banco()`:

```js
{ label: 'Depósitos sin asociar', val: 3, ... }
{ label: 'Movimientos sin crear', val: 1, ... }
```

Impacto:

- La UI muestra números fijos sin derivarlos de `conciliacionBanco`, `conciliaciones`, `finmovs` o importación real.
- Puede dar impresión de datos productivos cuando son placeholders.
- Contradice regla de no mostrar mock/demo/smoke o estados no conectados como reales.

Corrección recomendada:

- Calcular desde `Orbit.store('conciliacionBanco')` o `Orbit.store('conciliaciones')`.
- Si no hay fuente conectada, mostrar `0` o `Pendiente de conciliación` con texto honesto.
- No usar valores fijos.

Tipo:

```txt
P1 visual/operativo — hotfix pequeño Codex o Claude si toca UI Finanzas.
```

---

## P2 — producciónNeta usa `prima` en vez de `primaNeta`

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

Hallazgo:

```js
const vig = S().where('polizas', p => p.estado === 'Vigente' || p.estado === 'Por renovar')
  .reduce((s, p) => s + q.norm(p.prima, p.moneda), 0);
```

El comentario dice prima neta, pero usa `p.prima`, que en el importador se mantiene como prima total/compatibilidad visible.

Impacto:

- Si `produccionNeta()` se usa o se reusa en una vista futura, podría inflar producción al usar prima total.
- Actualmente otras funciones clave (`primaNetaMes`, metas, dashboard mensual) sí usan `primaNeta`.

Corrección recomendada:

```js
.reduce((s, p) => s + q.norm(p.primaNeta != null ? p.primaNeta : 0, p.moneda), 0)
```

Tipo:

```txt
P2 precisión / deuda técnica preventiva.
```

---

## Aseguradoras — hallazgo de seguridad

Archivo:

```txt
orbit360-platform/modules/aseguradoras.js
```

Hallazgo:

La ficha permite capturar portales con:

```txt
usuario
contraseña
```

y `snapshot()` / `Guardar cambios` persisten:

```js
portales: [{ nombre, url, usuario, pass }]
```

Impacto:

- En un entorno real, esto guardaría contraseñas en frontend/store.
- Va contra la regla de no subir secretos ni credenciales reales.
- Ya existe una lógica segura para integraciones (`credentialRef`, `backend_required`) que debería replicarse aquí.

Corrección recomendada:

- No persistir `pass` en frontend.
- Guardar solo:

```js
usuarioRef: 'capturado_no_sensible'
credentialRef: 'backend_required'
```

- Mostrar campo como “Enviar/guardar en bóveda backend” o “Pendiente de bóveda segura”.
- Para prototipo, permitir placeholder visual sin almacenar el valor real.

Tipo:

```txt
P0/P1 seguridad — debe corregirse antes de producción, datos reales o demo con credenciales.
```

Pendiente Claude:

- Si Claude toca Aseguradoras, debe rediseñar UX de accesos para no guardar contraseñas reales.
- Mostrar estados honestos: “credencial pendiente de bóveda segura”, “usuario capturado”, “endpoint/portal registrado”.

Pendiente ChatGPT/Codex:

- Blindar `modules/aseguradoras.js` como backend-crítico ampliado o al menos como archivo sensible.
- Aplicar hotfix para sanitizar `pass` antes de `Orbit.store.update`.

---

## Marketing — validaciones positivas

Archivo:

```txt
orbit360-platform/modules/marketing.js
```

Conclusión:

- El calendario usa datos de `contenidos`.
- `Programar`, `Crear pieza` e `Importar calendario` emiten eventos a `Orbit.integraciones`, no llaman proveedores directamente.
- Los mensajes son honestos: si falta configuración, indica pendiente de configuración/conexión.
- El historial de eventos muestra trazabilidad.

Riesgo menor:

- El fallback de IA crea copy local, pero no simula publicación real. Es aceptable si se mantiene como borrador editable.

---

## Pendientes acumulados importantes para Claude/Codex

Ya se acumularon varios pendientes relevantes:

1. Renovaciones/Cliente360: filtrar renovables estrictamente (`Vigente`/`Por renovar`).
2. Aseguradoras: no persistir contraseñas de portales en frontend.
3. Finanzas/Banco: eliminar KPIs hardcodeados de conciliación bancaria.
4. Finanzas: ajustar `produccionNeta()` para usar `primaNeta` si se conserva.
5. Academia: reforzar rutas sobre renovación vs recuperación, accesos/credenciales seguras e integraciones pendientes de conexión.

## Decisión

Se debe abrir un mini-paquete de hotfixes Codex antes de producción/demo ejecutiva:

```txt
Hotfix A — renovaciones filtradas
Hotfix B — sanitizar credenciales en aseguradoras
Hotfix C — KPIs bancarios sin hardcode
Hotfix D — producciónNeta usa primaNeta o se elimina si no se usa
```

Claude debe recibir instrucciones de conservación cuando vuelva a generar candidata, pero estos hotfixes son principalmente Codex/seguridad/regla de negocio.
