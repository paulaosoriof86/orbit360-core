# Cierre de causa raíz — Observabilidad insuficiente del despliegue Functions M1

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Evidencia observada

La ejecución `29781660851`, sobre el commit `23d6166e6237ac0af8211e126eb43240c3c0eac8`, demostró correctamente:

- preflight contractual: PASS;
- checkout por SHA inmutable: PASS;
- instalación de dependencias en `functions/`: PASS;
- Firebase CLI fijado en `15.24.0`: PASS;
- diagnóstico posterior de membresía, cuenta ejecutora, función activa e ingreso callable: PASS.

El comando de despliegue devolvió código `1` y produjo 281 bytes de salida JSON. Sin embargo, el workflow conservó únicamente hashes y tamaño de la salida, clasificó el resultado como `DEPLOY_FAILED_UNCLASSIFIED` y eliminó el archivo temporal. El importador no se ejecutó.

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
DEPLOY_OBSERVABILITY_GAP
```

## Causa raíz

El mecanismo de sanitización eliminó la única evidencia estructurada que permitía distinguir entre:

- fallo antes de publicar;
- despliegue parcial de una o varias Functions;
- revisión publicada con error posterior;
- advertencia o fallo de limpieza;
- error de permisos, build, selector o precondición.

Guardar únicamente el hash del JSON no permite diagnosticar la causa ni decidir con seguridad si corresponde repetir el despliegue. Esto convierte cualquier nuevo intento en un reintento a ciegas, contrario al protocolo de causa raíz.

## Corrección vinculante

Antes de cualquier nuevo despliegue o ejecución integral:

1. reutilizar el workflow existente de proveedor como diagnóstico `read_only`, sin deploy;
2. consultar las cuatro Functions mediante Cloud Functions API v2;
3. consultar sus servicios y revisiones de Cloud Run;
4. registrar en evidencia sanitizada:
   - estado de cada Function;
   - `updateTime` y `createTime`;
   - runtime y entry point;
   - presencia de URI y servicio;
   - cuenta ejecutora esperada;
   - revisión lista y revisión creada, únicamente como hash;
   - tráfico sobre la última revisión;
   - política IAM legible e invocador callable;
   - mensajes de estado únicamente como categoría y hash;
5. comparar las fechas con la ventana del run `29781660851` para determinar si hubo despliegue completo, parcial o ninguno;
6. conservar compatibilidad con el diagnóstico de membresía y autorización;
7. no exponer URI, tokens, secretos, variables de entorno, payloads ni mensajes crudos.

## Regla de no repetición

No se vuelve a ejecutar el gate ni el deploy hasta que la evidencia de solo lectura determine una de estas condiciones:

```txt
DEPLOYMENT_CONFIRMED_CURRENT
DEPLOYMENT_PARTIAL
DEPLOYMENT_NOT_APPLIED
DEPLOYMENT_REVISION_INCONSISTENT
```

Solo después se corrige una capa exacta. No se toca Cliente 360, Aseguradoras, el importador, la membresía ni los datos para resolver una brecha de observabilidad.

## Alcance preservado

- No reimportación de Clientes ni Aseguradoras.
- No fuentes reales GT/CO.
- No escrituras Firestore operativas.
- No invocación del proveedor.
- No cambios en `core/importa.js`, `data/store.js`, Auth, rules o módulos funcionales.
- No avance a Pólizas, Vehículos, Cobros o Comisiones.
- No producción, `main`, merge, DNS ni hosting productivo.
- Conteos preservados: 414 clientes, 26 aseguradoras, 77 portales y 7 asesores.

## Impacto Claude / prototipo reutilizable

```txt
BACKEND_PROTEGIDO_NO_CLAUDE
ACADEMIA_ACTUALIZAR
```

Patrón de Academia: un estado activo no demuestra que la revisión más reciente fue desplegada. Debe distinguirse código validado, deploy solicitado, revisión creada, revisión lista y tráfico efectivo.

## Siguiente acción exacta

1. ampliar el diagnóstico existente a las cuatro Functions y sus revisiones;
2. adaptar el workflow existente a ejecución exclusivamente read-only;
3. ejecutar una sola lectura sobre un SHA inmutable;
4. clasificar el estado real del despliegue;
5. decidir el siguiente cambio únicamente con esa evidencia;
6. no reintentar el gate mientras la clasificación siga abierta.
