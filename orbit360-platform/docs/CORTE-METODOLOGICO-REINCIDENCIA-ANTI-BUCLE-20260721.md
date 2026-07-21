# CORTE METODOLÓGICO POR REINCIDENCIA DEL BUCLE

Fecha: 2026-07-21  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Issue de control: #7  
Producción, `main`, merge y deploy: no autorizados

## 0. Estado vinculante

```txt
STOP_THE_LINE_METHODOLOGY_REVIEW
```

Este corte suspende cualquier diagnóstico runtime, lectura de Firestore/Secret Manager, dry-run, recuperación, importación, gate, navegador, deploy o modificación del producto.

Solo se permite:

- auditoría metodológica estática;
- comparación de commits y documentos;
- deshabilitar automatismos;
- endurecer el archivo de congelamiento;
- sincronizar PR, issue y documentación;
- documentar causa raíz.

## 1. Aclaración esencial: las aseguradoras sí habían quedado validadas

El checkpoint sano fue real y sigue siendo evidencia válida:

```txt
HEAD: 02a5436bc804b3a861f82375b124d05015389b4b
Run: 29797444980
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias protegidas válidas: 91
Valores completos en store: 0
```

Por tanto:

```txt
M1 funcional: PRESERVADO
26 aseguradoras: VALIDADAS EN EL CHECKPOINT SANO
26 credenciales de portal en bóveda: CONFIRMADAS
91 cuentas bancarias completas en bóveda: CONFIRMADAS
```

La regresión ocurrió después, durante una reimportación posterior del directorio GT. Esa regresión redujo las referencias visibles en documentos operativos de 91 a 23, pero no invalida que el checkpoint anterior sí había aprobado.

La contradicción percibida se produjo porque se mezclaron dos estados distintos:

1. `CHECKPOINT SANO VALIDADO`;
2. `ESTADO POSTERIOR REGRESADO`.

A partir de este corte, ambos estados deben reportarse siempre por separado.

## 2. Qué volvió a ocurrir

Después del primer corte anti-bucle ya existían reglas explícitas:

```txt
si la misma etapa falla dos veces:
NO tercer reintento
NO otro parche
NO otro gate
NO otro módulo
NO reimportación
abrir diagnóstico de causa raíz
```

A pesar de ello, la etapa `readonly_identity_diagnosis` volvió a recibir parches y ejecuciones.

Secuencia observada:

1. El diagnóstico inicial encontró 34 coincidencias únicas por huella completa y 34 filas sin resolver.
2. Se asumió, antes de evidencia runtime, que las otras 34 podían resolverse por últimos cuatro.
3. Un segundo diagnóstico falló por una referencia residual después de renombrar una variable.
4. La metodología exigía detenerse.
5. Se creó/ajustó otro script y otro workflow.
6. Cada commit activó automáticamente un nuevo run porque los workflows escuchaban cambios en sus propios archivos.
7. La evidencia posterior demostró que la hipótesis era incorrecta: hubo 34 coincidencias por huella completa, 0 por últimos cuatro y 34 sin resolver.

No hubo escritura ni pérdida adicional, pero sí se repitió el patrón metodológico que debía evitarse.

## 3. Clasificación exacta de la reincidencia

```txt
METHODOLOGY_ENFORCEMENT_FAILURE
PIPELINE_MECHANISM_FAILURE
```

No se trata de falta de documentación. La documentación existía y era correcta.

La causa raíz fue una brecha entre política y ejecución:

```txt
El congelamiento era declarativo, pero no bloqueaba técnicamente los workflows,
el preflight ni los triggers por push.
```

### 3.1 Fallo del control central

`tools/orbit360-validar-gate-contracts-v20260717.mjs` valida:

- registro del gate;
- owners;
- archivos;
- rama;
- proyecto;
- canal;
- tokens y contratos.

No consulta `tools/orbit360-incident-freeze-v20260721.json`.

Por ello podía devolver `GO_GATE_CONTRACT` aunque el incidente estuviera en `STOP_THE_LINE`.

### 3.2 Fallo de automatización

Los workflows relevantes incluían trigger `push` sobre:

- el propio workflow;
- scripts de diagnóstico;
- scripts del importador;
- archivos del proveedor.

En consecuencia:

```txt
parche → commit → push → nuevo run automático
```

Esto convertía una corrección local del mecanismo en un reintento runtime, incluso cuando la regla de dos fallos lo prohibía.

### 3.3 Fallo de lenguaje de evidencia

La hipótesis `34 huellas + 34 últimos cuatro` se trató como conclusión antes de contar con evidencia sanitizada completa.

A partir de ahora se usan solo estas categorías:

| Estado | Significado |
|---|---|
| `CONFIRMED` | Artefacto sanitizado completo o checkpoint inmutable lo demuestra. |
| `HYPOTHESIS` | Explicación posible; no autoriza ejecución ni escritura. |
| `DISPROVED` | Evidencia posterior la contradijo. |
| `UNKNOWN` | No existe evidencia suficiente. |

La hipótesis de las 34 coincidencias por últimos cuatro queda clasificada como:

```txt
DISPROVED
```

## 4. Violaciones metodológicas confirmadas

1. No se consultó el freeze antes de crear nuevos cambios.
2. Se continuó después de dos fallos en la misma etapa.
3. Se aplicó otro parche, aunque `patchAllowed=false`.
4. Se creó/extendió un workflow temporal, aunque estaba prohibido.
5. Se permitió que cada push iniciara otro run.
6. Se presentó una hipótesis como si fuera una ruta ya validada.
7. Se volvió a formular una “siguiente acción exacta” sin que sus precondiciones estuvieran demostradas.
8. Se agregaron más mecanismos antes de estabilizar el owner único.

## 5. Medidas aplicadas en este corte

### 5.1 Congelamiento endurecido

`tools/orbit360-incident-freeze-v20260721.json` se elevó a versión 2 con:

- estado `STOP_THE_LINE_METHODOLOGY_REVIEW`;
- clasificación `METHODOLOGY_ENFORCEMENT_FAILURE`;
- gateIds y workflows bloqueados;
- prohibición de cualquier runtime, incluso read-only;
- vocabulario obligatorio de evidencia;
- separación entre checkpoint sano y estado regresado;
- autorización futura separada y explícita.

### 5.2 Automatismos deshabilitados

Se eliminaron los triggers automáticos de:

```txt
.github/workflows/orbit360-aseguradoras-op2-smoke.yml
.github/workflows/orbit360-importer-incident-readonly-diagnosis.yml
```

Ambos quedan `workflow_dispatch` y con job `if:false`.

No deben ejecutarse hasta cerrar formalmente esta revisión metodológica.

### 5.3 Datos y producto congelados

No se modifican:

- 414 clientes;
- 26 aseguradoras;
- 7 asesores;
- documentos GT;
- documentos CO;
- bóveda;
- credenciales;
- cuentas;
- importador propietario;
- Auth;
- store;
- Functions;
- reglas;
- UI;
- Academia.

## 6. Estado correcto y único a comunicar

```txt
Bloque 0: CERRADO
M1 funcional: PRESERVADO
26 aseguradoras en checkpoint sano: VALIDADAS
Credenciales de portal en bóveda: 26/26 CONFIRMADAS
Cuentas bancarias en bóveda: 91/91 CONFIRMADAS
Valores completos en store: 0
Estado operativo posterior regresado: 23 referencias válidas y 68 faltantes
Identidad de recuperación confirmada: 34
Identidad de recuperación no demostrada: 34
Colombia: INTACTA Y BLOQUEADA
Reimportación: NO REQUERIDA Y PROHIBIDA
Recuperación: NO AUTORIZADA
Runtime: CONGELADO
Bloque 2/Pólizas/Cobros: BLOQUEADOS
```

## 7. Lo que no se hará ahora

No se hará:

- otro diagnóstico de las 34 filas;
- comparación runtime con la fuente original;
- otro dry-run;
- recuperación parcial de 34;
- recuperación total de 68;
- modificación del importador;
- otro gate;
- revisión visual;
- avance de plan productivo.

Aunque alguno de esos pasos pueda ser técnicamente razonable después, no se autoriza mientras el problema metodológico siga abierto.

## 8. Condiciones para salir de este corte

Antes de cualquier ejecución futura deben cumplirse todas:

1. Paula recibe y valida un único estado, sin contradicciones.
2. Se reconoce formalmente que las aseguradoras sí habían sido validadas en el checkpoint sano.
3. Se separa evidencia confirmada de hipótesis.
4. Los workflows automáticos permanecen deshabilitados.
5. Existe un único owner metodológico y técnico.
6. Se define una sola pregunta de diagnóstico, no una cadena de acciones.
7. La siguiente ejecución futura requiere autorización separada.
8. El preflight futuro debe bloquear si el freeze sigue activo antes de leer secrets o runtime.
9. No se crea otro workflow temporal.
10. No se presenta una siguiente acción como exacta sin demostrar primero sus precondiciones.

## 9. Causa raíz definitiva del bucle

```txt
No faltaban planes ni adendas.
Faltaba convertir el estado STOP_THE_LINE en un control técnico que impidiera
que un parche o push se transformara automáticamente en otro intento.
```

## 10. Siguiente acción permitida

La única acción permitida es:

```txt
REVISIÓN Y CIERRE DE ESTE CORTE METODOLÓGICO CON PAULA
```

No existe una siguiente acción técnica autorizada en este momento.
