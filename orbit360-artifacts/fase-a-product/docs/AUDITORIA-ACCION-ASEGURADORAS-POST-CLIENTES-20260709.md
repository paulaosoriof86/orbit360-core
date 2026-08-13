# Auditoría-acción Aseguradoras — siguiente bloque operativo post Clientes

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Convertir la auditoría puntual del módulo Aseguradoras en acciones concretas, usando el directorio GT/CO ya procesado y sin repetir la importación ni reabrir fuentes.

## Baseline que no se repite

- Directorio Guatemala procesado.
- Directorio Colombia procesado.
- Deduplicación corregida para conservar múltiples contactos.
- Dry-run sanitizado ejecutado.
- GT: aproximadamente 14 aseguradoras, 152 contactos y 14 gestiones `credentialRef`.
- CO: aproximadamente 16 aseguradoras, 88 contactos y 16 gestiones `credentialRef`.
- No hay credenciales reales en repo.
- Importador P0 de directorio y test ya existen.

## Evidencia del módulo actual

Archivo:

`orbit360-platform/modules/aseguradoras.js`

Aspectos positivos:

- usa `Orbit.store`;
- filtra por país activo;
- conserva histórico al desactivar;
- bloquea borrado cuando existen vínculos operativos;
- solicita motivo en cambios administrativos;
- registra actividad administrativa;
- permite contactos, cuentas, documentos, ramos y comisiones;
- conecta importador de directorio, documentos y planillas;
- usa `credentialRef: backend_required` en lugar de persistir contraseña;
- relaciona pólizas, cobros, siniestros, reclamos, documentos y comisiones.

## Hallazgos que requieren acción

### AYS-ASG-001 — Campo visual de contraseña

- Necesidad: no inducir al usuario a escribir credenciales en frontend.
- Esperado: solicitar conexión segura o registrar referencia pendiente.
- Causa raíz: la fila de portal mantiene un `input type=password`; su contenido no se persiste, pero la UX aparenta captura de contraseña.
- Archivo/función: `modules/aseguradoras.js` / `portalRow`, `portalSnapshot`.
- Fix requerido: reemplazar el campo contraseña por control de estado/solicitud de conexión segura; mantener únicamente `credentialRef` y `backend_required`.
- Impacto: seguridad, honestidad operativa, futuro gestor de secretos.
- Estado: ABIERTO P0 UX/seguridad.

### AYS-ASG-002 — País no editable/validado en ficha

- Necesidad: aseguradora y contactos deben pertenecer a país configurado.
- Esperado: país visible y editable mediante catálogo permitido por tenant.
- Causa raíz: el país se toma al crear y se muestra, pero la ficha no ofrece control explícito ni validación de cambio.
- Archivo/función: `modules/aseguradoras.js` / `nueva`, `ficha`, `snapshot`.
- Fix requerido: selector de país desde configuración tenant, con auditoría.
- Impacto: Cotizador/Comparativo, moneda, cartera, contactos y productos.
- Estado: ABIERTO P1.

### AYS-ASG-003 — Monedas de operación no modeladas a nivel aseguradora

- Necesidad: una aseguradora puede operar por país y moneda, incluyendo excepciones USD.
- Esperado: monedas permitidas configurables; cuentas y tarifas deben validarse contra ellas.
- Causa raíz: moneda existe solo por cuenta y se infiere GTQ/COP al crear.
- Archivo/función: `modules/aseguradoras.js` / cuentas y nueva aseguradora.
- Fix requerido: catálogo `monedasPermitidas` por aseguradora/país; no sumar monedas.
- Impacto: cotizaciones, primas, cartera, comisiones y reportes.
- Estado: ABIERTO P1.

### AYS-ASG-004 — Productos/planes/tarifas no están como configuración estructurada

- Necesidad: Cotizador y Comparativo deben consumir configuración de Aseguradoras.
- Esperado: ramos → productos → planes → coberturas/deducibles/condiciones/exclusiones/tarifas por país/moneda/vigencia.
- Causa raíz: el módulo actual maneja ramos, comisiones y documentos, pero no catálogo operativo completo de planes/tarifas.
- Archivo/función: `modules/aseguradoras.js`; integración futura con `modules/cotizador.js` y `modules/comparativo.js`.
- Fix requerido: contrato configurable y vista operativa; documentos solo proponen cambios mediante diff.
- Impacto: desbloquea integración de `comparativo_final_v110.html` sin hardcode.
- Estado: ABIERTO P1, siguiente gran integración.

### AYS-ASG-005 — Drive/repositorio como URL libre

- Necesidad: no presentar una URL escrita como integración activa.
- Esperado: estado pendiente/conectado y referencia segura/configurada.
- Causa raíz: campo libre y enlace inmediato si existe texto.
- Fix requerido: validar URL, mostrar estado honesto y separar referencia de conexión real.
- Impacto: documentos comerciales y seguridad.
- Estado: ABIERTO P1.

### AYS-ASG-006 — Cuentas completas visibles sin control de rol

- Necesidad: datos bancarios deben respetar permisos y alcance.
- Esperado: visualización restringida, enmascarada cuando corresponda y auditada.
- Causa raíz: la ficha confía en visibilidad general del módulo.
- Fix requerido: gates por rol/scope y máscara en vista; edición solo autorizada.
- Impacto: seguridad financiera.
- Estado: ABIERTO P0 permisos.

### AYS-ASG-007 — Borrado físico todavía permitido sin vínculos detectados

- Necesidad: evitar pérdida de trazabilidad por relaciones no detectadas o futuras.
- Esperado: desactivar/archivar como regla general; eliminación física solo superadmin con confirmación reforzada y auditoría antes/después.
- Causa raíz: `borrarAseguradora` permite `remove` si `v.total === 0`.
- Fix requerido: preferir archivado; reservar eliminación física a gate reforzado.
- Impacto: integridad histórica y multi-tenant.
- Estado: ABIERTO P0 seguridad.

## Orden de implementación

1. Seguridad de credenciales y datos bancarios.
2. Archivado frente a borrado físico.
3. País y monedas permitidas.
4. Contactos ya importados en estructura operativa.
5. Productos/planes/tarifas configurables.
6. Integración con Cotizador/Comparativo.
7. Smoke por rol/país/moneda.

## Claude/prototipo — acumulado obligatorio

Claude deberá recibir, cuando se solicite nueva candidata:

- reemplazar captura de contraseña por “Solicitar conexión segura”;
- estados: sin referencia, conexión solicitada, pendiente de conexión, conectada solo si backend lo confirma;
- cuentas enmascaradas y restringidas por rol;
- desactivar/archivar como acción normal;
- eliminación física fuera del flujo común;
- país y monedas visibles;
- contactos múltiples por país y tipo;
- productos, planes y tarifas configurables;
- documentos de tarifas como propuestas con diff;
- integración visual con Cotizador/Comparativo;
- no hardcodear aseguradoras, tarifas, cuentas, usuarios o datos A&S.

## Academia impactada

Rutas requeridas:

- Dirección/Admin: alta, vinculación, archivado, permisos y auditoría.
- Operativo: consulta de contactos, documentos y requisitos.
- Cotizador: selección de país, moneda, producto y plan.
- Finanzas/Cobros: cuentas, cartera y comisiones con permisos.
- IT/Seguridad: `credentialRef`, conexión segura y secretos fuera del frontend.

Evaluaciones sugeridas:

- portal sin conexión: acción correcta;
- cambio de país/moneda;
- aseguradora con vínculos que se intenta eliminar;
- documento de tarifa que propone cambios pero no los aplica;
- usuario sin permiso que intenta ver cuenta completa.

## Claude requerido

No todavía para aplicar backend/contratos. Claude será requerido cuando esté definido el contrato de productos/planes/tarifas y se deba consolidar la ficha visual, la integración Cotizador/Comparativo y la ruta profunda de Academia.

## Siguiente acción técnica

Aplicar hotfix aditivo y seguro para:

- eliminar captura visual de contraseña;
- reforzar archivado frente a borrado físico;
- preparar contratos país/moneda/permisos sin tocar backend protegido.
