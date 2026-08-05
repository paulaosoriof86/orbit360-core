# CIERRE STOP_RETRY — AUTH ACCESS v3

Fecha local: 2026-08-05 09:27 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `block-auth-access-recovery-lab-v3-20260805`

## Decisión

```text
STOP_RETRY_ACCESS_CONFIG_APPLY
PIPELINE_MECHANISM_FAILURE
```

La autorización v3 fue consumida y no se ejecutará otro intento con el mismo request.

## Frontera ejecutada

```text
preflight canónico: 12/12 PASS
plan de configuración: alcanzado
aplicación de configuración: abortada antes de commit
configuración de acceso escrita: 0
Auth writes: 0
membership writes: 0
Function onboarding desplegada: no
correos enviados: 0
Hosting/Rules/reimportación: 0
CRM writes: 0
producción/main/merge: 0
```

## Causa raíz

Owner exacto:

```text
tools/orbit360-auth-access-config-repair-lab-v3-20260805.mjs
modo apply
db.runTransaction callback
```

El callback recorría los tres perfiles con esta secuencia:

```text
perfil 1: tx.get → tx.update
perfil 2: tx.get → tx.update
perfil 3: tx.get → tx.update
```

Esto intercaló lecturas y escrituras dentro de una misma transacción. La siguiente lectura se intentó después de haber programado una escritura. Firestore abortó la transacción completa antes de confirmar documentos.

La evidencia pública original solo preservó `ACCESS_CONFIG_REPAIR_FAILED`; la causa concreta se aisló mediante inspección del owner que falló. No hubo commit parcial de configuración.

## Root fix source-only aplicado

Commit:

```text
38aae846477a35025950869a207bf10be9337cc1
```

La transacción ahora tiene tres fases:

1. leer los tres snapshots;
2. validar todos y construir únicamente los patches allowlisted;
3. programar todas las escrituras después de finalizar las lecturas.

También se agregó un código sanitizado específico para detectar una regresión futura de lectura después de escritura.

## Estado siguiente

- request v3: consumido e inmutable;
- rerun v3: prohibido;
- Function onboarding: no desplegada;
- identidades reales: todavía no creadas o vinculadas por este gate;
- correo oficial de Paula: permanece corregido por el gate v2;
- candidata LAB y Bloque 4: no afectados;
- continuación Auth: requiere nuevo path/version, validación source-only y autorización explícita nueva.

Fuente sanitizada:

`orbit360-platform/runtime-gate-crm-v20260716/auth-access-v3-transaction-rootcause-sanitized-v20260805.json`
