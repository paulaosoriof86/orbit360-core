# Addendum control maestro Claude/Academia — P0.9d resolver y lote

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATOS_BACKEND_IMPLEMENTADOS`

## 1. Regla de continuidad

La futura UX de carga por lotes debe operar sobre referencias autorizadas y nunca pedir o mostrar rutas internas del servidor.

Debe distinguir claramente:

```text
archivo seleccionado
referencia creada
referencia resuelta
manifiesto generado
fuente registrada
regla validada
regla habilitada
```

Son estados diferentes.

## 2. Vista de lote

La interfaz debe ofrecer:

- agrupación por aseguradora;
- conteo Excel/PDF;
- producto y variante;
- versión;
- país/moneda;
- estado de referencia;
- estado del dry-run;
- warnings;
- duplicados;
- errores de asociación;
- progreso por documento;
- reintento individual;
- detener lote;
- exportar reporte sanitizado.

## 3. Resolución de referencia

La UI solo muestra:

- nombre del archivo;
- proveedor documental;
- referencia amigable;
- fecha de expiración si aplica;
- estado;
- permisos requeridos.

No mostrar:

- ruta montada;
- bucket interno;
- token;
- URL firmada completa;
- comando Python;
- stack trace.

## 4. Errores de lote

Traducir de forma accionable:

```text
DUPLICATE_DOCUMENT_VERSION
DUPLICATE_FILE_REFERENCE
REFERENCE_EXPIRED
REFERENCE_NOT_READY
REFERENCE_TASK_NOT_ALLOWED
REFERENCE_TENANT_MISMATCH
SOURCE_REFERENCE_NOT_FOUND
```

Cada error debe indicar el documento afectado y permitir corregirlo sin reiniciar todo el lote.

## 5. A&S

El lote inicial contiene once fuentes y debe mostrarse agrupado, no como una lista plana.

Casos especiales visibles:

- AseGuate: tarifario + dos variantes PDF;
- Bantrab: Autos y Motos separados;
- BAM: Vehículos y Salud separados;
- Banrural/Aseguradora Rural: asociación pendiente de confirmar;
- Columna: nombre/alias pendiente de confirmar;
- Universales: presentación PDF sin tarifa automática.

No incorporar estos nombres o estructuras en el core visual reusable. Deben provenir de datos del tenant.

## 6. Confirmaciones

La carga por lote debe tener dos momentos:

### Antes del dry-run

Confirmar:

- tenant;
- aseguradoras;
- referencias;
- versiones;
- país/moneda;
- propósito.

### Antes de persistir metadata

Confirmar:

- resultados del dry-run;
- conflictos;
- mappings corregidos;
- motivo;
- actor/rol activo.

La persistencia de metadata no debe ofrecer habilitar Cotizador en el mismo botón.

## 7. Roles

### Operativo

- preparar lote;
- ejecutar dry-run;
- revisar referencias y errores;
- corregir datos permitidos;
- no persistir globalmente.

### Admin/Dirección

- confirmar asociaciones;
- corregir duplicados;
- aprobar metadata;
- revisar auditoría;
- ejecutar segundo gate en fase posterior.

### Asesor

- no administra el lote global;
- puede cargar documentos operativos propios según scope.

## 8. Academia

Rutas mínimas:

- qué es una referencia;
- expiración y single-use;
- aislamiento por tenant;
- task/purpose;
- cómo leer un lote;
- cómo resolver duplicados;
- cómo detener/reintentar;
- diferencia dry-run/persistencia/habilitación;
- casos AseGuate/Bantrab/Salud como ejemplos sanitizados.

Evaluaciones:

- detectar referencia cruzada;
- identificar documento duplicado;
- separar Autos/Motos;
- separar presentación/tarifa;
- bloquear moneda faltante;
- impedir activación desde lote.

## 9. Prohibiciones Claude

- no hardcodear el lote A&S;
- no mostrar rutas;
- no procesar todos los archivos como una sola fuente;
- no fusionar productos;
- no permitir cross-tenant;
- no aplicar automáticamente tras dry-run;
- no marcar fuentes como activas;
- no ocultar warnings;
- no tocar `Orbit.store` directo.

## 10. Condición de candidata

Claude se solicitará cuando el lote pueda ejecutarse en LAB y el read model real esté comprobado. Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
