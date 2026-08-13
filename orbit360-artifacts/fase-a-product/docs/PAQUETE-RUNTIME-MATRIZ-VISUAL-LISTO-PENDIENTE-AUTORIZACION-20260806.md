# Paquete runtime de matriz visual — listo, pendiente de autorización

Fecha: 2026-08-06  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open  
RC: `RC-AYS-LAB-CANONICA-01`

## Estado

```text
READY_FOR_SINGLE_MACRO_AUTHORIZATION
```

No se requieren más comandos locales, PowerShell, instalaciones ni pasos técnicos por parte de Paula.

## Evidencia cerrada

```text
GO_GATE_CONTRACT previo: 28/28 PASS
Auth/membership/tenant/Inicio: PASS
precheck previo: PASS_VISUAL_BROWSER_PRECHECK / INICIO_READY_PASS
Firebase CLI local: 15.19.1
Firebase LAB visible: ays-orbit-360-lab
worktree remoto aislado: PASS
jq shim: 10/10 PASS
Windows signal compatibility: 7/7 PASS sintético
request v6 anterior: consumido / no reutilizable
```

El HOLD v4 fue `VALIDATOR_STALE`: Windows/Git Bash reportó terminación por señal sin código POSIX 143, mientras rollback y persistencia ocurrieron exactamente una vez. El correctivo solo acepta esta variación cuando:

- existe un único fallo de exit status por señal;
- el contexto es Windows/MSYS/MINGW;
- rollback ocurre exactamente una vez;
- persistencia ocurre exactamente una vez;
- no existe salida normal exitosa;
- no hay ningún otro check fallido.

Casos sintéticos: 7/7 PASS, incluidos rechazos de rollback duplicado, salida normal, fallo adicional y contexto no Windows.

## Bloque runtime propuesto

Después de autorización macro explícita y de un nuevo `GO_GATE_CONTRACT`:

1. resolver y sellar el HEAD vigente;
2. crear request local-runtime nuevo, inmutable y de una ejecución;
3. enlazar credencial LAB sin mostrarla ni persistirla;
4. restaurar `visual-matrix-corrected-backup-31116830824` a Hosting LAB live;
5. crear backup previo del estado restaurado;
6. ejecutar máximo un deploy exclusivo de Hosting LAB;
7. ejecutar precheck Auth, membership, tenant, ruta e hidratación;
8. solo con PASS ejecutar matriz:
   - Dirección desktop 1440×1000;
   - Operativo tablet 1024×768;
   - Asesor móvil 390×844;
9. exigir evidencia incremental, watchdog por rol/checkpoint y snapshot final;
10. ante cualquier fallo, rollback y persistencia exactamente una vez + `STOP_RETRY`;
11. persistir solo evidencia sanitizada en la rama canónica.

## Ejecutores permitidos

Orden de preferencia:

1. ejecución directa desde ChatGPT cuando exista acceso seguro al runtime/credencial;
2. Codex únicamente como transporte puntual siguiendo `CODEX-HANDOFF-PUNTUAL-EJECUTOR-RUNTIME-MATRIZ-VISUAL-20260806.md`.

Codex no asume el proyecto, no reaudita producto y no solicita pasos manuales a Paula.

## Prohibiciones

```text
main: NO
merge: NO
producción: NO
Functions: NO
Rules: NO
Firestore/Auth/operational writes: 0
reimportación: NO
más de un deploy Hosting LAB: NO
reutilizar request v6: NO
```

## Criterio de cierre

```text
PASS_VISUAL_POST_AUTH
roles: 3/3
snapshotIntegrity: VERIFIED_UNCHANGED
Firestore writes: 0
Auth writes: 0
operational writes: 0
Functions/Rules/production/main/merge: 0
```

Con PASS se continúa sin auditoría general adicional a bootstrap productivo read-only, activación controlada del tenant, migración limitada, release candidate y go-live autorizado.
