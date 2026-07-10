# Implementación P0.9e/P0.10c — persistencia LAB y bindings AseGuate

Fecha: 2026-07-10  
Módulo: Aseguradoras → Cotizador → Comparativo  
Estado: `CONTRATOS_IMPLEMENTADOS / INDEX_SIN_APLICAR / FIRESTORE_LAB_SIN_ESCRITURA`

## 1. Necesidad

P0.9 ya podía construir planes metadata-only y escribir mediante `Orbit.store`. Sin embargo, la auditoría del adapter LAB detectó que su lista histórica de snapshots no incluye las seis colecciones profundas de conocimiento:

```text
aseguradora_manifiestos
aseguradora_propuestas
aseguradora_reglas_tarifarias
aseguradora_presentaciones
aseguradora_bindings
aseguradora_revisiones
```

Firestore podía aceptar una ruta dinámica, pero el dato no quedaría garantizado en el read model después de recargar la SPA. Persistir sin cerrar esa lectura habría producido un estado engañoso.

## 2. Solución P0.9e

### Adapter de colecciones LAB

Archivo:

```text
core/aseguradoras-lab-collections-p09e.js
```

Características:

- solo opera en `firestore-lab`;
- solo permite `alianzas-soluciones`;
- exige store LAB explícito;
- añade listeners a las seis colecciones;
- conserva una caché separada por colección;
- extiende únicamente `all/get/where/find/raw` para esas colecciones;
- delega el resto al store original;
- no reemplaza `insert/update/remove`;
- no conoce credenciales ni secretos;
- no modifica los archivos protegidos.

La extensión permite que los registros profundos reaparezcan mediante snapshots y sean consumidos por el read model después de una recarga.

### Gate estricto de persistencia

Archivo:

```text
core/aseguradoras-lab-persistence-p09e.js
```

Antes de escribir exige:

- modo `firestore-lab`;
- tenant `alianzas-soluciones`;
- `Orbit.store.__firestoreLabExplicit`;
- snapshots base conectados;
- security guard instalado;
- seis snapshots profundos conectados;
- usuario LAB esperado;
- rol activo administrativo;
- rol activo asignado;
- plan metadata-only;
- tenant del actor y del plan coincidentes;
- cero habilitación de Cotizador o Comparativo.

Después de solicitar la escritura:

1. espera que la cola de escrituras se vacíe;
2. bloquea si aparece un error nuevo;
3. consulta el read model;
4. confirma que la fuente y el manifiesto reaparecen;
5. devuelve `LAB_METADATA_PERSISTED_PENDING_VALIDATION`.

Si la escritura queda pendiente, falla o no reaparece, no se declara persistida.

## 3. Solución P0.10c

### Constructor reusable

Archivo:

```text
core/tenant-binding-plan-p10c.js
```

Recibe:

- plan tenant;
- directorio;
- reglas revisadas;
- presentaciones revisadas;
- casos de validación.

Ejecuta:

```text
resolución de aseguradora
→ perfil financiero tenant
→ reconciliación por variante
→ binding tarifa/presentación
→ resumen de bloqueos
→ estado para segundo gate
```

No persiste ni habilita.

### Plan A&S AseGuate

Archivo:

```text
data/tenant-alianzas-soluciones-binding-plan-p10c.js
```

Define dos variantes:

```text
Automóvil
Microbús
```

El plan contiene únicamente dimensiones y referencias lógicas a documentos. No contiene tasas de producto, importes, PII ni secretos.

Los targets permanecen en `false`:

```text
cotizador_automatico
cotizador_pdf_externo
comparativo
```

Una variante sin regla aplicable queda `RULE_REQUIRED`. La presentación de microbús no puede heredar una regla de automóvil.

## 4. Integrador

Se actualizó:

```text
tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs
```

Orden protegido:

```text
security guard LAB
→ contratos documentales
→ reconciliación/gate
→ configuración tenant
→ plan binding tenant
→ adapters Excel/PDF
→ registry/bridge
→ runtime P0.9
→ snapshots P0.9e
→ gate persistencia P0.9e
→ modules/aseguradoras.js
→ servicio P0.9
```

El integrador continúa:

- dry-run por defecto;
- sin commit;
- sin push;
- sin deploy;
- con backup y rollback en `--apply`;
- con validación de UTF-8, duplicados y orden.

El `index.html` real conserva una única etiqueta `modules/aseguradoras.js?v1291`, el store se carga antes de los módulos y no se observó mojibake en la zona auditada. El `--apply` no se ejecutó.

## 5. Smokes

Archivos:

```text
tools/orbit360-test-aseguradoras-lab-collections-p09e.mjs
tools/orbit360-test-aseguradoras-lab-persistence-p09e.mjs
tools/orbit360-test-tenant-binding-plan-p10c.mjs
```

Cubren:

- seis snapshots;
- delegación de colecciones legacy;
- cero reemplazo de escrituras;
- read model después de persistencia;
- Auth correcto e incorrecto;
- rol activo;
- tenant;
- plan inseguro;
- automóvil y microbús separados;
- variante incompleta;
- cero habilitación.

Workflow:

```text
.github/workflows/orbit360-aseguradoras-lab-p09e-binding-p10c-smoke.yml
```

Incluye dry-run contra el `index.html` real y verifica que no se modifica.

## 6. Impacto Claude/Academia

### Claude

La futura interfaz debe mostrar estados diferentes:

```text
Fuente inspeccionada
Persistencia solicitada
Sincronización pendiente
Persistida y leída nuevamente
Requiere validación
Lista para segundo gate
Habilitada
```

No debe mostrar “guardado” solo porque el método frontend retornó.

### Academia

Debe enseñar:

- diferencia entre caché y persistencia;
- snapshots;
- metadata-only;
- validación frente a habilitación;
- separación automóvil/microbús;
- lectura de bloqueos;
- segundo gate;
- resolución de errores de Auth/tenant.

Claude no se solicita todavía.

## 7. Estado honesto

```text
adapter de snapshots: implementado
gate persistencia LAB: implementado
plan binding AseGuate: implementado
smokes/workflow: configurados
index.html modificado: no
--apply ejecutado: no
Firestore LAB escrito: no
binding real persistido: no
Cotizador habilitado: no
Comparativo habilitado: no
```

## 8. Siguiente acción

P0.9f:

1. confirmar workflow/dry-run;
2. aplicar empalme controlado cuando el entorno LAB esté disponible;
3. verificar Auth y snapshots;
4. persistir una fuente metadata-only;
5. confirmar read model tras recarga;
6. persistir reglas/presentaciones AseGuate revisadas;
7. construir los dos bindings;
8. mantener segundo gate cerrado;
9. repetir por lote para las once fuentes.
