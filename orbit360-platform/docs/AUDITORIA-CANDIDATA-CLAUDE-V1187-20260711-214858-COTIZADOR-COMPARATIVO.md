# AUDITORÍA DE CANDIDATA CLAUDE v1.187 — COTIZADOR / COMPARATIVO

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.  
Candidata auditada: `Prototype Development Request - 2026-07-11T214858.349.zip`

## 1. Dictamen ejecutivo

```txt
CANDIDATA COMO REEMPLAZO ACUMULADO: RECHAZADA
CANDIDATA COMO FUENTE SELECTIVA DE UX: APROVECHABLE CON REVISIÓN
COTIZADOR: NO CERRADO
COMPARATIVO: NO CERRADO
IMPRESIÓN/PDF COTIZADOR: NO ACEPTABLE
IMPRESIÓN/PDF COMPARATIVO: NO ACEPTABLE
REPLANTEAMIENTO: PARCIAL / REGRESIVO FRENTE A v110
PLANTILLAS WHATSAPP/CORREO: AUSENTES
CONTRATOS v1.203: AUSENTES EN LA CANDIDATA
BACKEND PROTEGIDO: NO DEBE SER SUSTITUIDO
VALIDACIÓN VISUAL AUTOMATIZADA: BLOQUEADA POR ENTORNO; AUDITORÍA ESTÁTICA CONCLUYENTE
```

La candidata se identifica internamente como v1.187 y declara que fue construida sin acceso al repositorio vivo ni al paquete reconciliado v1.205. No puede considerarse continuación de la base acumulada vigente.

El baseline vivo obligatorio continúa siendo:

```txt
Claude visual v1.198
+ contratos/bridges físicos v1.198–v1.203
+ documentación y paquete reconciliado v1.205
+ comparativo_final_v110.html como referencia visual/funcional
+ backend protegido de la rama activa
```

## 2. Desajuste de baseline

El inventario de la candidata frente al paquete v1.205 encontró 38 archivos físicos esperados de contratos, motores y bridges v1.198–v1.203. Solo aparecen 2; faltan 36.

Entre los faltantes críticos están:

```txt
core/quote-comparison-contracts-v1203.js
core/quote-comparison-contracts-v1203-refinements.js
modules/cotizador-v1203-source-gate.js
modules/comparativo-v1203-operational-bridge.js
data/academia-v1203-cotizador-comparativo.js
```

También faltan los bridges acumulados de CRM, recibos, renovaciones, emisión/endosos, Ops y Aseguradoras.

El `index.html` de la candidata carga únicamente los módulos base de Cotizador y Comparativo. No carga los contratos/bridges v1.203. Por tanto, la candidata no representa el flujo operativo persistente y seguro ya construido en la rama viva.

## 3. Riesgo de sobreescritura

La candidata incluye archivos protegidos que no deben copiarse por encima de la rama viva.

```txt
data/store.js
core/auth.js
core/importa.js
index.html
```

Aunque `data/store.js` coincide con el snapshot actual, `core/auth.js`, `core/importa.js` e `index.html` difieren del HEAD vivo. Un overlay completo produciría regresiones y eliminaría loaders/bridges actuales.

Regla de empalme:

```txt
No extraer el ZIP sobre orbit360-platform/.
No reemplazar archivos protegidos.
No reemplazar index.html completo.
Solo comparar y cosechar cambios visuales puntuales después de revisión archivo por archivo.
```

## 4. Cotizador — hallazgos P0

### 4.1 Impresión demasiado básica

La impresión actual genera una página HTML mínima con:

- título simple;
- nombre de aseguradora;
- prima neta;
- recargo;
- gastos de emisión;
- IVA;
- prima total;
- nota legal genérica.

No conserva el trabajo del index v110 ni el estándar visual de la ficha de Aseguradoras.

Faltan:

- portada corporativa;
- marca Orbit 360 y slot white-label del tenant;
- logo del cliente y logo de la aseguradora;
- encabezado/hero por aseguradora;
- producto y plan;
- datos completos del riesgo;
- coberturas y límites;
- deducibles;
- condiciones, restricciones y exclusiones;
- vigencia;
- formas y frecuencia de pago;
- selección de planes/cotizaciones por aseguradora;
- pie legal y datos del asesor configurables;
- paginación cuidada;
- consistencia entre pantalla e impresión/PDF.

### 4.2 Regresión del contrato de fuentes

El módulo vuelve a contener tasas genéricas y cálculo automático por defecto:

```txt
TASAS_DEF
RECARGO_FRACC
```

Esto contradice el contrato v1.203:

```txt
sin fuente tarifaria vigente, compatible y validada
→ no cálculo automático
→ estado honesto
→ registrar cotización recibida / documental
```

No se permite presentar tasas genéricas como cotización operativa A&S.

### 4.3 Transferencia volátil

La candidata vuelve a trasladar resultados mediante:

```txt
Orbit._cots
```

El contrato acumulado exige:

```txt
cotizaciones persistidas
→ IDs canónicos
→ quoteTransfers
→ Comparativo reconstruido desde Orbit.store
```

### 4.4 Historial no operativo

El historial sigue basado en preferencias y estado del navegador, no en colecciones operativas con trazabilidad por cliente, asesor, país, moneda, fuente, versión y estado.

## 5. Comparativo — hallazgos P0

### 5.1 Pantalla e impresión no reproducen v110

La candidata incorpora una tabla más amplia que el Cotizador, pero sigue siendo una versión simplificada. La impresión genera otra composición separada y básica; no mantiene paridad exacta entre pantalla y PDF.

El index v110 ya define y debe conservar como referencia:

- tarjetas de resumen rápido;
- identificación visual de la mejor opción;
- bloque oscuro de cliente/riesgo;
- tabla comparativa profunda por secciones;
- logos y jerarquía de aseguradoras;
- fila de prima total destacada;
- recomendación consultiva;
- encabezado y pie de impresión;
- layout A4 controlado;
- saltos de página y tipografía corporativa;
- misma lógica visual en pantalla y PDF.

### 5.2 Replanteamiento incompleto

La candidata reduce `Replantear` a tres opciones:

```txt
precio
cobertura
equilibrio
```

El comportamiento v110 debe conservar:

```txt
costo-beneficio / equilibrio
precio
cobertura
deducible
responsabilidad civil
selección manual con justificación
restablecer recomendación automática
```

La recomendación debe recalcular ventajas/desventajas y explicar por qué cambia, sin fabricar una decisión ni sustituir la revisión profesional.

### 5.3 Bug de nombres de aseguradora

La candidata construye propuestas principalmente con el campo `nombre`, pero varias funciones de resumen y recomendación leen `aseguradora`. Esto puede degradar las etiquetas a `Propuesta 1`, `Propuesta 2` o producir recomendaciones sin el nombre real de la compañía.

Debe normalizarse mediante el contrato canónico y el snapshot de aseguradora, no con fallbacks inconsistentes.

### 5.4 País/IVA hardcodeado

En el registro/extracción de cotización recibida se calcula prima neta con un divisor fijo equivalente a IVA 12%.

```txt
total / 1.12
```

Esto es incorrecto para Colombia y viola la configuración por tenant/país:

```txt
GT → IVA configurado GT, actualmente 12%
CO → IVA configurado CO, actualmente 19%
si falta país/moneda → REQUIERE_VALIDACION
```

No debe inferirse el desglose cuando el documento no lo permite; debe proponerse y validarse.

### 5.5 Registrar cotización recibida todavía incompleto

El cambio de nombre es correcto y debe conservarse. Sin embargo, el flujo aún debe completar:

- aseguradora del directorio;
- producto/plan;
- documento o referencia;
- versión, fecha y vigencia;
- prima neta, gastos, impuestos y total;
- pagos/frecuencia;
- coberturas y límites;
- deducibles;
- condiciones/exclusiones;
- propuesta de extracción;
- diff antes/después;
- motivo;
- confirmación humana;
- estado canónico `requiere_validacion` hasta completar fuente y revisión.

### 5.6 Opción aceptada prematura

`Registrar opción aceptada` no debe estar disponible solo porque exista alguna propuesta. Debe habilitarse únicamente cuando:

- hay propuesta seleccionada;
- pasa validación completa;
- tiene cliente existente;
- posee país/moneda/producto y primas consistentes;
- existe fuente o referencia;
- el usuario tiene permiso;
- se registra aceptación y evidencia.

Debe autocompletar desde `cotizacionId/comparativoId` y crear una solicitud de emisión en Ops. No debe crear póliza, recibos ni cartera antes de la emisión real.

## 6. WhatsApp y correo

La candidata usa mensajes hardcodeados y no conserva el sistema de plantillas trabajado en v110.

Requisito obligatorio:

```txt
plantillas configurables por tenant, país, producto y canal
+ vista previa
+ variables seguras
+ edición autorizada
+ selección de plantilla
+ preparar WhatsApp/correo
+ estado preparado
+ confirmación/callback antes de marcar enviado
```

Plantillas mínimas:

- cotización individual;
- comparativo de vehículos;
- comparativo de gastos médicos;
- propuesta recomendada;
- seguimiento de cotización;
- solicitud de información faltante;
- aceptación y próximos pasos.

Variables mínimas:

```txt
cliente
asesor
aseguradora
producto/plan
prima total
forma de pago
recomendación
vigencia
link/documento autorizado
```

No exponer credenciales, rutas internas ni estados técnicos.

## 7. Contrato visual y funcional de aceptación

### 7.1 Cotizador

Debe quedar visual y funcionalmente alineado con v110 y con Aseguradoras:

1. Flujo guiado/stepper.
2. Mínima digitación y precarga desde Cliente360/Renovaciones.
3. Aseguradoras, productos, planes y fuentes elegibles.
4. Default-deny sin fuente válida.
5. Propuestas ricas con prima desglosada, coberturas, deducibles, condiciones, pagos y vigencia.
6. PDF por aseguradora con selección de planes y forma de pago.
7. Logos, identidad tenant y encabezado por aseguradora.
8. Historial persistente y trazable.
9. Transferencia por IDs al Comparativo.
10. Responsive y accesible.

### 7.2 Comparativo

1. Misma composición visual esencial en pantalla y PDF.
2. Resumen rápido, bloque cliente/riesgo, tabla profunda y recomendación.
3. Comparación de prima neta/gastos/impuestos/total sin mezclar monedas.
4. Coberturas, límites, deducibles, exclusiones, condiciones, pagos y vigencias.
5. Replanteamiento completo y selección manual justificada.
6. Registrar cotización recibida con extracción/diff/validación.
7. Plantillas WhatsApp/correo configurables.
8. Historial, trazabilidad y estados comerciales honestos.
9. Opción aceptada conectada a solicitud de emisión en Ops.
10. No crear póliza/cartera prematuramente.

## 8. Carriles paralelos

### Carril A — prototipo/UX/Academia

- conservar únicamente mejoras visuales válidas de la candidata;
- reconstruir Cotizador y Comparativo con referencia v110;
- recuperar impresión/PDF, replanteamiento y plantillas;
- responsive 1440/1024/390;
- eliminar copy técnico;
- actualizar Academia profunda y manuales.

### Carril B — backend protegido

- conservar contratos v1.203;
- source gate/default-deny;
- persistencia por Orbit.store e IDs;
- tenant/rol/scope;
- proveedor documental/PDF durable pendiente;
- callbacks de comunicación pendientes;
- no sobrescribir archivos protegidos.

### Carril C — operación real A&S

- directorios GT/CO por dry-run;
- fuentes de tarifas/planes separadas por aseguradora, país, moneda y producto;
- cotizaciones reales sanitizadas para casos de prueba;
- validar formatos de impresión por aseguradora;
- confirmar plantillas comerciales A&S por canal;
- no habilitar tarifa hasta validación individual.

## 9. Academia obligatoria

La corrección debe actualizar rutas de Dirección, Operativo y Asesor para explicar:

- fuentes válidas y bloqueo sin tarifa;
- cotización recibida y validación documental;
- diferencia entre prima neta, gastos, impuestos y total;
- lectura del comparativo;
- replanteamiento y justificación;
- comunicación preparada vs enviada;
- aceptación real y solicitud de emisión;
- límites de permisos;
- errores que no se deben cometer.

## 10. Validación de cierre

Antes de cerrar los módulos debe ejecutarse una sola ronda consolidada:

```txt
1. node --check de todo JS modificado
2. validadores v1.203
3. verificación de archivos protegidos por hash/diff
4. smoke funcional Cotizador → Comparativo → Aceptación → Ops
5. pantalla 1440 px
6. pantalla 1024 px
7. móvil 390 px
8. impresión/PDF de Cotizador por aseguradora
9. impresión/PDF de Comparativo con paridad v110
10. replantear todos los criterios
11. vista previa de plantillas WhatsApp/correo
12. copy técnico visible = 0
13. no mezcla GTQ/COP
14. no tarifa genérica presentada como real
15. Academia actualizada
```

La captura automatizada en el entorno de auditoría fue bloqueada por la política del navegador local. Esto no convierte la candidata en aprobada. La auditoría estática y la documentación visual existente son suficientes para rechazar el empalme completo; la validación visual final se repetirá únicamente después de la corrección acumulada.

## 11. Siguiente acción

```txt
No empalmar esta candidata completa.
Generar instrucción acumulada de corrección sobre baseline v1.205.
Claude debe continuar sobre su base visual más reciente, incorporar físicamente los contratos de referencia y reconstruir Cotizador/Comparativo contra v110.
Luego ChatGPT/Codex audita y empalma selectivamente sin tocar backend protegido.
```
