# Matriz de fuentes separadas para migración A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** plan documental de fuentes  
**Estado:** vigente; no implica carga LAB ni solicitud inmediata de archivos.

## 1. Objetivo

Definir el orden correcto de archivos/fuentes para la migración real A&S, evitando usar archivos financieros como fuente de clientes, pólizas, cobros o cartera.

Esta matriz reduce reprocesos y deja claro qué archivo pedir en cada bloque cuando corresponda.

## 2. Regla principal

La migración operativa se hará con archivos actualizados y separados por entidad.

No se deben inferir entidades críticas desde fuentes equivocadas:

- movimientos financieros no crean clientes;
- movimientos financieros no crean pólizas;
- movimientos financieros no crean cobros;
- movimientos financieros no crean cartera;
- producción histórica no sustituye archivo oficial de pólizas;
- planillas de aseguradoras no sustituyen maestro de clientes sin validación.

## 3. Orden recomendado de fuentes

| Orden | Fuente | Colecciones candidatas | Uso | Estado |
|---:|---|---|---|---|
| 1 | Clientes actualizados | `clientes` | Base maestra inicial. | Pendiente archivo. |
| 2 | Aseguradoras/directorios actualizados | `aseguradoras` | Catálogo por país, contactos, accesos, Drive, facturación. | Directorios base revisados; actualización futura opcional. |
| 3 | Pólizas actualizadas | `polizas`, `vehiculos`, `acreedores`, `documentos` | Base operativa de pólizas vigentes, renovaciones, vencidas/canceladas históricas. | Pendiente archivo separado. |
| 4 | Cobros realizados | `cobros`, `finmovs` si aplica | Historial de pagos/cobros confirmados. | Pendiente archivo separado. |
| 5 | Planillas de aseguradoras | `comisiones`, conciliación, validación `cobros` | Cruce de primas/comisiones/cobros por aseguradora. | Pendiente por fases. |
| 6 | Estados de cuenta bancarios | `finmovs`, conciliación | Conciliación bancaria y cierres. | Pendiente por fases. |
| 7 | Cierres manuales mayo/junio/julio | `finmovs`, conciliación | Cierre operativo validado por A&S. | Pendiente manual/conciliación. |
| 8 | Bitácora de siniestros | `reclamos`, `gestiones`, `documentos` | Histórico multi-cliente. | Pendiente archivo separado. |
| 9 | Documentos/expedientes | `documentos` | Soporte pólizas, clientes, reclamos, cobros. | Pendiente estructura. |

## 4. Clientes — campos mínimos esperados

Fuente esperada: archivo actualizado de clientes.

Campos mínimos sugeridos:

```txt
nombre_cliente
tipo_persona
pais
documento_tipo
documento_numero
telefono
correo
direccion
ciudad/departamento
estado_cliente
asesor_responsable
observaciones
```

Validaciones:

- deduplicar por documento si existe;
- si no hay documento, deduplicar por nombre normalizado + teléfono/correo;
- país obligatorio;
- moneda no aplica al cliente, salvo preferencias comerciales;
- no crear pólizas desde clientes;
- no crear cobros desde clientes.

## 5. Pólizas — campos mínimos esperados

Fuente esperada: archivo actualizado y separado de pólizas.

Campos mínimos sugeridos:

```txt
numero_poliza
cliente_identificador_o_nombre
aseguradora
pais
moneda
ramo/producto
estado_poliza
fecha_emision
vigencia_inicio
vigencia_fin
prima_neta
prima_total
forma_pago
asesor_responsable
vehiculo_si_aplica
acreedor_si_aplica
observaciones
```

Validaciones:

- `numero_poliza` obligatorio salvo caso documentado;
- país y moneda obligatorios;
- aseguradora debe cruzar contra catálogo del país;
- estado de póliza no se infiere solo por fecha;
- cancelada requiere dato explícito;
- vencida/cancelada se conserva como histórico;
- vigente/por renovar puede generar recibos solo si hay forma de pago y regla aprobada;
- no crear cartera sin evidencia de pendiente.

## 6. Cobros realizados — campos mínimos esperados

Fuente esperada: archivo separado de cobros realizados/pagos confirmados.

Campos mínimos sugeridos:

```txt
fecha_pago
cliente_identificador_o_nombre
numero_poliza
aseguradora
pais
moneda
monto_pagado
recibo/factura/referencia
medio_pago
cuenta_banco
estado_pago
observaciones
```

Validaciones:

- no confundir cobro realizado con cartera pendiente;
- cruzar contra póliza si existe;
- cruzar contra estado de cuenta si existe;
- moneda por país;
- si no hay póliza asociable, marcar `requiere_validacion`;
- si el pago corresponde a varios recibos, marcar distribución pendiente.

## 7. Planillas de aseguradoras — campos mínimos esperados

Uso: conciliación, comisiones, producción/cobros reportados por aseguradora.

Campos mínimos sugeridos:

```txt
aseguradora
periodo
pais
moneda
numero_poliza
cliente
prima_neta
prima_total
comision_base
porcentaje_comision
comision_calculada
estado_cobro_o_pago
fecha_reporte
```

Validaciones:

- cruzar aseguradora contra catálogo;
- no crear cliente/póliza automáticamente sin validación;
- cruzar contra pólizas/cobros ya cargados;
- diferencias quedan como conciliación;
- comisiones se calculan sobre prima neta recaudada si aplica y está confirmada.

## 8. Estados de cuenta — campos mínimos esperados

Uso: conciliación financiera.

Campos mínimos sugeridos:

```txt
banco
cuenta
pais
moneda
fecha
descripcion
referencia
monto_debito
monto_credito
saldo
```

Validaciones:

- no crear pólizas/cobros automáticamente;
- clasificar como `finmovs` o conciliación bancaria;
- cruzar contra cobros realizados y movimientos manuales;
- separar GTQ/COP;
- registros no identificados quedan `requiere_validacion`.

## 9. Cierres manuales mayo/junio/julio

Uso: completar y conciliar periodos no cerrados por archivo histórico.

Reglas:

- mayo 2026 no se toma como cierre definitivo desde el archivo histórico;
- junio y julio deben capturarse/validarse manualmente;
- cada ajuste manual debe tener responsable, fecha, motivo y soporte;
- cada movimiento debe quedar conciliado, con diferencia o pendiente;
- no mezclar cierres con cartera/pólizas.

## 10. Siniestros / reclamos

Fuente esperada: bitácora separada de siniestros multi-cliente.

Campos mínimos sugeridos:

```txt
fecha_reclamo
cliente
numero_poliza
aseguradora
ramo
estado_reclamo
monto_reclamado
monto_pagado_si_aplica
responsable
ultima_gestion
proxima_gestion
documentos_soporte
observaciones
```

Validaciones:

- cruzar contra cliente/póliza si ya existen;
- si no existen, dejar candidato pendiente;
- no crear cobros/cartera desde reclamo;
- conservar historial de gestiones.

## 11. Orden de carga LAB futura sugerido

Solo con autorización explícita:

1. Catálogos base: aseguradoras, asesores, configuración país/moneda.
2. Clientes.
3. Pólizas.
4. Vehículos/acreedores/documentos asociados.
5. Cobros realizados.
6. Movimientos financieros históricos (`finmovs`).
7. Planillas de aseguradoras para conciliación.
8. Estados de cuenta para conciliación.
9. Reclamos/siniestros.
10. Cierres manuales mayo/junio/julio.

## 12. Bloqueos antes de cualquier carga LAB

No avanzar si:

- fuente no está identificada por alcance;
- archivo mezcla entidades sin selección manual;
- hay país/moneda ambiguos;
- hay duplicados críticos no resueltos;
- hay datos sensibles que podrían subirse al repo;
- se requiere modificar `data/store.js`;
- no hay autorización explícita de Paula;
- el dry-run genera errores bloqueantes;
- no existe reporte de exclusiones.

## 13. Pendientes para prototipo base / Claude

El importador debe incorporar:

1. Selector obligatorio de tipo de fuente.
2. Vista previa de campos detectados.
3. Mapeo columna → entidad según alcance.
4. Bloqueo de inferencias entre entidades.
5. Deduplicación por reglas configurables.
6. Reporte de exclusiones antes de importar.
7. Estados: listo, requiere validación, excluido, conflicto.
8. Modo dry-run sin escritura.
9. Conciliación posterior para cobros/planillas/estados de cuenta.
10. Trazabilidad de archivo, hoja, columna, fila y responsable.

## 14. Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.

## Estado

**Matriz de fuentes separadas definida.**

Siguiente paso real: pedir el primer archivo actualizado solo cuando Paula confirme avanzar con esa fuente. Mientras tanto, la matriz sirve como guía de continuidad.
