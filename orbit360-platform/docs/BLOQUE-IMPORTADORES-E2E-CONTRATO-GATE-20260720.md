# Bloque importadores E2E — 2026-07-20

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Bloque activo: M1  
Producción: no autorizada

## Diagnóstico

- Falla inmediata: `DATA_CONTRACT_FAILURE`.
- Hallazgo sistémico: `NO_MANDATORY_BROWSER_TO_BACKEND_TO_STORE_ACCEPTANCE_GATE`.
- Estado: `FREEZE_IMPORTERS_UNTIL_E2E_GATE`.

## Gate propietario

`importers-e2e-acceptance-lab-v20260720`

Contrato: `1.0.0 · canonical-browser-backend-store-rollback-v1`.

## Recorrido obligatorio

`fixture → parser → mapeo → dry-run → confirmación → identidad/rol → target → proveedor → referencia opaca → relectura → auditoría → rollback`

Un parser, un dry-run, un smoke puro o una pantalla correcta no bastan para declarar funcional un importador.

## Owners

- `core/importer-execution-contract-v20260720.js`
- `core/insurer-directory-import-v1202.js`
- `core/insurer-secure-target-bridge-v20260720.js`
- `core/aseguradoras-credentials-provider-lab-v20260720.js`
- `functions/index.js`
- `tools/orbit360-importers-e2e-fixture-v20260720.mjs`
- `tools/orbit360-importers-e2e-browser-v20260720.mjs`
- `tools/orbit360-importers-e2e-vault-rollback-v20260720.mjs`
- `tools/orbit360-importers-e2e-finalize-v20260720.mjs`

No se crea otro importador ni una ruta paralela.

## Criterio de aceptación

La evidencia debe confirmar autenticación, rol, lectura, dry-run, target, llamada remota, escritura o referencia opaca, relectura, auditoría positiva y negativa, ausencia de valores protegidos en el store operativo y rollback completo.

Solo `ok:true` permite repetir una vez las cargas reales GT/CO.

## Carriles

- A: estado honesto y Academia por rol.
- B: contrato único, servicio seguro, auditoría y rollback.
- C: fixture ficticio; se preservan 414 clientes, 26 aseguradoras y 7 asesores.

## Claude y Academia

- `REPLICABLE_CLAUDE_ACUMULADO`: contrato de etapas, target único y gate E2E.
- `ACADEMIA_ACTUALIZAR`: lectura, dry-run y aplicación son estados distintos.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: autenticación, servicio seguro y rollback.
- `SECRETO_DATO_REAL`: valores de acceso.

## Estado

Implementación estructural completada. Pendiente ejecutar el gate una sola vez y aceptar exclusivamente evidencia sanitizada `ok:true`.
