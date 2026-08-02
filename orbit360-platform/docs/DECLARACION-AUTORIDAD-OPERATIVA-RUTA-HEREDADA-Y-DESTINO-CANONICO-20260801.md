# Declaración de autoridad operativa y destino canónico

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`

## Decisión documental autorizada

Para las colecciones `clientes`, `aseguradoras`, `polizas`, `vehiculos`, `recibosEsperados`, `carteraPrimas` y `cobros` se declara:

- Ruta heredada `tenantId/{tenantId}/{collection}`: **fuente operativa autoritativa vigente**.
- Ruta canónica `tenants/{tenantId}/data/{collection}/items`: **destino multi-tenant y read model futuro**, sujeto a reconciliación y migración controlada.

Esta declaración no modifica Firestore, no cambia el frontend, no retira seeds y no autoriza migración real.

## Evidencia que sustenta la decisión

- Gate 7.2 confirmó 4,837 documentos en la ruta heredada, 445 en la canónica, 440 IDs compartidos, 5 solo-canónicos y 4,397 solo-heredados.
- Gate 7.3 confirmó que los 440 documentos compartidos son equivalentes en proyección de negocio, sin conflictos críticos.
- Los cinco documentos solo-canónicos fueron clasificados como `SEED_BOOTSTRAP_NON_OPERATIONAL`.
- Los dieciséis Clientes y cuatro Aseguradoras adicionales de la ruta heredada tienen procedencia y permanecen en `REQUIRES_VALIDATION`.
- La ruta heredada contiene el universo operativo de Pólizas, Vehículos, Recibos, Cartera y Cobros.

## Condiciones obligatorias del dry-run

1. Calcular `CREATE`, `UPDATE`, `OMIT` y `HOLD` por colección.
2. Preservar los veinte registros adicionales en `REQUIERE_VALIDACION`.
3. Proponer cuarentena para los cinco seeds canónicos, sin borrado.
4. Normalizar únicamente referencias de import batch respaldadas por evidencia; toda referencia no resuelta queda en HOLD.
5. Verificar relaciones entre Clientes, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera y Cobros.
6. Emitir digests reproducibles sin IDs, PII, números de póliza ni valores de negocio.
7. Conservar la candidata visual acumulativa completa de 308 archivos.

## Límites

```text
Firestore writes: 0
operational writes: 0
reimportación: no
frontend: sin adaptación
navegador: no
preview: no
deploy: no
Rules: no
Functions: no
producción: no
main/merge: no
```

La migración real requerirá autorización independiente, snapshot, idempotencia, operación atómica por alcance aprobado, post-verificación y rollback exacto.
