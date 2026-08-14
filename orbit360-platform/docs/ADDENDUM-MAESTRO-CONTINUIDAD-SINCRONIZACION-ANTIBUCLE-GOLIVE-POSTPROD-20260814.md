# ADDENDUM MAESTRO — CONTINUIDAD, SINCRONIZACIÓN, ANTIBUCLE, GO-LIVE Y POSTPRODUCCIÓN

Fecha: 2026-08-14  
Proyecto: Orbit 360 / A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open  
Estado: VIGENTE Y VINCULANTE

## 1. Propósito

Este addendum convierte la auditoría forense del 14 de agosto de 2026 en una regla permanente de operación. Su objetivo no es únicamente sacar la Fase A a producción; gobierna todas las iteraciones futuras de Orbit 360, los módulos postproducción, la preparación para nuevos tenants y el handoff posterior a Claude/otros agentes.

Resuelve cuatro fallas históricas demostradas:

1. continuidad rota entre conversaciones;
2. documentos rectores desincronizados respecto del HEAD/evidencia viva;
3. confusión entre artefacto versionado, artefacto efímero de runner y paquete durable de entrega;
4. ejecuciones demasiado largas y encadenadas que dejaban resultados en GitHub sin respuesta final y provocaban rediagnóstico en la conversación siguiente.

## 2. Precedencia operativa desde este addendum

Para cualquier nueva conversación, implementación, auditoría o ejecución:

1. reglas maestras y addenda de seguridad/datos vigentes;
2. `orbit360-platform/docs/orbit360-live-state-v1.json`;
3. estado vivo del PR #5 y HEAD de `ays/backend-tenant-lab-v99-20260703`;
4. último workflow/evidencia nombrados por el live-state;
5. este addendum;
6. Plan Único de Salida y documentos históricos, solo para contexto no contradicho por 1–5.

README, CHANGELOG, PENDIENTES, PR bodies históricos y cierres anteriores NO pueden usarse aisladamente como estado operativo si difieren del live-state o de evidencia posterior.

## 3. Estado vivo único

Archivo canónico:

`orbit360-platform/docs/orbit360-live-state-v1.json`

Debe contener como mínimo:

- `stateVersion`;
- `updatedAt`;
- `phase`;
- `productSourceHead`;
- `controlPlaneParentHead`;
- `pr`;
- `lastEvidence`;
- `classification`;
- `blocker`;
- `nextActionExact`;
- `hostdimeBlocking`;
- `productionTouched`;
- `writeAuthorization`;
- `iterationBudget`;
- `resumeProtocol`.

El `productSourceHead` identifica el SHA del producto/candidata sobre el que se certifica la frontera. Commits documentales/control-plane posteriores no invalidan ese SHA siempre que no modifiquen producto.

## 4. Transacción obligatoria de sincronización documental

Cada iteración que cambie cualquiera de estos elementos:

- causa raíz;
- estado de gate;
- último run;
- SHA de producto;
- paquete durable;
- autorización;
- producción/deploy/rollback;
- siguiente acción;
- bloque/etapa;

DEBE cerrar con una transacción documental única antes de iniciar otra frontera larga.

Superficies mínimas a sincronizar:

1. `orbit360-live-state-v1.json` — fuente operativa principal;
2. PR #5 — resumen humano actual, sin conservar instrucciones obsoletas como vigentes;
3. `README.md` — puntero al live-state, fase actual y siguiente acción;
4. documento de cierre/checkpoint de la iteración — evidencia narrativa;
5. CHANGELOG/bitácora del módulo cuando exista cambio de producto, pipeline, datos o contrato;
6. Plan Único / E2E únicamente cuando cambie la secuencia global o la política de aceptación.

Una iteración NO se considera cerrada si su evidencia cambió pero `live-state` y PR siguen describiendo una frontera anterior.

## 5. Regla de reanudación después de corte de conversación

Una nueva conversación NO vuelve a planificar ni diagnosticar desde cero.

Debe ejecutar este protocolo:

1. leer `orbit360-live-state-v1.json`;
2. confirmar HEAD real de la rama y PR #5;
3. leer exactamente el último run/evidencia indicado por `lastEvidence`;
4. verificar si `nextActionExact` sigue siendo válido;
5. ejecutar esa acción o, si hay drift real, registrar el drift y reclasificar una sola vez.

Prohibido usar memoria, una conversación anterior o un documento viejo como sustituto de esos cinco pasos.

## 6. Regla de tamaño de iteración

Para evitar cortes durante ejecución:

- una iteración puede contener una sola frontera larga de runtime/browser/deploy;
- antes de esa frontera debe existir checkpoint durable;
- después de la frontera se detiene para leer resultado, clasificar y sincronizar;
- no se encadena en la misma iteración `fix -> workflow -> segundo fix -> segundo workflow -> deploy -> E2E`;
- si un workflow queda ejecutándose o finaliza después del corte de chat, la conversación siguiente recupera su resultado desde GitHub y NO lo vuelve a disparar.

## 7. Regla STOP_RETRY reforzada

Si la misma etapa o familia de fallo aparece dos veces:

- congelar producto;
- no crear otro parche, request, workflow o transporte equivalente;
- clasificar `FUNCTIONAL_DEFECT`, `VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE`, `ENVIRONMENT_FAILURE`, `PIPELINE_MECHANISM_FAILURE` o `SECURITY_FAILURE`;
- reproducir fuera de producción cuando sea posible;
- corregir el owner de causa raíz, no el síntoma;
- actualizar live-state y documentación antes de cualquier nueva ejecución.

No existe una tercera ejecución de la misma familia sin nueva evidencia que demuestre una causa distinta.

## 8. Contrato de artefactos

Quedan definidos tres nombres distintos:

### 8.1 Source productivo
Código fuente/candidata en `orbit360-platform/` ligado a `productSourceHead`.

### 8.2 Artefacto efímero de runner
Resultado de ensamblaje creado dentro de GitHub Actions para validar el paquete. No se considera entregable manual mientras no sea persistido como artifact durable.

### 8.3 Paquete durable de producción
ZIP/artefacto final con:

- SHA fuente;
- manifest de archivos;
- SHA-256 de archivos críticos y ZIP;
- entrypoint funcional;
- cero referencias LAB prohibidas;
- runtime productivo configurado;
- evidencia synthetic PASS;
- fecha/version de materialización.

Solo el tercero puede llamarse `paquete productivo definitivo` para HostDime/entrega.

## 9. Plan integrado — recuperación actual + producción + postproducción

### R0 — Gobernanza y sincronización

Objetivo: cerrar el defecto de continuidad antes de otra ejecución larga.

Entregables:

- este addendum;
- live-state machine-readable;
- README y PR sincronizados;
- regla de documentación transaccional.

No toca producto, datos, secretos, HostDime ni producción.

### R1 — Observabilidad del blocker actual

Modificar únicamente el harness synthetic para conservar el último evento sanitizado `orbit:product-readonly-bootstrap`, fase/errors y requests fallidos/404 sanitizados.

Ejecutar UNA vez el mismo synthetic local.

Salida:

- PASS -> R3;
- FAIL con causa interna demostrada -> R2.

### R2 — Único rootfix permitido

Corregir únicamente el owner demostrado por R1.

No reabrir HostDime, base de datos, módulos cerrados ni arquitectura general.

Ejecutar UNA vez el mismo synthetic.

Salida obligatoria:

- PASS -> R3;
- misma familia FAIL -> STOP_RETRY, sin tercer parche/tercer intento.

### R3 — Materialización durable

Construir desde el `productSourceHead` certificado:

- `fase-a-product` funcional;
- manifest;
- hashes;
- ZIP durable;
- gate estático final;
- evidencia de que el ZIP coincide con lo probado.

No buscar artefactos anteriores.

### R4 — Publicación y aceptación de go-live

HostDime deja de ser diagnóstico y se convierte en transporte de entrega.

Secuencia:

1. crear/configurar el destino final solo si aún falta;
2. subir exactamente el ZIP durable certificado;
3. validar HTTPS/dominio final;
4. ejecutar smoke E2E productivo read-only en `app.aysseguros.com`;
5. Dirección desktop + Operativo tablet + Asesor móvil;
6. Auth/membership/scopes;
7. Inicio, Cliente 360, Aseguradoras, Ops, Leads, Pólizas, Vehículos, Recibos, Cobros/cartera y relaciones críticas;
8. cero errores relevantes, cero copy técnico, cero escrituras inesperadas;
9. integridad before/after;
10. `POST_GO_LIVE_SMOKE_PASS` -> habilitación del equipo.

Si HostDime requiere una acción manual de Paula por falta de conexión/credenciales disponibles para automatización, esa acción se limita al transporte del paquete; no reabre construcción ni producto.

### R5 — Arranque operativo y delta controlado

Después del `POST_GO_LIVE_SMOKE_PASS`:

- producción pasa a ser sistema operativo de registro;
- ejecutar delta incremental desde el último corte documentado, nunca full reload;
- snapshot/backup;
- dry-run/diff;
- trazabilidad por fuente;
- no sobrescribir silenciosamente actividad nacida en producción;
- banco continúa staging/conciliación, no cobro directo;
- planillas nuevas son batches independientes e idempotentes.

### R6 — Postproducción funcional acumulativa

Continuar módulos pendientes como releases incrementales, no como nueva plataforma:

- Cotizador + Comparativo v110;
- Renovaciones;
- Ops/Leads profundización si aplica;
- Marketing;
- Portal;
- financiero histórico;
- documentos;
- resto de Academia y módulos no bloqueantes.

Cada release reutiliza Auth/membership/scopes, Orbit.store, gates, snapshot, E2E, cleanup y rollback ya establecidos.

### R7 — Producto SaaS / siguiente tenant

Antes de activar un segundo tenant:

- cero hardcode A&S en módulos genéricos;
- tenant por `Orbit.tenant`/configuración y membership;
- catálogo/configuración aislados;
- contratos de importación multi-tenant;
- credenciales por `credentialRef/backend_required`;
- datos y reglas GT/CO parametrizadas;
- pruebas cross-tenant fail-closed;
- bootstrap de tenant reproducible;
- paquete/base reutilizable independiente de datos A&S;
- documentación de onboarding de tenant sincronizada con el código vivo.

A&S sigue siendo primer tenant/configuración, no fork del producto.

## 10. Batería E2E acumulativa obligatoria

La matriz pre/post go-live permanece vinculante y debe crecer con cada módulo.

Reglas:

- probar recorridos reales, no solo presencia de funciones;
- sincronizaciones Ops <-> Leads <-> Cliente 360 y relaciones asociadas;
- Dirección/Operativo/Asesor;
- desktop/tablet/móvil;
- writers completos en LAB con `testRunId`, cleanup y cero residuos;
- smoke productivo por defecto read-only;
- canary write en producción solo con autorización separada;
- integridad before/after;
- cero writes inesperadas;
- evidencia sanitizada.

## 11. Presupuesto de iteraciones para el go-live actual

El presupuesto se cuenta DESPUÉS de R0, que es documental/control-plane y se ejecuta al adoptar este addendum.

Objetivo normal: 3 iteraciones técnicas.

- Iteración 1: R1 observabilidad + un synthetic.
- Iteración 2: R2 solo si R1 demuestra rootfix; si R1 pasa, esta iteración se omite y se usa para R3.
- Iteración 3: R3 materialización durable.
- Iteración 4 máxima: R4 publicación + smoke E2E de producción.

Por tanto:

- mejor caso: 3 iteraciones técnicas hasta go-live validado;
- caso con un rootfix demostrado: 4 iteraciones técnicas;
- no se autoriza una quinta iteración de la misma ruta por acumulación de parches.

No se promete que un proveedor externo nunca presente un incidente nuevo; sí se fija que un incidente nuevo se clasifica como nueva familia y no reactiva diagnósticos cerrados.

## 12. Definition of Done del primer go-live

El equipo puede empezar a operar cuando exista:

- synthetic local PASS;
- paquete durable certificado;
- publicación final exacta del paquete;
- HTTPS/dominio operativo;
- `POST_GO_LIVE_SMOKE_PASS`;
- roles/scopes y rutas críticas PASS;
- integridad PASS;
- cero writes inesperadas;
- live-state/PR/README sincronizados con `PRODUCTION_ACTIVE`;
- backup/rollback documentados.

No es requisito que todos los módulos futuros estén terminados.

## 13. Definition of Done de cada release postproducción

Cada módulo posterior exige:

- source gate;
- pruebas del dominio;
- regresión transversal mínima;
- E2E por roles aplicables;
- backup/rollback;
- evidencia;
- actualización live-state;
- CHANGELOG/bitácora;
- impacto Academia;
- clasificación Claude;
- siguiente acción exacta.

## 14. Academia / Claude / reutilización

Este addendum genera reglas reutilizables:

- `REPLICABLE_CLAUDE_ACUMULADO`: separación artefacto efímero/durable, pruebas del flujo real, estados/checkpoints y anti-bucle UX/pipeline no protegido;
- `BACKEND_PROTEGIDO_NO_CLAUDE`: live-state, gates, secrets, auth, store, seguridad, runner y rollback;
- `ACADEMIA_ACTUALIZAR`: continuidad entre conversaciones, clasificación de causas, diferencia validator/producto, lectura de evidence y release lifecycle;
- `TENANT_AYS_ONLY`: dominio, configuración, datos y escenarios propios de A&S.

## 15. Regla final

Antes de actuar: leer live-state.  
Antes de ejecutar: confirmar nextActionExact.  
Antes de runtime/deploy: checkpoint durable.  
Después de runtime/deploy: detener, leer, clasificar y sincronizar.  
Antes de otro intento: verificar STOP_RETRY.  
Antes de llamar algo paquete productivo: exigir artifact durable + hashes.  
Antes de nuevo tenant: demostrar aislamiento y configuración, no fork/hardcode.
