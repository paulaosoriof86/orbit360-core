# Cierre de causa raíz — Truncamiento de roles por aridad de callback

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Módulo: proveedor seguro de credenciales / autorización multirol  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Clasificación definitiva

```txt
FUNCTIONAL_DEFECT
CALLBACK_ARITY_TRUNCATION_IN_ROLE_NORMALIZATION
```

## Evidencia

La membresía LAB fue leída cuatro veces sin escrituras mediante el run `29777719203`, artefacto `8475314644`.

Resultado:

```txt
memberUpdateTime: 2026-07-20T20:21:05.117Z
documento miembro estable: true
documento asesor estable: true
roles es array: true
roles contiene solo roles canónicos: true
activeRole aparece en roles: true
```

Roles canónicos verificados:

```txt
AdminTenant
Asesor
Dirección
Operativo
SuperAdmin
```

Por tanto, no existe corrupción vigente de la membresía, escritor concurrente ni diferencia entre el documento de miembro y el contrato esperado.

## Causa raíz técnica

El handler `functions/index.js` y los diagnósticos de autorización contienen este patrón:

```js
array.map(clean)
```

La función tiene esta firma conceptual:

```js
function clean(value, max = 512)
```

`Array.prototype.map` llama al callback con tres argumentos:

```txt
valor, índice, arreglo
```

Por ello, el índice se usa accidentalmente como `max`:

```txt
índice 0 → cadena vacía
índice 1 → primer carácter
índice 2 → dos caracteres
índice 3 → tres caracteres
...
```

Los roles canónicos terminan convertidos en prefijos como:

```txt
a, di, direc, direcc, ope, supe
```

El handler luego compara `direccion` contra esos prefijos y produce correctamente, pero por datos ya truncados dentro del mismo proceso:

```txt
permission-denied
El rol activo no está asignado a la identidad.
```

El defecto también afecta cualquier otro arreglo procesado por el mismo helper, incluidos permisos extra.

## Por qué los validadores se contradijeron

El reparador de membresía usa un callback que recibe un solo argumento y leyó correctamente los roles completos. El diagnóstico y el handler reutilizaron `map(clean)` y truncaron los mismos valores en memoria. Por eso:

- reparador: membresía canónica;
- diagnóstico: roles prefijo;
- documento Firestore: siempre canónico y estable.

La contradicción no provenía del backend de datos, sino del callback defectuoso.

## Corrección obligatoria

Sustituir en cada owner afectado:

```js
.map(clean)
```

por:

```js
.map(function (value) { return clean(value); })
```

o equivalente con arrow function.

Owners mínimos:

- `functions/index.js`;
- `tools/orbit360-diagnose-credential-provider-auth-v20260720.mjs`;
- `tools/orbit360-diagnose-credential-provider-auth-v20260720-v2.mjs`.

No se modifica la membresía, el importador, el Excel, el target, el frontend ni la bóveda.

## Gate de prueba previo a deploy

Debe ejecutarse una prueba dinámica sobre las funciones extraídas del código real y demostrar:

```txt
roles de entrada: 5
roles normalizados: 5
direccion presente: true
superadmin presente: true
admintenant presente: true
asesor presente: true
operativo presente: true
permisos no truncados: true
map(clean) residual: 0
```

Si la prueba falla, no se permite deploy LAB ni reejecución E2E.

## Seguridad y alcance

- No toca datos reales.
- No cambia roles ni scopes almacenados.
- No expone secretos.
- No modifica reglas Firestore.
- No reimporta clientes ni aseguradoras.
- No carga credenciales reales.
- No avanza a Pólizas, Vehículos, Cobros o Comisiones.
- El deploy permitido después del gate es exclusivamente LAB y solo de Functions.

## Claude y Academia

```txt
REPLICABLE_CLAUDE_INMEDIATO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

Patrón reusable para Claude y Academia:

- no pasar directamente a `map`, `filter` o callbacks similares una función cuyo segundo parámetro tenga significado de negocio;
- usar siempre un wrapper de un solo argumento cuando el helper acepta opciones, límites o contexto;
- una membresía canónica puede parecer inválida si el validador transforma los valores durante la lectura;
- distinguir `DATA_CONTRACT_FAILURE` de un defecto funcional del normalizador.

No se comparte la implementación protegida del proveedor, identidades LAB, rutas de bóveda ni secretos.

## Siguiente acción exacta

```txt
1. Corregir los tres owners afectados.
2. Agregar prueba dinámica de no truncamiento.
3. Ejecutar preflight contractual.
4. Ejecutar la prueba estática/dinámica.
5. Solo con PASS, desplegar Functions en LAB.
6. Ejecutar diagnóstico read-only corregido.
7. Reactivar el gate integral una sola vez únicamente si autorización queda lista.
```
