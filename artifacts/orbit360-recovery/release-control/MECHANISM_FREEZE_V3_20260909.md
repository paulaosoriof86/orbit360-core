# Gravicentra Insurance — Freeze del mecanismo de recovery/release V3

Fecha de congelación: 2026-09-09  
Rama rectora: `recovery/fase-a-clean-20260831`  
Mecanismo: `GRAVICENTRA_RECOVERY_MECHANISM_V3_20260909`  
Estado: `FROZEN`

## 1. Alcance

Este documento congela el mecanismo operativo de recovery/release. No crea una iteración nueva, no sustituye las Fuentes Evergreen V3 y no modifica el Plan I0–I6.

La autoridad mutable única sigue siendo `CONTROL_PLANE.json`. El lineage aprobado sigue congelado en `CAPABILITY_LINEAGE_LOCK.json`. El estado por capability se materializa en `CAPABILITY_STATUS_LEDGER.json` y no puede gobernar por sí solo gate ni release identity.

## 2. Regla de no-retroceso

I2 e I3 solo pueden reactivarse después de I3 cuando exista un cambio real de source de producto, derivado de una causa reproducible y registrada físicamente.

No autorizan retorno a I2/I3:
- un fallo del executor o de GitHub Actions;
- un fallo de QA que no demuestre que el source debe cambiar;
- drift o actualización documental;
- problemas de IAM, cuotas o infraestructura que no requieran source nuevo;
- una interpretación de chat;
- la aparición de nueva evidencia sobre una capability que no exija modificar source.

Si existe cambio causal de source, el retorno obligatorio es I2 -> I3 -> nuevo Preview -> I4A. Eso es recertificación del nuevo candidato, no reapertura de I1 ni reinicio del recovery.

## 3. Regla de preservación

Las capacidades no afectadas no se reabren ni se vuelven a descubrir. Su lineage y evidencia aprobada se preservan. Un fallo se resuelve dentro del gate activo salvo que quede probado físicamente que requiere source nuevo.

No se crean iteraciones, ramas de metodología o planes paralelos por bug.

## 4. Ejecución y autoridad

Los executors de gate consumen únicamente `CONTROL_PLANE.json`. I2 e I3 se activan por intents exactos, no autoritativos y ligados a source/tree; I4A se activa por intent exacto ligado a source/build/Preview certificados.

Los checkouts de control usan ancestry completa. I3 usa `nextCandidate` durante una recertificación de sucesor y nunca reconstruye por error el `certifiedCandidate` anterior.

El guard central vigila workflows `gravicentra-*`, tools `gravicentra-*`, `release-control/**` y las Fuentes Evergreen V3. El QA harness no puede autoparchearse durante el run.

## 5. Evidencia física de congelación

El mecanismo quedó probado con:
- I2 sucesor run `34420740707`: SUCCESS.
- Guard central run `34423252383`: SUCCESS.
- I3 sucesor run `34423252469`: SUCCESS.
- Source I3: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- Build: `gi-i3-1e6a6ca3d259-57f234755dc1`.
- Preview: `https://ays-orbit-360-lab--gi-i3-34423252469-ybf4i1dw.web.app`.
- Readback exacto: 202/202 archivos.
- Artifact: `10131707259`.
- Producción tocada: false.
- Datos tocados: false.
- Writes operativos: 0.

## 6. Enforcement

El mecanismo congelado se protege por las condiciones ya ejecutables de `tools/gravicentra-control-plane-guard-v2.mjs` y `tools/gravicentra-mechanism-invariant-v1.mjs`:
- I2/I3 requieren `nextCandidate` físico;
- ese source debe ser distinto del `certifiedCandidate` vigente;
- SHA y tree deben existir y coincidir;
- el source debe ser ancestro del HEAD de control;
- los executors consumen intents exactos y no autoritativos;
- el guard central falla cerrado ante drift de autoridad, hardcodes, split authorities, self-patch o executors paralelos.

La causa funcional que justifique un source nuevo debe quedar registrada como evidencia antes de activar esa transición. Un fallo de executor no modifica el source y, por tanto, no habilita por sí mismo otro ciclo I2/I3.

## 7. Fuentes del Proyecto

Este freeze no requiere reemplazar las seis Fuentes Evergreen V3 porque hace explícita y operativa una regla que ya contienen: un cambio de source posterior a I3 obliga recertificación I2/I3 y los fallos permanecen dentro del gate activo.

Por ello `projectSources.staticSourceUpdateRequired=false`.

## 8. Estado al congelar

I0 PASS. I1 PASS. I2 PASS para el source sucesor. I3 PASS para el mismo source. El gate activo retorna a I4A.

El porcentaje certificado hacia producción permanece 57.1% hasta que I4A completo cierre PASS.
