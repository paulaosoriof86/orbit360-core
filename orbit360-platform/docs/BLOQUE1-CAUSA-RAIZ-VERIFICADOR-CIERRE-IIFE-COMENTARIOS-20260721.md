# Bloque 1 — Causa raíz del verificador de cierre IIFE con comentarios finales

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.35`

## Clasificación

- `PIPELINE_MECHANISM_FAILURE`
- Producto funcional invalidado: no
- Datos afectados: no
- Seguridad afectada: no

## Evidencia

Run estático: `29884111586`  
Artifact: `8515882763`  
Digest: `sha256:e6ccd01a5ee294512162a6fff89075e1f46685158599bafb7e199e4140e2082d`

El preflight contractual aprobó completamente:

```text
status: GO_GATE_CONTRACT
controles: 1194
aprobados: 1194
fallidos: 0
```

La etapa siguiente, `Validación estática · owners, sintaxis e integridad local`, se detuvo con:

```text
LOCAL_OR_REMOTE_OWNER_CLOSURE_MISSING:routerTenantBootstrap
```

## Causa raíz

El Router tenant bootstrap sí termina su IIFE correctamente con `})();` y después contiene un comentario documental de preflight.

El verificador usaba esta regla:

```text
/\}\)\(\);\s*$/
```

Esa expresión exigía que `})();` fuera el último contenido absoluto del archivo. Por eso interpretó erróneamente un comentario posterior como si el owner estuviera truncado.

No existía fallo de sintaxis, cierre, carga o ownership en el Router.

## Corrección

Commit del verificador: `ec291989630845d401472bcc9249a0f7ce28e866`.

El mecanismo ahora:

1. conserva la validación de sintaxis completa con `vm.Script`;
2. elimina únicamente comentarios finales para evaluar el cierre estructural;
3. exige que, después de retirar esos comentarios, el script termine en `})();`;
4. no modifica el archivo inspeccionado ni relaja la comparación de bytes y SHA-256;
5. aplica la misma regla al archivo local y al remoto.

Política registrada:

```text
iife_before_trailing_comments
```

Commit del contrato/overlay: `72d7a754c20bfbc6d5e2aa6a31cde75b5e27e456`.

## Alcance

- Archivos de producto modificados: 0.
- Router modificado: 0.
- Barrera visual modificada: 0.
- Service Worker modificado: 0.
- Datos modificados: 0.
- Escrituras operativas: 0.
- Navegador ejecutado: no.
- Deploy ejecutado: no.
- Producción tocada: no.

## Academia

La Academia M1 ya explica que un `VALIDATOR_STALE` o un mecanismo de prueba incorrecto no debe provocar parches sobre un producto que cumple. No requiere una nueva lección duplicada; esta bitácora queda como evidencia técnica y operativa del caso concreto.

## Siguiente acción exacta

Ejecutar una sola validación estática del contrato 1.0.35. Debe confirmar:

- `GO_GATE_CONTRACT`;
- nueve activos locales presentes;
- sintaxis correcta en todos los scripts requeridos;
- cierres IIFE válidos antes de comentarios finales;
- owner visual idempotente 27/27;
- cero secrets, navegador, Firestore, bóveda, escrituras o deploy.

Solo un resultado estático `ok:true` habilita una autorización separada para el deploy Hosting LAB y gate final.
