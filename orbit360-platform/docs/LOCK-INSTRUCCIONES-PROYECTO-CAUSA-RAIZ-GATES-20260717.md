# LOCK PARA INSTRUCCIONES DEL PROYECTO — CAUSA RAÍZ Y GATES

Fecha: 2026-07-17  
Proyecto: Orbit 360 A&S  

## Texto corto oficial

```txt
Antes de corregir cualquier fallo de Orbit 360 A&S, clasificarlo como FUNCTIONAL_DEFECT, VALIDATOR_STALE, DATA_CONTRACT_FAILURE, ENVIRONMENT_FAILURE, PIPELINE_MECHANISM_FAILURE o SECURITY_FAILURE. Leer obligatoriamente el ADENDUM-MAESTRO-CONTROL-CAUSA-RAIZ-VALIDADORES-GATES-ORBIT360-AYS-20260717.md y ejecutar el preflight machine-readable del gate antes de Firebase, Hosting, Playwright o cambios funcionales. Si el mismo código/etapa falla dos veces, detener reintentos y diagnosticar la causa raíz; no crear otro parche ni modificar otro módulo. Owners, registro del gate, validador y workflow se actualizan juntos. Un validador obsoleto nunca puede forzar la reintroducción de bridges retirados. Mantener rama ays/backend-tenant-lab-v99-20260703, PR #5 draft/open, sin main, merge, deploy productivo ni reimportación para resolver problemas de visualización.
```

## Regla de precedencia

Este lock complementa las instrucciones generales y tiene precedencia para:

- fallos repetidos;
- gates y smokes;
- workflows;
- validadores;
- owners y bridges;
- selección de la capa que debe corregirse.

No reemplaza el Plan Maestro ni los addenda funcionales.

## Implementación práctica

La lectura humana se refuerza con:

```txt
tools/orbit360-gate-contract-registry-v20260717.json
tools/orbit360-validar-gate-contracts-v20260717.mjs
```

La regla no se considera implantada completamente mientras el gate activo no ejecute ese preflight antes de acceder a entorno, secrets o datos.
