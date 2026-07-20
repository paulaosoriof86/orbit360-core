# Estado vigente M1 — 2026-07-20

Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción: no autorizada

## Estado confirmado

- Bloque 0 cerrado con `GO_STATIC_ARCHITECTURE`.
- Gate funcional Cliente 360 + Aseguradoras aprobado previamente.
- Revisión visual realizada.
- 414 clientes, 26 aseguradoras, 77 portales y 7 asesores preservados.
- IAM resuelto.
- Cuatro Functions del proveedor seguro activas.
- Acceso anónimo bloqueado.
- Hosting LAB disponible.
- Falso éxito con cero corregido.
- Target aseguradora–portal incorporado sin leer valores protegidos.

## Gate integral de importadores

Gate: `importers-e2e-acceptance-lab-v20260720`.

Contrato vigente: `20260720.2`.

Estado: `FROZEN_AFTER_TWO_CONFIRMATION_STAGE_FAILURES`.

El workflow quedó congelado y no se dispara por commits. No ejecuta secretos, navegador, deploy, fixture ni escrituras de datos.

## Evidencia de las ejecuciones

### Run 29770504103

- Preflight: aprobado.
- Autenticación y rol: aprobados.
- Fuente sintética: leída.
- Operaciones: 1.
- Referencias detectadas: 1.
- Target interno: resuelto.
- Etapa final: `dry_run_produced`.
- Proveedor invocado: no.
- Rollback: completo.
- Conteos restaurados: 414 clientes, 26 aseguradoras y 7 asesores.

### Run 29771152601

- Preflight: 227/227 aprobado.
- Autenticación y rol: aprobados.
- Fuente sintética: leída.
- Operaciones: 1.
- Referencias detectadas: 1.
- Target interno: resuelto.
- Etapa final: `dry_run_produced`.
- Proveedor invocado: no.
- Rollback de fixture y bóveda: completo.
- Otros registros preservados: sí.
- Conteos restaurados: 414 clientes, 26 aseguradoras y 7 asesores.

## Causa raíz confirmada

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Código conceptual: `SYNTHETIC_BROWSER_LEGAL_GATE_NOT_SATISFIED`.

La sesión sintética se autenticó correctamente, pero inició con almacenamiento vacío. El owner legal presenta el acuerdo una sola vez por usuario y versión mediante un overlay. El ejecutor no modelaba esa condición de sesión; por eso pudo leer el archivo y construir el dry-run, pero el primer clic operativo quedó bloqueado antes de abrir la confirmación del importador.

No es un defecto del Excel, parser, IAM, proveedor, target ni backend. Es una omisión del contrato del navegador de prueba.

## Cambios aplicados

- Workflow E2E congelado después de dos fallos en la misma etapa.
- Contrato canónico actualizado a `20260720.2`.
- Predicado obligatorio: `legalGateSatisfied`.
- Código de etapa: `LEGAL_GATE_PENDING`.
- Regla: ningún clic operativo antes de resolver identidad, rol, tenant y gate legal.
- Bootstrap sincronizado con contrato `20260720.2`.
- Academia actualizada a `1.226`.
- Cierre documentado en `CIERRE-CAUSA-RAIZ-IMPORTERS-E2E-LEGAL-GATE-20260720.md`.

## Carriles

- A · Frontend, UX y Academia: estados honestos; sesión legal enseñada por rol.
- B · Backend y seguridad: proveedor, IAM, auditoría y rollback preservados; no fueron la causa.
- C · Datos reales: sin nuevas cargas; conteos y bóveda restaurados.

## Restricciones vigentes

- No repetir las cargas reales de Guatemala o Colombia.
- No ejecutar nuevamente el gate con la revisión actual.
- No modificar el importador para adaptarlo al test.
- No desactivar ni saltar el acuerdo legal.
- No reimportar las 26 aseguradoras.
- No avanzar a Pólizas o Cobros.
- No merge, `main`, producción, DNS ni deploy productivo.

## Siguiente acción exacta

Diseñar y auditar un contrato canónico de preparación de sesión que pruebe, antes del primer clic:

```txt
browserAuthReady:true
activeRoleResolved:true
tenantResolved:true
legalGateSatisfied:true
```

La aceptación debe completarse por la UI legal real o por un fixture equivalente validado por el owner legal. Solo después se registra una nueva revisión del gate y se ejecuta una vez. M1 sigue abierto hasta obtener evidencia integral sanitizada `ok:true`.
