# REGISTRO DE ACTUALIZACIÓN DEL CONTROL MAESTRO — P0.4 / P0.4B

Fecha: 2026-07-10  
Referencia obligatoria: `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`

Este registro satisface la regla de actualización por bloque del control maestro y debe leerse junto con él al preparar cualquier paquete posterior para Claude.

## Fila maestra P0.4

```txt
Fecha: 2026-07-10
Carril: B; prepara A y C
Módulo/regla: Aseguradoras — contrato documental y adapter Excel multifunción
Cambio backend/local: envelope seguro, inventario de libro, clasificación de hojas, capacidades, presentación, versionado y dry-run
Patrón reusable: un Excel puede ser simultáneamente cotizador, tarifario, motor de reglas, catálogo, formulario, salida, impresión y caso de prueba
¿Aplica a Claude/prototipo?: Sí
UX requerida: wizard de fuente, inventario por hoja, corrección de clasificación, capacidades separadas, diff, versiones, advertencias y estados honestos
Academia requerida: tipos de fuente, validación, productos separados, seguridad, versionado y relación Aseguradoras→Cotizador→Comparativo
Manual/operación requerida: seleccionar país/producto, revisar roles/capacidades, complementar con cotización ejemplo y confirmar versión
Archivos fuente: core/document-source-contract-p04.js; core/excel-workbook-adapter-p04.js
Estado backend: IMPLEMENTADO_BACKEND
Estado prototipo: PENDIENTE_PROTOTIPO
Estado Academia: PENDIENTE_ACADEMIA
Estado enviado a Claude: NO_ENVIADO
Condición de cierre: parser real + dry-run real sanitizado + UX + smoke visual + validación de una combinación
```

## Fila maestra P0.4B

```txt
Fecha: 2026-07-10
Carril: B; prepara C
Módulo/regla: Aseguradoras — inspector seguro OOXML XLSX/XLSM
Cambio backend/local: parser estructural estándar, sin macros/fórmulas/valores, con límites anti-ZIP bomb
Patrón reusable: separar lectura técnica determinística de interpretación semántica e IA
¿Aplica a Claude/prototipo?: Sí, en estados/advertencias; no se entrega lógica interna de seguridad
UX requerida: lectura pendiente, inventario generado, macros no ejecutadas, vínculos bloqueados, formato no soportado
Academia requerida: seguridad de libros, formatos soportados, advertencias, escalamiento y privacidad
Manual/operación requerida: ninguna todavía; luego referencia de archivo autorizada
Archivos fuente: tools/orbit360-inspect-excel-p04.py; tools/orbit360-test-inspect-excel-p04.py
Estado backend: IMPLEMENTADO_BACKEND / CI_PENDIENTE_CONFIRMACION
Estado prototipo: PENDIENTE_PROTOTIPO
Estado Academia: PENDIENTE_ACADEMIA
Estado enviado a Claude: NO_ENVIADO
Condición de cierre: smoke CI + interoperabilidad inspector→adapter + primer inventario real sanitizado
```

## Restricciones heredadas

- No usar datos reales en código o pruebas.
- No guardar bytes/base64/valores de clientes.
- No ejecutar macros, fórmulas, ActiveX ni vínculos.
- No aprobar tarifas automáticamente.
- No habilitar una aseguradora en Cotizador por inventariar un archivo.
- No reemplazar versiones previas sin diff y confirmación.
- No mezclar productos, países o monedas.
- No tocar `Orbit.store`, Auth, Firestore LAB ni archivos protegidos.
- No pedir a Claude todavía una candidata visual basada en supuestos.

## Documentos detallados asociados

```txt
IMPLEMENTACION-P04-ADAPTER-DOCUMENTAL-EXCEL-ASEGURADORAS-20260710.md
CONTRATO-PROVEEDOR-PARSER-EXCEL-P04-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P04-EXCEL-20260710.md
IMPLEMENTACION-P04B-INSPECTOR-SEGURO-OOXML-XLSX-XLSM-20260710.md
```

## Estado de activación Claude

```txt
ACUMULANDO
NO_ENVIADO
CLAUDE_NO_REQUERIDO_TODAVIA
```

Hito para solicitar Claude: disponer de al menos un inventario real sanitizado y del contrato de extracción semántica/diff, para diseñar la UX con evidencia y no con supuestos.