# ADDENDUM CONTROL MAESTRO — CLAUDE / UX / ACADEMIA — P0.5 DOCUMENTOS DE ASEGURADORAS

Fecha: 2026-07-10  
Referencia obligatoria: `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`  
Estado: `IMPLEMENTADO_BACKEND / PENDIENTE_PROTOTIPO / PENDIENTE_ACADEMIA / NO_ENVIADO_A_CLAUDE`.

## 1. Patrón reusable implementado

```txt
fuente documental referenciada
→ inventario metadata-only
→ clasificación propuesta
→ versión y trazabilidad
→ extracción semántica con evidencia
→ diff
→ confirmar/corregir/rechazar
→ validado pendiente de habilitación
```

No existe escritura operativa ni activación automática.

## 2. Reglas que Claude debe conservar

### Aseguradoras como única fuente maestra

- No crear otro módulo de aseguradoras.
- No reutilizar el directorio del HTML v110.
- Cotizador y Comparativo consumen fuentes y conocimiento relacionados con `aseguradoraId` de Orbit.
- Una aseguradora puede tener muchas fuentes por país, producto, segmento, vehículo, plan y versión.

### Fuentes y documentos

La UX debe admitir:

- muchos cotizadores Excel;
- muchos tarifarios;
- muchas cotizaciones ejemplo;
- muchas pólizas ejemplo;
- condiciones, beneficios, circulares y anexos múltiples;
- archivos adicionales o ajustes versionados;
- Drive como referencia sin duplicar almacenamiento innecesario.

No usar una sola tarjeta “Póliza ejemplo” o “Cotización ejemplo”.

### Estados honestos

Mostrar claramente:

```txt
Fuente registrada
Lectura pendiente
Inventario listo
Extracción en prueba
Requiere validación
Conflicto
Validado pendiente de habilitación
Validado habilitado
Reemplazado por versión
Bloqueado
```

No mostrar “Tarifa activa” después de una lectura o confirmación documental.

## 3. UX requerida

### Inventario

- nombre del archivo;
- tipo de fuente propuesto;
- país/producto/plan;
- versión;
- hojas visibles/ocultas;
- hoja de entrada;
- hoja de tarifas;
- hoja de cálculo;
- hoja de salida;
- área de impresión;
- macros detectadas, nunca ejecutadas;
- vínculos externos;
- advertencias;
- documento original.

### Propuestas

Tabla o tarjetas con:

- concepto;
- valor propuesto;
- unidad/moneda;
- combinación aplicable;
- confianza;
- hoja/rango o página/bloque;
- valor vigente anterior;
- acción propuesta;
- estado de validación.

### Diff

Acciones visibles:

- Crear propuesta.
- Actualizar propuesta.
- Sin cambio.
- Requiere validación.
- Conflicto.

### Decisión humana

Por campo:

- Confirmar.
- Corregir.
- Rechazar.
- Motivo obligatorio.
- Abrir evidencia.

Para conflictos debe elegirse un valor o corregirse su dimensión; no se pueden confirmar dos valores incompatibles.

### Habilitación

Debe existir una pantalla o gate separado:

```txt
Validación documental
≠
Habilitación para Cotizador/Comparativo
```

La habilitación debe indicar país, producto, versión, vigencia y alcance.

## 4. Diseño futuro de Aseguradoras

Pestañas sugeridas:

```txt
Directorio
Contactos
Accesos
Cuentas
Drive
Fuentes
Inventario
Extracción y diff
Versiones
Productos habilitados
Comisiones
Requisitos de emisión
```

La organización puede ajustarse, pero no debe quedar redundante ni dispersa como el laboratorio interno del HTML v110.

## 5. Academia profunda

### Ruta Operativo

Lecciones:

1. Diferencia entre archivo, fuente y conocimiento.
2. Registrar archivo y combinación correcta.
3. Ejecutar inventario.
4. Leer alertas de macros/vínculos.
5. Revisar evidencia.
6. Escalar conflicto.

Evaluación:

- seleccionar país/producto correctos;
- identificar una fuente tarifaria sin presentación;
- reconocer que inventario no activa tarifas.

### Ruta Admin/Dirección

Lecciones:

1. Versionado y reemplazo.
2. Diff crear/actualizar/omitir.
3. Confirmar/corregir/rechazar.
4. Resolver conflictos.
5. Segundo gate de habilitación.
6. Auditoría y reversibilidad.

Evaluación:

- resolver valores conflictivos;
- impedir habilitación sin evidencia;
- diferenciar regla de Autos, Motos y Gastos Médicos.

### Ruta Asesor

- consultar solo productos/tarifas habilitados;
- interpretar vigencia y fuente;
- reportar inconsistencia mediante gestión;
- no editar conocimiento validado.

## 6. Manuales y mensajes

Textos obligatorios:

- “Lectura preparada” en lugar de “Tarifa importada”.
- “Propuesta de extracción” en lugar de “Dato confirmado”.
- “Validado pendiente de habilitación” cuando corresponda.
- “Conflicto: requiere decisión” si existen valores incompatibles.
- “El archivo contiene macros, pero Orbit no las ejecutó”.

## 7. Lo que Claude no debe recibir

- archivos reales no sanitizados;
- valores reales de clientes;
- contraseñas/tokens;
- rutas privadas;
- bytes/base64;
- service accounts;
- proveedor interno de secretos;
- backend protegido para reemplazo.

## 8. Archivos fuente para futura candidata

Claude debe recibir completos, cuando corresponda:

```txt
IMPLEMENTACION-P04-ADAPTER-DOCUMENTAL-EXCEL-ASEGURADORAS-20260710.md
IMPLEMENTACION-P04B-INSPECTOR-SEGURO-OOXML-XLSX-XLSM-20260710.md
IMPLEMENTACION-P05-WIRE-METADATA-EXTRACCION-DIFF-ASEGURADORAS-20260710.md
CONTRATO-PROVEEDOR-EXTRACCION-DOCUMENTAL-P05-20260710.md
AUDITORIA-FORENSE-PROFUNDA-COTIZADOR-COMPARATIVO-V110-CONTRATO-AYS-20260709.md
```

No preparar instrucciones visuales desde memoria o únicamente desde un resumen de conversación.

## 9. Condición para llamar a Claude

Claude será necesario después de obtener al menos un flujo real sanitizado:

```txt
archivo real
→ inventario
→ propuestas
→ diff
→ validaciones/errores reales
```

Antes de esa evidencia, diseñar la UX final sería prematuro.

## 10. Estado

```txt
PATRON_REUSABLE_IMPLEMENTADO
CONTRATOS_Y_SMOKES_PREPARADOS
UX_FINAL_PENDIENTE
ACADEMIA_DOCUMENTADA
BENCHMARK_REAL_PENDIENTE
LISTO_PARA_CLAUDE: NO
ENVIADO_A_CLAUDE: NO
```
