# GRAVICENTRA QUOTE AUTHORITY CONTRACT v1

**Fecha:** 2026-10-03  
**Dominio:** Cotización / comparación / selección / handoff A&S  
**Autoridad:** Gravicentra Insurance  
**Consumidor:** CotComp / Web A&S  
**Estado:** FROZEN SOURCE CONTRACT · PROVIDER TRANSPORT PENDING · NO LIVE  
**Contrato ejecutable:** `orbit360-platform/core/quote-authority-contract-v1.js`

## 0. Autoridad reconciliada

Este contrato NO adopta ciegamente el handoff interproyecto y NO reconstruye el motor.

Baseline Gravicentra previo a R10:
`421a356b0dbd0b9f935c8aa1cd5435b558e26572`.

A&S Transformación Digital contemporáneo:
`paulaosoriof86/ays-transformacion-digital@4128feedeb1b957e3dc3d76fe5b8bb085849cfae`.

El archivo recibido por Gravicentra es v1.0 y se conserva como evidencia histórica del handoff. El estado contemporáneo de A&S declara v1.1 como paquete recomendado y conserva v1.0 como histórico. Los hallazgos S4.83 se reconciliaron nuevamente contra la rama física de recovery de Gravicentra, no contra el antiguo HEAD forense usado por CotComp.

Autoridad interna Gravicentra preservada:
- R7: `I6_5_B4_003_R7_CUMULATIVE_PLAN_FINDINGS_PREMIUM_AND_MANUAL_ACTION_LOCK_20261003.json`.
- R8: `I6_5_B4_003_R8_INFORMATION_HEALTH_AND_INSURER_KNOWLEDGE_LOCK_20261003.json`.
- R9: conocimiento de aseguradoras visible y respaldado por fuentes, sin auto-habilitación.
- R10: este contrato + guards incrementales.

## 1. Decisión rectora

`GRAVICENTRA = QUOTE DOMAIN AUTHORITY`.

CotComp no mantiene un segundo motor tarifario. CotComp puede capturar riesgo/preferencias, presentar opciones, explicar diferencias y transportar una selección explícita, pero no recalcula ni corrige primas, recargos, impuestos, elegibilidad o reglas de aseguradora.

Cambiar una regla habilitada y vigente en Gravicentra afecta únicamente nuevas cotizaciones. Una Proposal ya materializada queda pinned al conjunto exacto de versiones/digest/fuente usado al calcularla.

## 2. Clasificación del handoff

| Aporte | Clasificación | Disposición contemporánea |
|---|---|---|
| Una autoridad de negocio / varias experiencias | ALREADY_EXISTS | Preservar y hacer explícita en provider contract. |
| P06 multiproducto: aplicabilidad, amountBasis, componentes | ALREADY_EXISTS | Reutilizar. No reconstruir. |
| P06C: desglose, evidencia, doble impuesto/doble gasto | ALREADY_EXISTS | Reutilizar como cálculo/reconciliación source-backed. |
| Segundo gate validar ≠ habilitar | ALREADY_EXISTS | Mantener. Parsear/validar nunca habilita automáticamente. |
| Desglose de prima canónico para consumo externo | ADJUST | Los campos existen internamente; R10 fija semántica provider-side. |
| Fraccionamiento aseguradora vs financiación externa/Visa Cuotas | ADJUST | Separar settlement de aseguradora y financiación del cliente. |
| Trace completo de versión/digest/vigencia | ADJUST | Se exigen nueve campos mínimos en toda Proposal consumible por CotComp. |
| Proposal canónica + pin histórico | ADJUST | Normalización existente; R10 agrega elegibilidad/current-version/trace estrictos. |
| Comparison facts con `MISSING != NOT_COVERED` | ADJUST | CotComp recibe facts; no ranking oculto desde Gravicentra. |
| Selection separada de ISSUED/BOUND/CONFIRMED | ADOPT | Congelado en SelectionHandoff v1. |
| SAT/catálogo vehicular como upstream/fixture | ADOPT | Útil como upstream y QA; no master productivo paralelo. |
| Defaults genéricos de `primas.js` como autoridad pública | REJECT | Pueden seguir sirviendo dominios internos; nunca rescatan una cotización CotComp. |
| Fallback tributario 12/19 para completar quote incompleta | REJECT | Impuesto automático requiere autoridad en regla/configuración. |
| Fallback silencioso P06 → motor legacy para CotComp | REJECT | La ruta provider-side es default-deny. |
| `aseguradora.cotTasas` legacy como autoridad competidora | REJECT | Compatibilidad interna solamente; no participa del provider contract. |
| Derivar neta/IVA desde total manual con porcentaje país | REJECT | Total fuente se preserva; faltantes quedan `requires_validation`. |
| Ranking ponderado interno como verdad de CotComp | REJECT | La proyección pública no trae ranking/recomendación por defecto. |
| Manifest + Quote API + Selection endpoint reales | DEPENDENCY | Contrato congelado; transporte/deploy LAB aún debe implementarse y probarse. |
| Proyección productiva de catálogo vehicular gobernado | DEPENDENCY | Falta materializar endpoint/proyección versionada de Gravicentra. |

## 3. Ownership por campo

| Campo/dominio | Autoridad | Regla |
|---|---|---|
| Aseguradora elegible/activa | Gravicentra | CotComp consume. |
| Producto / plan / subproducto | Gravicentra | No catálogo financiero paralelo en Web. |
| Fuente, regla, binding, proveedor | Gravicentra | Navegador nunca llama proveedor/rater directamente. |
| Elegibilidad | Gravicentra | Un DENY no puede reinterpretarse en Web. |
| Tarifa / prima mínima / componentes | Gravicentra | Fuente + versión + vigencia + gate. |
| Prima total y premium breakdown | Proposal Gravicentra | CotComp muestra; no recalcula. |
| Fraccionamiento aseguradora | Proposal Gravicentra | Calendario/recargo source-backed. |
| Financiación externa | Proposal Gravicentra o fuente externa explícita gobernada | Separada del fraccionamiento de aseguradora. |
| Coberturas / límites / deducibles / asistencias | Proposal Gravicentra | Facts comparables normalizados. |
| Validación / vigencia Proposal | Gravicentra | Solo VALIDATED + current + vigente compara. |
| Comparison facts | Gravicentra | Sin ranking silencioso. |
| Presentación ComparisonSet | CotComp | UX pública. |
| Journey / captura progresiva | CotComp | No gobierna cálculo. |
| Consentimiento público | CotComp | Consentimiento no es Selection. |
| Elección explícita | Acción del usuario en CotComp | Se transporta a Gravicentra. |
| Emisión / binding / confirmación | Gravicentra | Selection no los presume. |
| Catálogo vehicular | Gravicentra o servicio compartido gobernado por Gravicentra | CotComp recibe proyección read-only versionada. |
| Analítica funnel Web | CotComp | No reemplaza métricas operativas. |

## 4. Jerarquía de autoridad financiera

Orden obligatorio:

1. Documento/cotizador oficial vigente de aseguradora o valores contractuales aprobados e identificables.
2. Regla tarifaria canónica Gravicentra por país + aseguradora + ramo/producto + riesgo + plan + condición de pago, con fuente, versión y vigencia.
3. Entrada manual versionada cuando el proceso legítimamente la requiera, con fuente/referencia, actor y motivo.
4. Heurísticas/defaults de país solo como ayuda de interfaz/análisis. Nunca certifican un valor contractual de una cotización.

Reglas:
- Si la fuente entrega `primaTotal`, se preserva el total contractual.
- Si faltan componentes necesarios, no se reconstruyen desde un default genérico.
- Si existen todos los componentes autoritativos, se recalculan para reconciliar; una diferencia material queda bloqueada/requiere validación.
- Nunca derivar `primaNeta` del total por diferencia para “hacer cuadrar” la propuesta.
- No añadir impuesto/gasto nuevamente si `amountBasis` declara que ya está incluido.

## 5. Premium breakdown v1

Toda Proposal autoritativa expone, según aplique:

```
currency
amountBasis
netPremium
minimumPremiumApplied
issuanceExpense
expeditionExpense
assistance
discounts
other
insurerInstallmentSurcharge
externalFinanceCost
taxAmount
totalPremium
payment
paymentOptions[]
```

`amountBasis`:
- `net`
- `gross_includes_tax`
- `gross_includes_fees`
- `gross_includes_tax_and_fees`
- `requires_validation`

`requires_validation` nunca es elegible para Proposal pública validada.

## 6. Fraccionamiento / financiación

No se utiliza un único campo ambiguo “recargo”.

```
payment.insurerSettlementMode
payment.customerPaymentMode
payment.financingProvider
payment.insurerInstallments
payment.externalInstallments
payment.insurerSurcharge
payment.externalFinanceCost
```

Ejemplo semántico: Visa Cuotas puede significar `insurerSettlementMode=cash` y `customerPaymentMode=external_financing`. En ese caso el costo de la financiación no es un recargo de fraccionamiento de la aseguradora.

Los recibos/cartera siguen su dominio operativo. La suma de recibos generados desde una póliza emitida debe reconciliar exactamente contra su prima total contractual; este contrato de cotización no convierte automáticamente una preferencia de pago en calendario de cartera.

## 7. Versionado obligatorio de Proposal

Trace mínimo:

```
configurationVersion
tariffVersion
sourceVersion
providerBindingVersion
catalogVersion
rulesDigest
calculatedAt
validityFrom
validityTo
sourceDocumentId/sourceRef
ruleId
bindingId
```

Una Proposal histórica no se recalcula ni reescribe al cambiar configuración. Un cambio habilitado produce una nueva Proposal/version para nuevas solicitudes.

## 8. Elegibilidad

Automatic quote:
- binding P06 habilitado;
- regla validada y aplicable;
- fuente identificable;
- amountBasis suficiente;
- vigencia efectiva;
- trace completo;
- cálculo/reconciliación sin blockers.

Si cualquiera falla:
`NOT_AUTOMATIC / HYBRID / REQUIRES_VALIDATION`.

Prohibido:
`NO_SOURCE -> GENERIC_COUNTRY_DEFAULT_QUOTE`.

Proposal comparable:
- `validationState=VALIDATED`;
- `currentVersion=true`;
- vigente;
- no estimación interna;
- premium breakdown válido;
- trace completo.

## 9. Proposal v1

Bloques mínimos:
- identidad: tenant, país, moneda, aseguradora, producto/plan, case/risk;
- origen: tipo de fuente, documento/cotizador, rule/binding;
- finanzas: premium breakdown + opciones de pago;
- seguro: coberturas, límites/sublímites, deducibles, asistencias, condiciones/exclusiones;
- vigencia;
- gobierno: validationState, currentVersion, provenance, versiones/digest, actor/revisión.

Orígenes permitidos:
`tariff_rule`, `official_quote`, `official_pdf`, `excel_calculator`, `assisted_online`, `manual_versioned`.

## 10. ComparisonProjection v1

Gravicentra devuelve Proposal(s) validadas y facts comparables. CotComp controla composición visual.

Estados de facts:
- `PRESENT`
- `MISSING`
- `NOT_COVERED`
- `NOT_APPLICABLE`
- `NOT_COMPARABLE`

Reglas:
- `MISSING != NOT_COVERED`;
- no silent weighting;
- no ranking por defecto;
- no “mejor” inferido por ausencia de información;
- toda diferencia debe trazar a Proposal/fuente.

El ranking/recomendación interna histórica de Gravicentra no forma parte del contrato público v1.

## 11. SelectionHandoff v1

Requiere:
```
tenantId
caseId
comparisonId
proposalId
correlationId
idempotencyKey
explicitUserChoice=true
state=USER_SELECTED_FOR_CONTINUATION
```

Selection no puede afirmar:
- `ISSUED`
- `BOUND`
- `CONFIRMED`

Esos estados solo los cambia Gravicentra con evidencia operativa correspondiente.

## 12. Contratos que CotComp debe consumir

### Manifest
Read-only. Debe publicar versión de contrato, configuración disponible, catálogo/proyección, capabilities y freshness/digest. No contiene secretos ni reglas editables en navegador.

### QuoteRequest
CotComp envía identidad de riesgo/contexto/preferencia de pago + correlation/idempotency. Está prohibido enviar overrides financieros/tarifarios para cambiar la autoridad.

### QuoteResult / Proposal
CotComp acepta los importes y facts autoritativos devueltos; puede validar schema/formato, pero no recalcularlos.

### ComparisonProjection
Facts normalizados o Proposal[] válidas. CotComp presenta y explica.

### SelectionHandoff
Elección explícita idempotente/correlacionada. Gravicentra crea/actualiza continuidad operativa.

## 13. Cambios concretos para CotComp

CotComp debe:
- conservar S4.80A como patrón UX, pero alimentar Marca/Línea/Año desde proyección Gravicentra versionada cuando exista;
- sustituir transporte sintético S4.82 solo después del provider-side LAB PASS;
- consumir `authorityContractVersion=gravicentra-quote-authority-v1`;
- rechazar response sin trace completo;
- no corregir ni completar premium breakdown;
- no mapear MISSING a NOT_COVERED;
- no aplicar ranking/recomendación silenciosa;
- mantener Proposal histórica inmutable/pinned;
- enviar SelectionHandoff solo tras acción explícita;
- no llamar APIs/cotizadores de aseguradora desde navegador.

CotComp NO necesita reimplementar P06, P06C, reglas de impuesto, prima mínima, gastos, fraccionamiento, elegibilidad ni bindings.

## 14. Integración R10 ya aplicada en Gravicentra

- Nuevo contrato puro: `core/quote-authority-contract-v1.js`.
- P06 runtime adapter obtiene una ruta estricta `calculateAuthoritative` que nunca usa fallback legacy y exige trace completo cuando el contrato está cargado.
- Cotización normalizada preserva `amountBasis` y `authorityTrace`.
- El cálculo automático legacy ya no puede rescatar un impuesto faltante mediante fallback de país.
- Manual/PDF ya no derivan neta/IVA desde un total usando 12/19; faltantes quedan en revisión.
- La revisión humana exige una base monetaria explícita antes de validar.

Estos cambios NO habilitan transporte CotComp real ni deploy productivo.

## 15. Dependencias para provider transport real

Pendiente, dentro del plan/gate vigente:
- manifest provider-side;
- QuoteRequest transport;
- Proposal DTO/export;
- SelectionHandoff transport;
- correlation/idempotency server-side;
- proyección de catálogo gobernada por Gravicentra;
- exact LAB proof: config v2 cambia nueva quote sin redeploy de CotComp;
- exact LAB proof: Proposal v1 histórica no cambia;
- no LIVE antes del gate autorizado.

## 16. Anti-regresión

- No segunda tabla tarifaria productiva en CotComp.
- No hardcodes financieros en Web.
- No provider directo en navegador.
- No fallback financiero genérico para quote pública.
- No auto-enable por ingestión/validación.
- No mutación retroactiva de Proposal.
- No Selection implícita.
- No B4-004 mientras B4-003 siga pendiente de su aceptación acumulativa.

