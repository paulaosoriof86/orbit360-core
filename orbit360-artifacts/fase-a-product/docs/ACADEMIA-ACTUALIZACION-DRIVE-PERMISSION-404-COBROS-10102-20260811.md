# Academia — paquete privado, permiso técnico y 404 — 2026-08-11

Caso reusable: un archivo privado puede existir y conservar su identidad, pero devolver 404 al backend si la identidad técnica perdió permiso de lectura. No debe clasificarse como dato ausente ni corregirse recreando el paquete.

Secuencia correcta:
1. `GO_GATE_CONTRACT` antes de secretos;
2. distinguir OAuth exitoso de visibilidad efectiva del archivo;
3. verificar el archivo desde la autoridad Drive sin exponer su contenido;
4. comparar permisos con un canal privado previamente probado;
5. reparar solo el permiso mínimo `reader` de la identidad técnica exacta;
6. verificar no acceso público y no cambio de bytes;
7. consumir el request fallido y no hacer replay;
8. pedir autorización nueva para una ejecución post-rootcause.

Clasificaciones del caso:
- fallo operativo: `ENVIRONMENT_FAILURE / PRIVATE_PACKAGE_LAB_READER_PERMISSION`;
- clasificación incorrecta del fallback de evidencia: `VALIDATOR_STALE`;
- producto Cobros: no defectuoso por este incidente.
