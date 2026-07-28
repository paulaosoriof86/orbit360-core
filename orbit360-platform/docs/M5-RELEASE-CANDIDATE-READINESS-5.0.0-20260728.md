# M5 5.0.0 — Release candidate readiness

Fecha: 2026-07-28  
Gate único M5: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado vigente

`M5_FROZEN_M4_CANONICAL_TARGET_MIGRATION_PENDING`.

La ejecución 5.0.0 demostró correctamente la integridad visual de la candidata, pero su readiness de producto quedó invalidado al detectarse que el validador no exigía cardinalidad del destino canónico.

Clasificación del incidente: `VALIDATOR_STALE` + `DATA_CONTRACT_FAILURE`.

## Evidencia 5.0.0 preservada

```text
Run: 30400072369
Job: 90412449826
Artifact: 8704338707
Preflight: 31/31
Contrato: 24/24
RC hash: a891dbd159bd667125291460b9f2202fe5177f78df460791d685255940df1c13
Activos críticos: 40/40
Paridad visual LAB: 22/22
Hosting deploy ejecutado: no
```

Esta evidencia sigue siendo válida para integridad de frontend, pero no autoriza runtime smoke ni revisión visual.

## Causa de invalidación

El store productivo consume `tenants/{tenant}/data/{collection}/items`. El cierre M4 había probado que el origen estaba saneado en 414 clientes y 26 aseguradoras, pero no exigió que esos mismos conteos existieran en el destino canónico.

La lectura durable 4.2.10 confirmó:

```text
origen clientes: 414
origen aseguradoras: 26
destino canónico clientes: 0
destino canónico aseguradoras: 0
```

Por tanto, `M4_CLOSED_SUCCESS` fue prematuro y M4 se reabrió únicamente para completar la migración canónica. Las 61 correcciones GT/GTQ permanecen válidas y no se revierten.

## Regla corregida de readiness

Ningún nuevo readiness M5 podrá pasar sin demostrar simultáneamente:

```text
sourceClients == 414
sourceInsurers == 26
canonicalTargetClients == 414
canonicalTargetInsurers == 26
canonicalTargetConfig == 1
missingClientCurrency == 0
targetOnlyClients == 0
targetOnlyInsurers == 0
```

Un conteo correcto solo en origen nunca vuelve a ser suficiente.

## Deuda visual heredada

M1 dejó como deuda aceptada títulos móviles no completamente responsive, con cierre obligatorio antes de la release candidate productiva.

La implementación viva ya contiene owner explícito de títulos responsive en `styles/client-insurer-visual-contract-v20260720.css`: `clamp`, wrapping, `overflow-wrap`, cortes a 760 px y 430 px. La evidencia estática se preserva, pero la validación de navegador permanece bloqueada hasta cerrar M4.

## Próximo retorno a M5

Solo después del nuevo cierre M4 se repetirá el readiness sobre contrato corregido y, si pasa, el mismo gate deberá validar:

- Dirección — escritorio;
- Operativo — tableta;
- Asesor — móvil;
- login, membership, tenant, rol activo y scope;
- 414 clientes y 26 aseguradoras desde el store canónico;
- Cliente 360 lista/ficha/calidad;
- Aseguradoras directorio/ficha/conocimiento;
- GT/CO y sin monedas mezcladas;
- relaciones faltantes honestas;
- sin copy técnico, seed/demo ni secretos;
- sin dobles listeners/renderers;
- sin error bloqueante.

Además, antes de ese smoke debe quedar resuelto el selector legacy de rol para que solo exponga roles permitidos por la membership efectiva; no se crean usuarios ni se modifican memberships para resolverlo.

Solo con smoke `PASS` se habilita la revisión visual única de Paula.

## Fuentes reales

Pólizas continúa `FUENTE_REAL_REQUERIDA`. Cuando llegue su bloque se solicitará a Paula el listado actual y vigente específico. `Listado producción 2025-2026` no es una fuente válida de Pólizas. La misma regla aplica a las fuentes posteriores.

## Claude y Academia

Claude: patrones reutilizables de source-vs-target readiness, UX y gates pueden acumularse sin datos reales; backend protegido no se envía.  
Academia: `ACADEMIA_ACTUALIZAR` con diferencia entre fuente saneada, destino migrado, validador obsoleto y readiness visual.
