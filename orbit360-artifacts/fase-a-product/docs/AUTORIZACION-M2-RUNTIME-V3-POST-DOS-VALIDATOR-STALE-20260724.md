# Autorización M2 runtime v3 — posterior a dos cierres VALIDATOR_STALE

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.1`

## Autorización explícita

Paula autorizó una única ejecución del runtime M2 `2.2.1` sobre `ays-orbit-360-lab`, reutilizando exclusivamente Auth y membership existentes, después del cierre estático de las dos causas `VALIDATOR_STALE`.

## Alcance autorizado

```text
Ejecuciones permitidas: 1
Proyecto existente: ays-orbit-360-lab
Identidad existente: sí
Auth nuevo o modificado: no
Membership nueva o modificada: no
Rules: no
Escrituras de configuración: 0
Escrituras operativas: 0
Hosting/Functions/importaciones: no
Pólizas/M3/merge/main: no
```

## Cierres previos obligatorios

```text
Auth validator stale: CERRADO
MEMBERSHIP validator stale: CERRADO
Membership static preflight: GO_GATE_CONTRACT 32/32
Membership static proof: PASS 24/24
```

## Aceptación única

Solo se acepta evidencia sanitizada `ok:true` con:

```text
controlledExistingIdentityAccepted: true
controlledAuthMarkerAccepted: true
controlledMembershipMarkerAccepted: true
storeInstalled: true
snapshotsAttached: true
noFallback: true
storeWriteEnabled: false
localWriteBlocked: true
rulesChanged: false
configurationWrites: 0
operationalWrites: 0
```

El request v3 será inmutable y ligado al HEAD inmediatamente anterior. El workflow ejecutará el preflight canónico antes de resolver secretos. No existe autorización de reintento automático.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.
