# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-29 UTC / 2026-07-28 Guatemala

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/main/producción: no autorizados
M1: cerrado
M2: cerrado
M3: cerrado
M4: cerrado / M4_CLOSED_SUCCESS_CANONICAL_TARGET_VERIFIED
M5 5.0.1: readiness canónico cerrado
M5 5.0.2: Access role/session boundary cerrado
M5 5.0.3: RC post-Access cerrada
M5 5.0.4: Hosting LAB entregado y verificado 24/24
Bloque activo siguiente: autorización separada para un runtime smoke LAB
```

### Estado M5 5.0.4

La RC exacta:

```txt
d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045
```

fue entregada una sola vez al canal Hosting LAB `orbit360-ays-lab` del proyecto `ays-orbit-360-lab`.

Evidencia:

```txt
Run: 30411375732
Job: 90447991314
Artifact: 8708510538
Digest: sha256:fbe4ba382fe6d51294b2a08f17e2ba48a35e8b36dd0973303943cef8c631e1ec
Preflight: 16/16
Contrato: 31/31
Activos críticos: 41/41
Paridad pública LAB: 24/24
Mismatches: 0
```

El run terminó rojo únicamente porque el generador del resumen mezcló `||` y `??` sin paréntesis después de que el deploy y la revalidación 24/24 ya habían pasado. Se clasificó como `PIPELINE_MECHANISM_FAILURE`, se corrigió el workflow y no se repitió el deploy.

La autorización Hosting quedó consumida. Runtime smoke, navegador y revisión visual siguen bloqueados hasta autorización explícita separada.

### Cierre M4

La migración canónica preserva:

```txt
source: 414 clientes / 26 aseguradoras
canonical target: 1 configuración / 1 membership / 414 clientes / 26 aseguradoras
61 correcciones GT/GTQ preservadas
moneda faltante restante: 0
```

No se tocaron Pólizas ni otras fuentes reales.

## Siguiente acción operativa

```txt
Solicitar autorización explícita para una sola ejecución runtime smoke LAB
sobre la RC d90ec601…, sin nuevo deploy y sin escrituras.
```

No se inicia Pólizas dentro de M5. Cuando el Plan Maestro llegue al bloque Pólizas se debe solicitar a Paula el listado/base actual y vigente específico; `Listado producción 2025-2026` no es una fuente válida de Pólizas. La misma regla aplica a Vehículos, Recibos/cartera, Cobros, planillas, financiero, siniestros y documentos: cada fuente real se solicita cuando su bloque la necesite.

## Metodología vigente

Antes de modificar: verificar PR, rama, HEAD, freeze, registro contractual y evidencia más reciente. Antes de secrets, Firebase, sincronización, deploy LAB o navegador: ejecutar el preflight canónico del gate. Si la misma etapa o código falla dos veces, detener reintentos y diagnosticar causa raíz. No corregir producto si el fallo es `VALIDATOR_STALE`, `ENVIRONMENT_FAILURE` o `PIPELINE_MECHANISM_FAILURE`.

Un status rojo no prueba por sí mismo un defecto funcional. Debe identificarse la etapa exacta y comprobarse si el resultado operativo ocurrió antes del fallo del mecanismo de cierre.

## Arquitectura y capa de datos

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
├── core/
├── modules/
├── docs/
└── tools/
```

Los módulos usan exclusivamente `Orbit.store`. El backend adapta el store sin romper su API pública ni introducir persistencia operativa directa en módulos.

### Carriles permanentes

```txt
A — prototipo / UX / Academia / empalmes Claude
B — backend protegido / Auth / seguridad / Orbit.store / integraciones
C — datos reales y migración A&S por fuentes separadas
```

## Reglas de datos

- GT → GTQ; CO → COP.
- Si falta país/moneda confiable: `REQUIERE_VALIDACION`.
- Cobros/recaudos no son `finmovs`.
- Producción, metas y comisiones usan prima neta recaudada.
- Solo pólizas Vigente / Por renovar generan cartera.
- Financiero histórico no crea clientes, pólizas, cobros ni cartera.
- Estados bancarios sirven para conciliación, no para crear cobros directamente.
- Documentos solo proponen datos con diff/confirmación.
