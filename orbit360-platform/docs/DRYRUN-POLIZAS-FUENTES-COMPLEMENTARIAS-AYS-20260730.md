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
5. Póliza, recibo, cobro aplicado y conciliación permanecen separados.
6. Este bloque no genera cartera ni aplica cobros.

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
- estados fuente `Vencida` incompatibles con vigencia activa + emisión al corte: **109**; se conserva el estado fuente y una advertencia de calidad en vez de borrar la contradicción;
- recibos julio en staging: **101** (`96 Por Cobrar`, `5 Cobrado El`);
- cobros/conciliaciones aplicados en este bloque: **0**;
- Firestore/Orbit.store writes de este análisis: **0**.

## Hallazgo de contrato

Los 109 casos `Vencida` con vigencia que contiene el 30-07-2026 y presencia en el reporte de emitido vigente se clasifican como `DATA_CONTRACT_FAILURE` de calidad/estado fuente, no como motivo para desechar la póliza. El dry-run propone estado operativo vigente con trazabilidad de la contradicción. La cartera permanece diferida al bloque Recibos/cartera.

Las dos vigencias invertidas quedan bloqueadas para escritura canónica hasta validación/corrección de fuente.

## Reuso transversal

Se reutiliza la arquitectura post-M6: Auth/membership, scopes, Orbit.store/write guard, manifiesto/aliases, readiness, smoke multirol/multivista, integridad before/after, rollback fail-closed, STOP_RETRY y gate único. Pólizas agrega únicamente normalización, identidad de término, estados/vigencias, país/moneda, prima y relaciones.

Reglas tenant A&S implementadas sin datos reales:

- `tools/orbit360-ays-policy-source-rules-v20260730.mjs`
- `tools/orbit360-test-ays-policy-source-rules-v20260730.mjs`

Prueba sintética previa: `PASS`, 0 filas reales, 0 escrituras.

## Períodos posteriores — regla de solicitud

- **Vehículos:** fuente histórica 2017–2026 ya recibida; si aparecen altas después del 30-07-2026, pedir solo el delta desde 31-07-2026 hasta el nuevo corte.
- **Recibos/cartera:** saldo/cartera vigente al corte de migración; solo pólizas Vigente/Por renovar/futuras cuando inicie vigencia. Histórico no entra a cartera viva.
- **Cobros realizados:** para el cierre operativo inicial, mayo–julio 2026 hasta el corte vigente, como fuente separada.
- **Planillas de aseguradora:** mayo–julio 2026 hasta el corte vigente para conciliación.
- **Planillas de comisiones:** junio–julio 2026 hasta el corte vigente, según fuentes disponibles por aseguradora.
- **Estado de cuenta bancario:** mayo–julio 2026 hasta el corte vigente; solo conciliación, nunca creación automática de cobros.
- **Financiero histórico:** 2024-11 a 2026-04 permanece como histórico; mayo–julio 2026 se completa/cierra mediante conciliación y fuentes operativas separadas.
- **Siniestros:** al llegar al bloque se solicitará el histórico disponible hasta el corte exacto; posteriores solicitudes serán solo delta.

## Estado

`POLIZAS_DRYRUN_CONSOLIDADO_LISTO / ESCRITURA_REAL_AUN_NO_AUTORIZADA`

Siguiente acción exacta: preparar el paquete inmutable de persistencia de pólizas + creación idempotente de los clientes faltantes, excluyendo las dos vigencias invertidas y sin materializar cartera/cobros; ejecutar validaciones estáticas/sintéticas antes de solicitar una única autorización macro de escritura.
