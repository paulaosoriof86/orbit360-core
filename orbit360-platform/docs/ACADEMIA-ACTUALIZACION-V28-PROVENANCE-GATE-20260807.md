# Academia Orbit 360 — actualización v28

## Patrón aprendido
Cuando una evidencia sanitizada conserva un fingerprint unidireccional pero no un locator, ampliar indefinidamente búsquedas documentales no agrega certeza. Tras agotar source-safe, la validación correcta es focal: localizar por ID/reference sin payload, comparar hashes en memoria y leer payload técnico únicamente de los matches.

## Gate y causa raíz
Un `VALIDATOR_STALE` del lifecycle/control-plane no debe resolverse relajando el gate ni cambiando el contrato de datos. Debe registrarse un perfil phase-aware nuevo del mismo owner, con capacidades exactas para la fase autorizada y gate-contract observable antes de secretos.

## Seguridad por diseño
La fase v28 separa: localización ID-only; lectura focal de campos técnicos; clasificación sanitizada; y universe gate condicionado. Un fallo de procedencia detiene la ejecución antes del universe gate. Browser y Hosting permanecen contractualmente deshabilitados.

## Multirol e importadores
La procedencia de clientes se decide por trazabilidad técnica y temporal, no por inferencias desde Pólizas, Cobros o histórico financiero. Los importadores deben conservar batch/source/auditoría suficiente para que una reconciliación futura no dependa de heurísticas.

## Diferencia de defectos
- `VALIDATOR_STALE`: contrato de validación/control-plane no representa la fase autorizada.
- `DATA_CONTRACT_FAILURE`: los datos carecen de procedencia objetiva o contradicen el contrato.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de ejecución falla antes de poder adjudicar datos.

La decisión debe conservarse en evidencia sanitizada y consumir la autorización one-shot incluso ante STOP.
