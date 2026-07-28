# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

## Estado vivo — 2026-07-28

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge/deploy/main/producción: no autorizados
M1: cerrado
M2: cerrado
M3: cerrado
M4: cerrado / M4_CLOSED_SUCCESS
Bloque activo siguiente: M5 release candidate + visualización A&S
```

### Cierre M4

La escritura final 4.2.11 aplicó exactamente 61 correcciones autorizadas de Clientes (`pais=GT`, `moneda=GTQ`) con:

```txt
414 clientes preservados
26 aseguradoras preservadas
overlay target-only 0/0
61 snapshots durables
61 auditorías append-only
61 updates de cliente
0 moneda faltante restante
digest de los otros 353 clientes idéntico antes/después
```

Run: `30397573914` · SUCCESS. No se tocaron Aseguradoras, configuración, memberships, Rules, Hosting, Functions, producción, `main` ni merge.

## Siguiente acción operativa

```txt
M5 — preparar release candidate y una única visualización A&S
```

No se inicia Pólizas dentro de M5. Cuando el Plan Maestro llegue al bloque Pólizas se debe solicitar a Paula el listado/base actual y vigente específico; `Listado producción 2025-2026` no es una fuente válida de Pólizas. La misma regla aplica a Vehículos, Recibos/cartera, Cobros, planillas, financiero, siniestros y documentos: cada fuente real se solicita cuando su bloque la necesite.

## Metodología vigente

Antes de modificar: verificar PR, rama, HEAD, freeze, registro contractual y evidencia más reciente. Antes de secrets, Firebase, sincronización, deploy LAB o navegador: ejecutar el preflight canónico del gate. Si la misma etapa o código falla dos veces, detener reintentos y diagnosticar causa raíz. No corregir producto si el fallo es `VALIDATOR_STALE`, `ENVIRONMENT_FAILURE` o `PIPELINE_MECHANISM_FAILURE`.

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

## Importadores seguros

Cada fuente se procesa separadamente: Clientes, Aseguradoras, Pólizas, Vehículos, Cobros, Planillas, Banco, Financiero, Siniestros, Documentos y Configuración. El ciclo esperado es perfilado → mapeo → normalización → deduplicación → calidad → dry-run → diff → autorización → escritura durable → auditoría → rollback.

## Evidencia vigente

```txt
docs/CIERRE-M4-ESCRITOR-DURABLE-CLIENTES-ASEGURADORAS-20260728.md
runtime-gate-crm-v20260716/m4-block-closure.json
runtime-gate-crm-v20260716/m4-client-country-correction-write-closure.json
docs/M4-CLIENTES-CORRECCION-61-GT-GTQ-WRITE-4.2.11-20260728.md
```
