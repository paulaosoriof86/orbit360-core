# Hotfix de resolución de credencial — carga A&S LAB

Fecha: 2026-07-14  
Carril: C — carga controlada de Clientes y Aseguradoras  
Estado: documentado; sin escritura en el intento fallido

## Síntoma

El ejecutor mostró:

```txt
Se encontraron varias credenciales candidatas:
 - System.Collections.Hashtable
```

y bloqueó antes de leer o escribir Firebase.

## Causa raíz

PowerShell no distingue mayúsculas/minúsculas en nombres de variables. El script usó `$matches` como colección y, dentro del mismo bloque, la variable automática `$Matches` generada por el operador `-match`. Ambas referencias apuntaron a la misma variable y la colección quedó reemplazada por un hashtable.

## Impacto

- No se alcanzó la lectura previa.
- No se creó backup remoto.
- No hubo dry-run contra Firebase.
- No se escribieron Clientes ni Aseguradoras.
- No hubo producción ni deploy.

## Corrección

El flujo de reanudación:

1. resuelve `projectId` desde la configuración LAB local sin imprimirla;
2. busca únicamente JSON de tipo `service_account` cuyo `project_id` coincida;
3. deduplica copias por SHA-256;
4. elige automáticamente la candidata de mayor prioridad local;
5. define `GOOGLE_APPLICATION_CREDENTIALS` solo en el proceso actual;
6. ejecuta una copia temporal del cargador con `git worktree prune` omitido para evitar el bloqueo de metadatos obsoletos de Windows/OneDrive;
7. conserva backup, dry-run, diff, escritura LAB autorizada, verificación y rollback.

## Restricciones preservadas

```txt
Tenant: alianzas-soluciones
Solo Clientes + Aseguradoras
No producción
No deploy
No Pólizas
No Cobros
No finmovs
No secretos en repo o reportes
```

## Aplicación a patrones reutilizables

- No usar nombres de variables que colisionen con variables automáticas de PowerShell.
- Resolver credenciales por tipo, proyecto y hash, no por nombre de archivo.
- Nunca imprimir contenido de credenciales.
- El dry-run debe terminar antes de habilitar cualquier escritura.
