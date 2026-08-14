# ORBIT 360 / A&S — Pruebas funcionales automatizadas E2E pre/post go-live

Fecha original: 2026-08-12  
Actualización de secuencia: 2026-08-14  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open  
Estado operativo: consultar primero `orbit360-platform/docs/orbit360-live-state-v1.json`.

## 1. Decisión de producto y operación

Paula requiere que ChatGPT/Codex ejecute directamente una batería automatizada de pruebas funcionales reales de la plataforma, reutilizando el patrón ya aplicado en CXOrbia y Finanzas, para reducir al mínimo las pruebas manuales de la dueña del producto.

La batería debe cubrir de forma acumulativa:

- Inicio y navegación;
- Auth, membership, multirol, rol activo y scopes;
- Cliente 360;
- Aseguradoras;
- Pólizas;
- Vehículos;
- Recibos/cartera;
- Cobros/conciliación;
- Comisiones/planillas;
- Ops;
- Leads;
- sincronización Ops ↔ Leads ↔ Cliente 360 y módulos relacionados;
- permisos por Dirección / Operativo / Asesor;
- responsive desktop / tablet / móvil;
- notificaciones, estados y efectos transversales cuando la integración correspondiente esté realmente conectada;
- integridad de datos before/after;
- cero copy técnico visible al usuario.

No basta con verificar que una ruta abre o que una función existe. Deben probarse recorridos de usuario y efectos observables entre módulos.

## 2. Regla anti-desviación

Este requisito NO reabre Fase A ni sustituye la ruta crítica actual de salida a producción.

- Módulos cerrados no se reauditan desde cero.
- Se reutilizan harnesses, owners, fixtures, gates y evidencia ya aprobados.
- Solo se agregan escenarios que prueben flujos integrados no cubiertos o que funcionen como aceptación final.
- Producción no se usa para depurar validators ni para descubrir defectos del harness.
- Si la misma etapa/familia falla dos veces: `STOP_RETRY`, clasificación de causa raíz y reproducción fuera de producción.
- Una sola frontera larga de runtime/browser/deploy por iteración.
- Antes de una frontera larga debe existir checkpoint durable.
- Después de la frontera se detiene, lee, clasifica y sincroniza documentación antes de otra ejecución.

## 3. Dos capas de prueba

### Capa A — aceptación write-enabled fuera de producción

Objetivo: probar flujos completos con creación, transición, actualización, sincronización y cierre.

Entorno: LAB/preproducción sobre el mismo SHA candidato a go-live y configuración A&S equivalente.

Cada corrida debe:

1. fijar SHA exacto;
2. obtener `GO_GATE_CONTRACT` antes de secretos/runtime;
3. crear `testRunId` único;
4. capturar snapshot/digest before;
5. crear únicamente registros sintéticos identificables y acotados;
6. ejecutar el recorrido real por UI/API de producto, no una reproducción paralela de la lógica;
7. comprobar efectos esperados en todas las colecciones/módulos relacionados;
8. comprobar roles/scopes con Dirección, Operativo y Asesor;
9. limpiar los registros sintéticos creados por el `testRunId`;
10. verificar snapshot/digest post-cleanup equivalente al baseline permitido;
11. conservar evidencia sanitizada.

### Capa B — smoke productivo post-publicación

Objetivo: demostrar que el artefacto publicado, dominio, Auth, tenant, navegación, backend y lecturas reales operan en `https://app.aysseguros.com`.

Por defecto es read-only y debe incluir:

- TLS/HTTPS y URL final;
- bootstrap productivo, sin referencias LAB;
- Auth real y membership fail-closed;
- tenant correcto;
- Dirección desktop, Operativo tablet y Asesor móvil;
- rutas críticas;
- datos A&S visibles según scope;
- cero errores de consola;
- cero copy técnico;
- integridad de colecciones y digests sensibles;
- cero escrituras inesperadas.

Una prueba canary write-enabled en producción solo puede existir como sub-bloque separado y explícitamente autorizado, con actor, alcance, registros sintéticos marcados, cleanup obligatorio, backup/rollback y evidencia de cero residuos. No es requisito para el primer deploy si la Capa A ya demuestra los writers completos.

## 4. Matriz mínima de escenarios integrados

### CRM / Cliente 360

- localizar cliente por rol permitido;
- abrir ficha y validar relaciones reales;
- comprobar que un Asesor no ve clientes fuera de su scope;
- crear gestión permitida desde Cliente 360 en LAB y comprobar su aparición en Ops;
- validar historial/auditoría del evento.

### Ops

- crear gestión sintética autorizada;
- asignar responsable;
- mover por estados válidos;
- comprobar persistencia después de reload/new-tab;
- comprobar visibilidad por rol;
- verificar que los estados que deben impactar Leads lo hagan exactamente una vez.

### Leads

- crear lead sintético;
- avanzar etapas válidas;
- comprobar sincronización con Ops cuando el contrato lo requiera;
- impedir duplicación de tarjetas/gestiones;
- comprobar relación con cliente cuando corresponda;
- comprobar persistencia después de reload/new-tab.

### Pólizas / Vehículos / Recibos

- validar relaciones cliente ↔ póliza ↔ vehículo ↔ recibos;
- comprobar que solo `Vigente` / `Por renovar` genera cartera;
- comprobar prima neta, gastos, IVA/impuestos y total como campos separados;
- verificar moneda por país sin mezcla.

### Cobros / Conciliación

- mantener `pago reportado`, `propuesta`, `validación`, `cobro confirmado` y `conciliado` como estados distintos;
- demostrar que banco no escribe cobros directos sin conciliación;
- comprobar efectos en cartera sin duplicar `finmovs`.

### Comisiones

- comprobar que producción/metas/comisiones se basan en prima neta recaudada;
- respetar HOLD/validaciones y scope de asesor;
- impedir que una planilla nueva sobreescriba silenciosamente lotes previos.

## 5. Evidencia obligatoria por corrida

```text
RUN_ID
SHA
ENTORNO
GATE_ID / CONTRACT_VERSION
CLASIFICACION_DEL_FALLO (si aplica)
ACTOR / ROL
SCENARIOS_TOTAL
SCENARIOS_PASS
SCENARIOS_FAIL
WRITES_ESPERADAS
WRITES_INESPERADAS
SNAPSHOT_BEFORE
SNAPSHOT_AFTER
CLEANUP
RESIDUOS_SINTETICOS
CONSOLE_ERRORS
COPY_TECNICO
RESPONSIVE_3_VISTAS
OPS_LEADS_SYNC
CRM_RELATIONS
RESULTADO_FINAL
SIGUIENTE_ACCION_EXACTA
```

## 6. Gates de aceptación

### PRE_GO_LIVE_E2E_PASS

Requiere:

- 100% de escenarios P0/P1 definidos para primera salida en PASS;
- cleanup PASS;
- integridad PASS;
- cero residuos sintéticos;
- cero fallos de seguridad/cross-tenant;
- cero writes inesperadas;
- ninguna familia de fallo repetida sin causa raíz.

### POST_GO_LIVE_SMOKE_PASS

Requiere:

- `https://app.aysseguros.com` accesible por HTTPS;
- Auth/tenant/membership/scopes PASS;
- Dirección desktop, Operativo tablet, Asesor móvil PASS;
- rutas críticas PASS;
- datos reales visibles según scope;
- cero errores de consola relevantes;
- cero copy técnico;
- integridad read-only PASS;
- cero escrituras inesperadas.

## 7. Relación vigente con el go-live — sustituye el orden HostDime-first anterior

La ruta crítica vigente está gobernada por el Addendum Maestro de Continuidad 20260814 y el live-state:

```text
R1 observabilidad + un synthetic local
→ R2 rootfix único solo si R1 demuestra owner
→ R3 paquete durable + manifest + hashes
→ R4 HostDime/app.aysseguros.com + smoke productivo Capa B
→ R5 habilitación del equipo + delta incremental controlado
→ R6 regresión E2E acumulativa con releases postproducción
→ R7 pruebas de aislamiento/reutilización para siguiente tenant
```

Reglas:

1. HostDime NO bloquea R1–R3.
2. No se prepara ni publica un paquete manual basado en un artefacto efímero no certificado.
3. R4 sube exactamente el paquete durable construido en R3.
4. El equipo se habilita solo después de `POST_GO_LIVE_SMOKE_PASS`.
5. El delta de información es incremental desde el watermark/corte documentado; no full reload.
6. Nuevos módulos postproducción no reabren Fase A: entran como releases incrementales con su regresión acumulativa.

## 8. Continuidad documental obligatoria

Cada corrida que cambie estado debe cerrar sincronizando:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. PR #5;
3. `README.md`;
4. checkpoint/cierre de la corrida;
5. CHANGELOG/bitácora cuando cambie producto/pipeline/datos/contrato;
6. este documento solo cuando cambie política E2E o secuencia de go-live.

Ante corte de conversación, no se repite una corrida por ausencia de respuesta del chat. Primero se recupera el resultado desde GitHub usando `lastEvidence` del live-state.

## 9. Postproducción y siguiente tenant

La batería E2E debe crecer, no reiniciarse.

Cada release posterior debe reutilizar:

- Auth/membership/scopes;
- Orbit.store y contratos de acceso;
- harness/gates/fixtures existentes;
- snapshots e integridad;
- `testRunId` y cleanup para writers sintéticos;
- smoke read-only de producción;
- evidencia sanitizada;
- STOP_RETRY.

Antes del siguiente tenant debe agregarse una matriz cross-tenant que demuestre:

- aislamiento de datos;
- tenant derivado de membership/configuración;
- cero hardcode A&S en módulos genéricos;
- configuración por tenant;
- denegación fail-closed ante tenant/scope inválido;
- bootstrap reproducible del tenant nuevo sin fork.

## 10. Clasificación

- patrón de QA/harness: `REPLICABLE_CLAUDE_ACUMULADO` cuando afecte UX/recorridos reutilizables;
- harness, seguridad, secretos, integridad y pipeline: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- escenarios y configuración A&S: `TENANT_AYS_ONLY`;
- datos/credenciales reales: `SECRETO_DATO_REAL`;
- Academia: `ACADEMIA_ACTUALIZAR` para enseñar pruebas por rol, continuidad documental, diferencia entre defecto funcional y validator stale, artefacto efímero vs durable y lectura de evidencia E2E.
