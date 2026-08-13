# Academia — actualización v32

Una llamada llamada `update()` no demuestra una escritura. La seguridad debe identificar la API y la procedencia del objeto: `crypto.Cipher.update()` transforma bytes en memoria, mientras `DocumentReference.update()`, `WriteBatch.update()`, `Transaction.update()` o `BulkWriter.update()` sí pueden mutar Firestore.

Patrón reusable: fixture negativo obligatorio para métodos homónimos no operacionales + fixtures positivos de todas las familias de write + ejecución del detector sobre el archivo real. Si el validador confunde ambas categorías, clasificar `VALIDATOR_STALE`, congelar producto y corregir mecanismo antes de secretos.

La reconciliación retained26 enseña además que datos en `REQUIERE_VALIDACION` no pueden convertirse automáticamente en duplicados: los pares probables requieren revisión humana y toda comparación con datos reales debe emitir solo fingerprints/digests sanitizados.
