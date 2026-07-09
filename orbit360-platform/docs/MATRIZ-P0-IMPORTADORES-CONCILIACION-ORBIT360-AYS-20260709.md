# MATRIZ P0 — IMPORTADORES, CREACION CONTROLADA Y CONCILIACION ORBIT 360 A&S

Fecha: 2026-07-09  
Carriles: B/C  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: documentacion tecnica y contrato de implementacion; sin datos reales incrustados; sin merge; sin deploy.

---

## 1. Proposito

Este documento consolida el cierre P0 del bloque de clientes, polizas, vehiculos/bienes, recibos/cobros, estados de cuenta de aseguradoras, planillas de comisiones, facturas de comisiones, CxC/CxP, conciliaciones y documentos soporte.

No reemplaza auditorias previas de modulos ni reabre diagnosticos ya cerrados. Convierte lo trabajado con fuentes reales A&S en contrato implementable y reutilizable para cualquier tenant, pais, moneda y aseguradora.

---

## 2. Restricciones vivas

- No tocar `main`.
- No hacer merge ni deploy.
- No hardcodear A&S, nombres reales, polizas reales, clientes reales ni datos de fuentes reales.
- No subir secretos, tokens, credenciales ni archivos fuente reales al repo.
- No pisar backend protegido:
  - `orbit360-platform/data/store.js`
  - `orbit360-platform/data/store-firestore-lab.local.js`
  - `orbit360-platform/core/backend-lab-loader.js`
  - `orbit360-platform/core/backend-lab-init.js`
  - `orbit360-platform/core/backend-lab-security-guard.js`
  - `firestore.rules`
  - `tools/orbit360-*` backend/validadores/pipeline
- Todo importador debe ejecutar dry-run antes de escritura real.
- Todo cambio manual de estado financiero, cartera, comision o conciliacion debe auditar antes/despues, usuario, fecha y motivo.
- Academia, UI cliente y manuales generales no deben mencionar sistemas anteriores por nombre. Usar: `fuente externa`, `sistema anterior`, `base importada`, `reporte de cobros`, `estado de cuenta`, `planilla`, `factura`.

---

## 3. Estado real encontrado en prototipo/backend actual

El importador transversal existe y ya tiene mapeos basicos para clientes, polizas, vehiculos, estados de cuenta, planillas de comision, facturas, finanzas, documentos, directorio de aseguradoras y estados bancarios.

Sin embargo, el bloque queda en estado parcial porque la implementacion actual todavia no cubre completamente las reglas corregidas con fuentes reales A&S.

| Bloque | Estado real actual | Cierre requerido |
|---|---|---|
| Clientes | Parcial | Ajustar duplicacion exacta/probable, `pendiente_polizas`, asesor temporal, calidad por asesor, documentos por pais/tipo persona. |
| Polizas | Parcial | Cambiar llave de deduplicacion, separar estado fuente/original vs estado operativo, tratar renovadas vigentes y canceladas exactas. |
| Vehiculos/bienes | Parcial | Complementar desde documentos y archivos, vincular a poliza/vigencia sin crear polizas indebidas. |
| Recibos/cobros | Parcial | Separar `reciboEsperado`, `reciboFuenteExterna`, `reciboAseguradora`, `cobroConfirmado`. |
| Estados cuenta aseguradora | Parcial | Crear entidades propias de cartera aseguradora, no escribir todo en `cobros`. |
| Planillas comision | Parcial | Crear comision devengada, recaudo probable, conciliacion planilla/factura y propuesta de liquidacion asesor. |
| Facturas comision | Parcial | Distinguir factura de comision A&S vs factura/recibo de prima. Crear CxC solo para comisiones/facturacion financiera. |
| CxC/CxP | Parcial | CxC/CxP solo financiero: comisiones, proveedores, asesores, otros. No primas pendientes. |
| Conciliaciones | Parcial | Falta motor integral por fuente: poliza/recibo/aseguradora/planilla/factura/banco. |
| OCR/documentos | Muy parcial | PDF/imagen/OCR debe crear propuestas con diff, no escribir directo datos criticos. |
| Aseguradoras | Parcial bajo | Convertir en hub/fuente transversal para productos, tarifas, cotizador, comparativo, IA, cartera, comisiones, documentos, accesos. |
| Academia | Parcial | Generica, multi-tenant, sin nombres de sistemas anteriores. |

---

## 4. Regla matriz: importar no es solo leer

Todo importador debe poder crear o actualizar entidades reales, pero solo bajo pipeline seguro:

```txt
archivo / documento / imagen / PDF / Excel / CSV
→ clasificacion de fuente
→ deteccion de hojas/paginas/bloques/columnas
→ mapeo con sinonimos
→ extraccion / normalizacion
→ dry-run crear/actualizar/omitir/requiere_validacion
→ confirmacion humana
→ escritura por API de Orbit.store/backend
→ auditoria y trazabilidad
```

Niveles de escritura:

| Nivel | Nombre | Accion |
|---|---|---|
| 0 | lectura | No escribe. |
| 1 | propuesta | Crea registro temporal/propuesta. |
| 2 | dry-run | Calcula impactos sin escribir entidades finales. |
| 3 | escritura controlada | Crea/actualiza entidades confirmadas. |
| 4 | conciliacion | Vincula entidades entre fuentes. |
| 5 | cierre operativo | Cambia estados finales con auditoria. |

---

## 5. Entidades fuente y destino

| Fuente | Debe crear/actualizar | No debe crear directamente |
|---|---|---|
| Clientes/contratantes | `clientes`, `contactosCliente`, `calidadDatos`, `asignacionesAsesor`, `gestionesCorreccion` | Polizas, cobros, cartera, finmovs. |
| Documentos de identidad | `documentos`, `documentosPropuestas`, parches de cliente, calidad de datos | Cambios definitivos sin validacion. |
| Persona juridica | Cliente empresa, representante, NIT/RTU/RUT/Camara/patente, direccion fiscal propuesta | Polizas/cobros sin cruce. |
| Polizas estructuradas | `polizas`, `vigenciasPoliza`, `produccion`, `renovaciones`, `recibosEsperados`, calidad poliza | Cobros pagados, CxC/CxP, finmovs. |
| Poliza PDF | Propuesta de poliza/vigencia/recibos/bien asegurado | Escritura final sin validacion. |
| Vehiculos/bienes | `bienesAsegurados`, `vinculosPolizaBien`, calidad vehiculo | Poliza completa si fuente no es maestra. |
| Tarjeta circulacion/propiedad | Propuesta de vehiculo, placa, chasis, motor, propietario | Cambio validado sin revision. |
| Recibos/cobros fuente externa | `recibosFuenteExterna`, `cobrosFuenteExterna`, `aplicacionesPagoPropuestas`, `conciliacionesPrimas` | Finmovs, CxC/CxP, conciliado final. |
| Estados cuenta aseguradora | `estadosCuentaAseguradora`, `recibosAseguradora`, `carteraPrimas`, `agingCartera`, `conciliacionesPrimas`, `gestionesCobro` | Facturas, CxC, pagos definitivos. |
| Soportes de pago | `soportePagoCliente`, `pagoReportado`, propuesta de aplicacion | Pago definitivo sin banco/validacion. |
| Planillas comisiones | `planillasComisiones`, `comisionesDevengadas`, `recaudosProbables`, `comisionesAsesorPropuestas`, `conciliacionesComisiones` | Prima pendiente, finmov, pago asesor automatico. |
| Facturas comisiones | `facturasComisiones`, `cxcComisiones`, `conciliacionesComisiones`, documentos soporte | Prima/cobro/poliza. |
| Estado bancario | `movimientosBanco`, `conciliacionBancaria`, `finmovs` validados, `cxcCobradas`, `cxpPagadas` | Clientes, polizas, recibos sin conciliacion. |
| Docs aseguradora | `documentosAseguradora`, propuestas de tarifa/producto/cobertura, datos para cotizador/comparativo/IA | Tarifa oficial sin aprobacion. |

---

## 6. Clientes P0

### Reglas confirmadas

- Duplicados exactos claros: fusionar/actualizar si el dry-run los identifica con alta confianza.
- Duplicados probables: no fusionar; crear alerta/revision.
- Documento faltante: `FALTA_DOCUMENTO`.
- Geografia incompleta: no frena importacion; marcar calidad.
- Estado inicial hasta polizas: `pendiente_polizas`.
- Folio cliente no se importa ni se usa.
- Vendedor/asesor vacio: asignacion temporal configurable con alerta, no hardcode.
- Asesores ven calidad solo de sus clientes segun scope.

### Gaps de implementacion

- El importador actual debe distinguir `duplicado_exacto` vs `duplicado_probable`.
- Debe crear `calidadDatos` y `gestionesCorreccion`, no solo campos en cliente.
- Debe soportar documentos por pais/tipo persona:
  - GT: DPI, RTU, patente, nombramiento, recibo servicios.
  - CO: cedula, RUT, Camara de Comercio, representante legal.
  - Otros paises: catalogo configurable.

---

## 7. Polizas P0

### Llave de deduplicacion correcta

No usar solo numero de poliza.

```txt
aseguradora + numeroPoliza + contratante/asegurado normalizado + vigenciaInicio + vigenciaFin
```

### Estados obligatorios

| Campo | Uso |
|---|---|
| `estadoFuenteOriginal` | Estado literal de la fuente importada. No visible en Academia con nombre de sistema anterior. |
| `estadoOperativoOrbit` | Vigente, renovada vigente, vencida, cancelada terminal, historica, requiere validacion. |
| `estadoCartera` | Genera cartera operativa, recibo analitico, brecha historica, no exigible. |
| `estadoConciliacion` | Pendiente, conciliado, conflicto, requiere validacion. |

### Reglas

- Renovada con vigencia activa puede ser `vigente_renovada`.
- Cancelada exacta por fuente de canceladas marca terminal solo esa vigencia exacta.
- Vencidas 2025/2026 pueden generar recibos para analitica/conciliacion, no cartera viva automatica.
- 2024 hacia atras: historico salvo cobro real/documentacion que amerite analisis.
- Sin moneda: resolver por pais de aseguradora si catalogo confiable; si no, `REQUIERE_VALIDACION_PAIS_MONEDA`.
- USD se conserva y se asocia al pais/aseguradora correspondiente.
- Produccion/metas/comisiones se calculan sobre prima neta recaudada.
- Prima debe separarse: neta, gastos, IVA/impuestos, total.

---

## 8. Recibos, cobros y cartera P0

### Capas separadas obligatorias

| Capa | Origen | Uso |
|---|---|---|
| `reciboEsperado` | Poliza + vigencia + forma de pago | Cronograma teorico. |
| `reciboFuenteExterna` | Reporte de recibos/cobros de una base externa | Estado registrado en fuente externa. |
| `reciboAseguradora` | Estado de cuenta/cartera de aseguradora | Pendiente real reportado por compania. |
| `cobroConfirmado` | Banco/validacion manual/soporte conciliado | Pago confirmado. |

### Estados

- `recibo_esperado`
- `pendiente_fuente_externa`
- `pagado_fuente_externa`
- `pendiente_aseguradora`
- `recaudo_probable_por_planilla`
- `pendiente_real`
- `conciliado_prima`
- `conflicto_fuente_aseguradora`
- `conflicto_planilla_fuente`
- `conflicto_planilla_aseguradora`
- `brecha_historica`
- `requiere_validacion`

### No mezclar

- Cartera de primas no es CxC financiera.
- Cobro/recaudo no es `finmov` hasta confirmacion bancaria/financiera.
- Estado de cuenta aseguradora no marca pagado; solo confirma pendiente o ausencia de pendiente.

---

## 9. Estados de cuenta aseguradora P0

Deben crear entidades propias:

```txt
estadosCuentaAseguradora
recibosAseguradora
carteraPrimas
agingCartera
conciliacionesPrimas
gestionesCobro
```

Campos minimos:

```txt
tenantId
pais
moneda
aseguradoraId
fechaCorte
archivoFuente
hoja/pagina/bloque/fila
poliza
asegurado/contratante normalizado
recibo/requerimiento/factura si existe
fechaVencimiento
monto
bucketAging
estadoConciliacion
requiereValidacion
```

---

## 10. Planillas de comisiones P0

### Uso correcto

Las planillas de comisiones ayudan a:

1. Identificar recaudos probables del periodo.
2. Crear comision devengada por A&S.
3. Preparar conciliacion contra factura emitida.
4. Proponer liquidacion a vendedor/asesor.

No deben marcar prima como pagada definitiva.

### Entidades

```txt
planillasComisiones
comisionesDevengadas
recaudosProbables
conciliacionesComisiones
comisionesAsesorPropuestas
```

### Estados

- `comision_devengada_planilla`
- `pendiente_facturar`
- `no_facturado_acumulado`
- `facturado`
- `factura_cuadra`
- `diferencia_planilla_factura`
- `pendiente_recaudo_comision`
- `comision_recaudada`
- `liquidable_asesor`
- `cxp_asesor_pendiente`
- `cxp_asesor_pagada`

---

## 11. Facturas de comision / CxC / CxP P0

### Separacion obligatoria

| Concepto | Modulo | Crea CxC/CxP |
|---|---|---|
| Prima pendiente de cliente | Cobros/Cartera | No. |
| Factura de comision emitida por A&S | Finanzas/Comisiones | Crea CxC de comision. |
| Comision a asesor/vendedor | Comisiones/Liquidaciones | Crea CxP asesor cuando sea liquidable. |
| Pago bancario recibido | Finanzas/Banco | Marca CxC cobrada si concilia. |
| Pago bancario a asesor | Finanzas/Banco | Marca CxP pagada si concilia. |

### Flujo

```txt
planilla_comision
→ comision_devengada
→ factura_comision
→ cxc_comision
→ banco confirma ingreso
→ comision_recaudada
→ liquidacion_asesor
→ cxp_asesor
→ banco confirma egreso
→ cxp_asesor_pagada
```

---

## 12. Documentos/OCR P0/P1

El importador documental debe aceptar:

- DPI/Cedula/Pasaporte.
- RTU/RUT/Camara/patentes/nombramiento.
- Recibo de servicios para direccion.
- Polizas PDF por aseguradora/formato.
- Facturas de prima y facturas de comision.
- Soportes de pago en imagen/PDF.
- Tarjetas de circulacion/propiedad.
- Estados de cuenta bancarios.
- Cotizaciones PDF/imagen/Excel.
- Tarifarios PDF/Excel.

Regla: OCR/documentos crean propuestas y diffs, no escritura critica directa.

Colecciones sugeridas:

```txt
documentos
documentosExtracciones
documentosPropuestas
documentosValidaciones
documentosVinculos
ocrJobs
documentosVersiones
documentosPermisos
```

---

## 13. Aseguradoras Hub P1

El modulo de aseguradoras debe evolucionar a fuente de alimentacion transversal.

Debe administrar por aseguradora/pais/tenant:

- identidad legal/comercial/logo;
- contactos por area;
- accesos y `credentialRef` sin secretos visibles;
- portales/plataformas;
- productos/ramos/subramos;
- tarifas/versiones/vigencia;
- polizas PDF de ejemplo;
- cotizaciones PDF de ejemplo;
- excels/tarifarios;
- reglas de forma de pago;
- reglas de comision;
- estados de cuenta/cartera;
- documentos comerciales;
- requisitos de emision;
- integraciones;
- insumos para Cotizador/Comparativo;
- insumos para Asistencia IA;
- material de Academia.

No debe ser una ficha plana.

---

## 14. Cotizador/Comparativo P1

Queda anotado, sin desviarse del plan actual.

Fuentes que alimentan cotizador/comparativo:

- documentos y tarifarios del modulo Aseguradoras;
- cotizaciones PDF/Excel por aseguradora;
- reglas de producto/ramo/subramo;
- coberturas, deducibles, exclusiones;
- prima neta/gastos/IVA/total;
- reglas de moneda/pais;
- condiciones comerciales;
- `comparativo_final_v110.html` como fuente aislada ya recibida para revisar despues.

No pasar a este bloque hasta cerrar P0 de importadores/conciliacion y sin pisar backend protegido.

---

## 15. Movimientos financieros P1

Pendiente posterior al cierre P0:

- importar estados bancarios;
- crear movimientos banco en bandeja de conciliacion;
- confirmar CxC de comisiones cobradas;
- confirmar CxP de asesores pagadas;
- separar pagos de clientes, comisiones, gastos, proveedores;
- no crear clientes/polizas/cobros desde banco;
- no usar finmovs como fuente de cartera.

---

## 16. Archivos candidatos a tocar cuando se implemente

Sin tocar protegidos salvo autorizacion explicita.

| Area | Archivo candidato |
|---|---|
| Importadores frontend/wizard | `orbit360-platform/core/importa.js` |
| Reglas primas/recibos | `orbit360-platform/core/primas.js` si existe / modulo equivalente |
| Configuracion tenant | `orbit360-platform/modules/configuracion.js` |
| Aseguradoras hub | `orbit360-platform/modules/aseguradoras.js` |
| Finanzas/CxC/CxP | `orbit360-platform/modules/finanzas.js` |
| Cobros/cartera | `orbit360-platform/modules/cobros.js` o modulo equivalente |
| Cliente360/calidad | `orbit360-platform/modules/clientes.js` o modulo equivalente |
| Academia | `orbit360-platform/modules/academia.js` o docs/Academia correspondientes |
| Documentacion | `orbit360-platform/docs/*` |

---

## 17. Smoke/validacion minima requerida

Antes de considerar cerrado P0 tecnico:

1. Importar clientes ficticios multi-pais y validar dry-run.
2. Importar polizas ficticias con renovada vigente, cancelada exacta, vencida historica y moneda faltante.
3. Generar recibos esperados solo cuando aplique.
4. Importar estado cuenta aseguradora ficticio y crear cartera de primas separada.
5. Importar planilla de comisiones ficticia y crear comision devengada/recaudo probable.
6. Importar factura de comision ficticia y crear CxC de comision.
7. Importar banco ficticio y marcar CxC cobrada / CxP pagada solo con validacion.
8. Validar que primas pendientes nunca sean CxC financiera.
9. Validar que Academia/UI no muestren nombres de sistemas anteriores.
10. Validar que docs de aseguradora alimenten hub, no tarifas oficiales sin aprobacion.

---

## 18. Estado del bloque

- Clientes, polizas, cobros, recibos, estados de cuenta, planillas, facturas, CxC/CxP y conciliaciones: trabajados conceptualmente y contrastados contra fuentes reales A&S.
- Implementacion actual: parcial; requiere P0 antes de cargar datos reales o cerrar modulo.
- Siguiente paso: implementar ajustes P0 de importadores/conciliacion en rama activa, de forma aditiva y sin tocar backend protegido.
- Claude: no usar todavia; primero cerrar contrato tecnico/backend y gaps P0. Luego trasladar a Claude UX/Academia/Hubs con instrucciones precisas.
