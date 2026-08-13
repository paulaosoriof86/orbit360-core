# Auditoría forense — candidata Claude 2026-07-08T183042.881

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Archivo auditado

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
Entradas: 98
```

## Baseline comparado

```txt
Prototype Development Request - 2026-07-08T135740.684.zip
SHA256: 97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c
Entradas: 98
```

## Resultado técnico inicial

```txt
Archivos agregados: 0
Archivos eliminados: 0
Archivos modificados: 7
JS/MJS revisados con node --check: 56
Errores de sintaxis: 0
```

## Archivos modificados contra candidata anterior

```txt
docs/BITACORA-CAMBIOS.md
docs/REPORTE-SMOKE.md
index.html
modules/cliente360.js
modules/cobros.js
modules/configuracion.js
modules/portal.js
```

## Protegidos tocados

```txt
index.html
```

Observación: el cambio de `index.html` es cache-bust de módulos (`cliente360`, `cobros`, `configuracion`, `portal`). Por regla del proyecto, `index.html` no debe reemplazarse desde ZIP completo. Si se requiere, aplicar solo cache-bust de forma controlada/local.

## Conclusión ejecutiva

La candidata **avanza** en Cliente360 Documentos, Cobros, Portal y Configuración, pero **no debe empalmarse completa**.

Motivos:

```txt
1. Toca index.html.
2. No actualiza Academia profunda post-addendum.
3. No toca Cotizador/Comparativo; quedan sin smoke real nuevo.
4. Cliente360 aplica diff al cliente al aprobar propuesta, lo cual requiere gate más fuerte y auditoría.
5. Cobros todavía marca conciliado=true si hay factura, aunque factura debe ser metadata-only y no conciliar automáticamente.
6. Configuración conserva UI `ci-key` y texto de API key/token/backend; aunque lo plantea como referencia, no cumple limpio el contrato de credentialRef/backend_required.
7. M5/Conciliaciones no cambió frente a candidata anterior; no absorbe hotfix P0 completo.
8. Equipo no cambió; no absorbe hotfix P0 completo.
```

## Cumplimiento por frente pedido

| Frente | Estado | Evidencia / problema |
|---|---|---|
| Portal pago reportado + soporte visible | Parcial mejorado | Crea documento `metaOnly` con `soporteDocumentoId`, pero no registra auditoría completa y conserva comentario con `base64`; `enRevision:false` al reportar es inconsistente. |
| Cobros revisión/motivo/auditoría | Parcial | Agrega motivo y país/moneda al confirmar; elimina lectura binaria real, pero deja comentario `readAsDataURL/base64`; factura sigue poniendo `conciliado=true` si hay `factName`. |
| Cliente360 Documentos | Parcial | Agrega botones aprobar/rechazar/aclarar por rol y motivo, pero aprobar aplica diff directo al cliente y estado `aclaracion_solicitada` no coincide con contrato `requiere_aclaracion/pendiente_revision`; falta auditoría unificada. |
| Metadata-only/documentos | Parcial | Portal y factura avanzan a metadata-only; falta uniformidad de `storageEstado`, auditoría y no aplicación automática. |
| M5 Conciliaciones | No nuevo | `modules/conciliaciones.js` no cambió respecto a candidata anterior. Hotfix P0 de M5 sigue fuera de esta candidata. |
| Config/Equipo gates | Parcial | Config avanza a `credentialRef` y `backend_required`, pero conserva `ci-key` y copy de API key/token/backend. Equipo no cambió. |
| Academia profunda | No nuevo | `data/academia-plus.js` y `modules/academia.js` no cambiaron. No incorpora addendum profundo posterior. |
| Cotizador/Comparativo | No nuevo | `modules/cotizador.js` y `modules/comparativo.js` no cambiaron. Deben incluirse en smoke y Academia, pero no reescribirse si están estables. |

## Hallazgos por archivo

### `modules/cliente360.js`

Avances:

```txt
- Botones Aprobar / Rechazar / Solicitar aclaración en Documentos.
- Motivo obligatorio.
- Historial interno simple.
- Visibilidad de botones limitada a Dirección/Admin/IT/Finanzas/Operativo.
```

Riesgos:

```txt
- Aprobar aplica el diff directamente al cliente.
- No usa colección `auditoria`.
- Busca `parchesPendientes` con estado `pendiente`; contrato nuevo usa `pendiente_revision`.
- Usa estado `aclaracion_solicitada`, no contemplado en contrato actual.
- No valida país/moneda para parches que afectan póliza/cobro.
- No usa confirmación reforzada para aplicar cambios.
```

Decisión:

```txt
No empalmar completo sin adaptar al contrato Cliente360 Documentos/Parches/Roles v1330.
Se puede rescatar UX de botones y layout.
```

### `modules/cobros.js`

Avances:

```txt
- Cambia etiqueta a Fecha de confirmación del cobro.
- Quita variable `factData` funcional.
- No ejecuta `readAsDataURL`; solo conserva comentario.
- Agrega guard país/moneda GT=GTQ / CO=COP.
- Exige motivo para confirmar cobro.
- Guarda `facturaMetaOnly:true`.
```

Riesgos:

```txt
- Aún aparece `readAsDataURL/base64` en comentario; rompe validadores estrictos.
- Si hay factura, pone `conciliado=true`. Factura metadata-only no debe conciliar automáticamente.
- Usa historial local en cobro, pero no auditoría unificada.
```

Decisión:

```txt
No empalmar completo. Preferir hotfix P0 preparado por ChatGPT/Codex o ajustar este fragmento eliminando conciliación automática y comentario prohibido.
```

### `modules/portal.js`

Avances:

```txt
- Reportar pago crea `documentos` con `metaOnly:true`.
- Vincula cobro por `soporteDocumentoId`.
- Usa `storageEstado:'pendiente_storage'`.
- Mantiene historial `reportado_cliente`.
```

Riesgos:

```txt
- Comentario contiene `base64`.
- `enRevision:false` al reportar soporte contradice estado reportado/en revisión.
- No registra auditoría unificada.
- Documento soporte no incluye todos los campos del contrato nuevo: tenantId, visibilidadCliente, responsable, updatedAt.
```

Decisión:

```txt
Rescatar idea, pero empalmar con script/hotfix Portal ya preparado, no ZIP completo.
```

### `modules/configuracion.js`

Avances:

```txt
- Cambia integración hacia `credentialRef` y `backend_required`.
- Agrega confirmación `RESTABLECER` para reset de configuración.
```

Riesgos:

```txt
- UI mantiene `id="ci-key"`.
- Copy contiene API key/token/backend.
- `integEstado` todavía revisa `cfg.key` por compatibilidad.
- Logo del cliente sigue usando FileReader/base64; esto no es soporte operativo, pero debe controlarse por configuración/Storage futuro.
- Equipo no cambió.
```

Decisión:

```txt
No empalmar completo. Preferir hotfix P0 Config/Equipo preparado, que elimina key/token y normaliza credentialRef/backend_required.
```

### `index.html`

Cambio:

```txt
Cache-bust de cliente360/cobros/configuracion/portal a v1338.
```

Decisión:

```txt
No reemplazar index completo desde ZIP. Aplicar cache-bust solo si los módulos se empalman de forma controlada.
```

## Módulos sin cambios en esta candidata

```txt
modules/cotizador.js
modules/comparativo.js
modules/academia.js
data/academia-plus.js
modules/conciliaciones.js
modules/equipo.js
modules/aseguradoras.js
```

Implicación:

```txt
La candidata no incorpora el addendum de Academia profunda completo, no refuerza Cotizador/Comparativo y no cierra M5/Equipo.
```

## Decisión de empalme

```txt
NO empalmar ZIP completo.
NO declarar baseline corregido.
NO reemplazar index.html.
NO reemplazar módulos directamente sin adaptar gates.
```

Ruta segura:

```txt
1. Mantener hotfixes P0 ChatGPT/Codex como base de empalme.
2. Rescatar de esta candidata solo UX útil:
   - botones/documentos Cliente360;
   - labels/copy visual;
   - soporteDocumentoId/metaOnly de Portal si no está ya cubierto;
   - notas de smoke.
3. Adaptar Cliente360 al contrato nuevo de Documentos/Parches/Roles antes de empalmar.
4. Ejecutar runner P0 + validador post-runner en worktree local.
5. Auditar Cotizador/Comparativo y Academia como módulos core en el siguiente bloque.
```

## Estado

Auditoría forense inicial completada. Pendiente plan de rescate controlado por módulo y, si procede, script de empalme seguro que no revierta hotfixes existentes.