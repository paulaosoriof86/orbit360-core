# PENDIENTE EXACTO — DISPATCH DE GITHUB ACTIONS

## Problema

Los requests versionados no generan workflow run en la rama `ays/backend-tenant-lab-v99-20260703`, aunque el workflow y los patrones se encuentran versionados.

## No hacer

- no crear otro request;
- no repetir el mismo push-path;
- no modificar frontend, Auth, datos, Functions, Rules o Hosting;
- no solicitar nuevamente la autorización runtime.

## Solución requerida

Exponer una de estas rutas soportadas:

1. `workflow_dispatch` sobre un workflow registrado y accesible para la rama;
2. dispatch de Actions mediante API con referencia explícita al branch/HEAD;
3. runner autorizado desde un workflow ya registrado fuera de la rama no fusionada.

El runner ya preparado es:

```text
tools/orbit360-run-visual-observable-rootfix-v2-lab-v20260805.sh
```

Debe recibir las credenciales únicamente después de que el validador canónico produzca `GO_GATE_CONTRACT`.

## Criterio de cierre

```text
workflow run ID creado
+
GO_GATE_CONTRACT
```

Hasta entonces la autorización permanece reservada, no consumida.
