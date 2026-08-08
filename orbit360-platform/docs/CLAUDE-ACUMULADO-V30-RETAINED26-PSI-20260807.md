# Claude acumulado v30

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: reconciliación privacy-preserving con envelope encryption. Runtime extrae campos mínimos, cifra con clave pública efímera y publica un artifact cifrado; la clave privada vive fuera del repositorio. El resultado de adjudicación vuelve solo como fingerprints/clasificaciones sanitizadas. Un gate posterior consume ese manifest y calcula universo efectivo sin tocar datos.

No enviar datos reales, claves privadas, credenciales, backend protegido ni archivos fuente A&S.
