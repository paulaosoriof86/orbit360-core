# Nota para Claude — avances backend mientras corrige candidato

Fecha: 2026-07-04  
Actualización: 2026-07-08  
Rama backend activa: `ays/backend-tenant-lab-v99-20260703`  
PR backend: #5  
Estado: documentación de coordinación Claude / ChatGPT-Codex.

## Propósito

Mientras Claude corrige el candidato frontend/prototipo Orbit 360 A&S, ChatGPT/Codex continuó avanzando únicamente en backend seguro, herramientas de validación y documentación. Estos avances no deben ser sobrescritos por el próximo ZIP de Claude.

Claude debe usar esta nota como restricción de empalme: el nuevo candidato debe ser frontend/prototipo empalmable y no invasivo.

## Avances backend realizados después del paquete Claude ampliado

### 1. Protección de artefactos locales y privados

Archivo actualizado:

- `.gitignore`

Se reforzaron exclusiones para:

- previews de overlay;
- manifiestos privados;
- fuentes privadas;
- payloads privados;
- reportes privados;
- archivos `.private`, `.payload` y manifests locales/privados.

Implicación para Claude:

- No incluir datos reales ni artefactos temporales en el ZIP.
- No entregar payloads reales en documentación.
- No asumir que `_orbit360_reports`, `_orbit360_tmp` o `_orbit360_overlay_preview` son parte del producto final.

### 2. Plan técnico del parser por fuentes separadas

Archivo agregado:

- `orbit360-platform/docs/PLAN-IMPLEMENTACION-PARSER-FUENTES-SEPARADAS-AYS-20260704.md`

Define:

- adaptadores Excel, CSV, PDF/OCR, Word e imagen;
- tipos de fuente autorizados;
- contrato de procesamiento;
- reglas por fuente;
- estados de salida;
- reporte dry-run obligatorio.

Implicación para Claude:

- El módulo Importar debe alinearse con fuentes separadas.
- No mezclar clientes, pólizas, cobros, comisiones, estados bancarios, histórico financiero, documentos o siniestros.
- Si un tipo visible no tiene contrato real, debe quedar oculto, bloqueado o documentado como pendiente, no simulado.

### 3. Validador de manifiestos por fuente

Archivos agregados:

- `tools/orbit360-validar-manifest-fuente-ays.mjs`
- `tools/orbit360-test-validar-manifest-fuente-ays.mjs`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-VALIDADOR-MANIFEST-FUENTE.md`

Bloquea:

- tipo de fuente inválido;
- país/moneda incoherente;
- campos mínimos faltantes;
- colecciones destino no permitidas;
- filas/payload real embebido en manifest;
- `write_enabled=true`.

Implicación para Claude:

- El frontend debe mostrar preview/validación, no escritura directa.
- No debe permitir que financiero histórico escriba clientes, pólizas, cobros o aseguradoras.
- No debe permitir que estado bancario cree clientes, pólizas o cobros directamente.
- No debe permitir que documentos soporte creen/modifiquen clientes o pólizas sin confirmación posterior.

### 4. Normalizador país/moneda sin defaults peligrosos

Archivos agregados:

- `tools/orbit360-normalizar-pais-moneda-ays.mjs`
- `tools/orbit360-test-normalizar-pais-moneda-ays.mjs`
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260704-NORMALIZADOR-PAIS-MONEDA.md`

Reglas:

- GT + GTQ: listo metadata.
- CO + COP: listo metadata.
- GT sin moneda: requiere validación; puede sugerir GTQ, pero no autoriza escritura.
- CO sin moneda: requiere validación; puede sugerir COP, pero no autoriza escritura.
- GT + COP o CO + GTQ: bloqueado.
- Guatemala y Colombia en la misma metadata: bloqueado por ambigüedad.

Implicación para Claude:

- No usar `GT`, `GTQ`, Guatemala o moneda por defecto en flujos de escritura.
- El UI puede sugerir país/moneda, pero debe dejar claro si requiere validación.
- No generar cartera, cobros, pólizas ni producción si falta país/moneda confiable.

### 5. Contrato pólizas, recibos/cartera y conciliación

Archivos agregados:

- `orbit360-platform/docs/CONTRATO-POLIZAS-RECIBOS-CARTERA-CONCILIACION-AYS-20260704.md`
- `orbit360-platform/docs/PAQUETE-CLAUDE-BLOQUE-POLIZAS-RECIBOS-CARTERA-20260704.md`

Define:

- estados de póliza que generan cartera y estados históricos;
- campos mínimos para `polizas`, `cobros` y `conciliaciones`;
- reglas de prima neta/gastos/IVA/total;
- conciliación con aseguradoras;
- conciliación con planillas de comisiones;
- tratamiento especial de junio/julio 2026 como caso de migración, no hardcode productivo;
- impacto en Cliente360, Portal, analíticas, metas, comisiones, liquidaciones, notificaciones y reportes.

### 6. Auditoría real de la candidata activa Claude

Archivos agregados:

- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-ACTIVO-CLAUDE-20260704-152321.md`
- `orbit360-platform/docs/PAQUETE-COMPLETO-CLAUDE-ACTUALIZADO-POST-AUDITORIA-20260704.md`

Resultado:

- El candidato activo `Prototype Development Request - 2026-07-04T152321.882.zip` fue auditado sobre archivos reales.
- Tiene 97 archivos, 54 JS y 30 módulos.
- Los 54 JS pasaron validación sintáctica.
- Se comparó contra el ZIP anterior disponible.
- La candidata actual ya resolvió parte de los hallazgos que estaban abiertos en la rama GitHub, especialmente en importador, país/moneda, planillas de comisión, documentos como parches y estado bancario como conciliación.

Implicación para Claude:

- El próximo trabajo debe partir de esa candidata, no de una versión anterior.
- No se debe pedir que corrija algo que ya está corregido; debe conservar esas mejoras y completar lo pendiente.
- Debe unificar documentación de versión: v1.114/v1.117/v1.123.

### 7. Avance v1330 desde celular: gates, copy honesto y Academia

Archivos agregados/actualizados:

- `orbit360-platform/docs/AVANCE-CELULAR-EQUIPO-CONFIG-V1330-20260708.md`.
- `orbit360-platform/docs/AUDITORIA-CELULAR-MODULOS-VISIBLES-V1330-20260708.md`.
- `orbit360-platform/docs/REGISTRO-ACCIONES-CELULAR-V1330-20260708.md`.
- `orbit360-platform/docs/PLAN-TRABAJO-ACTUALIZADO-V1330-20260708.md`.
- `orbit360-platform/docs/BITACORA-CAMBIOS-AYS-BACKEND-20260703.md`.
- `orbit360-platform/docs/PENDIENTES-Y-MEJORAS-BACKEND-POST-V104-20260703.md`.

Resultado:

- Se documentó que Equipo y Configuración son el bloqueo real antes de M2/M3/M4.
- Se auditó Portal, Correo, Notificaciones, Automatizaciones, Plantillas, Marketing y Conciliaciones.
- Se separó qué bloquea ahora, qué no bloquea M2/M3/M4 y qué bloquea solo M5.
- Se documentó que el patch Equipo/Config v1 falló sin cambios por usar reemplazos exactos largos.
- Se dejó instrucción de patch v2 tolerante, validación Node y contrato backend LAB.

Implicación para Claude:

- No debe tratar estos pendientes como backend de Claude; Equipo/Config gates son cierre operativo ChatGPT/Codex.
- Sí debe conservar los patrones UX reutilizables:
  - copy honesto;
  - preparado/registrado/abierto no equivale a enviado/publicado/confirmado;
  - no mostrar tecnicismos visibles al cliente/admin comercial;
  - no simular integraciones activas;
  - no pedir ni guardar secretos reales en frontend;
  - acciones administrativas con motivo, confirmación y trazabilidad;
  - sección interna Orbit oculta por rol.

## Backend protegido que Claude no debe tocar

- `orbit360-platform/data/store.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-loader.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/core/backend-lab-security-guard.js`
- `firestore.rules`
- scripts `tools/orbit360-*` de backend, preflight, plan, preview, diff, pipeline, manifest y normalización.

## Instrucciones para el próximo candidato Claude

1. Entregar solo candidato frontend/prototipo empalmable.
2. No reemplazar backend LAB ni herramientas ChatGPT/Codex.
3. No incluir datos reales.
4. No hardcodear A&S fuera de configuración tenant/demo aislado.
5. Documentar cada corrección en bitácoras.
6. Actualizar smoke visual real clic por clic.
7. Alinear Importar con fuentes separadas, manifests, país/moneda y contratos reales.
8. Alinear Pólizas/Cobros/Cliente360/Portal/Comisiones/Finanzas con el contrato de cartera y conciliación.
9. Conservar avances ya verificados de la candidata activa 2026-07-04T152321.882.
10. Conservar la auditoría v1330: Portal/Correo/Notificaciones/Automatizaciones/Plantillas/Marketing tienen pendientes de copy/gate menor, pero no bloquean M2/M3/M4.
11. No tocar Conciliaciones como M5 sin conservar aislamiento: no cobros, no cartera, no producción, no aplicación de pagos.
12. Actualizar Academia con rutas por rol para gates administrativos, copy honesto, marketing, finanzas y conciliaciones.

## Criterio de aceptación post-Claude

El candidato será revisado por ChatGPT/Codex con pipeline seguro:

1. preflight;
2. plan de empalme;
3. preview de overlay;
4. diff/riesgo;
5. revisión manual;
6. empalme aditivo solo si no pisa backend protegido.

No habrá merge, deploy, carga LAB ni datos reales sin autorización explícita de Paula.
