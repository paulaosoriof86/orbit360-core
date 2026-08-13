# Claude acumulado — patrón reusable v26

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Dedupe reusable

- Una clave de fuente (`codigo`, `codigoIntermediario` u otra) no es identidad global salvo contrato explícito.
- El merge/exclusión automática debe apoyarse en identidad legal compuesta y contexto suficiente.
- País, tipo de entidad y procedencia forman parte del contexto de identidad.
- Colisiones ambiguas permanecen efectivas como `REQUIERE_VALIDACION`; no se sacrifican para cuadrar conteos.
- Incluso cuando una fuente declara unicidad de código, una colisión con identidades legales contradictorias debe fallar cerrado para revisión, no fusionarse ciegamente.

## Provenance reusable

- Un fingerprint sanitizado es útil para correlación, no necesariamente para localizar el registro original.
- Los artifacts sanitizados deben preservar un mecanismo de join/locator seguro para diagnósticos focales posteriores, sin exponer PII.
- Si el locator no existe, documentar la brecha de observabilidad y evitar una relectura masiva por defecto.

## No transferir

No enviar nombres, correos, documentos, IDs reales, códigos concretos de aseguradoras, fingerprints reales de A&S, secretos, payloads del tenant ni implementación backend protegida.

Los patrones son reutilizables; los resultados concretos son `TENANT_AYS_ONLY`.
