# Orbit 360 A&S — Addendum súper acumulado Claude
## Hallazgos de validación visual real de Aseguradoras

Fecha: 2026-07-10  
Carril: A, derivado de validación real de Carriles B y C  
Candidata de referencia: `Prototype Development Request - 2026-07-08T183042.881.zip`

## Evidencia real observada

En la primera apertura exitosa del host loopback de Aseguradoras se confirmó:

- módulo Aseguradoras visible;
- panel documental montado;
- formulario administrativo montado;
- rol activo Dirección;
- una fuente real localizada: `Tasas AseGuate.xlsx`;
- diez fuentes restantes pendientes;
- Cotizador y Comparativo deshabilitados;
- sesión visual temporal sin persistencia.

## Hallazgos que Claude debe atender nativamente

### 1. Selección inicial incorrecta

- Necesidad: operar únicamente con fuentes realmente disponibles.
- Observado: los once documentos aparecían seleccionados aunque solo AseGuate estaba localizada.
- Esperado: seleccionar automáticamente solo las fuentes disponibles; permitir selección humana posterior cuando existan varias.
- Causa raíz: `initializeSelection()` tomaba todas las fuentes elegibles antes de consultar disponibilidad.
- Hotfix local: `modules/aseguradoras-validation-ui-p09fix.js` limita la prueba visual a AseGuate.
- Requisito Claude: implementar selección por disponibilidad dentro del flujo nativo, sin depender del hotfix.
- Estado: hotfix visual cerrado; solución nativa pendiente de candidata Claude.

### 2. Indicadores visualmente contradictorios

- Necesidad: que los KPIs indiquen claramente qué etapa representan.
- Observado: el panel mostraba cero documentos/disponibles mientras el formulario listaba once.
- Esperado: diferenciar selección actual, disponibilidad de archivos, última vista previa y conocimiento persistido.
- Causa raíz: el panel administrativo mostraba únicamente el último plan persistido, mientras el formulario mostraba el lote configurado.
- Hotfix local: durante la prueba muestra 1 seleccionado, 1 localizado y 0 pendiente.
- Requisito Claude: separar visualmente `selección actual`, `vista previa`, `lectura` e `historial`.
- Estado: hotfix visual cerrado; solución nativa pendiente de candidata Claude.

### 3. Copy técnico visible

- Necesidad: estados comprensibles para usuarios cliente.
- Observado: `BRIDGE REGISTERED`, además de términos internos relacionados con dry-run y metadata-only.
- Esperado: `Disponible`, `Lectura de prueba`, `Código de control`, `Resumen técnico` y estados honestos equivalentes.
- Causa raíz: códigos internos llegaron al renderer sin traducción completa.
- Archivos relacionados: `modules/aseguradoras-batch-admin-copy-p09l.js`, `modules/aseguradoras-validation-ui-p09fix.js`.
- Requisito Claude: absorber el copy de forma nativa y no mostrar backend, LAB, Firebase, Firestore, provider, snapshots, referencias ni códigos internos.
- Estado: hotfix visual cerrado; solución nativa pendiente de candidata Claude.

### 4. Identidad ficticia incoherente

- Necesidad: no mostrar un usuario ficticio distinto durante una sesión temporal de validación.
- Observado: topbar mostraba Andrea Beltrán mientras el actor real del flujo era una sesión visual temporal.
- Esperado: `Validación visual · Dirección · sesión temporal` o el usuario real autenticado cuando Auth esté operativo.
- Causa raíz: topbar se pintaba con datos seed antes de reflejar el actor temporal.
- Hotfix local: `core/aseguradoras-validation-session-p09fix.js`.
- Requisito Claude: la identidad visible siempre debe corresponder al actor efectivo y rol activo.
- Estado: hotfix visual cerrado; solución nativa pendiente de candidata Claude.

## Restricciones conservadas

- No se modificó `core/auth.js`.
- No se modificó `data/store.js`.
- No se modificó `data/store-firestore-lab.local.js`.
- No se modificaron reglas Firestore.
- No se habilitó Cotizador ni Comparativo.
- No se persistió conocimiento.
- La sesión temporal solo opera en loopback autorizado y declara que los cambios no se guardan.

## Pendiente técnico separado

Firebase Auth/Firestore LAB continúa pendiente de resolución y no debe confundirse con la validación visual. La candidata Claude no debe simular persistencia ni ocultar este estado.

## Gate para solicitar Claude

Después de confirmar visualmente:

1. AseGuate como única fuente seleccionada;
2. vista previa generada;
3. lectura de prueba ejecutada sin conocimiento persistido;
4. responsive básico;
5. Cotizador/Comparativo sin activación;

se debe preparar el paquete súper acumulado completo para Claude, incluyendo este addendum y todos los addenda previos desde la candidata del 8 de julio.
