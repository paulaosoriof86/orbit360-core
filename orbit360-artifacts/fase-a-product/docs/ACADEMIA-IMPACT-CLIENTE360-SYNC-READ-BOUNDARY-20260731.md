# Academia — Cliente 360 · frontera síncrona de view-model

Fecha: 2026-07-31  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Qué debe enseñar Academia

Un dato puede estar correctamente migrado y una proyección puede existir, pero la UI todavía puede fallar si el renderer consume el dato antes de que la proyección asíncrona se aplique.

Caso reusable:

1. backend/store entrega una fila válida;
2. la normalización visual se programa con un evento/timer;
3. el router renderiza en el mismo ciclo;
4. el módulo recibe un shape incompleto;
5. una operación como `.map()` sobre un array opcional rompe la ficha completa.

## Regla operativa

Los campos obligatorios para que un renderer no falle deben garantizarse **en la frontera síncrona de lectura**, no únicamente mediante listeners posteriores.

Para Cliente 360:

- `q.clienteResumen(id)` es el read-model usado por lista/ficha;
- `r.cli` debe salir ya proyectado;
- arrays opcionales ausentes se convierten en `[]`;
- campos ausentes genuinos se muestran de forma honesta;
- la proyección de lectura no escribe Store ni backend.

## Diferencia metodológica

### FUNCTIONAL_DEFECT

El producto falla aunque datos, permisos y relaciones sean correctos. Ejemplo: carrera entre proyección asíncrona y render síncrono.

### VALIDATOR_STALE

El gate no observa el owner/read-model que realmente controla la experiencia. Se corrige el validador sin alterar producto hasta que la prueba reproduzca el defecto.

### DATA_CONTRACT_FAILURE

Existe cuando la relación o dato canónico realmente falta. En este caso fue descartado: 1293/1293 recibos y 673/673 cartera estaban alineados.

## Patrón de prueba

El gate debe incluir una fila estructural sin arrays opcionales y exigir:

- proyección síncrona ejecutada;
- `r.cli.etiquetas` sea array;
- cero writes;
- resumen indexado preserve conteos/prima;
- Póliza y Vehículo full-page permanezcan intactos;
- cero `undefined` / `NaN` visibles.

## Roles

La misma regla aplica a Dirección, Operativo y Asesor. El scope puede reducir filas, pero no debe modificar el contrato mínimo del view-model.
