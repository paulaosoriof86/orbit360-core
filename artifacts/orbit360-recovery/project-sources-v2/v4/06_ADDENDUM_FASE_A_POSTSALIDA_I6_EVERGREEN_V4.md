# Gravicentra Insurance — Addendum Evergreen V4
## Fase A Post-Salida / I6 Compleción Operativa y Actualización Controlada

**Estado documental:** STATIC_NORMATIVE_EVERGREEN  
**Naturaleza:** normativa permanente; no contiene estado operativo mutable  
**Autoridad operativa:** `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json`  
**Autoridad de lineage:** `artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json`  
**Ledger derivado por capability:** `artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json`  
**Rama canónica:** `recovery/fase-a-clean-20260831`

> Este documento no informa el gate actual, HEAD, run, build, artifact, Preview URL, porcentaje ni estado PASS/PENDING vigente. Para conocer el estado real siempre debe consultarse `CONTROL_PLANE.json`. Este addendum define reglas permanentes para I6 y Fase A Post-Salida.

## 1. Finalidad

I6 cierra Fase A Post-Salida mediante dos carriles separados y controlados:

1. completar gaps operativos demostrados después de la salida productiva, sin reconstruir capacidades ya aprobadas;
2. actualizar, completar, deduplicar, conciliar y trazar la información operativa posterior al corte de Fase A únicamente cuando el gate y la autorización correspondiente lo permitan.

Fase B no comienza mientras exista un gate anterior de I6 abierto. Ningún hallazgo ordinario crea una iteración nueva.

## 2. No regresión, lineage y release

- La última release formalmente aceptada que registre `CONTROL_PLANE.json` es el baseline y rollback de I6.
- No se reabre una capability previamente PASS salvo regresión causal reproducible.
- `CAPABILITY_LINEAGE_LOCK.json` conserva la última versión aprobada; I6 no vuelve a investigar versiones históricas salvo `LINEAGE_EXCEPTION`.
- Está prohibido reconstruir el producto desde baseline histórico + overlays.
- Todo cambio de product source exige nueva candidata, build y digest; el artifact certificado nunca se parchea.
- Preview y producción deben promover el mismo payload certificado de frontend, conforme al contrato vigente.
- Firestore se conserva como fuente operativa y Drive como repositorio documental salvo autorización normativa posterior.
- No se reimportan datos para corregir visualización, routing, composición, caché, permisos o validators.

## 3. Cadencia obligatoria por bloque

Cada bloque de I6 sigue, sin saltos:

**fuente → snapshot/readback → dry-run → deduplicación/diff → revisión de conflictos → autorización de apply → escritura controlada → visualización humana → pruebas LIVE → integrity/readback → mini-freeze → siguiente bloque**

Reglas complementarias:

- un archivo fuente vacío no borra un valor operativo válido existente;
- un dato enriquecido manualmente se conserva salvo evidencia rectora más nueva;
- los conflictos no resolubles automáticamente quedan visibles para revisión;
- las credenciales no se imprimen en artifacts, logs ni evidencia;
- no se carga todo para revisar al final;
- Paula visualiza cada módulo actualizado antes de habilitar el siguiente bloque.

## 4. Contratos funcionales congelados

### 4.1 Sesión, login y startup

- Refrescar la página no debe aparentar logout ni expulsar temporalmente al usuario.
- Login y primer render no esperan service worker ni módulos no esenciales.
- Persistencia y reload se prueban por rol.
- Ningún timeout largo forma parte del flujo exitoso normal.

### 4.2 Aseguradoras / Directorio

- Dirección, SuperAdmin, AdminTenant y Operativo conservan el alcance completo aprobado del directorio.
- Asesor no recibe visibilidad completa salvo aprobación posterior demostrada.
- “Copiar contraseña” copia únicamente la contraseña.
- Si existe “Copiar credenciales”, puede copiar usuario + contraseña con formato explícito, pero no sustituye “Copiar contraseña”.
- El refresh se hace por diff de campo, nunca por reemplazo ciego.
- Cambiar usuario, contraseña, contacto, portal o cuenta actualiza la aseguradora/plataforma correspondiente y no crea duplicados.
- Plataformas, contactos, cuentas, credenciales y relaciones se deduplican con claves rectoras y provenance.

### 4.3 Usuarios, roles y módulos

Deben existir dos caminos explícitos:

- **Crear directamente**
- **Invitar usuario**

Crear directamente debe dejar coherentes Auth, membership, ficha de equipo, rol(es) y scopes, y permitir login real.

Invitar debe dejar estado pendiente trazable y completar activación al aceptar.

Cambiar rol, scopes, contraseña, activar/inactivar y habilitación de módulos debe persistir y reflejarse tras login/reload.

La creación/modificación de usuarios permanece abierta hasta superar una prueba sintética controlada:

**create → login → cambio de rol → relogin → inactivar/reactivar → cleanup**

### 4.4 Cliente 360, Pólizas, Vehículos y riesgos

Cliente 360 debe representar relaciones actuales de cliente, pólizas, vehículos/riesgos, recibos, cobros, renovaciones, siniestros, comisiones e historial.

Pólizas debe preservar y enriquecer, cuando la fuente lo soporte, prima neta, expedición, financiación, ajustes/descuentos, impuestos, asistencias/otros, prima total, frecuencia, forma de pago, vigencias, estado y riesgo/vehículo.

La ficha de Pólizas debe tener jerarquía visual suficiente para lectura operativa.

`undefined`, referencias huérfanas, calendarios incoherentes o pólizas de vehículo sin riesgo vinculado son defectos de integridad y bloquean el mini-freeze.

### 4.5 Recibos, Cobros y cartera

- La cartera del cliente vive en Cobros/Recibos/Cliente 360, no en Finanzas.
- Recibos debe existir dentro de cliente/póliza y como vista global operativa.
- Una póliza con periodicidad conocida debe tener el calendario completo de recibos esperados.
- Recibos explícitos e inferidos conservan `provenance`.
- Un recibo ya conciliado no se duplica.
- Aging, saldos, estados y totales deben cuadrar con el universo de recibos.

### 4.6 Comisiones y Finanzas

Visibilidad congelada:

- **Dirección/Admin:** comisión de empresa y detalle autorizado de asesores.
- **Operativo:** sin visibilidad de comisiones.
- **Asesor:** únicamente su propia comisión.
- **Comercial:** mismo alcance que Asesor, únicamente su propia comisión.

Ningún Asesor/Comercial ve comisión de empresa ni de otros asesores.

La comisión del asesor puede configurarse sobre:

1. porcentaje de la comisión efectivamente recibida por la empresa; o
2. porcentaje de prima neta.

Si una configuración anterior no permite resolver inequívocamente la base, el fallback es **porcentaje de la comisión efectivamente recibida por la empresa**.

Cliente 360 debe usar el motor real de comisión. Queda prohibido un split fijo o demo.

Las planillas de comisiones alimentan, con lineage y sin reimportación ciega: CxC/ingreso de la empresa frente a aseguradora; CxP/liquidación del asesor; conciliación; señales de recaudo; y relaciones con cliente, póliza, recibo/cobro, asesor y aseguradora.

Finanzas administra economía de la empresa. La cartera de clientes no se traslada a Finanzas.

### 4.7 Historial

Toda importación, actualización, conciliación, inferencia y edición relevante conserva, cuando aplique, fuente, timestamp, actor/proceso, before/after, provenance y conflicto o decisión.

Historial debe probar navegación, filtrado y persistencia.

### 4.8 Academia

Antes de pedir uso operativo al equipo debe existir una ruta básica usable por rol que cubra al menos CRM / Cliente 360 y Directorio / Aseguradoras.

La capacitación se valida en LIVE. Academia no se convierte en un proyecto paralelo.

### 4.9 UI operativa transversal

- La barra de desplazamiento del menú lateral debe ser visible y usable.
- El shell utiliza logo horizontal cuando corresponda.
- Favicon/PWA utiliza asset cuadrado o simplificado adecuado.
- Cada pantalla actualizada se revisa críticamente, no solo el punto inicialmente reportado.
- No se aceptan 404, errores de consola/página ni fallos de requests relevantes en el gate de cierre.

## 5. Orden congelado de I6

### I6.0 — Baseline y rollback

Objetivo: sellar la release productiva aceptada como rollback; inventariar conteos y relaciones actuales; registrar backlog humano post-salida; preparar snapshot/readback y rollback antes de cualquier apply.

**Gate:** `I6_0_BASELINE_FROZEN`

### I6.1 — Cierre funcional

Orden obligatorio: sesión/reload; copia directa de contraseña; creación/invitación/edición de usuarios y roles; cálculo y visibilidad real de comisiones; recibos globales; `undefined` e inconsistencias; jerarquía visual de Pólizas; scrollbar y favicon/PWA; Academia por rol; Historial; CRUD/sincronización de Ops, Leads, Cliente 360, Pólizas, Cobros e Importador inteligente.

Todo cambio de source exige nueva candidata/build/Preview y fixtures sintéticos con cleanup.

**Gates:** `I6_1_PRODUCT_SUCCESSOR_PREVIEW_PASS` → `I6_1_PRODUCT_SUCCESSOR_LIVE_PASS`

### I6.2 — Directorio / Aseguradoras

Entrada: snapshot **completo y actual** del directorio.

Dry-run mínimo: no-op; updated; new; possible duplicate; conflict.

El diff cubre aseguradora, plataformas, usuarios/credenciales, contactos y cuentas.

No se borra por ausencia en la fuente sin marca explícita de obsolescencia y autorización.

**Gate:** `I6_2_DIRECTORIO_LIVE_PASS`

### I6.3 — Clientes

Entrada preferida: maestro completo actual de clientes. El objetivo incluye altas y enriquecimiento de registros existentes.

Dedupe: **ID/documento rector → correo/teléfono fuerte → nombre normalizado con revisión**.

Los matches probabilísticos dudosos no se fusionan automáticamente.

**Gate:** `I6_3_CLIENTES_LIVE_PASS`

### I6.4 — Pólizas, renovaciones, vehículos y riesgos

Entrada: histórico suficiente desde 2025-01-01 hasta el corte post-salida aprobado.

Clave principal: **tenant/país + aseguradora + número de póliza**.

Una renovación se relaciona con la anterior y no destruye el histórico.

**Gate:** `I6_4_POLIZAS_RIESGOS_LIVE_PASS`

### I6.5 — Recibos

Si existe calendario explícito de la aseguradora, prevalece. Si no existe, puede derivarse de vigencia + frecuencia + condiciones de pago y debe marcarse `provenance=inferred`.

Clave de unicidad base: **póliza + cuota + vencimiento + importe + identificador fuente cuando exista**.

**Gate:** `I6_5_RECIBOS_COMPLETE_LIVE_PASS`

### I6.6 — Cobros y conciliación

Entradas posteriores según el orden autorizado: histórico disponible de cobros/recibos para cartera vigente; planillas de comisiones; estados de cuenta de aseguradoras.

Precedencia: evidencia explícita de pago/reverso > inferencia.

Reglas:

1. una cuota presente en planilla de comisiones permite inferir esa cuota y anteriores como recaudadas salvo evidencia explícita contradictoria;
2. una cuota pendiente en estado de cuenta mantiene esa cuota y siguientes pendientes salvo evidencia posterior explícita de recaudo;
3. la inferencia no inventa fecha exacta, método ni documento;
4. fuentes contradictorias generan `CONFLICT_REVIEW_REQUIRED`.

**Gate:** `I6_6_COBROS_CONCILIADOS_LIVE_PASS`

### I6.7 — Comisiones y liquidaciones

Se reutilizan las mismas planillas por lineage. No se reimportan ciegamente.

Se reconcilia comisión de empresa; comisión de asesor; base configurada del asesor; y relación comisión ↔ póliza ↔ recibo/cobro ↔ cliente ↔ asesor ↔ aseguradora.

Prueba obligatoria por rol según la política de visibilidad de este addendum.

**Gate:** `I6_7_COMISIONES_LIVE_PASS`

### I6.8 — Historial, Academia y habilitación gradual

- Historial prueba provenance y cambios.
- Academia prueba ruta por rol y capacitación CRM + Directorio/Aseguradoras.
- La habilitación por rol/usuario solo se usa después de prueba LIVE.
- Finanzas se habilita en Fase A Post-Salida únicamente si supera sus pruebas operativas de empresa; de lo contrario puede quedar oculto y su evolución pasar a Fase B sin bloquear CRM/Cobros.
- Integración del correo personal de cada usuario queda para Fase B.

**Gate:** `I6_8_ENABLEMENT_TRAINING_HISTORY_LIVE_PASS`

### I6.9 — Aceptación final y HostDime

La candidata final repite módulo × rol × viewport; login/reload/session persistence; CRUD controlado; usuarios sintéticos y cleanup; relaciones; recibos; cobros; comisiones; duplicados/conflictos; errores de consola/página/red; readback exacto; y rollback.

Solo después se modifica el corte formal de datos y se genera el mismo payload certificado para Firebase/HostDime.

**Gate final:** `FASE_A_POSTSALIDA_PRODUCTION_ACCEPTED`

## 6. Deduplicación, precedencia y trazabilidad

- Nunca deduplicar solo por nombre si existe identificador rector.
- Cliente: ID/documento > correo/teléfono fuerte > nombre con revisión.
- Póliza: país/tenant + aseguradora + número; renovación se relaciona, no se pisa.
- Recibo: póliza + cuota + vencimiento + monto + ID fuente.
- Comisión: aseguradora + póliza/recibo + periodo/cuota + monto/ID de planilla.
- Reprocesar la misma fuente debe ser idempotente.
- Un campo vacío no borra enriquecimiento válido.
- Dos fuentes contradictorias generan revisión explícita.
- Todo write debe reconstruirse desde fuente + diff + receipt de ejecución.

## 7. Evidencia mínima por mini-freeze

Cada bloque conserva como mínimo hashes de fuentes; conteos before/after; creates/updates/no-op/conflicts/duplicates; diff de campos; roles probados; relaciones; persistencia/reload; errores de consola/página/red; integrity checks; evidencia visual; aprobación humana; y receipt de rollback.

Sin esta evidencia el siguiente bloque no se habilita.

## 8. No descarrilamiento

- No volver a I1–I5 salvo regresión causal demostrada.
- No iniciar Fase B mientras exista un gate anterior de I6 abierto.
- No convertir problemas de datos en rediseños generales.
- No ampliar Finanzas fuera de finanzas de empresa durante I6.
- No reimportar fuentes para resolver defectos visuales o de composición.
- No ejecutar el siguiente bloque antes de la visualización humana requerida.
- Chat, capturas, PR bodies y Fuentes del Proyecto son contexto; el estado operativo se obtiene de `CONTROL_PLANE.json`.

## 9. Primer handoff de datos

El primer dataset de I6 es el **directorio completo y actual de aseguradoras**.

Su uso inicial es exclusivamente read-only para:

**actual existente → nueva fuente → no-op / updated / new / possible duplicate / conflict**

No se aplica ninguna actualización antes de presentar el dry-run y recibir la autorización de apply correspondiente.

Después de congelar Directorio, el siguiente archivo se solicita expresamente siguiendo I6.3 → I6.7.

## 10. Regla de autorización

La autorización general para iniciar I6 habilita la preparación y ejecución del gate que `CONTROL_PLANE.json` abra formalmente.

No equivale a autorización automática de escritura de datos operativos, carga de agosto o meses posteriores, resolución silenciosa de conflictos, promoción productiva de una nueva candidata ni avance al siguiente bloque sin evidencia y visualización.

Cada apply de datos conserva autorización explícita después del dry-run.

## 11. Regla de sincronización de Fuentes del Proyecto

Este addendum extiende el paquete Evergreen mediante **composición inmutable**, no duplicando las cinco fuentes normativas V3 que permanecen vigentes. El manifiesto Evergreen V4 debe referenciar por blob SHA las cinco fuentes V3 retenidas y este addendum V4 como sexta fuente canónica.

Por tanto, cuando `CONTROL_PLANE.json` active Evergreen V4 y el guard de integridad termine PASS, Paula debe:

1. conservar las cinco Fuentes Evergreen V3 existentes;
2. agregar únicamente este addendum como sexta fuente;
3. no reemplazar ni duplicar los cinco archivos V3 sin una instrucción posterior explícita;
4. tratar cualquier cambio operativo normal como estado de `CONTROL_PLANE.json`, no como motivo para editar estas fuentes estáticas.

Esta composición elimina el patrón de desincronización por copias sucesivas: los archivos normativos no se reescriben por cada iteración y el manifiesto activo fija exactamente qué blobs integran el paquete vigente.
