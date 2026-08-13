# Academia — doble ruta de datos y continuidad visual acumulativa

Fecha: 2026-08-01

## Qué ocurrió

Orbit 360 tenía dos rutas físicas de datos activas:

```text
canónica: tenants/{tenantId}/data/{collection}/items
heredada: tenantId/{tenantId}/{collection}
```

El producto visual consultaba la ruta canónica, mientras varios conteos operativos y writers controlados anteriores verificaban la ruta heredada. Comparar ambas como si fueran el mismo universo produjo una falsa expectativa visual.

## Diferencia entre defecto funcional y contrato de datos

Un defecto funcional ocurre cuando la interfaz recibe los datos correctos y los muestra o procesa mal.

Un `DATA_CONTRACT_FAILURE` ocurre cuando la interfaz y los procesos de backend no están leyendo el mismo contrato físico o lógico. En este caso no correspondía corregir la tabla, el buscador o el CSS: primero debía reconciliarse la procedencia de los datos.

## Evidencia del gate

```text
ruta canónica: 445 documentos
ruta heredada: 4,837 documentos
IDs compartidos: 440
IDs compartidos con contenido igual: 0
solo canónica: 5
solo heredada: 4,397
```

La evidencia no declara automáticamente cuál ruta es autoritativa. Esa decisión requiere revisar trazabilidad y finalidad por colección.

## Regla para importadores y migraciones

Nunca se debe resolver una doble ruta mediante una reimportación automática. Primero se comparan:

- conteos;
- IDs;
- digests de contenido;
- esquemas;
- trazabilidad;
- registros exclusivos de cada ruta;
- transformaciones esperadas frente a conflictos reales.

Solo después se prepara un dry-run de migración o adaptación, con diff y autorización separada.

## Continuidad visual acumulativa

Una revisión visual no puede usar una página reducida que contenga únicamente el módulo que se está probando. La candidata debe conservar:

```text
última baseline auditada y aceptada
+ cambios incrementales del HEAD vigente
+ todos los módulos rastreados
+ mejor versión acreditada de cada módulo
```

El manifiesto sellado contiene 308 archivos:

```text
index.html: 1
modules/: 62
core/: 182
styles/: 10
data/: 53
```

Una candidata posterior debe usar el mismo manifiesto o un descendiente auditado. Cada retiro, sustitución o cambio de versión debe explicarse y demostrar que no introduce regresión.

## Aplicación por rol

**Dirección:** debe visualizar la solución completa y acumulativa, no módulos aislados sin contexto.

**Operativo:** debe distinguir un error de acceso o proyección de una ausencia real de datos.

**Asesor:** debe reportar una Póliza o Cliente faltante mediante una gestión de corrección; no debe crear duplicados para compensar una ruta incompleta.

**Equipo técnico:** debe ejecutar primero el gate canónico, detener reintentos tras dos fallos en la misma etapa y documentar la causa raíz antes de cambiar producto o datos.

## Estado de aprobación

La reconciliación técnica no aprueba visualmente Pólizas, Vehículos, Recibos ni Cartera. La aprobación humana continúa pendiente.
