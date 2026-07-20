# Corrección de continuidad · Recursos protegidos de Aseguradoras

Fecha: 2026-07-20
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Bloque: 1 · Cliente 360 + Aseguradoras

## Estado corregido

El proyecto LAB, Auth, canal Hosting preview y configuración de acceso técnico ya existían y estaban operativos. No corresponde reconstruirlos ni volver a solicitarlos.

La URL vigente es el preview LAB. El PR continúa sin merge, `main` ni go-live productivo.

## Desvío retirado

Se retiró selectivamente una ruta paralela de infraestructura que no pertenecía al bloque activo. La comparación contra el baseline previo confirmó cero diferencias netas en los archivos afectados. No se publicó infraestructura nueva ni se alteraron los datos LAB.

## Evidencia de la fuente

Los directorios GT y CO contienen recursos operativos protegidos. El dry-run canónico decidió excluir sus valores de la carga inicial y convertirlos posteriormente en referencias seguras.

## Evidencia LAB sanitizada

Inventario de solo lectura, run `29724137323`:

- Aseguradoras: 26.
- Portales: 77.
- Recursos directos completos: 0.
- Recursos directos parciales: 0.
- Referencias seguras reales: 0.
- Referencias pendientes: 0.
- Portales utilizables por el owner existente: 0.

La evidencia no recuperó ni publicó valores, nombres, enlaces o identificadores.

## Clasificación correcta

`DATA_CONTRACT_FAILURE`

La carga inicial conservó el directorio operativo, pero omitió el lote separado de recursos protegidos. No es una falta de Firebase, Hosting, Auth ni del canal LAB. Tampoco justifica reimportar las 26 Aseguradoras o volver a pedir los directorios.

## Owner existente preservado

Se mantienen los contratos y vistas ya implementados para:

- revelado temporal;
- copia controlada;
- permisos Dirección/Admin/Operativo;
- denegación para Asesor;
- auditoría sin valores;
- referencias opacas.

No se crea otro owner ni otra vista paralela.

## Siguiente acción exacta

1. localizar el binding seguro ya configurado para recursos protegidos;
2. tratar el lote como fuente separada `accesos_aseguradoras`, no como reimportación del directorio;
3. producir dry-run sanitizado por país, aseguradora y portal;
4. generar referencias opacas solo después de confirmación del proveedor existente;
5. actualizar únicamente referencia, estado y trazabilidad;
6. validar Dirección desktop, Operativo tablet y denegación Asesor móvil;
7. ejecutar una sola vez el gate M1 únicamente si cambia el runtime evaluado.

## Carriles

- A: owner visual existente; pendiente validación con referencias reales.
- B: localizar y enlazar el proveedor existente; no crear infraestructura paralela.
- C: migración separada desde los directorios GT/CO, con trazabilidad y sin exposición.

## Clasificación para continuidad

- `REPLICABLE_CLAUDE_ACUMULADO`: estados, permisos y experiencia de uso.
- `BACKEND_PROTEGIDO_NO_CLAUDE`: binding y resolución de referencias.
- `SECRETO_DATO_REAL`: valores y filas de la fuente.
