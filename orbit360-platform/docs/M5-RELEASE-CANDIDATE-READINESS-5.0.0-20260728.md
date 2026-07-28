# M5 5.0.0 — Release candidate readiness

Fecha: 2026-07-28  
Gate único M5: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Objetivo

Preparar la release candidate que se someterá al smoke automatizado y a la única visualización V3 de A&S, sin reabrir M1–M4 y sin iniciar Pólizas.

## Fuente/base

- M1: aprobación humana cerrada.
- M2: runtime productivo read-only cerrado.
- M3: tenant activado read-only, membership/rol/scope y store sin fallback validados.
- M4: `M4_CLOSED_SUCCESS`, 414 clientes, 26 aseguradoras, 0 moneda faltante y overlay 0/0.

## Deuda visual heredada

M1 dejó como deuda aceptada títulos móviles no completamente responsive, con cierre obligatorio antes de la release candidate productiva.

La implementación viva ya contiene owner explícito de títulos responsive en `styles/client-insurer-visual-contract-v20260720.css`: `clamp`, wrapping, `overflow-wrap`, cortes a 760 px y 430 px. M5 debe comprobarlo y después validarlo en navegador; no basta con la inspección estática para cerrar el bloque.

## Fase 5.0.0

Capacidades:

```text
secrets: false
Firestore: false
writes: false
browser: false
Hosting deploy: false
Functions/Rules: false
production/main/merge: false
Pólizas: false
```

La fase calcula un hash SHA-256 sobre 40 activos críticos de la candidata y compara 22 activos visuales contra el canal LAB existente.

Resultados permitidos:

```text
M5_RC_READY_FOR_RUNTIME_SMOKE
M5_RC_READY_LAB_DELIVERY_REQUIRED
```

El segundo resultado no es un defecto funcional. Significa que la candidata local está lista pero el preview LAB no contiene exactamente sus mismos activos. En ese caso debe solicitarse autorización independiente para una única entrega Hosting LAB del mismo gate; no se despliega por inferencia.

## Gate mínimo que M5 deberá cerrar después

La fase runtime del mismo gate deberá validar:

- Dirección — escritorio;
- Operativo — tableta;
- Asesor — móvil;
- login, membership, tenant, rol activo y scope;
- 414 clientes, 26 aseguradoras y 7 asesores;
- Cliente 360 lista/ficha/calidad;
- Aseguradoras directorio/ficha/conocimiento;
- GT/CO y sin monedas mezcladas;
- relaciones faltantes honestas;
- sin copy técnico, seed/demo ni secretos;
- sin dobles listeners/renderers;
- sin error bloqueante.

Solo con smoke `PASS` se habilita la revisión visual única de Paula. El smoke y la revisión deben usar el mismo hash de release candidate.

## Fuentes reales

Pólizas continúa `FUENTE_REAL_REQUERIDA`. Cuando llegue su bloque se solicitará a Paula el listado actual y vigente específico. `Listado producción 2025-2026` no es una fuente válida de Pólizas. La misma regla aplica a las fuentes posteriores.

## Claude y Academia

Claude: clasificar únicamente patrones reutilizables de UX/owners/gates; no enviar backend protegido, datos reales ni secretos.  
Academia: `ACADEMIA_ACTUALIZAR` con release candidate por hash, paridad LAB, smoke de tres vistas y diferencia entre fallo funcional y entorno desalineado.
