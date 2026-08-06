# Academia — identidad de un request de gate

## Diferencia esencial

La historia de una ruta no es la identidad del request vigente. Git puede conservar una solicitud antigua retirada y una nueva autorización en la misma ruta.

La identidad segura se comprueba con:

1. commit actual;
2. padre declarado y padre real;
3. diff exclusivo de un archivo;
4. contrato, entorno y capacidades exactas;
5. consumo y replay controlados.

## Defecto funcional frente a validator obsoleto

- Defecto funcional: la plataforma no cumple el comportamiento esperado.
- `VALIDATOR_STALE`: el instrumento bloquea un estado válido por una regla que no representa el contrato real.

En este caso la plataforma nunca llegó a ejecutarse. Corregir Clientes, Pólizas, Auth o Hosting habría sido una desviación.

## Por rol

- Dirección: reconoce cuándo una autorización no abrió riesgo y debe retirarse antes de crear otra.
- Operativo: distingue un STOP de preflight de un fallo del módulo.
- Asesor: conserva exactamente su scope; el validator no amplía permisos para obtener verde.

## Patrón reusable

`REPLICABLE_CLAUDE_INMEDIATO`: validar requests por commit vigente, padre y diff exclusivo; no por conteo histórico de la ruta.
