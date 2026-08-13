# ESTADO VIVO FORENSE — BLOCK 1 — 2026-08-10

Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `block1-client360-insurers-lab-v20260717`
Contrato vivo: `1.0.41`

## Estado

`STOP_RETRY_CONTROL_PLANE`

No existe autorización ni necesidad de abrir v38 runtime.

## Datos

- baseline clientes: 414;
- aseguradoras contrato: 26;
- asesores contrato: 7;
- post-cierre investigados: 16;
- ligados a retained26: 14;
- origen no demostrable: 2;
- universe gate: pendiente.

## IAM

- v34: Logging privado no disponible para cuenta LAB;
- v35: cuenta LAB no puede administrar IAM de Log View;
- v36: Policy Analyzer no disponible para cuenta LAB;
- v37: exactamente un candidato administrativo directo `USER / roles/owner` identificado mediante project IAM policy directa, evidencia sanitizada, cero IAM writes.

## Control-plane

Hallazgo forense: registry canónico principal y entrypoint/perfiles/extensiones no representan una única fuente de verdad. El registry histórico permanece en una versión anterior mientras la ruta viva usa `1.0.41`.

## Próximo bloque

Macrobloque source-only de convergencia:

1. canonicalizar registry Block 1 en 1.0.41;
2. convertir v28–v37 a evidence-only;
3. eliminar hardcode generacional cerrado del entrypoint;
4. derivar lifecycle/engine/estado de un registro único;
5. fixture anti-drift registry ↔ lifecycle ↔ preflight ↔ docs;
6. sincronizar README/PR/bitácora/Claude/Academia.

Solo después se elige una única ruta para los 2 clientes: evidencia externa owner-controlled o decisión de datos humana/controlada.
