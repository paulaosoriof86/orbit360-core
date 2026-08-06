# Handoff puntual para Codex — ejecutor runtime de matriz visual

Fecha: 2026-08-06  
Proyecto: Orbit 360 / A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## Uso permitido

Este documento no transfiere el proyecto a Codex. Solo se utiliza si ChatGPT no dispone del ejecutor runtime con acceso seguro a la credencial LAB y GitHub Actions continúa indisponible.

Codex actúa exclusivamente como transporte local del bloque ya diseñado. No audita nuevamente producto, Auth, datos ni arquitectura y no crea un gate alternativo.

## Estado previo obligatorio

```text
DATA_CONTRACT_FAILURE de readiness: corregido source-only
PIPELINE_MECHANISM_FAILURE de matriz: corregido source-only
Windows signal compatibility: PASS sintético 7/7
Firebase CLI local: 15.19.1
proyecto LAB visible: ays-orbit-360-lab
request v6: consumido / no reutilizable
backup existente: visual-matrix-corrected-backup-31116830824
PASS_VISUAL_POST_AUTH: NO
```

## Prohibiciones

- no pedir a Paula PowerShell, terminal, secretos ni pasos manuales;
- no mostrar, copiar, imprimir o persistir credenciales;
- no usar `main`, merge o producción;
- no desplegar Functions o Rules;
- no escribir Firestore, Auth ni datos operativos;
- no reimportar datos;
- no crear otro producto, rama funcional o gate superpuesto;
- no reutilizar el request v6 consumido;
- no modificar `data/store.js`, adaptadores backend protegidos, `core/auth.js`, `core/importa.js` o `firestore.rules`;
- no ejecutar más de un deploy de Hosting LAB;
- no continuar después de cualquier fallo.

## Preparación source-only

1. Resolver el HEAD vigente de la rama canónica.
2. Ejecutar:

```text
node tools/orbit360-validar-gate-contracts-v20260717.mjs block2.7-visual-matrix-corrected-post-auth-lab-v20260805
node tools/orbit360-test-windows-signal-compatibility-synthetic-v20260806.mjs
node tools/orbit360-test-visual-matrix-timeout-signal-safe-portable-v20260806.mjs
node tools/orbit360-test-visual-matrix-cross-runner-portable-v20260806.mjs
```

3. Detenerse si cualquier prueba no obtiene PASS.
4. Crear un request local-runtime nuevo, inmutable, con una ejecución, ligado al HEAD vigente y separado del request consumido.
5. Obtener autorización macro explícita antes de secreto, navegador o Hosting.

## Único bloque runtime autorizado después de GO_GATE_CONTRACT

1. Validar el proyecto de la credencial LAB sin mostrarla.
2. Restaurar `visual-matrix-corrected-backup-31116830824` a `ays-orbit-360-lab:live`.
3. Crear backup nuevo del estado restaurado.
4. Ejecutar máximo un deploy exclusivo de Hosting LAB desde la candidata canónica.
5. Ejecutar precheck Auth, membership, tenant, ruta e hidratación.
6. Solo con precheck PASS ejecutar:
   - Dirección 1440×1000;
   - Operativo 1024×768;
   - Asesor 390×844.
7. Usar runner v3 signal-safe, watchdog por rol/checkpoint y evidencia incremental.
8. Verificar snapshot final idéntico y cero escrituras.
9. Ante fallo, rollback automático exactamente una vez y `STOP_RETRY`.
10. Persistir únicamente evidencia sanitizada en la rama canónica.

## Criterio de PASS

```text
PASS_VISUAL_POST_AUTH
roles: 3/3
snapshotIntegrity: VERIFIED_UNCHANGED
Firestore writes: 0
Auth writes: 0
operational writes: 0
Hosting deploys: 1 máximo
Functions/Rules/production/main/merge: 0
```

## Salida esperada

Codex debe devolver únicamente:

- HEAD ejecutado;
- gate y contrato;
- precheck;
- resultado por rol/viewpoint;
- snapshot final;
- Hosting backup/deploy/rollback;
- cero escrituras;
- evidencia sanitizada;
- decisión PASS o STOP con checkpoint, causa raíz y owner.

No debe solicitar pasos adicionales a Paula.
