# Claude acumulado — Create-only, idempotencia y rollback compensatorio

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Para migraciones entre una fuente operativa y un read model multi-tenant:

1. declarar fuente y destino por contrato;
2. generar dry-run con acciones `CREATE`, `UPDATE`, `OMIT` y `HOLD`;
3. sellar snapshot de fuente, snapshot de destino y conjunto del plan;
4. permitir escritura únicamente si los tres digests coinciden;
5. usar precondición `create` para documentos nuevos;
6. dividir el trabajo en lotes por debajo del límite técnico;
7. mantener una lista de documentos creados para rollback compensatorio;
8. verificar conteos, IDs, contenido y fuente después de escribir;
9. consumir la autorización y bloquear replay por deriva del snapshot;
10. ejecutar revalidación read-only antes de cambiar el frontend.

## Reglas de seguridad

- un documento `OMIT` no se vuelve a escribir;
- un documento `HOLD` no se fuerza ni se elimina;
- un seed no se borra sin autorización específica;
- una referencia no resoluble no se inventa;
- una escritura no equivale a aprobación visual;
- el rollback solo puede retirar documentos creados por la ejecución;
- un error del validador se corrige antes de modificar datos.

## Forma de evidencia

La evidencia reusable debe contener:

```text
conteos por acción y colección
digests antes y después
número de lotes
writes ejecutados
post-verificación
rollback ejecutado o no
límites negativos preservados
```

Debe excluir IDs, nombres, números de póliza, importes, credenciales y datos del tenant.

## No transferible a Claude

- datos reales de A&S;
- IDs o digests que permitan reconstruir registros;
- credenciales o configuración de LAB;
- adaptadores Firestore protegidos;
- rutas o contratos backend específicos del tenant;
- evidencia privada de snapshot.

## Impacto en Academia

Enseñar por separado:

- autoridad operativa frente a destino canónico;
- idempotencia frente a reintento;
- create-only frente a upsert;
- HOLD frente a defecto;
- rollback compensatorio frente a atomicidad total;
- éxito de datos frente a aprobación visual.
