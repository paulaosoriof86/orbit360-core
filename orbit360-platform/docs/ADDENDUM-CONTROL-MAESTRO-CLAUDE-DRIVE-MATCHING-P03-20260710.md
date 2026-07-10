# ADDENDUM AL CONTROL MAESTRO CLAUDE — DRIVE MATCHING P0.3

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Estado de envío a Claude: `NO_ENVIADO`  
Estado técnico: `MOTOR_IMPLEMENTADO / SIN_ADAPTER_REAL / SIN_UX_FINAL`.

## 1. Control acumulativo

Este documento actualiza:

```txt
CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md
```

Debe leerse con:

- `IMPLEMENTACION-P03-DRIVE-MATCHING-CARPETAS-ASEGURADORAS-20260710.md`;
- `IMPLEMENTACION-P02-ASEGURADORAS-ACCESOS-CUENTAS-SENSIBLES-20260710.md`;
- addenda multifuentе y P0.2;
- contratos de documentos, Storage futuro e importador transversal.

## 2. Registro

```txt
Fecha: 2026-07-10
Carril: B preparando A y C
Módulo: Aseguradoras / Drive
Necesidad: vincular automáticamente una carpeta padre sin configurar cada aseguradora una por una.
Causa raíz: Drive existe como campo manual, sin matching, dry-run ni trazabilidad.
Patrón reusable: metadata → score → propuesta → validación → vínculo confirmado.
Archivo: core/drive-folder-matcher-p03.js
Smoke: tools/orbit360-test-drive-folder-matcher-p03.mjs
Estado backend: motor puro implementado; adapter y wire pendientes.
Estado UX: pendiente.
Estado Academia: documentado.
Estado enviado a Claude: no enviado.
```

## 3. UX futura obligatoria

Claude deberá diseñar un flujo claro:

```txt
Conectar Drive
→ seleccionar carpeta padre
→ listar carpetas autorizadas
→ ejecutar dry-run
→ revisar coincidencias
→ corregir ambiguas
→ confirmar
→ abrir desde la ficha
```

La interfaz debe separar:

- coincidencia alta;
- requiere validación;
- sin coincidencia;
- carpeta compartida por conflicto;
- vínculo existente;
- actualización propuesta;
- selección manual;
- omitida.

## 4. Estados honestos

```txt
Drive no configurado
Conexión pendiente
Carpeta padre autorizada
Metadata listada
Matching pendiente
Requiere validación
Vínculo confirmado
Error de permisos
Conexión revocada
```

Claude no debe mostrar `Conectado` solo porque exista un campo URL.

## 5. Vista Aseguradoras

La ficha debe permitir:

- ver carpeta confirmada;
- abrirla;
- ver carpeta propuesta;
- consultar score y razones en lenguaje comprensible;
- corregir selección;
- desvincular con motivo;
- volver a ejecutar matching;
- consultar histórico;
- navegar a los archivos inventariados.

El vínculo Drive no sustituye:

```txt
aseguradora.docs[]
inventario multifuentе
versiones
estados de lectura
```

## 6. Dry-run

Claude debe conservar la lógica visual de:

```txt
link_proposed
link_manual_proposed
update_proposed
omit_existing
omit
requires_validation
```

Cada fila debe permitir:

- entidad;
- carpeta candidata;
- país;
- confianza;
- razones;
- advertencias;
- alternativa;
- confirmación.

Las coincidencias altas no se escriben sin confirmación.

## 7. Ambigüedad y conflicto

### Ambigua

Dos carpetas con nombres similares requieren selección humana.

### País

GT y CO no se mezclan por coincidencia de nombre.

### Carpeta compartida

Una misma carpeta propuesta para dos aseguradoras queda bloqueada hasta revisión.

### Reemplazo

Cambiar una carpeta existente requiere motivo, antes/después y auditoría.

## 8. Seguridad

Claude no debe representar ni solicitar:

- access token;
- refresh token;
- client secret;
- credencial Google en formulario común;
- permisos amplios sin explicación.

Debe mostrar únicamente estados operativos y enlaces útiles.

La configuración técnica profunda corresponde a Dirección/IT y no debe aparecer en vistas de Asesor.

## 9. Aplicación posterior a Cliente360

El patrón es reusable para expedientes de clientes, pero no debe mezclarse todavía en la UX de Aseguradoras.

Cuando se aplique a Clientes deberá incluir identificación y deduplicación. Claude no debe asumir que el mismo formulario sirve sin adaptación.

## 10. Academia

### Dirección/Admin/Operativo

- conectar carpeta padre;
- revisar dry-run;
- interpretar confianza;
- resolver ambigüedad;
- confirmar lote;
- cambiar vínculo;
- abrir Drive.

### IT/Seguridad

- principio de mínimo privilegio;
- revocación;
- aislamiento tenant;
- tokens fuera del frontend;
- auditoría;
- error de carpeta compartida.

### Asesor

- abrir expedientes permitidos;
- no cambiar vínculos;
- solicitar corrección si la carpeta es incorrecta.

## 11. Prohibiciones

Claude no debe:

- pedir una URL por cada aseguradora como única solución;
- enlazar automáticamente sin dry-run;
- mezclar países;
- mover o renombrar carpetas;
- duplicar Drive en Storage en la primera fase;
- crear un segundo repositorio de aseguradoras;
- ocultar conflictos;
- exponer IDs/tokens innecesarios;
- tocar backend protegido;
- afirmar conexión real sin callback del proveedor.

## 12. Momento de intervención

Claude todavía no es indispensable.

Listo:

```txt
P0.1b multifuentе
P0.2 sensible
P0.3 motor de matching
```

Falta:

```txt
adapter real Google Drive
wire de confirmación
UX provisional del dry-run
adapter Excel/PDF
extracción/propuesta/diff
```

La futura candidata debe recibir el paquete completo y conservar todos estos contratos.
