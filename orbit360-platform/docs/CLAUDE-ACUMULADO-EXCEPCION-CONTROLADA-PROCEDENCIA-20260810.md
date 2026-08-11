# CLAUDE ACUMULADO — EXCEPCIÓN CONTROLADA DE PROCEDENCIA

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`
Fecha: 2026-08-10

Patrón reusable:

- una incertidumbre de procedencia acotada no debe bloquear un release completo si no existe evidencia de corrupción funcional y puede aislarse como deuda de calidad;
- la excepción no modifica datos ni conteos contractuales para forzar PASS;
- el registro permanece visible y con sus relaciones intactas;
- antes del release se ejecuta únicamente una comprobación read-only de existencia e impacto relacional;
- la deuda de procedencia queda registrada con owner y resolución post-go-live;
- un validator debe probarse contra el schema real producido por el writer, no contra nombres de campos inventados por el propio validator.

No replicar fingerprints, datos A&S, credenciales, nombres, correos, IDs, tenant específico ni backend protegido.
