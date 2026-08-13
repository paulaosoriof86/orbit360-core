# Claude acumulado — private package permission drift

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` para el patrón de control, no para datos, hashes, identidades ni backend A&S.

Patrón reusable:
- paquete privado fuera del repositorio;
- identidad física/lógica sellada;
- acceso mínimo a una identidad técnica;
- 404 puede significar pérdida de visibilidad y no inexistencia;
- comparar metadata/permissions con un canal probado antes de recrear datos;
- reparar únicamente `reader` al principal exacto;
- verificar no acceso público;
- no reutilizar request consumido;
- nueva ejecución solo con autorización nueva y gate previo a secretos.

No compartir: file IDs reales, hashes, service accounts, datos operativos, números de póliza, importes, credenciales ni implementación del writer protegido.
