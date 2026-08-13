# Addendum control maestro Claude/Academia — P0.9j Formulario administrativo

Fecha: 2026-07-10  
Módulo: Aseguradoras  
Estado: requisitos acumulados; todavía no solicitar candidata Claude

## 1. Propósito

Traducir el contrato backend P0.9j a una experiencia clara, segura y reusable para cualquier tenant, sin revelar rutas, referencias o secretos.

## 2. UX obligatoria futura

La candidata debe conservar este flujo:

```text
Acción
→ selección de fuentes
→ motivo
→ preview
→ disponibilidad de referencias
→ fingerprint
→ confirmación reforzada
→ dry-run/reanudación
→ resultados
→ historial separado
```

No debe convertirlo en una carga genérica de archivos ni fusionarlo con la habilitación de Cotizador.

## 3. Elementos visuales

- Selector “Dry-run del lote” / “Reanudar pendientes”.
- Lista por aseguradora, archivo, producto, país, moneda y versión.
- Selección mediante checkbox; nunca campo libre de ID.
- Motivo obligatorio.
- Estado de referencia con etiquetas:
  - Disponible;
  - Pendiente;
  - Backend requerido.
- Fingerprint visible para auditoría.
- Frase de confirmación exacta.
- Resumen por procesados, listos, fallidos y sin referencia.
- Bloque separado “Guardar únicamente el historial”.

## 4. Estados honestos

La UI debe distinguir:

```text
Contrato cargado
Backend de referencias conectado
Preview válido
Referencias completas
Dry-run terminado
Historial persistido
Conocimiento persistido
Binding habilitado
```

Nunca presentar los últimos tres como equivalentes.

## 5. Roles

### Operativo

Puede:

- ver el lote;
- seleccionar fuentes;
- generar preview;
- ejecutar o reanudar dry-run;
- revisar resultados.

No puede:

- persistir historial global;
- persistir conocimiento;
- habilitar bindings.

### Dirección/Admin/AdminTenant/SuperAdmin

Puede además guardar el historial metadata-only con doble confirmación.

### Asesor

No ve controles de operación global. Debe recibir una explicación de permiso insuficiente, no controles deshabilitados ambiguos.

## 6. Prohibiciones Claude

- No mostrar `fileRef`, `sourceRef`, rutas, URLs o tokens.
- No añadir campos para pegar enlaces técnicos.
- No usar `localStorage` para conservar el formulario.
- No llamar `Orbit.store.insert/update/remove` desde la UI.
- No activar Cotizador o Comparativo.
- No asumir que Excel equivale a regla validada.
- No usar nombres o porcentajes de A&S en componentes reusables.
- No borrar la separación entre preview, ejecución e historial.

## 7. Academia profunda

Rutas mínimas:

### Dirección/Admin

1. Qué es un lote documental.
2. Diferencia entre archivo, referencia y manifiesto.
3. Cómo revisar el preview.
4. Qué significa el fingerprint.
5. Por qué la confirmación es reforzada.
6. Diferencia entre dry-run, historial y conocimiento.
7. Cómo interpretar documentos fallidos o pendientes.
8. Cuándo reanudar.
9. Por qué Cotizador sigue deshabilitado.

### Operativo

1. Seleccionar fuentes.
2. Registrar un motivo útil.
3. Identificar referencias pendientes.
4. Ejecutar dry-run.
5. Leer resultados.
6. Escalar validaciones a Dirección/Admin.

### Evaluación

Casos:

- referencia backend pendiente;
- actor con rol activo Asesor;
- cambio de motivo después del preview;
- fingerprint diferente;
- reanudación de una fuente fallida;
- intento de guardar conocimiento desde el formulario;
- historial confirmado sin segunda confirmación.

## 8. Momento para Claude

No solicitar candidata todavía. Antes deben existir:

- bridge de referencias conectado;
- primer preview real;
- primer dry-run real;
- historial visible después de recarga;
- smoke visual del formulario;
- bindings AseGuate todavía cerrados por segundo gate.

## 9. Patrones reusables

El patrón aplicable a otros tenants es:

```text
frontend sin rutas
→ broker efímero
→ backend resuelve referencia
→ preview sanitizado
→ confirmación reforzada
→ ejecución sin conocimiento
→ historial independiente
```

La configuración tenant define fuentes, aseguradoras y permisos; el componente no debe hardcodearlos.