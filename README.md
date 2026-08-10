# orbit360-core

Repositorio de Orbit 360.

Fuentes operativas vigentes:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/AUDITORIA-FORENSE-ANTIBUCLE-V28-V37-CAUSA-RAIZ-Y-RUTA-PRODUCCION-20260810.md`;
4. estado vivo del PR #5 + HEAD de `ays/backend-tenant-lab-v99-20260703`;
5. lifecycle/registry/evidencia sanitizada más reciente del gate activo.

RC activa: `RC-AYS-LAB-CANONICA-01`.

## Estado rector actual

```text
Bloque activo: Block 1 — Cliente 360 + Aseguradoras
Gate único: block1-client360-insurers-lab-v20260717
Contrato vivo: 1.0.41
PASS_VISUAL_POST_AUTH: NO
Universe gate final: NO ejecutado
Producción/main/merge: NO autorizados
STOP_RETRY_CONTROL_PLANE: ACTIVO
```

## Datos/procedencia

```text
clientes baseline: 414
aseguradoras contrato: 26
asesores contrato: 7
clientes post-cierre investigados: 16
ligados a retained26: 14
ORIGEN_NO_DEMOSTRABLE: 2
```

No reimportar Clientes/Aseguradoras y no inferir legitimidad de los 2 pendientes. El universe gate permanece bloqueado hasta resolver objetivamente esos dos registros o registrar una decisión humana/controlada conforme al contrato.

## IAM / auditoría externa

Cierres consumidos:

```text
v34: cuenta LAB sin lectura privada Logging requerida
v35: cuenta LAB no puede administrar IAM de la Log View
v36: cuenta LAB no puede usar Policy Analyzer
v37: PASS — project IAM policy directa identificó exactamente un candidato administrativo USER / roles/owner, sanitizado por fingerprint
```

No reutilizar requests v34–v37 ni autoelevar la cuenta LAB.

## Auditoría forense 2026-08-10

La auditoría anti-bucle determinó que no corresponde abrir v38 runtime. Existe deriva entre:

- registry canónico principal;
- entrypoint/perfiles de preflight;
- registry extensions/lifecycles generacionales;
- documentación viva.

El registry principal todavía conserva una versión histórica del Block 1, mientras la ruta viva opera en `1.0.41`. Antes de cualquier nuevo runtime debe converger el control-plane source-only y volver a existir una sola fuente ejecutable de verdad.

## Siguiente acción exacta

```text
MACROBLOQUE SOURCE-ONLY DE CONVERGENCIA DEL CONTROL-PLANE
```

Sin secretos ni APIs externas:

1. promover `1.0.41` al registry canónico del Block 1;
2. convertir v28–v37 en evidencia histórica, no rutas paralelas activas;
3. retirar del entrypoint canónico el conocimiento hardcodeado de generaciones cerradas;
4. derivar lifecycle/engine/estado desde un registro único versionado;
5. añadir fixture que bloquee divergencias registry ↔ lifecycle ↔ entrypoint ↔ documentación;
6. sincronizar PR/README/bitácora/Claude/Academia.

Solo con PASS source-only de esa convergencia se prepara **un único macrobloque** para resolver los 2 clientes pendientes: evidencia externa owner-controlled o decisión de datos humana/controlada. No alternar ambas rutas mediante microexperimentos.

## Cierres que no se reabren

- Auth/membership/multirol/scopes salvo regresión demostrada;
- Pólizas write PASS histórico;
- Vehículos write PASS histórico;
- Recibos/cartera write PASS histórico;
- v32 baseline/demo/retained26;
- v34–v37 IAM diagnostics;
- Cobros cerrados/read-only según su gate vigente.

No ejecutar producción, main, merge, Rules, reimportación, Hosting o deploy sin autorización explícita y gate correspondiente.
