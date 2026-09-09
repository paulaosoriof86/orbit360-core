# Gravicentra Insurance — Retiro de ejecutores I4A históricos

Fecha: 2026-09-09
Rama: recovery/fase-a-clean-20260831

Este registro preserva la decisión de gobierno de retirar de `.github/workflows` los ejecutores I4A históricos/paralelos. Su historial de commits y ejecuciones de GitHub permanece como evidencia forense; dejan de ser mecanismos invocables del recovery vigente.

Ejecutor I4A único vigente:
`.github/workflows/gravicentra-recovery-i4a-public-browser.yml`

Los workflows retirados no deben restaurarse para resolver bugs ordinarios. Cualquier prueba necesaria debe integrarse al ejecutor I4A único o a evidencia inmutable, sin crear ramas metodológicas paralelas.

Motivo: eliminar fan-out, doble autoridad, hardcodes, retargets y causal-fix workflows que podían competir por el estado del gate.
