# Cierre de causa raíz — Dependencias de Functions no instaladas en el pipeline M1

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Evidencia observada

La ejecución `29780784427`, sobre el commit `c442e39ede301b47d92e160121ed5fc08d1008f3`, confirmó:

- preflight contractual: PASS;
- estructura inmutable del workflow: PASS;
- mismo HEAD entre jobs: PASS;
- cuenta LAB: PASS;
- dependencias generales del runner: PASS;
- diagnóstico de autorización del proveedor: `PROVIDER_AUTHORIZATION_LAYER_READY`;
- función activa, cuenta ejecutora correcta, membresía autorizada e ingreso callable disponible.

El despliegue de las cuatro Functions terminó con código `2` y el gate se detuvo antes del importador.

La misma etapa de despliegue ya había fallado en la ejecución `29778391492`. Por metodología, no corresponde repetirla sin diagnosticar la causa raíz.

## Clasificación

```txt
PIPELINE_MECHANISM_FAILURE
FUNCTIONS_DEPENDENCY_TREE_NOT_INSTALLED
```

## Causa raíz

El código desplegable vive en `functions/` y declara sus dependencias en `functions/package.json`:

- `firebase-functions`;
- `firebase-admin`;
- `@google-cloud/secret-manager`.

Sin embargo, ambos workflows instalaron paquetes únicamente en la raíz del repositorio. No ejecutaron `npm install` dentro de `functions/` ni mediante `npm --prefix functions`. Además, la carpeta no tiene `package-lock.json`, por lo que no existía una instalación reproducible previa que pudiera ser reutilizada por el runner.

Firebase CLI analiza localmente `functions/index.js` antes de desplegar. Sin el árbol de dependencias de esa carpeta, el análisis de los triggers no puede completarse y el CLI termina antes de publicar la nueva revisión.

El diagnóstico posterior seguía viendo una función activa porque ya existía una revisión desplegada anteriormente; eso no demuestra que el fix local de normalización de roles haya sido publicado.

## Corrección vinculante

1. Instalar explícitamente las dependencias declaradas por `functions/package.json`:

```txt
npm install --prefix functions --omit=dev --no-audit --no-fund
```

2. Verificar antes del deploy que el runtime puede cargar:

```txt
firebase-functions/v2/https
firebase-admin/app
@google-cloud/secret-manager
```

3. Fijar la versión de Firebase CLI utilizada por el gate para evitar deriva entre ejecuciones.
4. Ampliar la clasificación sanitizada del deploy para distinguir:
   - dependencias ausentes;
   - análisis de triggers fallido;
   - permisos;
   - selector de Functions;
   - build;
   - cuota o precondición.
5. Mantener el deploy limitado exclusivamente a las cuatro Functions del proveedor seguro.
6. Ejecutar el mismo gate una sola vez después de que el preflight contractual valide estos tokens.

## Regla de no repetición

El gate no puede volver a intentar un despliegue si el preflight no demuestra primero:

```txt
FUNCTION_DEPENDENCIES_OK
FIREBASE_TOOLS_PINNED
GO_GATE_CONTRACT
```

Si el despliegue vuelve a fallar, se detienen los reintentos y se utiliza la categoría sanitizada exacta. No se modifica Cliente 360, Aseguradoras, el importador, la membresía ni los datos para resolver un fallo del mecanismo de despliegue.

## Alcance preservado

- No se reimportan Clientes ni Aseguradoras.
- No se cargan fuentes reales GT/CO.
- No se modifica `core/importa.js`, `data/store.js`, Auth, reglas ni módulos funcionales.
- No se avanza a Pólizas, Vehículos, Cobros o Comisiones.
- No se toca producción, `main`, merge, DNS ni hosting productivo.
- Se preservan 414 clientes, 26 aseguradoras, 77 portales y 7 asesores.

## Impacto Claude / prototipo reutilizable

```txt
BACKEND_PROTEGIDO_NO_CLAUDE
```

La instalación y despliegue de Functions es backend protegido. El patrón reusable que sí debe conservarse en documentación es que una integración no se considera actualizada solo porque una revisión anterior siga activa.

## Impacto en manuales y Academia

- Módulos modificados: ninguno.
- Ruta afectada: Dirección / Superadmin / IT.
- Contenido: diferencia entre código local validado, revisión efectivamente desplegada y proveedor activo de una versión anterior.
- Implementación de Academia: pendiente acumulado, sin desplazar el cierre crítico de M1.

## Siguiente acción exacta

1. Actualizar el contrato del gate a la revisión de dependencias de Functions.
2. Actualizar el workflow con instalación en `functions/`, verificación de módulos y CLI fijado.
3. Ejecutar automáticamente el preflight antes de secretos.
4. Permitir un solo despliegue y un solo gate integral.
5. Cerrar M1 únicamente con evidencia sanitizada `ok:true` y conteos preservados.
