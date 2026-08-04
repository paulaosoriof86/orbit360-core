# Paquete acumulado para Claude — Orbit 360 V2

Fecha de corte: 2026-08-04  
Fuente: rama `ays/backend-tenant-lab-v99-20260703`, PR #5 draft/open  
Destino: frontend, UX, prototipo comercializable y Academia.

## Regla de continuidad

La próxima candidata debe ser única, canónica y acumulativa. Debe partir del mejor estado frontend aceptado de la rama viva y empalmar selectivamente. No puede ser un shell reducido, una versión paralela, una reconstrucción desde un ZIP antiguo ni una sustitución total del árbol.

Claude no toca backend protegido, Auth, Rules, `Orbit.store`, adaptadores Firestore, importadores protegidos, secretos ni gates.

## Alcance genérico obligatorio

El paquete contiene únicamente patrones reutilizables:

- onboarding administrado desde Equipo;
- multirol, rol activo y scopes;
- configuración autoadministrable por tenant;
- Cliente 360, Aseguradoras y CRM acumulativos;
- Ops y Leads como dos proyecciones de un mismo ciclo;
- acceso del Asesor a Ops con alcance `propios`;
- Portal y respuestas durables;
- importación inteligente recurrente;
- Cobros, Conciliaciones y Comisiones con estados honestos;
- responsive por rol;
- Academia por rol;
- estados de integración y notificación basados en evidencia real.

No se incluyen conteos, archivos, aseguradoras, clientes, pólizas, pagos, usuarios, países, monedas, impuestos ni decisiones operativas de un tenant específico.

## Ops del Asesor

El Asesor:

- sí accede a Ops;
- usa scope `propios` por defecto;
- solo ve clientes, pólizas, gestiones, cotizaciones, inspecciones y emisiones asociados a su cartera;
- consulta estado, próxima acción, notas, resultado, checklist y bitácora;
- recibe aviso al crear, asignar, modificar, resolver, reabrir o escalar una gestión;
- no ve operaciones de otros asesores;
- no administra listas, configuración, reasignaciones globales ni transiciones reservadas al equipo.

Leads sigue siendo el pipeline comercial. Ops es la vista operativa del mismo ciclo y de gestiones no comerciales: pagos, sustituciones, endosos, correcciones, renovaciones, inspecciones, emisiones, siniestros y calidad.

## Importación mensual reusable

La experiencia debe soportar directamente desde la plataforma:

1. adjuntar Excel, CSV, PDF, imagen u otra fuente permitida;
2. detectar tipo de documento y encabezados;
3. proponer un perfil de mapeo editable;
4. recuperar perfiles aprendidos por tenant, aseguradora y tipo de fuente;
5. normalizar póliza, recibo, cliente, aseguradora, país, moneda, periodo, cuota, fecha, monto y comisión;
6. deduplicar por hash y contraparte;
7. calcular calidad;
8. presentar dry-run de crear, actualizar, omitir y requiere validación;
9. conservar archivo, hoja, fila, bloque y periodo;
10. confirmar evidencia mediante acción humana;
11. ejecutar conciliación directa o inferencial en un dominio separado;
12. aplicar al recibo únicamente después de confirmación;
13. registrar actor, motivo, antes/después y eventos;
14. permitir rollback mientras la evidencia no haya sido consumida.

Tipos de fuente reutilizables:

```text
receipt_schedule
reported_payments
insurer_payment_report
portfolio_statement
commission_statement
bank_statement
supporting_document
```

Reglas obligatorias:

- un estado bancario no crea cobros ni movimientos financieros por sí solo;
- una planilla no aplica un recibo directamente: primero crea evidencia;
- país o moneda ausentes requieren validación;
- reversos, negativos, duplicados ambiguos y conflictos de vigencia quedan en HOLD;
- los perfiles aprendidos no eliminan el dry-run;
- toda nueva entrega mensual reutiliza el contrato, no requiere código especial.

## Cobros y Conciliaciones

La UI debe distinguir:

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

Cada resultado debe mostrar tipo de fuente, referencia sanitizada, periodo, póliza, vigencia, moneda, cuota, confianza, explicación, contradicciones y acción requerida.

## Autoadministración

Cada tenant configura desde la plataforma:

- etapas y transiciones;
- visibilidad Leads/Ops;
- listas y tipos de gestión;
- prioridades y SLA;
- cadencias y escalamiento;
- canales de notificación;
- scopes;
- perfiles de importación;
- sinónimos y mappings;
- tolerancias de conciliación;
- reglas de inferencia;
- reglas de HOLD;
- países, monedas, impuestos e integraciones.

## Owners UX que Claude puede empalmar

- `orbit360-platform/modules/ops.js`
- `orbit360-platform/modules/leads.js`
- `orbit360-platform/modules/importar.js`
- `orbit360-platform/modules/configuracion.js`
- `orbit360-platform/modules/cobros.js`
- `orbit360-platform/modules/conciliaciones.js`
- `orbit360-platform/modules/portal.js`
- `orbit360-platform/modules/academia.js`
- bridges UX explícitamente clasificados como replicables.

## Owners protegidos no reemplazables

- `functions/user-onboarding.js`
- `functions/tenant-domain-config.js`
- `functions/ops-leads-domain.js`
- `functions/ops-advisor-inbox.js`
- `functions/cobros-reconciliation-domain.js`
- `functions/recurring-insurance-import.js`
- `orbit360-platform/core/access-scope.js`
- `orbit360-platform/core/recurring-insurance-import-client.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-*`
- `orbit360-platform/core/auth.js`
- `orbit360-platform/core/importa.js`
- `firestore.rules`
- `tools/orbit360-*` protegidos.

## Academia

Actualizar por rol:

- Dirección: configuración, perfiles, scopes, gates y supervisión;
- Operativo: importación, transición, evidencia, calidad y cierre;
- Asesor: Leads + Ops propios, estado y notificaciones;
- Cliente: solicitudes y respuestas durables del Portal;
- Finanzas: pago reportado, conciliado, aplicado y diferencia con movimientos financieros.

## Entrega acumulativa

El paquete descargable debe incluir:

1. este índice;
2. manifiesto del HEAD fuente;
3. diff selectivo de UX;
4. contratos públicos de backend;
5. Academia actualizada;
6. lista de owners protegidos;
7. matriz de módulos acumulativos;
8. pendientes honestos;
9. cero datos reales y secretos.

El trabajo operativo de cualquier tenant se valida en un carril separado y nunca bloquea ni contamina la entrega genérica a Claude.
