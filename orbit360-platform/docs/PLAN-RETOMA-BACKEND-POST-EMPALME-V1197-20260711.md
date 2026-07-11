# PLAN OPERATIVO Y BACKEND POST-EMPALME v1.197

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni producción.

## Corrección de rumbo

Este plan reemplaza la formulación anterior que podía interpretarse como un bloque exclusivamente arquitectónico de recursos seguros seguido por una nueva solicitud de fuentes ya procesadas.

La arquitectura y la documentación son condiciones de seguridad, no el producto final. Cada bloque debe acercar Orbit 360 a la operación real de A&S y, simultáneamente, dejar contratos reutilizables para nuevos tenants.

## Baseline que no se reabre

```txt
Clientes Siga CRM -> auditados y con dry-run sanitizado.
Pólizas/vehículos -> perfilados, cruzados y modelados.
Recibos/cobros/cartera -> modelados y separados de finmovs.
Comisiones/facturas/banco -> flujo modelado.
Importador/dry-run -> builders, manifest, trazabilidad y confirmación P0.
Directorios GT/CO -> procesados estructuralmente; siguiente cierre operativo.
Candidata Claude v1.188–v1.197 -> empalmada selectivamente.
```

No se repiten perfiles, cruces o auditorías sin fuente nueva, cambio explícito o fallo demostrado.

## Regla de trabajo por módulo

Cada grupo funcional debe cerrar cinco capas:

```txt
1. Datos A&S: fuente real sanitizada, mapeo, calidad y trazabilidad.
2. Operación: flujo completo, estados, acciones, relaciones y excepciones.
3. Seguridad: tenant, rol activo, scope, extras/restricciones y auditoría.
4. Producto reusable: configuración, catálogos y contratos sin hardcode A&S.
5. Cierre: tests/smoke + validación visual única + documentación/Academia.
```

Un módulo no se marca cerrado porque renderiza: debe permitir operar el caso A&S correspondiente con estados honestos.

## Fase 1 — Cierre CRM transversal

### Alcance

```txt
Cliente360
Pólizas
Vehículos
Recibos/Cobros
Conciliaciones
Cartera
Comisiones
Portal
Calidad
Renovaciones
Cancelaciones
Historial
```

### Datos reales usados

- dry-run sanitizado de Clientes Siga CRM;
- modelo cruzado ya construido para pólizas, vehículos, recibos, cobros y cartera;
- asesores y multirol A&S documentados;
- comisiones/facturas/banco ya modelados.

### Trabajo operativo restante

1. verificar que Cliente360 muestre el expediente completo y relaciones correctas;
2. validar calidad y campos faltantes por asesor;
3. comprobar scopes propios/equipo/todos/ninguno;
4. comprobar gestiones de corrección cuando cliente/póliza no aparece o está mal asignado;
5. validar estados derivados `pendiente_polizas`, `activo`, `activo_en_mora`, `inactivo`, `reactivable`;
6. comprobar que recibos/cartera solo provengan de Vigente/Por renovar;
7. comprobar pago reportado → revisión → validación → aplicación/conciliación;
8. comprobar Portal → Ops/Cliente360/Historial;
9. comprobar que comisiones y finanzas no mezclen factura, caja y recaudo;
10. registrar solo deltas concretos para Claude/Academia.

### Condición de cierre

```txt
CRM opera de extremo a extremo con el baseline A&S sanitizado,
permisos por asesor y sin escritura automática insegura.
```

## Fase 2 — Cierre Aseguradoras operativas

### Datos reales usados

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
```

### Trabajo operativo

1. identidad, país, moneda y vinculación;
2. contactos por área y contacto principal;
3. plataformas, URL, usuario operativo, responsable y última verificación;
4. `credentialRef` para secretos, sin contraseña en frontend/store;
5. cuentas e instrucciones de pago con visibilidad por permiso;
6. productos, ramos, segmentos y planes;
7. documentos mediante `documentRef`, vigencia y visibilidad;
8. desactivar vinculación conservando histórico; borrado fuera del flujo normal;
9. fuente/fecha/responsable/calidad;
10. relación con pólizas, Cotizador y Comparativo;
11. importación GT/CO por dry-run, sin subir payload al repo;
12. smoke técnico y visual.

### Condición de cierre

```txt
El directorio deja de ser una pantalla técnica y se convierte en fuente operativa
para servicio, emisión, pagos, siniestros, Cotizador y Comparativo.
```

## Fase 3 — Cotizador y Comparativo configurables

### Fuente real

```txt
comparativo_final_v110.html
```

Se usa como referencia funcional avanzada; no se copia su Firebase/Auth/storage/router ni el monolito.

### Trabajo operativo

1. inventariar y conservar wizard, carga PDF/Excel, edición, recomendaciones, impresión, compartir e historial;
2. crear DTO canónico `CotizacionNormalizada` sin perder datos;
3. parametrizar país, moneda, aseguradora, ramo, producto, plan, riesgo/vehículo/uso;
4. separar coberturas, deducibles, exclusiones, límites y condiciones;
5. separar prima neta, gastos, IVA/impuestos y total;
6. usar fuentes/versiones/fechas/validación del motor `_fuentes`;
7. gate default-deny: solo combinación validada y habilitada;
8. conectar Cliente360, Leads/Ops, Aseguradoras e Historial;
9. conservar presentación y PDF configurables por tenant;
10. Academia por rol y caso práctico.

### Condición de cierre

```txt
A&S puede cotizar y comparar con estructura real/configurable,
y un tenant nuevo puede cargar sus aseguradoras/tarifas/documentos sin cambiar el core.
```

## Fase 4 — Ops y Leads

1. Kanban/lista/ficha;
2. asignación, cadencias, recordatorios y bitácora;
3. conversión Lead → Cliente/Póliza sin duplicados;
4. solicitudes de cliente/asesor y correcciones;
5. responsables y scopes;
6. vínculo con Cotizador/Comparativo;
7. notificaciones honestas según integración;
8. datos A&S sanitizados y smoke.

Las preguntas de negocio se harán únicamente cuando un estado, cadencia, responsable o excepción no esté documentado.

## Fase 5 — Finanzas

### Fuente

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

### Reglas

- destino `financiero_historico/finmovs`;
- GT→GTQ y CO→COP;
- no inferir clientes, pólizas, cobros, cartera o producción;
- no mezclar monedas;
- factura ≠ caja;
- cobro de póliza ≠ finmov;
- conciliación propone; no aplica automáticamente.

Cierre: movimientos, presupuesto, CxC/CxP, facturas, comisiones, conciliaciones y reportes coherentes por país.

## Fase 6 — Marketing

### Fuentes

```txt
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx
Manual de Identidad Básica – Versión 1 – Vigente.docx
Logo V. 2026.jpeg
```

Cierre: calendario real, piezas, responsables, estados, segmentación desde CRM, marca tenant y métricas; integraciones no conectadas muestran pendiente de conexión.

## Fase 7 — Resto de plataforma

```txt
Siniestros
Reportes
Automatizaciones
Integraciones
Correo/Notificaciones
IA
Plantillas
Configuración/Equipo
Academia
Portal completo
PWA
```

Cada módulo se cierra con fuente/flujo A&S y configuración reusable para nuevos tenants.

## Carril B — recursos seguros e integraciones reales

La aclaración de Claude es correcta:

```txt
Claude construyó el patrón UI para bóveda y visor.
La conexión real de credenciales, OAuth Drive, proveedores y secretos
es backend real de ChatGPT/Codex.
```

### Contrato documental

```txt
documentRef
→ tenant/rol/scope
→ resolver metadatos
→ preview/descarga temporal
→ acceso externo autorizado
→ auditoría
```

### Contrato de credenciales

```txt
credentialRef
→ permiso
→ reautenticación
→ recuperar/copiar temporalmente
→ TTL y limpieza
→ auditoría sin secreto
```

### Orden B sin desviarse de operación

Los adapters se implementan cuando desbloquean el módulo activo:

```txt
Aseguradoras -> bóveda/Drive.
CRM/Pólizas -> documentos/portal.
Cotizador/Comparativo -> fuentes y adjuntos.
Marketing -> Drive/Canva/Metricool cuando corresponda.
```

No se abrirá una fase abstracta indefinida de integraciones antes de cerrar los módulos operativos prioritarios.

## Entrada directa futura de datos

Toda alta/edición desde plataforma debe aplicar configuración del tenant y no depender del importador:

```txt
tenantId
país/moneda/impuestos
catálogos vigentes
rol/scope
responsable/asesor
estado canónico
fuente = ingreso_manual_plataforma
fecha/actor
antes/después
calidad y validaciones
```

Ningún default crítico se infiere silenciosamente. Si falta información, se bloquea o queda `REQUIERE_VALIDACION`.

## Validación visual

Se realizará al cierre de cada grupo, no en cada cambio pequeño.

Matriz mínima:

```txt
360x800
390x844
412x915
768x1024
834x1194
1024x768
1366x768
1440x900
```

Debe comprobar navegación, filtros, ficha, acciones, permisos, estados vacíos, datos A&S sanitizados, coherencia entre módulos y ausencia de texto técnico.

## Preguntas e insumos

Se pedirán progresivamente y solo cuando sean indispensables para cerrar el módulo activo. Cada solicitud indicará:

```txt
módulo
lógica/fuente faltante
por qué bloquea
formato mínimo
qué se hará con ella
```

## Próximo bloque ejecutable

```txt
Cerrar CRM transversal con el baseline ya procesado y preparar el smoke
Cliente360 -> Pólizas -> Recibos/Cobros -> Portal/Ops -> Calidad/scopes.
En paralelo, usar los directorios GT/CO para completar Aseguradoras.
Después, integrar los patrones de comparativo_final_v110.html.
```

## Criterio global de salida

- operación A&S coherente y trazable;
- datos reales sanitizados fuera del código;
- altas futuras configuradas por tenant;
- módulos cerrados por grupo;
- seguridad y permisos reales;
- prototipo reusable para tenants nuevos;
- documentación y Academia actualizadas;
- validadores/smoke verdes;
- PR continúa draft;
- sin deploy ni producción.
