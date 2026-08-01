# Claude acumulado — Gate único de escritura de Cobros

Fecha: 2026-08-01  
Clasificación del owner ejecutor: `BACKEND_PROTEGIDO_NO_CLAUDE`  
Clasificación del patrón: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

```text
decisión humana por caso
→ gate único por fases
→ preflight sin capacidad de escritura
→ snapshot obligatorio
→ idempotencia por caso
→ grupo atómico
→ verificación
→ rollback por caso
```

## Reglas reutilizables

- mantener bloqueado el writer genérico para colecciones sensibles;
- usar owner especializado y alcance cerrado;
- no confundir aprobación del caso con autorización de ejecución;
- un solo gate puede avanzar por fases sin crear gates repetidos;
- cada caso tiene snapshot, operaciones y rollback;
- el histórico requiere confirmación separada;
- una obligación histórica exigible no reactiva la póliza;
- cobros y `finmovs` permanecen separados;
- el deploy y producción son fronteras posteriores.

## No transferir a Claude

- referencias opacas reales;
- nombres, pólizas, recibos, montos o fechas;
- ejecutor backend;
- credenciales o secretos;
- snapshots reales;
- tokens de autorización;
- decisiones privadas del tenant.

## UX reusable

Mostrar estados honestos:

```text
Aprobado para preparar
Preparado
Autorizado para LAB
Ejecutando
Verificado
Revertido
Bloqueado
```

La interfaz nunca debe mostrar `Aplicado` hasta que la verificación posterior a la escritura sea satisfactoria.
