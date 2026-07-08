# Reglas backend/producto a conservar — paquete Claude integral v1330

## SaaS / tenant

- Orbit 360 es SaaS/white-label/multi-tenant.
- A&S es primer tenant, no fork.
- Todo se parametriza por configuración tenant.
- No hardcode A&S fuera de configuración.

## Orbit.store

Los módulos deben usar contrato conceptual:

```txt
all(collection)
get(collection, id)
where(collection, predicate)
insert(collection, record)
update(collection, id, patch)
remove(collection, id)
_emit(collection)
```

No usar almacenamiento directo en módulos.

## Fuentes separadas

No mezclar fuentes:

```txt
clientes
aseguradoras
polizas
vehiculos
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
```

Reglas:

- No inferir clientes/pólizas desde movimientos financieros.
- No escribir cartera desde financiero histórico.
- No escribir cobros desde estado bancario sin conciliación.
- Documentos soporte solo proponen datos.
- Faltante país/moneda = requiere validación.

## País/moneda

- GT → GTQ.
- CO → COP.
- No sumar monedas en crudo.
- Si falta país/moneda confiable: `REQUIERE_VALIDACION`.
- Puede sugerirse moneda por país, pero no autoriza escritura.

## Producción / comisiones

- Producción, metas y comisiones = prima neta recaudada.
- Prima separada: neta, gastos, impuestos/IVA, total.
- Factura emitida no es ingreso real.
- Recaudo nace cuando hay cobro/conciliación autorizada.

## Pólizas / cartera

- Solo Vigente / Por renovar genera recibos/cartera.
- Cancelada/Vencida/Anulada/Rechazada = histórico o recuperación.
- Cartera = cobros pendientes de pólizas vigentes o por renovar del año actual.

## Cobros / finmovs / conciliación

- Cobros/recaudos no son `finmovs`.
- `finmovs` es financiero histórico/operativo.
- Pago reportado por cliente no es pago confirmado.
- Conciliación propuesta no es pago aplicado.
- Validada no es aplicada.
- Estado bancario no crea cartera.

## Documentos / Storage

- Documento recibido no equivale a dato aprobado.
- Soporte de pago no equivale a pago aplicado.
- No guardar base64/bytes/URLs públicas/tokens.
- Storage pendiente no es Storage conectado.
- Documento puede proponer diff, no aplicar cambio directo.

## Integraciones

- Integración configurada no equivale a activa.
- Mientras no exista proveedor conectado, mostrar pendiente de conexión.
- No llamar proveedores externos directo desde módulos.
- Eventos se registran con trazabilidad.

## Credenciales

- No guardar contraseñas ni secretos reales en frontend/store.
- Usar referencia conceptual `credentialRef: backend_required`.
- Nunca precargar contraseña/token/API key.

## Backend protegido

No tocar:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```