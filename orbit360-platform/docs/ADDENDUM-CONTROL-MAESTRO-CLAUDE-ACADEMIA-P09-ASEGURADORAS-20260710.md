# Addendum control maestro Claude/Academia — P0.9 Aseguradoras

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / RUNTIME_BACKEND_PREPARADO`

## 1. Regla de continuidad

La futura UX debe operar sobre el read model P0.9 y no crear almacenamiento paralelo, arreglos locales o hardcodes para A&S.

Debe conservar:

- aislamiento por tenant;
- una ficha de aseguradora como punto de entrada;
- múltiples fuentes por combinación;
- Excel/PDF/versiones;
- manifiestos, propuestas, reglas, presentaciones y bindings;
- estado y evidencia;
- rol activo;
- motivo y confirmación;
- cero habilitación automática.

## 2. Vista Aseguradoras

Agregar tabs o equivalentes:

1. Resumen.
2. Fuentes.
3. Extracciones.
4. Reglas tarifarias.
5. Presentaciones.
6. Bindings.
7. Revisiones.
8. Versiones.
9. Auditoría visible según rol.

El resumen debe mostrar:

- cantidad de fuentes;
- manifiestos;
- propuestas;
- reglas;
- presentaciones;
- bindings;
- pendientes de validación;
- conflictos;
- habilitados para Cotizador;
- habilitados para Comparativo.

## 3. Flujo de carga

```text
Seleccionar aseguradora
→ cargar o elegir fuente Drive
→ indicar país/producto/versión si se conocen
→ ejecutar preflight
→ mostrar provider y estado honesto
→ mostrar manifiesto
→ revisar propuestas
→ corregir mapping
→ confirmar persistencia metadata-only
→ validar contenido
→ construir binding
→ segundo gate separado
```

Nunca usar “conectado” si el provider devuelve `BACKEND_REQUIRED`.

## 4. Estados visuales

```text
lectura pendiente
provider requerido
extracción en proceso
manifiesto listo para revisión
requiere validación
conflicto
metadata persistida pendiente de validación
validado pendiente de habilitación
habilitado
reemplazado por versión
bloqueado
```

## 5. Roles

### Operativo

- cargar fuente;
- ejecutar extracción;
- revisar manifiesto;
- completar clasificación;
- preparar propuesta;
- no aplicar plan global ni habilitar.

### Admin/Dirección

- revisar cambios;
- confirmar persistencia;
- validar reglas/presentaciones;
- resolver conflictos;
- versionar;
- ejecutar segundo gate;
- revisar auditoría.

### Asesor

- consultar únicamente conocimiento ya autorizado para su operación;
- no cargar conocimiento global;
- no validar ni habilitar.

## 6. Seguridad UX

- no mostrar PII de training;
- no mostrar claves o tokens;
- no exponer archivos completos en logs;
- no permitir pegar reglas directamente como JSON operativo;
- no permitir marcar “habilitado” desde un checkbox simple;
- advertir si el estado cambió y exigir regenerar el plan;
- ocultar auditoría interna a roles no autorizados.

## 7. Academia profunda

### Operativo

- diferencia entre fuente, manifiesto y regla;
- cómo elegir aseguradora/producto;
- cómo revisar evidencia;
- cómo reportar un error;
- por qué cargar no significa habilitar.

### Admin/Dirección

- cómo revisar un mapping;
- cómo persistir metadata-only;
- cómo comparar versiones;
- cómo resolver conflicto;
- cómo validar país/moneda;
- cómo construir un binding;
- cómo ejecutar segundo gate;
- cómo auditar actor/motivo.

### Evaluaciones

- detectar fuente del tenant incorrecto;
- detectar rol activo no autorizado;
- distinguir regla de presentación;
- resolver un reintento idempotente;
- bloquear plan desactualizado;
- identificar provider no conectado;
- impedir activación accidental.

## 8. Prohibiciones para Claude

- no hardcodear las once fuentes A&S;
- no precargar tasas en frontend;
- no usar localStorage;
- no tocar `data/store.js`;
- no crear colecciones con nombres diferentes;
- no duplicar el directorio Aseguradoras;
- no activar Cotizador/Comparativo al guardar;
- no ocultar `BACKEND_REQUIRED`;
- no fusionar tenants;
- no eliminar versiones anteriores.

## 9. Condición para solicitar candidata

Claude será requerido cuando:

1. P0.9 esté empalmado en runtime;
2. exista provider backend al menos para Excel/PDF determinístico;
3. una fuente real esté persistida metadata-only;
4. el read model devuelva datos reales sanitizados;
5. se haya validado el primer flujo de revisión.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
