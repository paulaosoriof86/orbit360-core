# MATRIZ DE EMPALME — COTIZADOR / COMPARATIVO ORBIT ↔ V110

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.  
Fuentes: módulos Orbit actuales, `comparativo_final_v110.html`, auditoría forense profunda y decisiones de producto A&S.

## 1. Regla de clasificación

Cada capacidad queda clasificada como:

- `CONSERVAR_ORBIT`: el prototipo ya aporta una base reusable válida.
- `CONSERVAR_V110`: v110 contiene la lógica/experiencia avanzada que no debe perderse.
- `COMBINAR`: conservar lo mejor de ambos bajo contrato canónico.
- `REEMPLAZAR`: la implementación actual es temporal, genérica o insegura.
- `DESCARTAR_V110`: no trasladar módulo/estadística/almacenamiento/parche.

## 2. Matriz funcional

| Capacidad | Orbit actual | V110 | Decisión | Destino técnico | Claude/UX | Smoke obligatorio | Estado |
|---|---|---|---|---|---|---|---|
| Fuente maestra de aseguradoras | `Orbit.store` y módulo Orbit | Catálogo interno propio | `CONSERVAR_ORBIT / DESCARTAR_V110` | `modules/aseguradoras.js` | No crear catálogo paralelo | IDs Orbit en todo flujo | CERRADO |
| Directorio/contactos | Operativo, editable, diseño simple | Disperso/redundante | `CONSERVAR_ORBIT + REDISEÑAR` | Aseguradoras | Ficha corporativa por tabs | Alta/edición/desactivar | PENDIENTE UX |
| Credenciales | Campo temporal, referencia | Config interna | `REEMPLAZAR` | Adapter seguro + auditoría | Mostrar/ocultar/copiar por rol | Acceso permitido/denegado | CONTRATO LISTO |
| Cuentas bancarias | Editables sin máscara completa | No fuente final | `REEMPLAZAR` | Aseguradoras + permisos | Mostrar/ocultar/copiar | Scope y auditoría | CONTRATO LISTO |
| Drive | Campo URL simple | No fuente final | `AMPLIAR ORBIT` | `externalFolderRef` | Abrir expediente y estado de enlace | Mapeo padre/dry-run | DOCUMENTADO |
| País/moneda | Parcial | Avanzado en flujos | `COMBINAR` | Config tenant + documentos | Dropdowns dependientes | GT/GTQ, CO/COP | PENDIENTE |
| Catálogos vehículo | Hardcode genérico Orbit | Amplios por país en v110 | `CONSERVAR_V110 + PARAMETRIZAR` | Catálogos tenant | Marca→línea→versión→Otra | GT/CO sin mezcla | PENDIENTE |
| Formularios por producto | Base simple multi-ramo | Mucho más ricos | `COMBINAR`, prioridad v110 A&S | Schemas país/producto | Formularios dinámicos | Auto/GM/Vida/Motos | PENDIENTE |
| Tarifas Excel | Tabla simple/hardcode | Lectura avanzada e inferencia | `CONSERVAR_V110 + CANONIZAR` | Versiones tarifarias | Carga, preview, diff | Archivo→propuesta→validación | CONTRATO LISTO |
| Tarifas PDF/circular | No completo | Lectura y conocimiento | `CONSERVAR_V110 + CANONIZAR` | Documentos Aseguradora | Estado lectura/validación | No activa sin aprobar | CONTRATO LISTO |
| Ajuste manual | Prima manual sin fuente | Correcciones dispersas | `REEMPLAZAR` | Overlay versionado | Wizard con motivo/evidencia | Base+diff+vigencia | CONTRATO LISTO |
| Cotizador en línea | No existe | No API; lógicas parciales | `NUEVO` | Captura asistida/calibración | Flujo autorizado | Sin evasión/MFA | DOCUMENTADO |
| Cálculo automático | Tasas fallback genéricas | Reglas por aseguradora | `REEMPLAZAR ORBIT / CONSERVAR V110` | Motor por versión validada | Explicar fuente/versión | Reproduce casos conocidos | PENDIENTE |
| Cotización PDF externa | No integrada en Cotizador | Existe/avanzada | `CONSERVAR_V110` | `CotizacionNormalizada` | Cargar/revisar/corregir | Convive con automática | CONTRATO LISTO |
| Tablero mixto | Solo tasas/manual | Automática + PDF | `CONSERVAR_V110 + DISEÑO ORBIT` | Cotizador | Un solo tablero | Mezcla 2 orígenes | PENDIENTE |
| Impresión individual | Genérica/incompleta | En construcción | `REEMPLAZAR CON FIDELIDAD CONTROLADA` | Plantillas por aseguradora/producto | A&S + información íntegra | Comparar contra original | DOCUMENTADO |
| WhatsApp Cotizador | Envío genérico | No completo | `NUEVO/AMPLIAR` | Plantillas tenant | Preview editable | Preparado/enviado real | DOCUMENTADO |
| Historial Cotizador | Preferencia local | Parcial | `REEMPLAZAR` | `Orbit.store` | Ver/retomar/duplicar/editar/archivar | Scope propios/equipo/todos | CONTRATO LISTO |
| Adapter a Comparativo | Estado global reducido | Existe pero falla tabla | `REEMPLAZAR` | Contrato canónico | Selección clara | Nunca tabla en blanco | PENDIENTE P0 |
| Comparativo independiente | Sí, base simple | Muy avanzado | `COMBINAR`, prioridad v110 A&S | Comparativo | Carga ilimitada razonable | Sin Cotizador activo | PENDIENTE |
| Lectura PDF múltiple | Existe básica | Avanzada por aseguradora/producto | `CONSERVAR_V110 + VALIDADORES` | IA/router + conocimiento | Confianza y corrección | PDFs nativos/escaneados | PENDIENTE |
| Edición propuesta | Existe sin auditoría | Existe y entrenada | `COMBINAR + AUDITAR` | Versiones/correcciones | Diff antes/después | Recalcula recomendación | CONTRATO LISTO |
| Tabla por producto | Criterios genéricos | Schemas avanzados | `CONSERVAR_V110 + PARAMETRIZAR` | Schema país/producto | Tabla completa | Auto/GM/Vida/otros | PENDIENTE |
| Recomendación | Ranking simplificado | Consultiva avanzada | `CONSERVAR_V110` | Motor consultivo | Activa default, tenant puede apagar | Explicable/replanteable | DOCUMENTADO |
| Impresión Comparativo | Buena base Orbit/v110 | Prácticamente completa | `CONSERVAR V110 + BRANDING ORBIT` | Renderer impresión | Pantalla/PDF | 2,4,6+ propuestas | PENDIENTE SMOKE |
| WhatsApp Comparativo | Mensaje genérico | Plantillas/recomendación | `CONSERVAR_V110 + GATE` | Plantillas | Admin+Dirección publican | Recomendación incluida | DOCUMENTADO |
| Historial Comparativo | Memoria global | Parcial | `REEMPLAZAR` | `Orbit.store` | Administración integral | Scope y auditoría | CONTRATO LISTO |
| IA por tarea | Router genérico/documento IA | Entrenamiento empírico | `COMBINAR` | Config módulo/tarea | Estado proveedor honesto | Benchmark sanitizado | DOCUMENTADO |
| Academia | Básica/parcial | No integrada | `AMPLIAR` | Academia por rol | Casos reales simulados | Evaluación por flujo | PENDIENTE |

## 3. Prioridades de implementación

### P0.1 — Aseguradoras preparada como fuente

1. Integrar permisos de credenciales/cuentas.
2. Agregar tabs Documentos / Conocimiento / Versiones / Drive.
3. Enlazar documentos por `aseguradoraId` Orbit.
4. Crear estados de lectura/validación.
5. Exponer solo conocimiento `validado_habilitado`.

### P0.2 — Contrato canónico Cotizador

1. Sustituir objetos parciales por `normalizeQuote`.
2. Eliminar dependencia de `Orbit._cots` como transporte final.
3. Guardar lote y propuestas en `Orbit.store`.
4. Incorporar PDF externo.
5. Conservar fuente/versión/confianza.

### P0.3 — Adapter Cotizador → Comparativo

1. Validar cada cotización.
2. Resolver schema país/producto.
3. Transferir coberturas/deducibles/condiciones/exclusiones.
4. Bloquear transición con campos críticos faltantes.
5. Mostrar errores concretos, no absorberlos.

### P0.4 — Comparativo

1. Consumir cotizaciones canónicas.
2. Mantener modo independiente.
3. Integrar conocimiento v110.
4. Auditar correcciones.
5. Recalcular recomendación.
6. Conservar impresión avanzada.

### P1 — Impresión, WhatsApp e historiales

No se dejan para un rediseño posterior: deben cerrar el módulo antes de considerarlo operativo.

## 4. Archivos que pueden modificarse en empalme

```txt
orbit360-platform/modules/aseguradoras.js
orbit360-platform/modules/cotizador.js
orbit360-platform/modules/comparativo.js
orbit360-platform/core/cotizador-comparativo-contrato-p0.js
nuevos adapters/wires aditivos
nuevos schemas/configuración tenant
docs/tests/workflows
```

## 5. Archivos que no se reemplazan

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-* backend protegidos existentes
```

## 6. Claude

Claude se requiere cuando finalice P0.1 y esté definida la primera estructura visible de Aseguradoras. El paquete debe incluir esta matriz completa; no se enviará una instrucción parcial.

## 7. Academia

Cada fila P0 debe producir:

- lección por rol;
- caso práctico;
- criterios de validación;
- actualización de manual;
- alerta de versión cuando cambie tarifa/conocimiento.

## 8. Acción manual

No requerida para cerrar contrato y adapters.

Será necesaria para:

- validar impresiones contra documentos fuente;
- conectar Drive;
- aportar dataset sanitizado de evaluación IA;
- probar cotizadores en línea autorizados.
