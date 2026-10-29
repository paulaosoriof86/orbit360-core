# Evidencia focal B4-003 — no código productivo ni nueva autoridad

El recibo rector de este conjunto es ../I6_5_B4_003_UAT_PARTIAL_CAUSAL_RETURN_20261029.md. El Control Plane sigue gobernando el gate. Ningún archivo de esta carpeta se carga en Hosting o Functions.

Resultados locales en Node 22.16.0: Plantillas original 6/18 PASS y 12 FAIL; parche local 18/18 PASS; diagnóstico de proyección 7/7 PASS. Total sobre parche local más diagnóstico: 25/25. No es CI de esta publicación, Chrome ni aceptación de seguridad.

Reproducción técnica por el ejecutor, no trabajo manual de Paula:

1. Confirmar que orbit360-platform/modules/plantillas.js tiene Git blob 702c90d4c655013fc168430cb44a48aab7bdfcd0. Conservar la copia original y el artifact certificado intactos.
2. Ejecutar tests/plantillas-use-lifecycle.test.cjs con PLANTILLAS_SOURCE apuntando al original. Son esperados 12 fallos discriminantes; no son una batería de CI verde.
3. En una copia temporal de fuente, aplicar plantillas-use-lifecycle.patch antes de ejecutar la prueba. Debe producir blob a7b51d38cb5062485376855541b690e2656dd072. No aplicar sobre el artifact certificado ni sobre producción.
4. Ejecutar el mismo harness sin modificarlo, con PLANTILLAS_SOURCE apuntando al fichero corregido. Resultado esperado: 18/18. Ejecutar además node --check del fichero corregido.
5. Ejecutar tests/insurer-activity-projection-diagnostic.test.cjs. Resultado esperado: 7/7. El excerpt es solo el proyector leído de functions/b4-003-scoped-bootstrap-reader.js, blob 356d36e0679a5e499c05632a981b9ef3f1ffb9ec. La variante propuesta se evalúa en memoria con datos ficticios; no cambia el backend ni acredita la función desplegada.

La integración productiva sigue pendiente y requiere source + composición + guard + build/digest nuevo + Preview + reproof Chrome. No cerrar B4-003 por estas pruebas locales.
