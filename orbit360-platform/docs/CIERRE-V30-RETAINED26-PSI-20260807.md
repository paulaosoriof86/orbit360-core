# V30 — Retained26 privacy-preserving reconciliation

Bloque 1 Cliente 360 + Aseguradoras. Gate `block1-client360-insurers-lab-v20260717`, owner `1.0.41`.

Fuente materialmente nueva: las 26 filas retenidas por el dry-run original, identificadas únicamente por fila y grupo en el reporte sanitizado: 16 registros en 8 grupos exactos y 10 registros en 5 pares probables. La acción contractual fue revisión humana antes de escribir.

Privacidad: las identidades LAB se exportan únicamente en artifact cifrado AES-256-GCM con clave de sobre RSA-OAEP-SHA256. La clave privada no entra a GitHub ni Actions. La fuente real de 26 filas tampoco entra al repositorio. La adjudicación que vuelva al repo contendrá solo fingerprints, clasificación y digests sanitizados.

Si un objetivo coincide con una fila retenida y no existe trazabilidad de validación aprobada, se considera `REQUIERE_VALIDACION` no aprobada; no se borra ni escribe. Si aparece evidencia de alta legítima, el universo efectivo puede superar 414 y debe clasificarse `VALIDATOR_STALE`, nunca forzar el contrato.

Producto, backend protegido, Auth, store, importadores, Rules, PWA/SW, matriz y observer permanecen congelados. Cero writes, Hosting, browser, producción, main o merge.
