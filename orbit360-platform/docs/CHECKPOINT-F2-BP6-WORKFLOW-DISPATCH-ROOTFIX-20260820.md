# Checkpoint F2 BP6 — handoff workflow_dispatch

Fecha: 2026-08-20
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Clasificación: `PIPELINE_MECHANISM_FAILURE`.

## Evidencia causal
La autorización F2 quedó persistida y el request V2 se materializó correctamente, pero no apareció un run runtime asociado al commit del request. El runtime workflow ya escuchaba el path V2 correcto. La causa raíz fue el mecanismo de encadenamiento: el request fue publicado desde un workflow mediante `GITHUB_TOKEN`, y ese push no debe utilizarse como disparador implícito de otro workflow.

## Root-fix reusable
El control plane despacha explícitamente el workflow runtime mediante `workflow_dispatch`, con `request_path` y `authorization_identity` ligados al boundary vigente. El runtime acepta ese evento solo si el request existente permanece activo, no consumido, no histórico y sin replay; el parent del request debe seguir siendo ancestro del HEAD actual.

`tools/orbit360-validar-f2-control-plane-reachability-v20260820.mjs` exige desde ahora que el handoff explícito exista antes de considerar alcanzable `F2-RUNTIME-PREFLIGHT`.

## Seguridad
Este root-fix no crea Request15, no sustituye el request activo, no reautoriza, no consume la autorización por sí mismo y no habilita writes/deploy/publicación/producción/main/merge. El runtime conserva el gate canónico antes de artifact/provider/secrets/Firestore/browser.

## Siguiente acción exacta
Publicar el root-fix source-only con CAS sobre el HEAD vivo. El push humano/conector del commit activa el control plane; en BP6 este debe despachar el runtime existente por `workflow_dispatch`. Luego se observa evidencia terminal y se reconcilia BP8.
