# Addendum control maestro Claude/Academia — P0.9f runtime Aseguradoras

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / RUNTIME_BACKEND_PREPARADO`

## 1. Alcance

P0.9f añade un panel técnico-operativo dentro de Aseguradoras sin modificar el módulo principal. La candidata futura de Claude deberá convertirlo en una experiencia final coherente con Orbit 360, pero no puede eliminar los estados honestos ni simplificar la separación entre persistencia y habilitación.

## 2. Panel futuro

Debe conservar indicadores para:

- runtime documental;
- provider conectado o `BACKEND_REQUIRED`;
- snapshots;
- preflight;
- fuentes;
- manifiestos;
- propuestas;
- reglas;
- presentaciones;
- bindings;
- revisiones;
- pendientes y conflictos.

No mostrar “conectado”, “activo” o “procesado” sin confirmación backend.

## 3. Primera fuente

El flujo visual debe distinguir:

```text
Seleccionar/cargar archivo
→ referencia backend
→ inspeccionar
→ revisar propuesta
→ confirmar plan
→ persistir metadata
→ verificar read model
→ validar conocimiento
→ segundo gate
```

La confirmación del plan y la confirmación de persistencia son acciones distintas.

## 4. Estados visibles

Mínimos:

```text
runtime pendiente
runtime listo
provider requerido
provider conectado
snapshots pendientes
preflight bloqueado
lectura pendiente
inspección lista
plan metadata-only listo
dry-run listo
persistido pendiente de validación
read model confirmado
conflicto
segundo gate pendiente
```

## 5. Roles

### Asesor

- consulta conocimiento habilitado;
- no registra fuentes globales;
- no confirma planes;
- no persiste ni habilita.

### Operativo

- puede inspeccionar y revisar;
- no confirma persistencia global ni segundo gate.

### Admin/Dirección

- selecciona fuente;
- revisa resolución;
- confirma plan con motivo;
- confirma persistencia;
- revisa read model;
- valida reglas/presentaciones;
- ejecuta segundo gate cuando corresponda.

## 6. Academia profunda

Rutas mínimas:

1. Qué es una referencia backend.
2. Diferencia entre archivo, manifiesto y propuesta.
3. Dry-run frente a persistencia.
4. Persistencia frente a habilitación.
5. Provider y estados honestos.
6. Snapshots y recarga.
7. Confirmaciones administrativas.
8. Resolución de errores de preflight.
9. Validación de primera fuente.
10. Segundo gate.

Evaluaciones:

- identificar cuándo `BACKEND_REQUIRED` es correcto;
- bloquear una ruta local;
- distinguir plan y persistencia;
- reconocer que una fuente persistida sigue deshabilitada;
- verificar fuente y manifiesto después de recarga;
- impedir habilitación con binding incompleto.

## 7. Prohibiciones para Claude

- no convertir el panel en una simulación estática;
- no hardcodear fuentes o rutas;
- no mostrar provider conectado por diseño;
- no escribir directo en `Orbit.store` desde UI;
- no habilitar automáticamente;
- no ocultar errores de Auth, tenant o snapshots;
- no mezclar fuentes de tenants;
- no eliminar motivo y confirmación;
- no incrustar secretos ni datos reales.

## 8. Condición para solicitar candidata

Claude se solicitará después de comprobar:

1. bootstrap cargado en LAB;
2. panel visible;
3. provider real o bridge controlado;
4. primera persistencia metadata-only;
5. recarga/read model;
6. primer binding revisado;
7. estados y acciones definitivos.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
