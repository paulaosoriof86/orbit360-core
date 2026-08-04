# Paquete acumulado para Claude — Orbit 360

Fecha de corte: 2026-08-04  
Destino: Claude / carril frontend, UX, prototipo y Academia  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama fuente obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Propósito

Este paquete evita que los cambios realizados durante la estabilización A&S se pierdan o queden como parches de un solo tenant. Todo patrón reusable debe incorporarse al prototipo comercializable sin copiar datos, usuarios, aseguradoras, archivos, credenciales ni reglas particulares de A&S.

No es una orden para reemplazar archivos completos. Claude debe auditar contra el HEAD vigente, empalmar selectivamente y respetar owners protegidos.

## 2. Clasificación obligatoria

### REPLICABLE_CLAUDE_INMEDIATO

1. Estados honestos de acceso en Equipo: Pendiente, Habilitando, Invitación pendiente, Invitado, Activo, Bloqueado y Requiere atención.
2. Acciones UX de Equipo: guardar configuración, crear/vincular acceso, sincronizar roles/scopes/países, bloquear, reactivar y reenviar establecimiento seguro.
3. Confirmación reforzada al abrir scope `todos`.
4. Proyección de gestiones operativas asignadas dentro de la experiencia del Asesor.
5. Misma oportunidad proyectada en Ops y Leads según etapa; nunca duplicar negocios.
6. Mensajes honestos de notificación: “preparada”, “pendiente de proveedor” o “entregada”, según evidencia real.
7. Estados de Cobros: reportado válido, conciliado directo, conciliado por reconocimiento de aseguradora, conciliado por secuencia de planilla, conciliado por secuencia de cartera, pendiente según aseguradora y HOLD.
8. Bandeja unificada de conciliación con evidencia, confianza, causa, trazabilidad y acción requerida.
9. Separación visual entre pago reportado, conciliación y aplicación al recibo.
10. UI autoadministrable para etapas, listas, tipos de gestión, cadencias, responsables, prioridades y canales.
11. Vista transversal de origen: Portal, ficha Cliente 360, Ops, Leads, Cotizador, Comparativo, Renovaciones, Siniestros, Cobros o automatización.
12. Enlaces entre gestión, cliente, póliza, negocio, cotización, inspección, emisión y notificación.
13. Relaciones vacías honestas; no inventar datos ni ocultar módulos porque aún no tengan registros.

### REPLICABLE_CLAUDE_ACUMULADO

1. Candidato visual único y acumulativo; no shell reducido ni composición fragmentada.
2. Responsive por rol y viewport: Dirección desktop, Operativo tablet, Asesor móvil y Portal cliente.
3. Multirol con rol activo/default, base + extras - restringidos y scopes propios/equipo/todos/ninguno.
4. Cliente 360 con lista, ficha, calidad, actividades, gestiones y deep-links protegidos.
5. Aseguradoras con directorio, ficha, contactos, datos bancarios, conocimiento y gates por consumidor.
6. Pólizas, vehículos, recibos, cartera, cobros, conciliaciones y comisiones con estados honestos.
7. Cotizador/Comparativo: propuesta aceptada crea solicitud de emisión; no crea póliza hasta número real.
8. Importador inteligente con detección de encabezados, mapeo corregible, dry-run, diff, confirmación, auditoría y rollback.
9. Cero copy técnico en UI cliente: Firebase, Firestore, backend, LAB, localStorage, mock, demo, smoke, secretos o credenciales.
10. Chrome Orbit 360 y marca del tenant solo en slot white-label.

### ACADEMIA_ACTUALIZAR

1. Diferencia entre registro de Equipo y usuario con acceso.
2. Flujo administrado de onboarding, invitación y activación.
3. Multirol, scopes, confirmación reforzada y auditoría.
4. Diferencia entre pago reportado, conciliado y aplicado.
5. Inferencias válidas desde planillas y estados completos de cartera.
6. Casos que deben permanecer en HOLD.
7. Ops/Leads como un único ciclo con dos proyecciones.
8. Solicitudes desde Portal y Cliente 360 hacia Ops.
9. Gestión asignada y seguimiento del Asesor.
10. Propuesta, negociación, inspección, emisión y cierre.
11. Notificaciones preparadas versus entregadas por proveedor.
12. Diferencia entre defecto funcional, contrato de datos, mecanismo de pipeline y validador obsoleto.
13. Gates, evidencia sanitizada, idempotencia y rollback.

### BACKEND_PROTEGIDO_NO_CLAUDE

Claude no debe sobrescribir ni recrear:

- `functions/user-onboarding.js`;
- `functions/ops-leads-domain.js`;
- `functions/cobros-reconciliation-domain.js`;
- `functions/index.js`;
- `functions/bank-accounts.js`;
- `functions/bootstrap.js`;
- `orbit360-platform/data/store-firestore-lab.local.js`;
- `orbit360-platform/core/backend-lab-*`;
- `orbit360-platform/core/auth.js`;
- `firestore.rules`;
- validadores y gates `tools/orbit360-*` protegidos.

Claude puede consumir contratos públicos documentados y construir UX reusable, pero no implementar Admin SDK, Rules, secretos ni accesos privilegiados.

### TENANT_AYS_ONLY

No replicar:

- nombres, correos, teléfonos o UID de personas A&S;
- padrón de asesores A&S;
- 414/430 clientes o sus datos;
- 26/30 aseguradoras y sus datos privados;
- 1,373 pólizas, vehículos, recibos, cartera o pagos reales;
- archivos, hojas, filas, hashes operativos o soportes A&S;
- IVA, países, monedas, contactos o portales como constantes globales: deben provenir de configuración del tenant.

### SECRETO_DATO_REAL

Nunca enviar a Claude:

- credenciales Firebase;
- secretos, tokens o referencias resolubles;
- datos personales;
- números de cuenta reales no sanitizados;
- documentos de pólizas, estados bancarios o planillas reales;
- enlaces internos privados.

### TEMPORAL_RETIRO

Retirar del prototipo:

- roster nominal de tres personas;
- fallback que convierte cualquier identidad Firebase en Dirección;
- cifrar acceso mediante scripts por nombres fijos;
- “365 no conciliados” como cifra final sin replay inferencial;
- cinco cobros como representación del universo total;
- afirmaciones de notificación enviada cuando solo se abrió WhatsApp/correo;
- index de evidencia presentado como si fuera aplicación canónica.

## 3. Contratos de UX para Ops y Leads

### Fuente única

Un negocio es un registro único. Las vistas dependen de la etapa configurada:

```text
Nuevo / Contactado       → Leads
Cotizando                → Leads + Ops
Propuesta / Negociación  → Leads
Inspección / Emisión     → Leads + Ops
Emitido / Perdido        → cierre e historial
```

Las etapas y su visibilidad deben ser configurables por tenant, conservando reglas de transición válidas.

### Gestiones

Las gestiones pueden originarse en:

- Portal cliente;
- ficha Cliente 360;
- Ops;
- renovación o modificación;
- siniestro;
- cobro/conciliación;
- calidad de datos;
- emisión;
- automatización.

Cada gestión debe conservar origen, solicitante, cliente, póliza, negocio, responsable, prioridad, vencimiento, checklist, comentarios, bitácora, resultado y notificaciones.

El Asesor debe ver las gestiones activas asignadas aunque Ops continúe siendo un tablero interno para Dirección/Operativo.

### Flujos inteligentes adicionales propuestos

1. SLA configurable por tipo de gestión y prioridad.
2. Escalamiento automático por vencimiento o inactividad.
3. Reasignación por ausencia, carga o territorio.
4. Bloqueo de cierre si faltan requisitos obligatorios.
5. Detección de duplicado por cliente, póliza, tipo y ventana temporal.
6. Dependencias: una gestión puede esperar documento, inspección, respuesta de aseguradora o pago.
7. Subtareas y participantes sin perder owner principal.
8. Eventos de negocio reutilizables para automatizaciones y reportes.
9. Notificaciones por preferencia del involucrado y disponibilidad real del canal.
10. Reintentos y dead-letter para notificaciones fallidas.
11. Respuesta durable visible en Portal y expediente del cliente.
12. Auditoría antes/después, actor, motivo y canal de origen.
13. Tablero de capacidad y cuellos de botella por etapa, aseguradora y responsable.
14. Historial de tiempo por etapa para medir SLA y conversión.
15. Reapertura sin borrar el cierre anterior.

## 4. Contratos de UX para Cobros y Conciliaciones

### Estados

```text
PAGO_REPORTADO_VALIDO_PENDIENTE_CRUCE
CONCILIADO_DIRECTO_ASEGURADORA
CONCILIADO_RECONOCIMIENTO_ASEGURADORA
CONCILIADO_SECUENCIA_PLANILLA
CONCILIADO_SECUENCIA_CARTERA
PENDIENTE_SEGUN_ASEGURADORA
HOLD_REQUIERE_VALIDACION
APLICADO_A_RECIBO
```

### Evidencia y confianza

Cada resultado debe mostrar:

- tipo de fuente;
- archivo/hoja/fila o referencia sanitizada;
- fecha del corte;
- póliza, vigencia, moneda y cuota;
- resultado directo o inferido;
- nivel de confianza;
- explicación legible;
- contradicciones;
- acción requerida;
- actor que confirma la aplicación.

### Inferencia reusable

- Una planilla de comisión positiva reconoce la cuota incluida si existe contraparte única.
- Una cuota N reconocida permite inferir 1..N-1 cuando el calendario es continuo y no hay conflicto.
- Una cartera completa cuya primera pendiente es N permite inferir las anteriores.
- La ausencia aislada no concilia.
- Banco solo no concilia sin vínculo suficiente.
- Reversos, negativos, duplicados, cambios de vigencia/moneda y coincidencias ambiguas permanecen en HOLD.

## 5. Archivos fuente que Claude debe consultar

### UX y ciclo

- `orbit360-platform/modules/ops.js`
- `orbit360-platform/modules/leads.js`
- `orbit360-platform/core/ciclo.js`
- `orbit360-platform/modules/portal.js`
- `orbit360-platform/core/issuance-workflow-v1201.js`
- `orbit360-platform/modules/ops-workflows-v1201-bridge.js`
- `orbit360-platform/modules/ops-leads-domain-v20260804-bridge.js`
- `orbit360-platform/core/notify.js`

### Cobros

- `orbit360-platform/modules/cobros.js`
- `orbit360-platform/modules/conciliaciones.js`
- `tools/orbit360-cobros-inferencia-secuencial-v20260804.mjs`
- `tools/orbit360-cobros-full-materialization-contract-v20260804.json`

### Acceso y Equipo

- `orbit360-platform/modules/equipo.js`
- `orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js`
- `orbit360-platform/core/user-onboarding.js`

### Auditorías vigentes

- `orbit360-platform/docs/CIERRE-SOURCE-ONLY-ONBOARDING-Y-BRECHA-COBROS-20260804.md`
- `orbit360-platform/docs/AUDITORIA-FORENSE-OPS-LEADS-Y-CONCILIACION-INFERENCIAL-20260804.md`

## 6. Estado de envío

Este paquete queda documentado y versionado en el repositorio. No se ha enviado a un servicio externo ni contiene datos reales o secretos. La próxima entrega a Claude debe usar este archivo como índice, acompañada por un diff selectivo y nunca por un ZIP que reemplace el backend protegido.
