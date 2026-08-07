# Academia Orbit 360 — actualización v27 — cobertura full-path

## Lección por rol técnico/administrativo
Un validador puede tener fixtures unitarios correctos y aun fallar en producción del gate si el test no recorre el mismo mecanismo de transporte, encoding y parsing que tomará la decisión.

### Caso reusable v27
El reconciliador histórico necesitaba leer `git cat-file --batch` como bytes. Declarar `encoding:'buffer'` no es una forma válida de pedir Buffer en Node 24. El error no pertenecía al producto ni a los datos; pertenecía al pipeline.

### Regla operativa
Antes de consumir una autorización de gate:
1. ejecutar el camino completo equivalente fuera del gate;
2. incluir transporte/encoding/batch parsing, no solo funciones auxiliares;
3. separar `PIPELINE_MECHANISM_FAILURE` de `DATA_CONTRACT_FAILURE` y de `VALIDATOR_STALE`;
4. no tocar datos para corregir un fallo del validador;
5. ante segundo fallo del mismo stage, STOP_RETRY.

### Seguridad
La prueba equivalente usa repositorio y locator sintéticos. No necesita Firebase, secretos, datos A&S ni navegador.
