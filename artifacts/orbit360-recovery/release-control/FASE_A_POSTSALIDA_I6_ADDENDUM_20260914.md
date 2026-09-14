# Gravicentra Insurance — Addendum Fase A Post-Salida / I6

**Fecha:** 2026-09-14  
**Estado del documento:** FROZEN_PLAN_ONLY  
**Autoridad de ejecución:** `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json`  
**Rama canónica:** `recovery/fase-a-clean-20260831`  
**Producto certificado de partida:** source `16f174d087024085eff18079c486f717ef98d691` · build `gi-i3-16f174d08702-57f234755dc1` · artifact `10183074943`  
**Último LIVE completo de referencia:** run `34767765643` · artifact `10321320520` · PASS transversal 15/15  

> Este addendum REFINA el alcance de I6. NO autoriza I6, NO modifica el producto certificado y NO autoriza escrituras ni carga de agosto. Mientras `CONTROL_PLANE.json` mantenga `I6.status=HOLD_PENDING_EXPLICIT_AUTHORIZATION`, toda mutación de datos post-2026-07-31 permanece prohibida.

## 1. Objetivo

Cerrar **Fase A Post-Salida** con la misma disciplina de lineage y release ya certificada, pero con dos trabajos adicionales y separados: (a) cerrar gaps operativos detectados en revisión humana de producción y (b) actualizar/completar la información operativa desde agosto de 2026 hasta la fecha de corte que sea formalmente aprobada. El resultado final debe poder publicarse en Firebase y HostDime como una única versión inmutable, visualmente aprobada y con datos actuales, completos, deduplicados, conciliados y trazables.

Fase B NO comienza hasta que este addendum termine. Ningún hallazgo aquí crea una nueva iteración; todo permanece dentro de I6.

## 2. Baseline protegido y reglas de no regresión

La release actual `16f174d… / gi-i3-16f174d08702-57f234755dc1 / artifact 10183074943` queda congelada como baseline y rollback. No se reabre un módulo previamente PASS salvo regresión causal reproducible. Todo cambio de source exige nueva candidata, nuevo build/digest, Preview, regresión y LIVE; jamás se parcheará el artifact certificado.

Cada bloque de datos seguirá obligatoriamente: **fuente → snapshot/readback → dry-run → deduplicación/diff → revisión de conflictos → autorización de apply → escritura controlada → visualización humana del módulo → pruebas LIVE → integrity/readback → mini-freeze → siguiente bloque**. Está prohibido cargar todo y revisar al final.

No se sobreescriben campos operativos no vacíos con valores vacíos. Un valor enriquecido manualmente se conserva salvo que una fuente rectora más nueva demuestre el cambio. Todo conflicto no resoluble automáticamente queda en revisión. Las credenciales nunca se imprimen en artifacts/logs/evidencia.

## 3. Contratos funcionales congelados

### 3.1 Sesión y experiencia de acceso
- Refrescar la página no debe aparentar logout ni sacar al usuario de la aplicación durante varios segundos.
- Login y primer render no deben depender de service worker ni de módulos no esenciales.
- Persistencia/reload debe probarse por rol antes del cierre.

### 3.2 Aseguradoras / Directorio
- Dirección, SuperAdmin, AdminTenant y Operativo mantienen acceso al directorio completo conforme al contrato aprobado; Asesor permanece restringido.
- “Copiar contraseña” debe copiar **solo la contraseña** para poder pegarla directamente. Si se conserva una acción “Copiar credenciales”, esa acción puede copiar usuario + contraseña con formato explícito, pero no sustituye a “Copiar contraseña”.
- El refresh del directorio se hará por diff de campo y no por reemplazo ciego. Cambios de usuario, contraseña, contacto, portal o cuenta no crean duplicados.

### 3.3 Usuarios, roles y módulos habilitados
- Deben existir dos caminos explícitos: **Crear directamente** e **Invitar usuario**.
- Crear directamente debe dejar Auth + membership + ficha de equipo + rol(es) + scopes coherentes y permitir login real.
- Invitar debe dejar estado pendiente trazable y completar la activación al aceptar.
- Modificar rol, activar/inactivar, contraseña y scopes debe persistir y reflejarse en el siguiente login/reload.
- La matriz de módulos puede habilitar/deshabilitar módulos por rol/usuario, pero solo se usará operativamente después de prueba LIVE del contrato.
- La creación/modificación de usuarios se considera OPEN hasta pasar prueba sintética LIVE create → login → cambio de rol → relogin → inactivar/reactivar → cleanup.

### 3.4 Cliente 360, Pólizas, Vehículos y visualización
- Cliente 360 debe reflejar relaciones completas y actuales de pólizas, vehículos/riesgos, cobros, recibos, renovaciones, siniestros, comisiones e historial.
- Pólizas se enriquecerán sin perder correcciones existentes: prima neta, expedición, financiación, ajustes/descuentos, impuestos, asistencias/otros, prima total, frecuencia, forma de pago, vigencias, estado y riesgo/vehículo.
- Debe corregirse la jerarquía visual de Pólizas: mejor contraste, agrupación y uso funcional de color; no se acepta una ficha plana difícil de escanear.
- `undefined`, diferencias inexplicadas de calendario, referencias huérfanas o pólizas de vehículo sin vínculo de riesgo quedan como defectos de integridad, no como simple estética.

### 3.5 Recibos, Cobros y cartera
- La cartera del cliente vive en **Cobros/Recibos/Cliente 360**, no en Finanzas.
- Recibos debe existir tanto dentro de la póliza/cliente como en la vista global operativa de Cobros/Recibos.
- Una póliza con periodicidad conocida debe tener su calendario completo de recibos esperados; no pueden existir únicamente los ya conciliados.
- Recibos explícitos y recibos inferidos deben conservar `provenance` y no duplicarse.
- Cobros, aging, saldos y estados deben cuadrar con el universo de recibos; cualquier diferencia visible de total/buckets bloquea el mini-freeze.

### 3.6 Comisiones y Finanzas
- **Operativo no necesita visibilidad de comisiones.** No se ampliará ese acceso.
- Dirección/Admin pueden ver la comisión de la empresa y el detalle autorizado de asesores.
- Asesor y rol legado Comercial solo pueden ver **su propia comisión**; nunca la comisión de la empresa ni la de otros asesores.
- La ficha de Cliente 360 debe mostrar cálculo real de comisión; queda prohibido un split fijo/demo (por ejemplo 60/40).
- La configuración del asesor debe permitir base de comisión sobre: **(a) porcentaje de la comisión recibida por la empresa** o **(b) porcentaje de prima neta**. Si una configuración anterior no permite resolver inequívocamente la base, el fallback congelado será **porcentaje de la comisión efectivamente recibida por la empresa**, nunca un porcentaje inventado.
- Las planillas de comisiones son fuente operativa para: comisión CxC de la empresa, comisión CxP del asesor, conciliación y señales de recaudo del cliente.
- Finanzas administra la economía de la empresa: movimientos, CxC de comisiones de aseguradoras, CxP de comisiones de asesores, liquidaciones, conciliación bancaria, presupuesto/financiación según alcance vigente. No se trasladará allí la cartera de clientes.

### 3.7 Historial
- Toda importación, actualización, conciliación, inferencia y edición relevante debe quedar trazable con fuente, timestamp, before/after cuando aplique y actor/proceso.
- El Historial debe probar navegación, filtrado y persistencia; no basta con que exista el módulo.

### 3.8 Academia
- La ruta de aprendizaje por rol existente debe probarse en LIVE.
- Debe existir un camino básico usable para Dirección/Admin/Operativo/Asesor/Comercial centrado, como mínimo, en **CRM/Cliente 360** y **Directorio/Aseguradoras** antes de pedir al equipo que inicie operación.
- Si el contenido de Directorio/Aseguradoras no existe o no es suficiente, se completa dentro de I6 sin convertir Academia en un proyecto paralelo.

### 3.9 UI operativa transversal
- Hacer visible y usable la barra de desplazamiento del menú lateral.
- Mantener un logo horizontal para shell cuando corresponda y un asset cuadrado/simplificado específico para favicon/PWA; no forzar el logo ancho como favicon.
- Revisar críticamente cada pantalla actualizada, no solo los hallazgos reportados por Dirección.

## 4. Orden congelado de ejecución

### I6.0 — Freeze post-salida y baseline
**Estado inicial:** PLAN_ONLY / sin escrituras de agosto.

1. Sellar release, build, artifact y evidencia LIVE actuales como rollback.
2. Inventariar conteos actuales y relaciones de clientes, pólizas, vehículos, recibos, cobros, comisiones, directorio, usuarios e historial.
3. Registrar los hallazgos humanos visibles de la revisión del 2026-09-14 como backlog cerrado de I6, no de Fase B.
4. Preparar snapshot/readback y mecanismo de rollback previo a cualquier apply.

**Gate:** `I6_0_BASELINE_FROZEN`.

### I6.1 — Cierre funcional antes de actualizar datos
Corregir y probar, en este orden: sesión/reload; copia directa de contraseña; creación/invitación/edición de usuarios y roles; cálculo/visibilidad real de comisiones; recibos globales; `undefined` y demás inconsistencias; jerarquía visual de pólizas; scrollbar/favicons; Academia por rol; Historial; CRUD/sincronización de Ops, Leads, Cliente 360, Pólizas, Cobros e Importador inteligente.

Todo cambio de source obliga a nueva candidata/build/Preview. Se ejecutan fixtures sintéticas controladas y cleanup; no se mezclan con datos de agosto.

**Gate:** `I6_1_PRODUCT_SUCCESSOR_PREVIEW_PASS` y luego `I6_1_PRODUCT_SUCCESSOR_LIVE_PASS`.

### I6.2 — Directorio/Aseguradoras
**Entrada que debe cargar Paula:** snapshot **completo y actual** del directorio de aseguradoras, no solo cambios de agosto.

Dry-run obligatorio con creates / updates / no-op / conflicts / possible-duplicates por aseguradora, plataforma, usuario, credencial, contacto y cuenta. No borrar por ausencia en la fuente sin una marca explícita de obsolescencia y autorización.

**Visualización obligatoria:** Directorio completo, plataformas, contactos, cuentas y reveal/copy por roles aprobados.

**Gate:** `I6_2_DIRECTORIO_LIVE_PASS`.

### I6.3 — Maestro de Clientes
**Entrada preferida:** maestro completo actual de clientes de SIGA/CRM.  
**Fallback mínimo:** todos los clientes vinculados a pólizas vigentes/históricas relevantes desde 2025-01-01 + todo cliente creado/modificado desde 2026-08-01.

Dedupe en orden: identificador rector existente → documento fiscal/personal exacto → claves fuertes normalizadas (correo/teléfono) → nombre normalizado con bucket de revisión. Ningún match probabilístico dudoso se fusiona automáticamente.

El refresh también puede completar campos faltantes existentes; no es solo alta de nuevos clientes.

**Visualización obligatoria:** listado Cliente 360 + muestras de fichas nuevas, actualizadas, no-op y conflicto resuelto.

**Gate:** `I6_3_CLIENTES_LIVE_PASS`.

### I6.4 — Pólizas, renovaciones, vehículos y riesgos
**Entrada solicitada:** pólizas desde 2025-01-01 hasta la fecha de corte post-salida, incluyendo vigentes, renovaciones y nuevas; detalle de vehículos/riesgos y desglose de prima/pago cuando exista.

Clave natural principal: tenant/país + aseguradora + número de póliza. Una renovación no reemplaza destructivamente la póliza histórica; se conserva relación predecessor/successor. La fuente nueva completa datos faltantes de pólizas existentes.

**Visualización obligatoria:** Pólizas global + Cliente 360/Pólizas + Vehículos + ficha de póliza + diferencias de prima/calendario.

**Gate:** `I6_4_POLIZAS_RIESGOS_LIVE_PASS`.

### I6.5 — Calendario completo de Recibos
Generar o importar todos los recibos esperados de pólizas activas. Si la aseguradora aporta calendario explícito, prevalece. Si no existe, se deriva de vigencia + frecuencia + condiciones de pago, marcando `provenance=inferred`.

No duplicar un recibo ya conciliado. Clave de unicidad: póliza + número/cuota + vencimiento + importe, complementada por identificadores fuente cuando existan.

**Visualización obligatoria:** recibos completos en Cliente 360/póliza y vista global operativa; cantidades y total del calendario deben cuadrar.

**Gate:** `I6_5_RECIBOS_COMPLETE_LIVE_PASS`.

### I6.6 — Cobros y conciliación por evidencia + inferencia
**Entradas solicitadas:**
- histórico disponible SIGA CRM de cobros/recibos de la cartera vigente;
- planillas de comisiones desde 2026-08-01 hasta la fecha de corte;
- estados de cuenta recientes de cada aseguradora, idealmente cierre de agosto + último estado disponible.

Precedencia: evidencia explícita de pago/reverso > inferencia.

Reglas congeladas de inferencia:
1. Si una cuota aparece en planilla de comisiones, esa cuota y las anteriores del calendario se consideran recaudadas **salvo evidencia explícita contradictoria** (reverso, devolución, cancelación, chargeback u otra).
2. Si una cuota aparece en estado de cuenta de aseguradora como pendiente, esa cuota y las siguientes permanecen pendientes **salvo evidencia posterior explícita de recaudo**.
3. La inferencia puede establecer estado; no inventa fecha exacta de pago, método ni documento que la fuente no demuestre.
4. Si planilla y estado de cuenta chocan, se crea conflicto para revisión y no se sobreescribe silenciosamente.

**Visualización obligatoria:** Cobros global, aging, Cliente 360/Cobros, Cliente 360/Recibos y relación con póliza.

**Gate:** `I6_6_COBROS_CONCILIADOS_LIVE_PASS`.

### I6.7 — Comisiones y liquidaciones
**Entrada principal:** mismas planillas de comisiones del bloque anterior, reutilizadas por lineage, no reimportadas ciegamente.

Generar/reconciliar:
- comisión de empresa = cuenta por cobrar / ingreso frente a aseguradora;
- comisión de asesor = cuenta por pagar / liquidación individual;
- base del asesor según configuración (`company_commission` o `net_premium`), con fallback `company_commission`;
- relación comisión ↔ póliza ↔ recibo/cobro ↔ cliente ↔ asesor ↔ aseguradora.

Eliminar cualquier cálculo demo/fijo en Cliente 360 y usar el mismo motor canónico del módulo de Comisiones/Finanzas.

**Prueba de seguridad por rol:** Dirección/Admin ven lo autorizado; Operativo sin comisión; Asesor y Comercial únicamente comisión propia.

**Visualización obligatoria:** Cliente 360/Comisiones, Comisiones global y Finanzas CxC/CxP/Liquidaciones.

**Gate:** `I6_7_COMISIONES_LIVE_PASS`.

### I6.8 — Historial, Academia y habilitación gradual por usuario
1. Validar que Historial refleje cambios/importaciones/inferencias con provenance.
2. Validar Ruta por rol en Academia y capacitación básica CRM + Directorio/Aseguradoras.
3. Probar la habilitación de módulos por rol/usuario. Solo después podrá activarse gradualmente a usuarios para evitar confusión.
4. Finanzas se habilita en Fase A Post-Salida únicamente si supera sus pruebas operativas de empresa; si no, se oculta y su evolución funcional pasa a Fase B sin bloquear CRM/Cobros.
5. Integración del correo personal de cada usuario queda explícitamente en Fase B.

**Gate:** `I6_8_ENABLEMENT_TRAINING_HISTORY_LIVE_PASS`.

### I6.9 — Aceptación final y paquete HostDime
Repetir sobre la candidata final:
- módulo × rol × viewport;
- login/reload/session persistence;
- CRUD controlado de Ops, Leads, Cliente, Póliza, Cobro e Importador;
- create/invite/login/change-role de usuario sintético + cleanup;
- relaciones y ausencia de huérfanos/duplicados;
- comisiones por rol y cálculo;
- recibos/cobros/inferencias;
- no 404, console/page errors, request failures ni HTTP errors relevantes;
- readback exacto y rollback.

Paula visualizará y aprobará cada módulo actualizado antes del freeze final. Solo después se cambia formalmente el data cutoff al corte aceptado y se genera el **mismo payload certificado** para Firebase/HostDime. El paquete anterior permanece como rollback.

**Gate final:** `FASE_A_POSTSALIDA_PRODUCTION_ACCEPTED`.

## 5. Contrato de deduplicación y precedencia

1. Nunca deduplicar solo por nombre cuando exista identificador rector.
2. Cliente: ID canónico/documento fiscal o personal > correo/teléfono fuerte > nombre normalizado con revisión.
3. Póliza: país/tenant + aseguradora + número de póliza; renovación se relaciona, no se pisa.
4. Recibo: póliza + cuota + vencimiento + monto + ID fuente cuando exista.
5. Cobro: ID fuente/documento + póliza/recibo + monto + fecha; la inferencia no crea evidencia de pago inexistente.
6. Directorio: aseguradora canónica + plataforma/contacto/cuenta; un cambio de usuario o contraseña actualiza, no duplica.
7. Comisión: aseguradora + póliza/recibo + periodo/cuota + monto/ID de planilla; reimportar la misma planilla debe ser idempotente.
8. Campo fuente vacío nunca borra enriquecimiento válido.
9. Dos fuentes contradictorias crean `CONFLICT_REVIEW_REQUIRED`.
10. Cada write debe poder reconstruirse desde fuente + diff + receipt de ejecución.

## 6. Evidencia mínima por cada mini-freeze

Cada bloque debe conservar: source SHA/buildId/URL; hashes de archivos fuente; conteos before/after; creates/updates/no-op/conflicts/duplicates; diff de campos; roles probados; relaciones; persistencia tras reload; errores de consola/página/red; integrity checks; evidencia visual; aprobación humana; receipt de rollback. Un bloque sin esta evidencia NO puede habilitar el siguiente.

## 7. Criterio de no descarrilamiento

- No volver a I1–I5 salvo regresión causal sobre su artifact/baseline.
- No iniciar Fase B mientras exista un gate I6 anterior abierto.
- No convertir hallazgos de datos en rediseños generales no necesarios.
- No agregar alcance de Finanzas distinto de finanzas de empresa durante I6.
- No reimportar una fuente para corregir visualización.
- No ejecutar el siguiente bloque hasta que Paula haya podido visualizar el actual.
- Chat, capturas o PR bodies son evidencia/contexto; el estado de ejecución sigue siendo `CONTROL_PLANE.json`.

## 8. Primer handoff de archivos

Mientras I6 permanezca en HOLD, Paula puede entregar archivos para **análisis/dry-run sin escritura**. El primer dataset recomendado es el **directorio completo actual de aseguradoras**, porque es un snapshot total y permite validar el mecanismo de diff/deduplicación de forma aislada. Después, el asistente indicará expresamente cuál es el siguiente archivo a cargar siguiendo I6.3→I6.7; Paula no necesita adivinar ni preparar todos los archivos de una vez.

---

**Regla final:** este addendum no vale como autorización de mutación. La autorización de I6 se registra únicamente mediante el mecanismo rector y no se infiere de “continúa”, de la entrega de archivos ni de la aprobación visual de un bloque.