# Acumulado Claude — Composición del preflight y evidencia honesta

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Separar expresamente:

```text
lifecycleCompositionRevision
visualHarnessRevision
engineRevision
requestSchemaVersion
```

El outer router debe validar la composición estable y delegar al engine la validación de la versión concreta del arnés. Un cambio de capturador no debe alterar el identificador de composición canónica.

## Test integrado obligatorio

Antes de secretos o despliegue, una prueba source-only debe ejecutar:

```text
request
→ outer router
→ lifecycle
→ registry
→ inner engine
→ evidencia GO_GATE_CONTRACT
```

No basta con probar el engine de manera aislada.

## Jerarquía de evidencia

```text
1. pasos observados del job
2. preflight sanitizado
3. inventarios before/after
4. decisión consolidada
```

Un campo consolidado que contradice los pasos observados debe invalidarse. Los contadores no pueden escribirse como literales; deben provenir de outputs reales y verificables.

## STOP_RETRY reusable

Después de dos fallos de la misma etapa:

- no tercer request;
- no otro parche de emergencia;
- congelar producto y datos;
- cerrar causa raíz y owner;
- rediseñar source-only;
- solicitar una autorización nueva solo después de PASS estático integrado.

## Exclusiones

No se comparte con Claude información de tenant, usuarios, Firebase, credenciales, datos reales ni backend protegido.
