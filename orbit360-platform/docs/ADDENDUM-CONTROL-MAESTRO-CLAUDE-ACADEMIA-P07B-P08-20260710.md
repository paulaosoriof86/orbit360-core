# Addendum control maestro Claude/Academia — P0.7b/P0.8

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / BACKEND_CONTRATOS_IMPLEMENTADOS`

## 1. Regla para futura candidata

Claude no debe diseñar una carga de archivos que dependa de intervención técnica fuera de la plataforma. La experiencia debe permitir que un tenant:

- cargue o vincule una fuente;
- vea el preflight;
- siga parsing/OCR/análisis;
- revise aseguradora, producto y combinación;
- compare versión y variantes;
- corrija campos;
- valide evidencia;
- habilite con segundo gate.

## 2. Estados visibles

```text
archivo recibido
preflight
parsing determinístico
OCR requerido
en análisis semántico
matching de aseguradora
manifiesto listo para revisión
requiere validación
conflicto
validado pendiente de habilitación
habilitado
reemplazado por versión
bloqueado
```

No mostrar IA, OCR, integración o conocimiento como activos si el backend/provider no está conectado.

## 3. Aseguradoras

Vistas requeridas:

1. Fuentes y versiones.
2. Manifiesto estructural.
3. Reglas tarifarias.
4. Presentaciones/familias/variantes.
5. Vínculos tarifa-presentación.
6. Conflictos y faltantes.
7. Gate e historial de habilitación.
8. Casos de prueba.

Cada vínculo debe indicar:

- combinación;
- fuentes;
- evidencia;
- regla específica seleccionada;
- presentación;
- target habilitable;
- warnings;
- país/moneda;
- versión;
- estado.

## 4. Targets separados

### Cotizador automático

Mostrar bloqueo si falta tarifa, presentación, evidencia, moneda, ruta o validación.

### Cotizador PDF externo

Permitir propuesta recibida aun sin tarifa automática, manteniendo el documento individual completo.

### Comparativo

Permitir propuesta PDF normalizada y validada sin exigir que Orbit haya calculado la tarifa.

No usar un único interruptor para los tres targets.

## 5. País y moneda

- ambos son obligatorios;
- GTQ/COP por defecto según país;
- moneda adicional solo desde configuración;
- mostrar `REQUIERE_VALIDACION` cuando falte;
- no ocultar conflictos de moneda.

## 6. IA por tarea

Configuración administrativa futura:

- parser determinístico;
- OCR;
- análisis semántico;
- matching;
- razonamiento consultivo;
- proveedor principal y fallback;
- política de datos;
- región;
- presupuesto/límites;
- estado real de conexión.

No mostrar ni guardar claves en la UI o `localStorage`.

## 7. Academia profunda

### Asesor

- cargar propuesta operativa;
- distinguir Cotizador automático de PDF externo;
- revisar resultado propio;
- informar error sin modificar conocimiento global.

### Operativo

- revisar manifiesto y evidencia;
- completar clasificación;
- detectar páginas/hojas faltantes;
- no habilitar reglas.

### Admin/Dirección

- configurar providers por tarea;
- revisar PII y propósito;
- validar país/moneda;
- resolver reglas/presentaciones conflictivas;
- aprobar vínculo;
- elegir target;
- confirmar gate con motivo;
- revisar auditoría y versiones.

Evaluaciones mínimas:

- decidir cuándo se necesita OCR;
- bloquear una moneda no configurada;
- diferenciar tarifa sin presentación;
- diferenciar presentación sin tarifa;
- elegir target correcto;
- detectar un binding obsoleto;
- impedir que una regla genérica sustituya una específica.

## 8. Prohibiciones Claude

- no hardcodear aseguradoras o formatos;
- no asumir que toda carga requiere IA;
- no ejecutar OCR siempre;
- no exponer claves;
- no usar localStorage para secretos;
- no fusionar variantes;
- no habilitar al validar;
- no permitir Asesor/Operativo en el gate;
- no aceptar país/moneda faltantes;
- no diseñar un único target Cotizador/Comparativo;
- no tocar backend protegido.

## 9. Condición para solicitar Claude

Falta antes:

1. wire/provider backend funcional;
2. writer metadata-only;
3. primera validación real P0.6b;
4. primer binding real revisado;
5. integración provisional en Aseguradoras.

Estado actual: `NO_ENVIADO_A_CLAUDE`.
