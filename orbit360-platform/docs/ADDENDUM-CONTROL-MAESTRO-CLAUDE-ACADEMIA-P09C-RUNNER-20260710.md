# Addendum control maestro Claude/Academia — P0.9c runner documental

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / RUNNER_BACKEND_IMPLEMENTADO`

## 1. Continuidad obligatoria

La futura candidata no debe simular que el navegador abre o interpreta directamente archivos locales.

El flujo real es:

```text
archivo/referencia autorizada
→ resolver backend
→ runner seguro
→ extractor
→ manifiesto
→ revisión
→ persistencia metadata-only
```

La UX debe reflejar estados reales y no mostrar un provider conectado si el bridge devuelve `BACKEND_REQUIRED`.

## 2. Carga de fuentes

El wizard de Aseguradoras debe admitir:

- selección desde Drive;
- upload autorizado;
- archivo Excel o PDF;
- país y aseguradora propuestos;
- producto/vehículo/riesgo/plan;
- versión;
- propósito training/operational;
- progreso por etapas;
- errores recuperables.

No debe mostrar ni solicitar una ruta local del servidor.

## 3. Estados del runner

Estados mínimos visibles:

```text
referencia_pendiente
resolviendo_fuente
validando_integridad
extrayendo_manifiesto
requiere_ocr
analisis_semantico
listo_para_revision
requiere_validacion
bloqueado
error_recuperable
```

Errores que deben traducirse a lenguaje operativo:

```text
SOURCE_REFERENCE_NOT_RESOLVED
SOURCE_HASH_MISMATCH
TASK_FILE_TYPE_MISMATCH
SOURCE_OUTSIDE_ALLOWED_ROOT
EXTRACTOR_TIMEOUT
EXTRACTOR_OUTPUT_MISSING
BACKEND_REQUIRED
```

Nunca mostrar rutas internas, comandos, stack traces o nombres de infraestructura al usuario cliente.

## 4. Panel de revisión

Debe mostrar:

- fuente y versión;
- aseguradora y país;
- hash abreviado;
- tipo de documento;
- hojas/páginas;
- capacidades detectadas;
- warnings;
- mapping propuesto;
- evidencia hoja/rango o página/bloque;
- diferencias frente a versión previa;
- estado de validación;
- botón para reconstruir el dry-run si cambió la fuente.

## 5. Persistencia

La acción final debe llamarse de forma honesta, por ejemplo:

```text
Registrar fuente y conocimiento pendiente de validación
```

No usar:

```text
Activar cotizador
Publicar tarifa
Conectar aseguradora
```

salvo que el segundo gate haya sido completado.

## 6. Primer caso A&S

El tarifario AseGuate fue utilizado en un dry-run aislado para validar el wire y el read model.

La UX futura debe poder mostrar:

```text
Aseguradora Guatemalteca
→ Tarifario Excel v1
→ requiere validación
→ 1 manifiesto
→ 1 propuesta
→ 0 reglas habilitadas
→ 0 bindings habilitados
```

No incorporar estos valores como seed global ni como contenido hardcodeado.

## 7. Multi-tenant

La interfaz debe derivar todo del tenant activo:

- directorio de aseguradoras;
- fuentes;
- políticas de provider;
- permisos;
- países/monedas;
- productos;
- versiones;
- gates.

Nunca mostrar fuentes A&S a otro tenant.

## 8. Roles

### Operativo

- cargar y ejecutar extracción;
- revisar warnings y evidencia;
- corregir clasificación permitida;
- no confirmar persistencia global.

### Admin/Dirección

- confirmar tenant/aseguradora;
- revisar diff;
- registrar metadata;
- resolver conflictos;
- gestionar versiones;
- habilitar únicamente mediante gate posterior.

### Asesor

- consultar fuentes habilitadas según permisos;
- cargar cotización operativa propia;
- no administrar patrones globales.

## 9. Academia profunda

Rutas mínimas:

- diferencia entre fileRef y archivo local;
- por qué el backend valida raíz y hash;
- training frente a operational;
- cómo interpretar warnings;
- cómo revisar evidencia;
- cómo registrar metadata;
- por qué registrar no equivale a habilitar;
- cómo reconstruir un plan cuando cambia la fuente;
- cómo revisar auditoría.

Evaluaciones:

- detectar hash cambiado;
- bloquear ruta no autorizada;
- resolver referencia faltante;
- diferenciar manifiesto de regla;
- identificar una fuente pendiente de validación;
- impedir activación prematura.

## 10. Prohibiciones para Claude

- no leer archivos mediante rutas locales del usuario;
- no ejecutar Python desde el navegador;
- no mostrar stack traces;
- no inventar progreso o conexión;
- no guardar binarios/base64 en Orbit.store;
- no hardcodear tenant/aseguradora;
- no fusionar upload con habilitación;
- no ocultar estado `requiere_validacion`;
- no tocar archivos backend protegidos.

## 11. Condición para solicitar candidata

Claude se solicitará cuando existan:

1. resolver Drive/upload funcional;
2. empalme P0.9 aplicado en runtime seguro;
3. primera fuente persistida en Firestore LAB;
4. read model y auditoría comprobados;
5. flujo de revisión suficientemente estable.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
