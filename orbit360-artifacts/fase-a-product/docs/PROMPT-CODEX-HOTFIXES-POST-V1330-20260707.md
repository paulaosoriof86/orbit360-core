# Prompt Codex — hotfixes post-v1330 Orbit 360 A&S — 2026-07-07

## Uso

Ejecutar solo si se va a aplicar el paquete de hotfixes post-auditoría v1330.

```txt
Repo: paulaosoriof86/orbit360-core
Rama obligatoria: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
No merge
No deploy
No main
No producción
No datos reales
No secretos
```

## Antes de cambiar

Leer:

```txt
orbit360-platform/docs/AUDITORIA-BLOQUE-POLIZAS-RENOVACIONES-CARTERA-V1330-20260707.md
orbit360-platform/docs/AUDITORIA-BLOQUE-FINANZAS-ASEGURADORAS-MARKETING-V1330-20260707.md
orbit360-platform/docs/BITACORA-CLAUDE-ACADEMIA-POST-EMPALME-V1330-20260707.md
orbit360-platform/docs/PENDIENTE-INTEGRACION-COTIZADOR-COMPARATIVO-AYS-V110-20260707.md
```

No tocar backend protegido:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*
```

No tocar `core/auth.js` ni `core/importa.js` salvo lectura. Ya fueron corregidos y deben conservarse.

---

# Hotfix A — Renovaciones solo con pólizas renovables

Archivos:

```txt
orbit360-platform/modules/renovaciones.js
orbit360-platform/modules/cliente360.js
```

Objetivo:

La vista de Renovaciones y la pestaña Renovaciones de Cliente360 deben incluir solo pólizas:

```txt
Vigente
Por renovar
```

No incluir:

```txt
Vencida
Cancelada
Anulada
Rechazada
Requiere validación
```

Cambios esperados:

1. Crear helper local o condición clara:

```js
const esRenovable = p => p && (p.estado === 'Vigente' || p.estado === 'Por renovar');
```

2. En `modules/renovaciones.js`, reemplazar filtros laxos tipo:

```js
p.estado !== 'Cancelada'
```

por:

```js
esRenovable(p)
```

3. En `modules/cliente360.js`, en `tabRenov()`, reemplazar:

```js
r.pol.filter(p => p.estado !== 'Cancelada')
```

por filtro estricto renovable.

4. Opcional seguro: en `solicitarPropuestas(polizaId)`, si la póliza no es renovable, mostrar toast y no registrar propuesta.

Regla:

```txt
Renovación activa ≠ recuperación.
Vencidas/canceladas/anuladas/rechazadas van por histórico/recuperación, no por pipeline de renovación.
```

---

# Hotfix B — Aseguradoras no debe persistir contraseñas en frontend

Archivo:

```txt
orbit360-platform/modules/aseguradoras.js
```

Problema:

Actualmente `portales` guarda:

```js
{ nombre, url, usuario, pass }
```

Esto no debe ocurrir.

Objetivo:

- No guardar contraseñas reales en `Orbit.store`.
- No mostrar contraseña ya guardada en el input.
- Si el usuario escribe algo en el campo contraseña, registrar solo referencia segura.
- El valor real debe quedar pendiente de bóveda/backend seguro.

Cambios esperados:

1. En `portalRow()`, el input de contraseña debe tener `value=""`, no `p.pass`.
2. Agregar o conservar referencia:

```js
credentialRef: p.credentialRef || (p.pass ? 'backend_required' : '')
```

3. En `snapshot()` y `Guardar cambios`, mapear portales así:

```js
{
  nombre,
  url,
  usuario,
  credentialRef: row.querySelector('[data-pp]').value ? 'backend_required' : (row.dataset.cred || ''),
  pass: ''
}
```

Si se prefiere no incluir `pass`, eliminar completamente la propiedad.

4. Sanitizar datos existentes: si un portal existente trae `pass`, al abrir/guardar debe eliminarse y quedar `credentialRef: 'backend_required'`.

5. Ajustar texto visible para que diga:

```txt
Contraseña: pendiente de bóveda segura
```

o similar.

Regla:

```txt
No secretos ni credenciales reales en frontend/store.
```

---

# Hotfix C — Finanzas / Banco sin KPIs hardcodeados

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

Problema:

En `banco()` hay KPIs fijos:

```js
Depósitos sin asociar = 3
Movimientos sin crear = 1
```

Objetivo:

Eliminar valores hardcodeados.

Corrección esperada:

1. Calcular desde colecciones reales si existen:

```txt
conciliacionBanco
conciliaciones
finmovs
```

2. Si no hay fuente conectada, mostrar `0` y texto honesto:

```txt
pendiente de importación/conciliación
```

3. No simular datos productivos.

Ejemplo seguro:

```js
const bancoRows = (S().all('conciliacionBanco') || []).filter(...pais...);
const depSin = bancoRows.filter(x => x.estado === 'sin_asociar' || x.estado === 'pendiente').length;
const movSin = bancoRows.filter(x => x.requiereMovimiento === true || x.estado === 'movimiento_pendiente').length;
```

Si `conciliacionBanco` no existe o está vacía:

```js
depSin = 0;
movSin = 0;
```

Y el foot debe decir:

```txt
pendiente de importación
```

---

# Hotfix D — producciónNeta usa primaNeta o se elimina

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

Problema:

La función `produccionNeta()` dice prima neta, pero usa:

```js
p.prima
```

El importador conserva `p.prima` como total/compatibilidad visual, no como prima neta confiable.

Cambio esperado:

```js
.reduce((s, p) => s + q.norm(p.primaNeta != null ? p.primaNeta : 0, p.moneda), 0)
```

Si la función está muerta, puede mantenerse corregida o eliminarse solo si no se rompe ninguna referencia.

---

# Validaciones obligatorias

Ejecutar:

```bash
node --check orbit360-platform/modules/renovaciones.js
node --check orbit360-platform/modules/cliente360.js
node --check orbit360-platform/modules/aseguradoras.js
node --check orbit360-platform/modules/finanzas.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

Verificar que no se tocaron protegidos:

```txt
store.js
store-firestore-lab.local.js
backend-lab-loader.js
backend-lab-init.js
backend-lab-security-guard.js
firestore.rules
tools/orbit360-*
core/auth.js
core/importa.js
```

## Entregable esperado

Commit pequeño en la misma rama:

```txt
fix(ays): hotfixes renovaciones credenciales finanzas v1330
```

Reporte breve:

- archivos modificados;
- cambios exactos;
- validaciones ejecutadas;
- confirmación de que no hay contraseñas persistidas;
- confirmación de que Renovaciones solo usa Vigente/Por renovar;
- confirmación de que Banco no muestra KPIs hardcodeados;
- confirmación de que no se tocaron protegidos.
