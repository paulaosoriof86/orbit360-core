# Catálogo financiero base A&S GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** propuesta documental de catálogo  
**Estado:** propuesta base; requiere validación de Paula antes de uso operativo o LAB.

## 1. Objetivo

Definir un catálogo financiero mínimo para clasificar movimientos históricos A&S GT/CO en la futura colección `finmovs`, sin mezclarlo con clientes, pólizas, cobros, cartera ni producción.

Este catálogo no es cierre contable ni parametrización final. Es una base para:

- dry-run financiero;
- prevalidación del importador;
- conciliación posterior;
- reportes financieros históricos;
- futura configuración editable desde Orbit 360.

## 2. Reglas generales

1. Guatemala usa GTQ.
2. Colombia usa COP.
3. No se mezclan monedas.
4. No se suman GTQ y COP en reportes brutos.
5. Todo movimiento debe quedar en ingreso, egreso, saldo inicial, ajuste, transferencia interna o sin clasificar.
6. La clasificación financiera no crea clientes, pólizas, cobros ni cartera.
7. Si la categoría no es segura, se marca `requiere_validacion=true`.
8. Las categorías deben ser configurables por tenant en una fase posterior.

## 3. Categorías principales

| Código | Nombre | Tipo | Impacto operativo |
|---|---|---|---|
| ING_COMISIONES | Comisiones recibidas | ingreso | Ingreso operativo. |
| ING_HONORARIOS | Honorarios / servicios | ingreso | Ingreso operativo. |
| ING_REINTEGROS | Reintegros / devoluciones recibidas | ingreso | Ingreso no necesariamente operativo. |
| ING_APORTES | Aportes internos / capitalización | ingreso | Financiero, no producción. |
| ING_PRESTAMOS | Préstamos recibidos | ingreso | Financiero, no producción. |
| ING_OTROS | Otros ingresos | ingreso | Requiere validación si no hay detalle. |
| EGR_COMISIONES | Comisiones pagadas / referidores | egreso | Costo comercial. |
| EGR_NOMINA | Nómina / honorarios equipo | egreso | Gasto administrativo/comercial. |
| EGR_MARKETING | Marketing / ventas / publicidad | egreso | Gasto comercial. |
| EGR_TECNOLOGIA | Tecnología / plataformas / software | egreso | Gasto operativo. |
| EGR_ADMIN | Administración / oficina / servicios | egreso | Gasto administrativo. |
| EGR_BANCOS | Bancos / comisiones financieras | egreso | Gasto financiero. |
| EGR_IMPUESTOS | Impuestos / tasas / trámites | egreso | Gasto fiscal/administrativo. |
| EGR_REEMBOLSOS | Reembolsos / devoluciones pagadas | egreso | Egreso operativo o ajuste. |
| EGR_PRESTAMOS | Pago de préstamos / financiamiento | egreso | Financiero, no gasto operativo puro. |
| EGR_OTROS | Otros egresos | egreso | Requiere validación si no hay detalle. |
| SALDO_INICIAL | Saldo anterior / balance inicial | saldo_inicial | Referencia de conciliación. |
| TRANSFERENCIA | Transferencia interna | transferencia | No ingreso/egreso operativo consolidado. |
| AJUSTE | Ajuste contable/manual | ajuste | Requiere respaldo. |
| SIN_CLASIFICAR | Sin clasificar | sin_clasificar | Requiere validación. |

## 4. Subcategorías sugeridas

### 4.1 Ingresos

| Categoría | Subcategorías sugeridas |
|---|---|
| ING_COMISIONES | comisiones aseguradoras, comisiones nuevas, comisiones renovaciones, bonificaciones, rappel/incentivos |
| ING_HONORARIOS | asesoría, gestión, administración, servicios especiales |
| ING_REINTEGROS | reintegro aseguradora, devolución proveedor, devolución banco, ajuste reversado |
| ING_APORTES | aporte socios, traslado interno, capitalización |
| ING_PRESTAMOS | préstamo socio, préstamo tercero, financiación temporal |
| ING_OTROS | ingreso no clasificado, ingreso por validar |

### 4.2 Egresos

| Categoría | Subcategorías sugeridas |
|---|---|
| EGR_COMISIONES | comisión asesor, comisión referidor, comisión aliado, comisión externa |
| EGR_NOMINA | salario, honorarios, bonificación, prestaciones, viáticos equipo |
| EGR_MARKETING | pauta, diseño, contenidos, redes sociales, eventos, material comercial |
| EGR_TECNOLOGIA | software, hosting, dominios, automatizaciones, IA, herramientas digitales |
| EGR_ADMIN | oficina, servicios públicos, papelería, mensajería, trámites, legal, contable |
| EGR_BANCOS | cargos bancarios, transferencias, comisiones tarjeta, diferencias bancarias |
| EGR_IMPUESTOS | impuestos, retenciones, tasas, formularios, multas/intereses |
| EGR_REEMBOLSOS | devolución cliente, reintegro colaborador, ajuste cliente |
| EGR_PRESTAMOS | cuota préstamo, abono capital, intereses, pago socio |
| EGR_OTROS | egreso no clasificado, egreso por validar |

## 5. Reglas de clasificación automática preliminar

Estas reglas son heurísticas para dry-run, no reglas finales:

| Señal en concepto | Categoría candidata | Validación |
|---|---|---|
| comisión, comisiones, aseguradora | ING_COMISIONES o EGR_COMISIONES según bloque | Si está en ingresos = recibido; si está en egresos = pagado. |
| salario, sueldo, honorarios equipo | EGR_NOMINA | Validar si es proveedor o colaborador. |
| pauta, meta, publicidad, diseño, contenido | EGR_MARKETING | Validar país/moneda. |
| software, hosting, dominio, plataforma, IA, make, mailchimp, canva | EGR_TECNOLOGIA | Validar si es suscripción. |
| banco, cargo, transferencia, comisión bancaria | EGR_BANCOS | Puede ser transferencia interna. |
| impuesto, retención, SAT, DIAN, tasa | EGR_IMPUESTOS | Validar país. |
| préstamo, prestamo, crédito, credito | ING_PRESTAMOS o EGR_PRESTAMOS | Según bloque y signo. |
| reintegro, devolución, devolucion | ING_REINTEGROS o EGR_REEMBOLSOS | Validar sentido. |
| saldo anterior, saldo inicial | SALDO_INICIAL | No ingreso/egreso operativo. |
| traslado, transferencia interna | TRANSFERENCIA | No duplicar en consolidado. |

## 6. Reglas de impacto financiero

| Tipo | Impacta flujo caja | Impacta producción | Impacta cartera | Requiere conciliación |
|---|---|---|---|---|
| ingreso | Sí | No automáticamente | No | Sí |
| egreso | Sí | No | No | Sí |
| saldo_inicial | No como operación | No | No | Sí, como referencia |
| transferencia | No en consolidado si ambas puntas existen | No | No | Sí |
| ajuste | Depende | No | No | Sí |
| sin_clasificar | No hasta validar | No | No | Sí |

## 7. Tratamiento de país y moneda

- `GT` siempre `GTQ`.
- `CO` siempre `COP`.
- Si un registro trae moneda inconsistente con la hoja, queda `requiere_validacion=true`.
- Los reportes consolidados deben separar GTQ y COP.
- El importador no debe hacer conversión cambiaria automática sin una tabla de tasas aprobada.

## 8. Tratamiento de terceros

Para reportes en GitHub:

- no exponer nombres reales de clientes, proveedores, empleados, asesores ni aliados;
- usar conteos y agrupaciones;
- si se requiere auditoría privada, conservar terceros solo en payload local/LAB autorizado.

Para LAB futuro:

- `tercero` puede conservarse si Paula autoriza carga de datos reales;
- en reportes públicos del repo debe anonimizarse o excluirse.

## 9. Estado de validación por movimiento

| Estado | Uso |
|---|---|
| historico | Registro candidato válido para histórico. |
| referencia | Registro útil, pero no movimiento operativo directo. |
| requiere_validacion | Dato incompleto, ambiguo o pendiente de regla. |
| excluido | No importable. |

## 10. Bloqueos

El importador debe bloquear la clasificación automática si:

1. no reconoce país;
2. no reconoce moneda;
3. no reconoce periodo;
4. el concepto está vacío;
5. el monto no es numérico;
6. el registro parece subtotal/total;
7. viene de hoja excluida;
8. corresponde a producción/póliza/cartera;
9. mezcla GTQ/COP;
10. parece transferencia interna duplicada.

## 11. Parámetros configurables futuros

En una fase posterior, Configuración debería permitir editar:

- categorías;
- subcategorías;
- palabras clave;
- reglas por país;
- reglas por banco/cuenta;
- tratamiento de transferencias internas;
- tratamiento de saldo inicial;
- visibilidad en reportes.

## 12. Pendientes antes de usar en LAB

1. Paula debe validar si las categorías coinciden con la operación A&S.
2. Definir si los aportes/préstamos se muestran dentro o fuera de EBITDA/operación.
3. Definir si comisiones pagadas a asesores van como costo comercial o gasto operativo.
4. Definir tratamiento de transferencias internas para evitar doble conteo.
5. Definir regla final de `Saldo anterior`.
6. Definir si mayo 2026 queda excluido total o como borrador no conciliado.

## 13. Restricciones cumplidas

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

**Catálogo financiero base propuesto.**

Debe validarse antes de usarlo para dry-run o LAB.
