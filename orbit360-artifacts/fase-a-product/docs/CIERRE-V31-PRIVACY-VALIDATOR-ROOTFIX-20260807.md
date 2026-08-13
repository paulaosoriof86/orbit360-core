# V31 — Rootfix del validador privacy-preserving

Causa heredada de v30: el detector textual de private key se autocoincidió con el propio workflow que contenía el sentinel. Clasificación: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`. Producto y datos no participaron.

Rootfix v31: el control ya no busca un sentinel textual. Valida estructuralmente el único PEM permitido con `openssl pkey -pubin`, comprueba SHA-256 exacto y aplica política fail-closed por filenames para `.key`, `*private*.pem`, service-account y credential JSON. El mecanismo fue preprobado fuera del gate con casos permitidos y sintéticos bloqueados.

Además se completó el field mask cifrado para reproducir los criterios de los 10 registros probables: teléfono y fecha de nacimiento viajan exclusivamente dentro del artifact cifrado y nunca en evidencia/versionado.

No hay tercer intento v30. V31 es generación nueva. Sin LAB hasta PASS source. Cero writes, Hosting, browser, reimportación, producción, main o merge.
