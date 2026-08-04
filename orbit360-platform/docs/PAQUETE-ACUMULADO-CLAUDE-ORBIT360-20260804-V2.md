# Paquete acumulado para Claude — Orbit 360 V2

Fecha de corte: 2026-08-04  
Fuente: rama `ays/backend-tenant-lab-v99-20260703`, PR #5 draft/open  
Estado: índice preparado; ZIP descargable pendiente de cerrar gate source y overlay completo de Cobros.

## Regla de continuidad

La próxima candidata de Claude debe ser acumulativa. Debe partir del mejor estado frontend aceptado de la rama viva y empalmar selectivamente. No puede ser un shell reducido, una versión paralela, un ZIP antiguo reconstruido ni una sustitución total del árbol.

Claude no toca backend protegido, Auth, Rules, `Orbit.store`, adaptadores Firestore, importadores protegidos ni gates.

## Corrección vigente de Ops

La regla anterior “el Asesor no entra a Ops” queda retirada.

El Asesor:

- sí accede a Ops;
- usa scope `propios` por defecto;
- solo ve clientes, pólizas, gestiones, cotizaciones, inspecciones y emisiones asociados a su cartera;
- consulta estado, próxima acción, notas, resultado, checklist y bitácora;
- recibe aviso al crear, asignar, modificar, resolver, reabrir o escalar una gestión;
- no ve operaciones de otros asesores;
- no administra listas, configuración, reasignaciones globales ni transiciones reservadas al equipo.

Leads sigue siendo el pipeline comercial. Ops es la vista operativa del mismo ciclo y de gestiones que no son leads: pagos, sustituciones, endosos, correcciones, renovaciones, inspecciones, emisiones, siniestros y calidad.

Owners UX:

- `orbit360-platform/modules/ops.js`
- `orbit360-platform/modules/leads.js`
- `orbit360-platform/modules/ops-workflows-v1201-bridge.js`
- `orbit360-platform/modules/ops-leads-domain-v20260804-bridge.js`
- `orbit360-platform/modules/portal.js`
- `orbit360-platform/core/ciclo.js`

Owners protegidos no reemplazables:

- `functions/ops-leads-domain.js`
- `functions/ops-advisor-inbox.js`
- `functions/tenant-domain-config.js`
- `functions/cobros-reconciliation-domain.js`
- `functions/user-onboarding.js`
- `orbit360-platform/core/access-scope.js`
- `orbit360-platform/data/store-firestore-lab.local.js`
- `orbit360-platform/core/backend-lab-*`
- `orbit360-platform/core/auth.js`
- `firestore.rules`
- `tools/orbit360-*` protegidos.

## Cobros y Conciliaciones

La UI debe distinguir:

- pago reportado válido;
- conciliación directa;
- conciliación por reconocimiento de aseguradora;
- conciliación por secuencia de planilla;
- conciliación por secuencia de cartera;
- pago posterior al corte;
- pendiente de cruce;
- HOLD;
- aplicado al recibo.

El primer replay del workbook privado corrigió la etiqueta temporal de 365 pagos:

```text
128  candidatos de conciliación por secuencia de cartera
2    pagos válidos posteriores al corte externo
235  pendientes de overlay con planillas/reportes directos
```

El 235 no es cifra final de no conciliados. No debe fijarse en la candidata de Claude hasta cerrar el overlay.

Evidencia sanitizada:

- `orbit360-platform/runtime-gate-crm-v20260716/cobros-replay-inferencial-sanitizado-v20260804.json`

## Autoadministración

La candidata debe incorporar UX reusable para que cada tenant configure desde la plataforma:

- etapas y transiciones;
- visibilidad Leads/Ops;
- listas y tipos de gestión;
- prioridades y SLA;
- cadencias y escalamiento;
- canales de notificación;
- duplicados;
- scopes;
- reglas de conciliación;
- tolerancias y HOLD.

No puede incluir constantes de personas, aseguradoras, países, impuestos, credenciales o datos A&S.

## Academia

Actualizar por rol:

- Dirección: configuración, scopes, gates y supervisión;
- Operativo: ejecución, transición, evidencia y cierre;
- Asesor: Leads + Ops propios, estado y notificaciones;
- Cliente: solicitudes y respuestas durables del Portal;
- Finanzas: pago reportado, conciliado, aplicado y diferencia con `finmovs`.

## Entrada obligatoria de Claude

Claude debe recibir, en un único paquete descargable preparado por ChatGPT/Codex y enviado manualmente por Paula:

1. este índice V2;
2. el paquete acumulado V1 como historial;
3. addendum Ops/Asesor;
4. manifiesto del HEAD fuente;
5. diff selectivo de UX;
6. Academia actualizada;
7. evidencia sanitizada de Cobros;
8. lista de owners protegidos;
9. instrucciones de entrega acumulativa;
10. cero datos reales y secretos.

## Compuerta de entrega

El ZIP se genera y se entrega a Paula inmediatamente después de:

```text
A. PASS source Ops/Leads/Asesor.
B. Overlay completo de Cobros: cartera + planillas + reportes directos.
C. Manifiesto acumulativo sellado contra el mismo HEAD.
```

No es necesario esperar el deploy productivo. Después de A+B+C, Claude puede trabajar en paralelo mientras ChatGPT/Codex continúa los gates y la activación LAB.
