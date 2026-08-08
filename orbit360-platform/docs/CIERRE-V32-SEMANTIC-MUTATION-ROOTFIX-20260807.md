# Cierre v32 — rootfix semántico de mutaciones

Fecha: 2026-08-07. Gate: `block1-client360-insurers-lab-v20260717`. Owner: `1.0.41`.

V30/V31 se detuvieron por falsos positivos del validador: autocoincidencia de sentinel y `crypto.Cipher.update()` confundido con escritura Firestore. V32 sustituye ese mecanismo por análisis de procedencia de objetos: solo referencias Firestore, WriteBatch, Transaction y BulkWriter pueden disparar hallazgo de mutación.

Preprueba externa al gate: 4 negativos permitidos y 7 mutaciones Firestore sintéticas bloqueadas. El exportador retained26 permanece read-only y usa envelope AES-256-GCM + RSA-OAEP-SHA256 con clave pública efímera; la clave privada queda fuera de GitHub/Actions.

Fuente retained26: 26 filas exactas del dry-run original, 16 en 8 grupos exactos y 10 en 5 pares probables. PII cruda no se versiona. Producto/backend protegido/owner/matriz/observer/Auth/store/importadores/Rules permanecen congelados.
