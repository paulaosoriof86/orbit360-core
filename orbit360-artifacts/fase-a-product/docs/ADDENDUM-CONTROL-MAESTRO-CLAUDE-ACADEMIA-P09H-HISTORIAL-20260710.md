# Addendum control maestro Claude/Academia — P0.9h historial del lote

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATO_BACKEND_IMPLEMENTADO`

## 1. Regla de continuidad

La futura candidata debe representar el historial documental como una función del módulo Aseguradoras y no como una consola técnica separada.

No debe asumir que:

- un lote se ejecuta una sola vez;
- una recarga conserva estado en memoria;
- todas las fuentes fallan o terminan juntas;
- reanudar significa repetir las once fuentes;
- un run completado habilita Cotizador o Comparativo.

## 2. Vista requerida

La UX futura debe incluir:

- historial de runs;
- fecha, modo, actor y motivo;
- resumen por estado;
- cantidad de intentos;
- detalle por aseguradora y documento;
- diff frente al run anterior;
- documentos reanudables;
- bindings pendientes;
- auditoría.

## 3. Estados visibles

```text
waiting_reference
failed
blocked
dry_run_ready
persisted
verified
```

Los textos para usuario deben ser claros y no mostrar códigos internos sin traducción.

## 4. Reanudación

La futura acción “Reanudar pendientes” debe:

- seleccionar solo fallidas, bloqueadas o sin referencia;
- mostrar qué documentos se ejecutarán;
- exigir actor, motivo y confirmación;
- conservar el vínculo con el run anterior;
- no repetir fuentes verificadas salvo selección expresa;
- no activar productos.

El panel implementado en P0.9h es de solo lectura. Claude no debe agregar acciones hasta que el bridge/provider y el gate LAB estén comprobados.

## 5. Diff por fuente

La interfaz debe mostrar cambios en:

- estado;
- código traducido;
- intentos;
- manifiestos/propuestas/reglas/presentaciones;
- errores.

No debe mostrar:

- fileRef;
- rutas internas;
- URLs firmadas;
- tokens;
- payload completo;
- datos de clientes.

## 6. Roles

### Dirección/AdminTenant

- consultar historial completo;
- revisar diffs;
- preparar reanudación;
- confirmar persistencia del historial;
- revisar auditoría.

### Operativo

- consultar ejecución y pendientes;
- revisar evidencia permitida;
- no confirmar persistencia global ni habilitación.

### Asesor

- no administra historial global;
- solo ve estados operativos relacionados con sus propios casos cuando el alcance final lo permita.

## 7. Academia profunda

Rutas mínimas:

1. Diferencia entre run, documento y binding.
2. Estados del lote.
3. Cómo leer intentos y errores.
4. Cómo interpretar un diff.
5. Cómo reanudar solo pendientes.
6. Qué información nunca aparece en historial.
7. Persistencia frente a habilitación.
8. Auditoría y rol activo.

Evaluaciones:

- identificar documentos reanudables;
- evitar repetir una fuente verificada;
- reconocer un cambio `failed` → `dry_run_ready`;
- bloquear una referencia expirada;
- detectar fuga de ruta o token;
- explicar por qué un run persistido no activa Cotizador.

## 8. Prohibiciones para Claude

- no incorporar rutas o referencias reales al frontend;
- no agregar botones de ejecución antes del bridge real;
- no permitir reanudar sin confirmación;
- no mostrar datos personales;
- no fusionar runs;
- no borrar historial;
- no habilitar Cotizador/Comparativo desde esta vista;
- no tocar `Orbit.store` directamente desde el módulo visual.

## 9. Condición para solicitar candidata

Claude se solicita después de:

1. bootstrap aplicado en LAB;
2. primer run real persistido;
3. historial confirmado tras recarga;
4. reanudación real de al menos un pendiente;
5. auditoría visible;
6. contrato de acciones administrativas estabilizado.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
