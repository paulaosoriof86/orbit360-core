# Contrato Backend LAB - No mezclar visual cliente con backend

## Puertos
- `5178/index.html?preview=visualClienteSinBackendLab`: revisión visual del prototipo/cliente.
- `5177/index-dev-firestore.html?backend=firestoreLab&tenant=alianzas-soluciones`: laboratorio técnico Firestore.

## Reglas
1. No usar 5177 para juzgar UX final del cliente.
2. No usar 5178 para afirmar que backend Firestore está conectado.
3. No hacer deploy sin autorización expresa.
4. No usar datos reales en LAB.
5. No reemplazar `data/store.js` productivo/local si ya tiene avances backend sin diff y decisión explícita.
6. No tocar módulos para conectar backend; el contrato es `Orbit.store`.
