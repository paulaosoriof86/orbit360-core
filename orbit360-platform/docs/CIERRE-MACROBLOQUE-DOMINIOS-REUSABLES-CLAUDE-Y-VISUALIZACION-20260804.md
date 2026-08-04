# Cierre macrobloque — dominios reutilizables, Claude y frontera visual

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Bloque

```text
CONFIGURACION_TENANT_SOURCE_IMPLEMENTED
OPS_LEADS_DOMAIN_SOURCE_IMPLEMENTED
COBROS_RECONCILIACION_SOURCE_IMPLEMENTED
CLAUDE_PACKAGE_DOCUMENTED
RUNTIME_AND_VISUAL_CANDIDATE_PENDING
```

No se ejecutaron deploy, Rules, Firebase, Auth, escrituras, producción, main ni merge.

## 2. Carril A — frontend, UX y Academia

### Avance visible

- Configuración incorpora secciones autoadministrables para Flujos y Conciliación.
- Dirección puede configurar visibilidad Leads/Ops por etapa, transiciones, SLA, cadencias, escalamiento y detección de duplicados.
- Dirección puede configurar reconocimiento por planilla, inferencia secuencial y reglas de HOLD.
- Leads incorpora una proyección de gestiones operativas asignadas para el rol Asesor.
- Los clientes de dominio están cargados detrás de compuertas inactivas hasta su validación runtime.
- Academia quedó ampliada por rol con onboarding, conciliación inferencial, Ops/Leads, notificaciones y gates.

### Owners

- `orbit360-platform/core/tenant-domain-config-client.js`
- `orbit360-platform/modules/config-domain-v20260804-bridge.js`
- `orbit360-platform/core/ops-leads-domain-client.js`
- `orbit360-platform/modules/ops-leads-domain-v20260804-bridge.js`
- `orbit360-platform/core/cobros-reconciliation-domain-client.js`
- `orbit360-platform/core/backend-lab-init.js`
- `orbit360-platform/docs/ACADEMIA-ACTUALIZACION-ONBOARDING-COBROS-OPS-LEADS-20260804.md`

## 3. Carril B — backend, seguridad y Orbit.store

### Configuración autoadministrable

`functions/tenant-domain-config.js` permite leer y guardar, por tenant:

- etapas y transiciones;
- visibilidad Leads/Ops;
- SLA;
- tipos de gestión;
- prioridades;
- canales de notificación;
- reglas de inferencia y validación de Cobros.

Exige membership activa, rol o permiso autorizado, motivo, validación de grafo y auditoría antes/después mediante digests.

### Ops/Leads

`functions/ops-leads-domain.js` incorpora:

- creación y transición de oportunidades;
- creación, asignación, resolución, reapertura y archivo de gestiones;
- etapas configurables por tenant;
- scopes propios/equipo/todos/ninguno;
- request idempotente;
- event ledger;
- outbox de notificaciones;
- respuesta durable para Portal;
- proyección de visibilidad para Leads, Ops y Asesor.

No contiene personas, correos, aseguradoras ni reglas A&S.

### Cobros/Conciliaciones

`functions/cobros-reconciliation-domain.js` incorpora:

- registro durable de evidencia;
- vista previa inferencial por póliza;
- propuesta, HOLD y reapertura;
- confirmación humana antes de aplicar;
- creación idempotente del cobro conciliado;
- actualización del recibo;
- eventos y trazabilidad.

`tools/orbit360-cobros-inferencia-secuencial-v20260804.mjs` implementa:

- reconocimiento directo de aseguradora;
- reconocimiento por planilla de comisión;
- secuencia de cuotas anteriores por planilla;
- secuencia de cuotas anteriores por cartera completa;
- pago reportado válido pendiente de cruce;
- HOLD ante contradicción.

`tools/orbit360-cobros-replay-inferencial-completo-v20260804.mjs` produce:

- ledger privado por recibo;
- evidencia sanitizada;
- conteos por resultado;
- plan de materialización sin escrituras;
- cobertura total del calendario normalizado.

### Estado de activación

```text
tenantDomainConfigBackendActive: false
opsLeadsDomainBackendActive: false
cobrosReconciliationDomainActive: false
```

Las compuertas permanecen cerradas porque aún no se ha ejecutado el gate source/runtime ni existe autorización de deploy.

## 4. Carril C — datos reales y migración A&S

### Estado preservado

- Los archivos enviados previamente no se declararon perdidos.
- Las fuentes y resultados anteriores permanecen documentados.
- No se reimportó ningún archivo.
- No se reescribieron los cinco cobros existentes.
- El conteo “365 no conciliados” fue retirado como conclusión final.

### Pendiente operativo

El replay inferencial debe ejecutarse sobre las colecciones normalizadas derivadas de:

- calendario de recibos;
- pagos reportados;
- reportes de pago de aseguradoras;
- planillas de comisión;
- estados completos de cartera.

Los bytes privados de esas entregas históricas no están montados en el runner actual. El motor y el contrato ya están preparados; no corresponde pedir nuevamente los archivos antes de intentar recuperar el paquete privado registrado.

## 5. Paquete para Claude

Índice acumulado:

`orbit360-platform/docs/PAQUETE-ACUMULADO-CLAUDE-ORBIT360-20260804.md`

Incluye:

- onboarding genérico;
- Equipo y estados de acceso;
- multirol y scopes;
- Configuración de Flujos y Conciliación;
- Ops/Leads y gestiones del Asesor;
- Portal y notificaciones honestas;
- Cobros directos e inferenciales;
- candidata visual acumulativa;
- Academia;
- archivos protegidos;
- clasificación de contenido reusable, tenant-only y secreto.

Estado real:

```text
documentado y versionado: sí
enviado externamente a Claude: no
secretos o PII incluidos: no
backend protegido ofrecido para reemplazo: no
```

No existe en esta sesión una acción externa conectada a Claude. El paquete queda listo para un empalme selectivo posterior; no se simula un envío inexistente.

## 6. Flujos adicionales incorporados por criterio de producto

Además de los flujos expresados por la usuaria, el contrato reusable incluye:

1. SLA por etapa, tipo y prioridad.
2. Escalamiento por vencimiento o inactividad.
3. Detección de solicitudes duplicadas.
4. Reasignación por alcance/equipo.
5. Reapertura sin borrar cierres previos.
6. Event ledger para analítica y automatizaciones.
7. Outbox idempotente con estados pendiente, entregado y fallido.
8. Respuesta durable visible en Portal.
9. Dependencias entre documentos, inspección, emisión, pago y aseguradora.
10. Medición de tiempo por etapa y cuellos de botella.
11. Configuración tenant-aware sin constantes A&S.
12. Confirmación humana antes de aplicar conciliaciones.

## 7. Validación y evidencia

Preparado:

- `functions/package.json` ejecutará `node --check` sobre los owners nuevos.
- manifiesto source: `domain-services-source-manifest-v20260804.json`.
- compuertas nuevas inactivas.
- cero checks CI observados en el HEAD al momento del cierre.

No se afirma todavía:

- PASS de sintaxis ejecutado en runner;
- PASS runtime;
- entrega de notificaciones por proveedor;
- conteo operativo recalculado de Cobros;
- backend desplegado;
- candidata visual final.

## 8. Impacto Academia

Academia debe enseñar que:

- autoadministrable no significa datos o roles hardcodeados;
- un mismo negocio se proyecta en dos vistas;
- una gestión asignada debe llegar al Asesor;
- una notificación preparada no equivale a entregada;
- un pago reportado es válido aunque aún no esté cruzado;
- una planilla o cartera completa puede soportar inferencias secuenciales;
- una contradicción real se mantiene en HOLD;
- defecto funcional, contrato de datos, mecanismo de pipeline y validador obsoleto son categorías distintas.

## 9. Pendiente y siguiente acción exacta

```text
1. Ejecutar gate-contract preflight del nuevo macrobloque.
2. Ejecutar npm run check en functions y validadores source.
3. Recuperar/montar las fuentes privadas ya registradas.
4. Ejecutar el replay inferencial completo con cero escrituras.
5. Revisar conteos, evidencia y HOLD.
6. Preparar una sola activación LAB de los tres dominios.
7. Solo con autorización expresa: deploy Functions/Hosting y gate end-to-end.
8. Construir inmediatamente la candidata visual runtime acumulativa.
```

## 10. Tablero resumido

| Área | Source | Runtime | Visual final |
|---|---|---|---|
| Onboarding Equipo | Implementado | Pendiente gate/deploy | Pendiente |
| Configuración tenant | Implementado | Pendiente gate/deploy | Pendiente |
| Ops/Leads | Implementado | Pendiente gate/deploy | Parcial histórica |
| Cobros inferenciales | Implementado | Pendiente replay/deploy | Pendiente |
| Academia | Actualizada | N/A | Se integra en candidata |
| Paquete Claude | Documentado | No enviado externamente | N/A |
