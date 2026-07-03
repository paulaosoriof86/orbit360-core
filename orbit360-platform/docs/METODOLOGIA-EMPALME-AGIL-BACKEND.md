# Orbit 360 - Metodologia agil de empalme y backend

Fecha: 2026-07-02
Estado: REGLA OBLIGATORIA DESDE FASE 8.5

## Problema corregido

Se repitio un error ya documentado: usar scripts PowerShell largos con logica compleja para empalmar prototipos. Eso genero fallos de parser y perdida de tiempo. La causa no fue Orbit ni backend, sino no aplicar la metodologia acordada.

## Regla obligatoria

No usar scripts PowerShell largos para empalmar prototipos Claude.

## Metodo correcto

1. Auditar ZIP Claude en sandbox.
2. Separar cambios: prototipo Claude, backend ChatGPT/Codex, tenant A&S, riesgos.
3. Actualizar backlog antes de empalmar.
4. Empalmar por GitHub o por archivos pequenos controlados.
5. Preservar backend LAB, store Firestore, Auth local, reglas y secretos ignorados.
6. PowerShell solo para validaciones cortas: git status, servidor local, smoke y reporte.
7. Nunca pedir a Paula ejecutar bloques largos con funciones complejas.
8. No afirmar que funciona sin validacion real.
9. No deploy, no Hosting, no produccion, no merge sin autorizacion.
10. Si falla una instruccion manual, documentar causa y cambiar metodo.

## Para cada ZIP Claude

- Auditoria de delta.
- Backlog Claude actualizado.
- Backlog backend actualizado.
- Mejoras ya resueltas marcadas.
- Pendientes abiertos marcados.
- Errores que no deben volver documentados.
- Empalme selectivo y validado.

## Separacion

Claude: UX, prototipo, modulos, pantallas, flujos, textos, manuales, academia, marketing, portal, configuracion visual y demo ficticia.

ChatGPT/Codex: backend, Firestore, Auth, tenant A&S, integraciones reales, scripts de validacion minimos, GitHub, sincronias y documentacion tecnica.
