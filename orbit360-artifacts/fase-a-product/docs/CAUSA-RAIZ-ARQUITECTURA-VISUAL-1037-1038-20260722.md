# CAUSA RAÍZ — ARQUITECTURA VISUAL 1.0.37 FRENTE A 1.0.38

**Fecha:** 2026-07-22  
**Run diagnóstico:** `29972554280`  
**Gate:** `block1-client360-insurers-lab-v20260717`

## Resultado del run

```text
Preflight: GO_GATE_CONTRACT · 152/152
Owner scope: overlay_replace
Runtime contract scope: overlay_replace
Directorio operativo: PASS · 30/30
Arquitectura: NO_GO · 33/35
```

No hubo acceso a datos, secretos, escrituras, runtime, navegador o deploy.

## Causa raíz

El gate arquitectónico 20260717 ejecutaba el contrato visual 1.0.37. Ese contrato todavía exigía:

- cuenta enmascarada;
- botón de revelado temporal bancario;
- copia dependiente del valor revelado;
- overlay y manifiesto 1.0.37.

Esas reglas habían sido válidas para la candidata anterior, pero quedaron obsoletas cuando la clasificación vinculante 1.0.38 estableció:

```text
usuario = operativo visible
número bancario = operativo visible y copiable
contraseña = secreto con revelado temporal
```

El producto 1.0.38 y su contrato conductual pasaron. El fallo fue exclusivamente `VALIDATOR_STALE` en la integración arquitectónica.

## Corrección

- El contrato visual mantiene los controles responsive de títulos, encabezados, pestañas, acciones e instalación PWA.
- Sustituye únicamente las reglas bancarias 1.0.37 por la semántica operativa 1.0.38.
- Conserva la separación usuario/contraseña.
- Valida que la política nunca persista contraseñas.
- Valida que el manifiesto crítico incluya política, owner y Academia operativos.
- El gate arquitectónico 20260722 conserva todos los checks de PWA, Router, Legal, Access, scopes y estados de Aseguradoras, pero exige contrato visual 1.0.38.

## Manifiesto crítico

La release pasa a:

```text
block1-critical-runtime-20260722-6
contractVersion=1.0.38
```

Se agregan:

- `operational-directory-field-policy-v20260722.js`;
- `client-insurer-operational-directory-owner-v20260722.js`;
- `academia-v1230-operational-directory-v20260722.js`.

## Predicado de aceptación

```text
GO_GATE_CONTRACT
+ operational-directory PASS
+ visual-responsive 1.0.38 PASS
+ GO_STATIC_ARCHITECTURE
+ dataAccess=false
+ secretAccess=false
+ writes=false
+ runtime=false
+ browser=false
+ deploy=false
```

Este cierre no autoriza todavía dry-run de datos, aplicación, Hosting o revisión visual.
