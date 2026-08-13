# ACADEMIA — COMPOSICIÓN CANÓNICA Y EVIDENCIA OBSERVADA

Fecha: 2026-08-05  
Caso: Microbloque 2.2 de `RC-AYS-LAB-CANONICA-01`

## Objetivo formativo

Comprender por qué un gate puede bloquear correctamente una ejecución aunque el producto no tenga un defecto funcional, y cómo corregir el control plane sin tocar módulos, datos, Auth o producción.

## 1. Composición lifecycle vs versión del arnés

Son conceptos distintos:

```text
validatorLifecycleRevision = phase-capability-contract-v1
visualHarnessRevision = isolated-context-direct-url-v6
```

La primera identifica la estructura canónica con la que el router interpreta capacidades y fases. La segunda identifica el mecanismo concreto usado para comprobar las ocho rutas.

Sustituir una por otra hace que el outer router rechace el contrato antes de ejecutar el inner engine. Ese resultado se clasifica como `VALIDATOR_STALE`, no como defecto funcional.

## 2. Outer router e inner engine

El preflight tiene dos capas:

1. **Outer router:** selecciona el gate, valida versión, lifecycle, fase y capacidades.
2. **Inner engine:** revisa el contrato específico, allowlists, owners, evidencias y fronteras.

Una prueba completa debe ejecutar ambas capas juntas. Probar solo el inner engine puede ocultar una incompatibilidad del router.

## 3. Source-only no significa runtime

El Microbloque 2.2 utilizó una fixture no operativa:

```text
runtimeAuthorized: false
secretAccessAuthorized: false
firebaseAuthorized: false
browserAuthorized: false
deployAuthorized: false
```

Aunque el lifecycle describa capacidades potenciales para un runtime futuro, el modo source-only fuerza todos los permisos de ejecución a `false`.

## 4. Request inmutable y ledger separado

Un archivo configurado como trigger no debe modificarse para registrar que fue consumido. Hacerlo produce otro evento `push` y puede generar una ejecución administrativa innecesaria.

Patrón correcto:

- request: autorización inmutable;
- ledger: consumo y estado;
- evidencia: resultados observados;
- cierre: documento explicativo.

## 5. Evidencia observada

Un resultado no debe decir `Functions: 4/4` por un literal escrito en el script. Debe leer el output real del paso de despliegue:

```text
FUNCTIONS_VERIFIED → Number.parseInt → functionsVerified
```

El builder debe rechazar contradicciones, por ejemplo:

- Functions retenidas con menos de 4 verificadas;
- Hosting retenido sin producto e integridad PASS;
- `ok:true` sin visual, integridad, Functions y URL completos.

## 6. Defecto funcional vs validador obsoleto

### FUNCTIONAL_DEFECT

Existe evidencia de que la aplicación se comporta incorrectamente: ruta no renderiza por código del producto, scope expone información indebida, operación falla o datos cambian sin autorización.

### VALIDATOR_STALE

El producto o mecanismo correcto existe, pero el validador busca una versión, token, campo o estructura anterior.

En este caso:

- el builder observó correctamente `0/4` en source-only;
- el validador buscaba un token literal diferente;
- la política de retención había migrado al builder, pero el validador buscaba el JSON inline retirado.

Por tanto, se corrigió el contrato y no el producto.

## 7. Gates y STOP_RETRY

Cuando la misma etapa falla dos veces:

1. detener runtime;
2. conservar evidencia;
3. identificar owner exacto;
4. pasar a source-only;
5. probar composición completa;
6. solicitar autorización nueva solo después de PASS.

No corresponde crear otra candidata, otro workflow visual ni repetir escenarios funcionales ya cerrados.

## 8. Resultado del caso

```text
run final: 30977179448
integrated gate: 31/31 PASS
inner preflight: 32/32 PASS
runtime/Firebase/browser/deploy: no
```

## 9. Aplicación por rol

### Dirección

Debe distinguir entre “el producto falló” y “el gate bloqueó antes de probar el producto”. Esto evita exigir reimportaciones o cambios de módulos para resolver un control obsoleto.

### Operativo

Debe revisar evidencias observadas, allowlists, snapshots y clasificación antes de autorizar reintentos.

### Asesor

No interactúa con gates técnicos, pero recibe una plataforma donde scopes y permisos se validan antes de exposición real.

### Equipo técnico

Debe mantener sincronizados router, lifecycle, registro, engine, workflow, request, ledger, documentación y Academia.
