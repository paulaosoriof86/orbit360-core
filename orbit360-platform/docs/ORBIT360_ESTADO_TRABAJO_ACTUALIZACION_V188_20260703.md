# Orbit 360 — Estado de trabajo, actualización v1.88 y continuidad Backend LAB

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 — A&S / Backend LAB / Empalme ágil de prototipos Claude  
**Repo correcto:** `paulaosoriof86/orbit360-core`  
**Rama backend obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Prototipo Claude vigente:** `Prototype Development Request - 2026-07-03T000030.492.zip`  
**Versión interna prototipo:** `v1.88` según `docs/BITACORA-CAMBIOS.md`  
**Cache-busting:** `v1287` en `index.html`  
**Seed demo:** `__v = 35` en `data/seed.js`  

---

## 1. Corrección de criterio financiero documentada

La regla anterior quedó formulada de forma demasiado rígida. Se corrige así:

### Regla correcta

1. **Pago/recaudo de póliza por el cliente**
   - Es recaudo comercial de una póliza/recibo.
   - Afecta cartera, recibos, estado del cliente, producción recaudada, metas de cobro y comisión estimada.
   - **No debe crear `finmov` como caja/banco de la empresa**, porque ese dinero normalmente pertenece a la aseguradora hasta liquidación/comisión.

2. **Factura de comisiones emitida a una aseguradora**
   - Sí debe generar una **Cuenta por Cobrar (CxC)** de comisiones.
   - Puede representarse dentro de Finanzas como `finmov` tipo `ingreso`, siempre que el estado sea **`facturado` / CxC**, no caja/banco.
   - Cuando se marque como **`recaudada`**, entonces sí pasa a ingreso real de la empresa.
   - Debe quedar claro en UI/reportes que `facturado` ≠ `recaudado`.

3. **Ingreso real de la empresa**
   - Solo debe computarse como ingreso recaudado/caja/banco cuando la factura a aseguradora cambie a estado `recaudado` o cuando se concilie contra banco/caja.

### Implicación para `modules/finanzas.js#facturaAseg`

No se debe marcar como error que `facturaAseg()` cree una CxC. El punto a verificar es que:

- el registro creado quede como CxC / `estado: facturado`,
- no se cuente como ingreso recaudado hasta pasar a `estado: recaudado`,
- tenga idempotencia para no duplicar facturas,
- tenga número correlativo,
- permita anular/revertir,
- enlace con planilla/statement de comisión,
- enlace con banco al momento del recaudo,
- respete país/moneda de la aseguradora o del tenant sin mezclar GTQ/COP.

**Estado:** regla corregida y documentada. Debe actualizarse en `CHANGELOG.md`, `docs/BITACORA-CAMBIOS.md`, pendientes Claude y pendientes backend/Codex.

---

## 2. Causa del desajuste anterior

La lectura anterior comparó el ZIP `2026-07-03T000030.492` solo contra el ZIP inmediatamente anterior `2026-07-02T201909.489`. Esa comparación directa muestra 6 archivos modificados:

- `core/config.js`
- `data/seed.js`
- `docs/BITACORA-CAMBIOS.md`
- `index.html`
- `modules/configuracion.js`
- `modules/finanzas.js`

Eso era técnicamente cierto para el salto corto del 2 al 3 de julio, pero **no representa la magnitud acumulada frente a V99/V89 ni frente al plan de actualización completo**.

Comparación más útil para continuidad:

| Base comparada | Agregados | Eliminados | Modificados | Lectura correcta |
|---|---:|---:|---:|---|
| V89 → v1.88 | 10 | 1 | 44 | Cambio grande, muchas mejoras acumuladas. |
| V99 → v1.88 | 4 | 1 | 36 | Cambio grande frente al paquete base de backend/prototipo previo. |
| 2026-07-01 → v1.88 | 3 | 0 | 27 | Cambio amplio por módulos funcionales. |
| 2026-07-02 → v1.88 | 0 | 0 | 6 | Cambio corto, pero con mejoras importantes en Finanzas, Config y Academia. |

**Regla de auditoría desde ahora:** siempre comparar el ZIP nuevo contra tres referencias:

1. el ZIP inmediatamente anterior,
2. la versión base backend/V99 o la última versión empalmada en GitHub,
3. el documento de pendientes acumulado para Claude.

---

## 3. Mejoras relevantes confirmadas en el prototipo v1.88

### v1.88 — Academia: profundización de cursos delgados

- Marketing pasa de 2 a 4 lecciones.
- Marketing pasa de 3 a 9 secciones.
- Marketing pasa de 2 a 4 preguntas de quiz.
- Portal pasa de 2 a 4 lecciones.
- Portal pasa de 3 a 9 secciones.
- Portal pasa de 1 a 3 preguntas de quiz.
- Se confirma que el visor `verCurso → lessonBody` ya renderiza secciones ricas, videos y quiz interactivo.
- Se sube `seed.__v` a 35 para resembrar cursos actualizados.
- Se documenta que videos HeyGen son producción externa: la usuaria genera el video y pega URL embed en la lección.

### v1.87 — Config fiscal multi-tenant

- `tenant.paisesCfg` se vuelve fuente única para país, moneda, IVA/impuesto y gastos de emisión.
- Defaults documentados: GT IVA 12%, moneda GTQ, gastos de emisión; CO IVA 19%, moneda COP.
- `agregarPais` en Configuración escribe en `tenant.paisesCfg` y mantiene compatibilidad con `pref('paises')`.
- Se documenta que el SaaS multi-tenant profundo real pertenece al backend: aislamiento de datos por tenant, DB/colecciones por cliente, provisioning automático.

### v1.86 — Facturas a aseguradoras + visor Academia confirmado

- Finanzas → Liquidación empresa → botón factura.
- Genera documento de factura de comisiones por aseguradora.
- Usa datos fiscales de la aseguradora: NIT, razón social, dirección fiscal, patrón de concepto.
- Calcula comisión devengada sobre prima neta recaudada.
- Calcula IVA/impuesto por país configurado.
- Imprime/PDF.
- Registrar emitida crea CxC/ingreso `estado: facturado`.
- Debe quedar claro que es control de facturación, no reemplazo fiscal/FEL/DIAN.
- El visor de Academia se confirma por flujo real, no solo por función suelta.

### v1.85 — Academia: visor unificado

- `verLeccion` delega en `lessonBody(l)`.
- Corrige normalización de videos YouTube/Vimeo.
- Corrige render de `secciones` para evitar contenido vacío.
- Reduce duplicación de lógica de render.

### v1.84 — Conciliación de planillas/statements de comisión

- `Orbit.comeng.conciliarStatement(filas?)` compara comisión esperada vs registrada/pagada.
- Soporta conciliación con planilla importada.
- Soporta recomputar sin archivo para detectar drift de tarifa o error de dato.
- Comisiones suma pestaña de conciliación con KPIs y tabla clicable.
- Importador de planilla de comisión se vincula al flujo.

### v1.83 — Regla recaudo de póliza ≠ finmov

- Pago aplicado por cliente a recibo/póliza no crea `finmov`.
- Afecta cartera, recibos, metas de recaudo y producción recaudada.
- Se revierte la regresión de `Orbit.q.postRecaudo` que escribía en `finmovs`.
- Se conserva la firma para no romper llamadas de Cobros, Cliente360 e Importador.

### v1.82 — Insights: concentración por aseguradora

- Agrega alerta/recomendación si una aseguradora concentra ≥35% de la prima vigente.
- Mantiene análisis crítico con variación interanual, tasa de recaudo, tasa de cancelación, vencimientos, asesor líder y composición.

### v1.81 — Presupuesto con fecha de pago

- Presupuesto captura `fechaPago`.
- Tabla muestra estado pagado, atrasado o en tiempo.
- Base para notificaciones de pago de gastos.

### v1.80 — Finanzas profundo

- Metas visibles como pestaña.
- Real vs ideal por empresa, asesor y aseguradora.
- Semáforos de cumplimiento.
- Motor de sugerencia inteligente de metas.
- Dashboard más analítico con tablas y comparativos reales.

---

## 4. Pendientes abiertos para Claude / prototipo

### P0 — No deben perderse

1. **Actualizar `CHANGELOG.md`**  
   Actualmente `docs/BITACORA-CAMBIOS.md` llega a v1.88, pero `CHANGELOG.md` queda desactualizado respecto de las últimas versiones. Claude debe actualizarlo con entradas v1.56–v1.88 o, mínimo, agregar una entrada consolidada `v1.88` que remita a `docs/BITACORA-CAMBIOS.md`.

2. **Documentar regla financiera corregida**  
   Actualizar `docs/BITACORA-CAMBIOS.md`, `CHANGELOG.md`, `docs/PENDIENTES-Y-MEJORAS.md` y documentación financiera:
   - Pago de póliza cliente ≠ `finmov`.
   - Factura de comisión a aseguradora = CxC facturada.
   - Estado `recaudado` = ingreso real.
   - Reportes deben separar facturado vs recaudado.

3. **Eliminar `localStorage` ejecutable en módulos**  
   Revisar `modules/configuracion.js` y cualquier módulo que aún use `localStorage`. Debe usar `Orbit.store`, `Orbit.tenant`, `pref/setPref` o helpers core.

4. **Revisar `index.html`**  
   En el empalme backend, `index.html` debe usar `Orbit.store.pref/setPref` para preferencias como sidebar, no `localStorage` directo.

5. **Completar facturas de aseguradoras**  
   No como “error de lógica”, sino como mejora necesaria:
   - idempotencia,
   - número correlativo,
   - anulación,
   - auditoría,
   - enlace a statement/planilla,
   - enlace a banco/recaudo,
   - estado facturado → recaudado,
   - control país/moneda.

6. **Confirmar seed 100% ficticio**  
   Revisar NIT/DPI/cédula/direcciones/correos. El prototipo base no debe contener datos reales de Paula, A&S ni clientes reales.

7. **No mostrar notas técnicas en UI cliente**  
   Validar que no aparezcan Firebase, Firestore, demo técnico, LAB, tokens, etc. en UI comercial.

8. **No hardcodear A&S**  
   Todo lo de A&S debe estar en `Orbit.tenant`, configuración, seed de tenant o backend, no incrustado como lógica del core.

### P1 — Siguiente nivel

1. Centralizar llamadas directas a IA mediante `Orbit.ia`.
2. Consolidar país/moneda/IVA/impuesto en `tenant.paisesCfg` para todos los módulos.
3. Conectar integraciones reales progresivamente: Make, correo, WhatsApp, Sheets, Drive, Canva, Metricool.
4. Completar Academia con recursos, certificados, progreso y videos reales cuando se produzcan.
5. Fortalecer importadores reales con trazabilidad, deduplicación y remapeo manual.
6. Mejorar auditoría de reportes: no mezclar facturado/recaudado ni GTQ/COP.

---

## 5. Estado del backend LAB

El backend LAB no se reinicia.

Estado validado:

- Rama: `ays/backend-tenant-lab-v99-20260703`.
- Repo: `paulaosoriof86/orbit360-core`.
- Firebase inicializó correctamente.
- Auth LAB validado.
- Usuario LAB autenticado.
- Tenant `alianzas-soluciones` correcto.
- `Orbit.store` LAB con API completa.
- CRUD ficticio controlado en `actividades` pasó.
- `contractOk true`.
- Sin deploy.
- Sin Hosting.
- Sin producción.
- Sin secretos.

Advertencia:

El nuevo ZIP v1.88 de Claude **no contiene** los archivos backend LAB:

- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `data/store-firestore-lab.local.js`
- `core/auth-firebase.config.local.js`

Por tanto, el ZIP no se debe descomprimir encima de la rama backend sin protección.

---

## 6. Metodología estable desde ahora

Cada ZIP nuevo de Claude se trata como **release candidate**, no como reinicio.

Flujo obligatorio:

1. Identificar versión del ZIP.
2. Comparar contra ZIP inmediatamente anterior.
3. Comparar contra V99/V89 o la última base aceptada para backend.
4. Revisar `docs/BITACORA-CAMBIOS.md`, `CHANGELOG.md`, `docs/PENDIENTES-Y-MEJORAS.md` y `docs/BITACORA-ERRORES.md`.
5. Auditar cambios por módulo, no solo por cantidad de archivos.
6. Separar:
   - mejoras reales cerradas,
   - pendientes aún abiertos,
   - regresiones,
   - cambios que aplican a prototipo base,
   - cambios que aplican a backend.
7. No reemplazar `data/store.js` conectado a backend sin revisar.
8. No tocar backend LAB validado hasta pasar gate.
9. Documentar cada avance y cada decisión.
10. Actualizar CHANGELOG o exigir a Claude que lo actualice.

---

## 7. Plan de migración de información de Alianzas

### Fase 1 — Preparar tenant A&S

- Logo y paleta.
- País Guatemala por defecto.
- Colombia adicional.
- IVA GT 12%.
- IVA CO 19%.
- Aseguradoras vinculadas.
- Usuarios, roles, permisos y módulos visibles.
- Glosario por país.
- Planes/tarifas.
- Integraciones por tenant.

### Fase 2 — Migrar catálogos base

1. Directorio de aseguradoras Guatemala.
2. Directorio de aseguradoras Colombia.
3. Contactos de aseguradoras.
4. Accesos/plataformas.
5. Datos fiscales/facturación.
6. Drive/enlaces documentales.
7. Tarifas y parámetros del cotizador/comparativo.

### Fase 3 — Migrar operación

1. Clientes/base inicial.
2. Pólizas.
3. Vehículos.
4. Recibos/cobros.
5. Estados de cuenta de aseguradoras.
6. Planillas de comisiones.
7. Histórico financiero.
8. Banco/caja.
9. Siniestros/bitácoras.
10. Calendario de contenidos.

### Fase 4 — Validación end-to-end

Validar mínimo 5 clientes completos:

- cliente creado/actualizado,
- póliza vinculada,
- vehículo vinculado si aplica,
- recibos generados según forma de pago,
- pago aplicado a recibo sin crear ingreso de caja/banco indebido,
- comisión esperada calculada,
- factura/CxC a aseguradora emitida,
- factura marcada como recaudada y reflejada como ingreso real,
- Cliente360 consistente,
- cartera correcta,
- no mezcla de GTQ/COP,
- sin datos ficticios en tenant productivo.

---

## 8. Instrucción concreta para Claude

Usar este texto reducido para Claude, sin pegar código largo:

```text
Orbit 360 — actualización obligatoria de documentación y cierre v1.88.

Trabaja sobre el último ZIP entregado: Prototype Development Request - 2026-07-03T000030.492.zip.
No pegues archivos completos ni diffs largos en la respuesta. Devuelve ZIP completo actualizado y resumen breve.

Objetivo:
1. Actualizar CHANGELOG.md, porque docs/BITACORA-CAMBIOS.md ya llegó a v1.88 pero CHANGELOG.md quedó desalineado.
2. Incorporar en CHANGELOG.md y bitácoras las mejoras v1.80–v1.88: Finanzas profundo, presupuesto con fecha de pago, Insights concentración aseguradora, regla recaudo póliza≠finmov, conciliación de statements, visor Academia, facturas a aseguradoras, tenant.paisesCfg y profundización Marketing/Portal.
3. Corregir documentación financiera: factura emitida a aseguradora sí genera CxC de comisiones; puede quedar como ingreso facturado/CxC, pero NO debe contarse como ingreso recaudado/caja hasta que se marque como recaudada o se concilie banco. Pago de póliza por cliente NO crea finmov.
4. Completar pendiente de facturas a aseguradoras: idempotencia, número correlativo, anulación, auditoría, enlace con statement/planilla y estado facturado→recaudado.
5. Confirmar que Configuración y módulos no usen localStorage directo; deben usar Orbit.store, Orbit.tenant, pref/setPref o helper core.
6. Mantener Orbit 360 SaaS multi-tenant: A&S solo por configuración, sin hardcodear datos reales.
7. Confirmar seed ficticio y que no existan datos reales de Paula, A&S ni clientes.
8. Documentar cada cambio con formato: fecha, módulo, necesidad, esperado, causa raíz si aplica, archivo/función, fix, impacto comercializable, estado y prioridad.
9. Marcar qué aplica al prototipo base Orbit 360 y qué queda para backend ChatGPT/Codex.
10. No tocar ni eliminar hooks/archivos backend LAB si están presentes en la rama de backend.
```

---

## 9. Paso inmediato recomendado para ChatGPT/Codex

1. Tomar `Prototype Development Request - 2026-07-03T000030.492.zip` como prototipo vigente.
2. Empalmar v1.88 con la rama `ays/backend-tenant-lab-v99-20260703` sin reemplazar backend LAB.
3. Preservar archivos backend LAB.
4. Reinsertar loader/init/store LAB en `index.html v1287`.
5. Corregir preferencias de sidebar para no usar `localStorage` directo.
6. Documentar regla financiera corregida.
7. Actualizar archivos de continuidad:
   - `docs/BITACORA-CAMBIOS.md`,
   - `docs/BITACORA-ERRORES.md` si hay bug,
   - `CHANGELOG.md`,
   - archivo de pendientes Claude,
   - archivo de pendientes backend/Codex.
8. Ejecutar smoke local demo + LAB.
9. Solo después iniciar migración controlada de información de Alianzas.

---

## 10. Prompt corto para próxima conversación

```text
Continúa Orbit 360 — A&S / Backend LAB / Empalme v1.88.

Lee primero ORBIT360_ESTADO_TRABAJO_ACTUALIZACION_V188_20260703.md, docs/BITACORA-CAMBIOS.md, CHANGELOG.md, MIGRACION-MAESTRO.md y GUIA-CHATGPT-CODEX.md.

Prototipo vigente: Prototype Development Request - 2026-07-03T000030.492.zip.
Repo correcto: paulaosoriof86/orbit360-core.
Rama backend obligatoria: ays/backend-tenant-lab-v99-20260703.

No reinicies metodología. No uses main. No mezcles CXOrbia/Orbia/Finanzas. No deploy/Hosting/producción sin autorización. No datos reales ni secretos.

Regla financiera corregida: pago de póliza por cliente no crea finmov; factura de comisión emitida a aseguradora sí genera CxC/facturado y solo cuenta como ingreso real cuando se marque recaudada o se concilie banco.

Primero empalma el ZIP v1.88 con backend LAB preservando core/backend-lab-loader.js, core/backend-lab-init.js, data/store-firestore-lab.local.js y config local. Actualiza documentación viva, incluyendo CHANGELOG.md. Audita cambios contra V99/V89 y contra el ZIP anterior, no solo contra el ZIP inmediatamente anterior.
```
