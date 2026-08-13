# Addendum control maestro Claude/Academia — P0.6b/P0.6c

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATO_BACKEND_ESTABLE`

## 1. Alcance futuro de Claude

La futura candidata debe representar el flujo ejecutable de extracción y validación, no una tabla de tarifas escrita manualmente para A&S.

Debe servir a cualquier tenant que cargue:

- tarifario puro;
- cotizador con fórmulas;
- libro multihoja;
- archivo con hojas ocultas;
- archivo de Salud;
- archivo por producto/vehículo;
- cotización PDF de ejemplo;
- nueva versión de una fuente existente.

## 2. Vista de revisión Excel

La ficha de la fuente debe mostrar:

- archivo, hash y versión;
- hojas y visibilidad;
- errores y referencias externas;
- rutas de impresión;
- hechos detectados;
- hoja y rango;
- fórmula como evidencia no ejecutada;
- confianza;
- grupo semántico;
- estado.

Filtros mínimos:

```text
pricing
financing
health_matrix
presentation
dimensions
requiere validación
conflicto
sin evidencia
```

## 3. Editor de mapping

El administrador debe poder:

- confirmar o corregir producto;
- elegir tipo/uso de vehículo;
- elegir plan;
- asignar un hecho a tasa, mínimo, asistencia, gasto, impuesto u opcional;
- definir base neta/bruta;
- definir base de un porcentaje;
- asociar tabla/matriz;
- asociar ruta de salida;
- decidir alcance de financiamiento;
- omitir hechos irrelevantes;
- marcar una fuente como incompleta.

Cada corrección muestra antes/después, motivo, actor y evidencia.

## 4. Financiamiento global

Cuando cuotas y recargos están separados de los bloques de producto, la interfaz debe mostrar:

```text
FINANCING_SCOPE_REQUIRES_MAPPING
```

Opciones configurables:

- aplica a todos los productos seleccionados;
- aplica a una familia;
- aplica a un plan;
- aplica a un tipo de vehículo;
- no aplica;
- requiere validación.

No preseleccionar todos los productos.

## 5. Reconciliación

La UX debe comparar:

- regla propuesta;
- datos técnicos del caso;
- componentes calculados;
- total esperado;
- total observado;
- diferencia absoluta y relativa;
- tolerancia;
- evidencia Excel/PDF;
- bloqueadores.

Estados visuales:

```text
reconciled_within_tolerance
mismatch_requires_validation
incomplete_requires_validation
```

Nunca presentar “aprobado” solo porque la diferencia sea pequeña; la reconciliación precede al segundo gate.

## 6. Caso AseGuate

La interfaz debe demostrar:

- tres bloques tarifarios propuestos;
- financiamiento global no asignado;
- dos variantes de presentación: automóvil y microbús;
- componentes faltantes;
- binding automático bloqueado;
- posibilidad de conservar los PDFs como propuestas externas.

No mostrar tasas o importes reales en datos demo o Academia.

## 7. Gastos Médicos

La revisión debe soportar:

- matrices por edad y género;
- tabla con/sin maternidad;
- titular, cónyuge e hijos;
- modalidad individual/familiar;
- dental individual/familiar;
- vida y otros componentes;
- base bruta/netta;
- planes múltiples;
- edad de ingreso frente a continuidad.

## 8. Roles

### Asesor

- consultar únicamente reglas habilitadas;
- ver por qué una aseguradora no cotiza;
- crear gestión de corrección;
- no validar ni habilitar conocimiento global.

### Operativo

- revisar evidencia;
- proponer correcciones;
- clasificar hechos;
- no ejecutar segundo gate.

### Admin/Dirección

- resolver mapping;
- confirmar bases;
- reconciliar casos;
- resolver conflictos;
- versionar;
- aprobar segundo gate;
- revisar auditoría.

## 9. Academia profunda

Rutas mínimas:

1. Diferencia entre hecho, regla y tarifa habilitada.
2. Lectura de evidencia hoja/rango.
3. Por qué una fórmula cacheada no es una fórmula ejecutada.
4. Cómo asignar tasa y mínimo.
5. Cómo identificar doble IVA/gasto.
6. Cómo mapear financiamiento global.
7. Cómo revisar una matriz de Salud.
8. Cómo reconciliar contra una cotización.
9. Cómo interpretar mismatch/incomplete.
10. Cómo ejecutar el segundo gate.

Evaluaciones:

- escoger la combinación correcta por vehículo;
- rechazar una tasa sin evidencia;
- separar financiamiento de prima;
- detectar base monetaria ausente;
- bloquear automóvil frente a microbús;
- reconocer una fuente incompleta;
- evitar doble impuesto;
- no habilitar ante una diferencia sin explicar.

## 10. Prohibiciones

- no hardcodear aseguradoras o tasas;
- no copiar los ocho libros al bundle;
- no incorporar PII;
- no usar una sola tabla plana;
- no ocultar errores de fórmula;
- no resolver referencias externas automáticamente;
- no asignar financiamiento por cercanía visual;
- no habilitar desde el frontend;
- no tocar Orbit.store directamente;
- no mostrar IA o integración activa sin conexión real.

## 11. Momento de solicitar Claude

Claude todavía no se solicita. Falta cerrar:

1. wire backend invocable desde referencia autorizada;
2. writer metadata-only;
3. primer panel de revisión funcional o contrato UI estable;
4. primer binding real revisado;
5. estados de historial/versionado.

Después se entregará paquete acumulado con P0.4–P0.8 y este addendum.
