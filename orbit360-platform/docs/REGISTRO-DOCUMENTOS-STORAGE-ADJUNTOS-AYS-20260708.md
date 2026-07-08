# Registro — Documentos + Storage futuro + adjuntos A&S

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Bloque trabajado

Contrato/modelo backend y prototipo para documentos, adjuntos y Storage futuro.

## Archivos agregados

```txt
orbit360-platform/docs/CONTRATO-MODELO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
tools/orbit360-validar-modelo-documentos-storage-ays.mjs
tools/orbit360-test-validar-modelo-documentos-storage-ays.mjs
orbit360-platform/docs/REGISTRO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md
```

## Resultado

Se fijó el contrato para que documentos soporte y adjuntos:

- sean metadata-only mientras no haya Storage real autorizado;
- no incluyan base64, bytes, payload, URLs públicas, tokens ni secretos;
- no creen clientes, pólizas, cobros, cartera, finmovs ni producción;
- propongan cambios mediante `parchesPendientes` con diff;
- permitan visibilidad controlada por rol/relación;
- conecten Portal Cliente, Cobros, M5 Conciliaciones, Cliente360, Operativo y expediente.

## Herramienta agregada

`tools/orbit360-validar-modelo-documentos-storage-ays.mjs`

Valida planes metadata-only de documentos/adjuntos y bloquea:

- `source_type` no permitido;
- destinos directos prohibidos (`clientes`, `polizas`, `cobros`, `cartera`, `finmovs`, `produccion`, `recibos`);
- `write_enabled=true`;
- `apply_to_master=true`;
- pago aplicado desde soporte;
- creación directa de cobro/cartera;
- país/moneda incoherente;
- base64, bytes, payload, filas, URLs públicas o secretos.

## Tests sintéticos agregados

`tools/orbit360-test-validar-modelo-documentos-storage-ays.mjs`

Casos cubiertos:

1. Documento soporte listo plan-only.
2. Recibo de pago que intenta aplicar pago: bloqueado.
3. Estado de cuenta CO con GTQ: bloqueado.
4. DPI/NIT cliente que intenta aplicar sin diff: bloqueado.
5. Payload/base64: bloqueado.
6. Pago reportado sin moneda: requiere validación.

## Impacto Claude/prototipo

Claude debe conservar:

- documento recibido no equivale a dato aprobado;
- soporte de pago no equivale a pago aplicado;
- diff obligatorio antes de modificar cliente/póliza;
- adjuntos visibles según rol y relación;
- estados honestos en Portal Cliente y Cobros;
- Storage pendiente no debe mostrarse como activo;
- trazabilidad por archivo/fuente/hoja/fila/bloque/período cuando aplique.

## Impacto Academia

Rutas impactadas:

- Portal Cliente;
- Cobros / Finanzas;
- Operativo / Gestiones;
- Cliente360;
- Dirección / Superadmin;
- IT / Seguridad.

Lecciones a incorporar:

- Cómo reportar pago y adjuntar soporte.
- Cómo revisar soporte sin aplicar pago.
- Cómo aprobar/rechazar documentos.
- Cómo interpretar diff propuesto.
- Cómo vincular documento a expediente.
- Cómo auditar visibilidad y acceso.

## Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No Storage real.
- No Firestore writes.
- No modificación de backend protegido.

## Estado

Bloque documental/técnico agregado. Pendiente ejecución local de tests sintéticos cuando sea estrictamente necesario o agrupado en runner posterior.