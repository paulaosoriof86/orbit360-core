# DRY-RUN PÓLIZAS — FUENTES COMPLEMENTARIAS A&S

Fecha: 2026-07-30  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Modo: `DRY_RUN_NO_WRITES`

## Decisiones vigentes de Paula

1. Las fuentes de pólizas/renovaciones entregadas el 30-07-2026 son complementarias y deben consolidarse antes de cualquier escritura.
2. Si una póliza corresponde a un cliente que no existe, el importador puede proponer la creación idempotente del cliente y dejar `calidad_datos = pendiente_completar`; no se inventan documento, teléfono, correo ni otros datos ausentes.
3. Regla A&S para país/moneda en esta migración:
   - moneda/divisa explícita prevalece;
   - `GTQ` implica GT y `COP` implica CO;
   - si no existe divisa, usar GT/GTQ por defecto;
   - si no existe divisa y el monto es de millones / muy grande, tratarlo como indicio CO/COP;
   - implementación del dry-run: umbral tenant configurable de `1,000,000`, siempre con `provenance` de inferencia;
   - USD explícito se conserva y no se convierte automáticamente a GTQ/COP.
4. Esta heurística es `TENANT_AYS_ONLY`; no se hardcodea como regla universal de Orbit 360.
5. **El estado contractual/operativo de la póliza lo determina la vigencia.** Un estado fuente `Vencida` puede corresponder a pagos/recibos y no convierte en histórica una póliza cuya vigencia contiene la fecha de corte.
6. El estado fuente se conserva íntegro para trazabilidad. Cuando contradice una vigencia activa se registra `estadoFuenteContradiceVigencia = true`, sin borrar ni reinterpretar el valor de origen.
7. La situación de pago se resolverá posteriormente en los bloques `Recibos/cartera` y `Cobros/conciliación`; no se mezcla con el estado contractual de Pólizas.
8. Póliza, recibo, cobro aplicado y conciliación permanecen separados.
9. Este bloque no genera cartera ni aplica cobros.

## Fuentes recibidas en el corte

- `Renovaciones 2024 a 2026.xlsx` — 247 filas útiles.
- `Listado de pólizas al 30 de julio 2023.xlsx` — 1,381 filas útiles; el contenido contiene vigencias posteriores al nombre del archivo, por lo que manda el contenido y su trazabilidad.
- `Listado de Emitido 2017 a 30 jul.xls` — 1,374 filas útiles de emisión.
- `Total emitido 2017 a julio 30 2026.xls` — variante del mismo reporte operativo; no se suma como una segunda fuente independiente.
- `Pólizas con endosos y recibos a partir de julio 2026.xls` — 21 pólizas recientes y 101 recibos en staging separado.
- `Reporte de vehículos 2017 a 2026.xlsx` — 1,058 filas reservadas para el siguiente bloque; no crea pólizas por sí sola.

Los payloads reales permanecen fuera del repositorio. Este documento solo registra resultados sanitizados/agregados.

## Resultado consolidado sanitizado

- filas candidatas de póliza consideradas, sin duplicar el reporte emitido: **3,023**;
- términos canónicos consolidados: **1,377**;
- términos respaldados por dos o más fuentes: **1,370**;
- propuesta `CREAR`: **1,375**;
- `REQUIERE_VALIDACION` antes de escritura por vigencia invertida: **2**;
- clientes nuevos candidatos: **2**;
- pólizas asociadas a esos clientes: **3**;
- estado operativo propuesto `Vigente`: **225**;
- vigencias futuras detectadas: **7**, sin cartera antes de su inicio;
- estados fuente `Vencida` con vigencia activa: **109**; por regla de negocio confirmada no son bloqueo ni convierten la póliza en histórica; se conserva el estado fuente y se normaliza el estado contractual por vigencia;
- recibos julio en staging: **101** (`96 Por Cobrar`, `5 Cobrado El`);
- cobros/conciliaciones aplicados en este bloque: **0**;
- Firestore/Orbit.store writes de este análisis: **0**.

## Cierre del hallazgo de estado `Vencida`

La clasificación previa `DATA_CONTRACT_FAILURE` para los 109 casos queda **cerrada por definición de negocio confirmada por Paula**: en Pólizas manda la vigencia contractual. El valor `Vencida` del reporte se conserva como `estadoFuenteOriginal` y, cuando la vigencia está activa, se marca únicamente como contradicción de fuente no bloqueante.

Implementación reusable:

- `orbit360-platform/core/importa-polizas-p0.js`: **solo** `Vencida` + vigencia activa → `vigente_operativa`, preservando `estadoFuenteOriginal` y `estadoFuenteContradiceVigencia = true`. `Terminada` y `Reexpedida` continúan como estados históricos salvo una regla de negocio futura específica.
- `tools/orbit360-test-importa-polizas-vigencia-authority-v20260730.mjs`: prueba sintética con datos ficticios; activo `Vencida` queda Vigente, vencido por fecha queda histórico y `Terminada/Reexpedida` no se reactivan automáticamente.

Resultado sintético: `PASS`; `firestoreWrites = 0`; `operationalWrites = 0`.

Las dos vigencias invertidas continúan bloqueadas para escritura canónica hasta validación/corrección de fuente.

## Calidad pendiente de clientes nuevos

El writer controlado común fue corregido para que un cliente creado desde una fuente de póliza con `calidad_datos = pendiente_completar` conserve esa calidad después de persistir y **no sea promovido artificialmente a `validationStatus = validado`**.

Implementación reusable:

- `orbit360-platform/core/importa-write-p0.js`: caso controlado `pending_client_quality`.
- `tools/orbit360-test-importa-write-p0.mjs`: prueba sintética de persistencia, auditoría y rollback con datos ficticios.

Resultado sintético: `PASS`; colecciones bloqueadas continúan bloqueadas; rollback preservado; sin escrituras reales.

## Reuso transversal

Se reutiliza la arquitectura post-M6: Auth/membership, scopes, Orbit.store/write guard, manifiesto/aliases, readiness, smoke multirol/multivista, integridad before/after, rollback fail-closed, STOP_RETRY y gate único. Pólizas agrega únicamente normalización, identidad de término, estados/vigencias, país/moneda, prima y relaciones.

Reglas tenant A&S implementadas sin datos reales:

- `tools/orbit360-ays-policy-source-rules-v20260730.mjs`
- `tools/orbit360-test-ays-policy-source-rules-v20260730.mjs`

Prueba sintética previa: `PASS`, 0 filas reales, 0 escrituras.

## Períodos posteriores — regla de solicitud

- **Vehículos:** fuente histórica 2017–2026 ya recibida; si aparecen altas después del 30-07-2026, pedir solo el delta desde 31-07-2026 hasta el nuevo corte.
- **Recibos/cartera:** saldo/cartera vigente al corte de migración; la vigencia contractual define qué pólizas están activas; la condición de pago se determina con recibos/cobros, no con el estado fuente de Pólizas.
- **Cobros realizados:** para el cierre operativo inicial, mayo–julio 2026 hasta el corte vigente, como fuente separada.
- **Planillas de aseguradora:** mayo–julio 2026 hasta el corte vigente para conciliación.
- **Planillas de comisiones:** junio–julio 2026 hasta el corte vigente, según fuentes disponibles por aseguradora.
- **Estado de cuenta bancario:** mayo–julio 2026 hasta el corte vigente; solo conciliación, nunca creación automática de cobros.
- **Financiero histórico:** 2024-11 a 2026-04 permanece como histórico; mayo–julio 2026 se completa/cierra mediante conciliación y fuentes operativas separadas.
- **Siniestros:** al llegar al bloque se solicitará el histórico disponible hasta el corte exacto; posteriores solicitudes serán solo delta.

## Impacto Claude / Academia

- Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` para la separación reusable entre vigencia contractual y estado de pago.
- Academia: `ACADEMIA_ACTUALIZAR` con un caso práctico: una póliza puede estar contractualmente vigente aunque una fuente operativa la marque `Vencida` por condición de pago; Recibos/Cobros resuelven la mora y Pólizas resuelve la vigencia.
- Backend protegido/datos reales: no se envían a Claude.

## Estado

`POLIZAS_DRYRUN_CONSOLIDADO_LISTO / REGLA_VIGENCIA_Y_CALIDAD_CLIENTE_CERRADAS / ESCRITURA_REAL_AUN_NO_AUTORIZADA`

Siguiente acción exacta: cerrar el manifiesto/freeze sanitizado del paquete de persistencia de **1,375 pólizas + hasta 2 clientes idempotentes**, excluyendo las dos vigencias invertidas y sin materializar recibos/cartera/cobros; validar estáticamente contrato, auditoría y rollback antes de solicitar una única autorización macro de escritura.
