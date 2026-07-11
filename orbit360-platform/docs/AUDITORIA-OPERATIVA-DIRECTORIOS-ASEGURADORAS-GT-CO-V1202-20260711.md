# AUDITORÍA OPERATIVA — DIRECTORIOS DE ASEGURADORAS GT/CO v1.202

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.  
Carriles: C — fuentes reales A&S; B — seguridad/contratos; A — UX/Academia.

## 1. Fuentes reales auditadas

### Guatemala

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
SHA256: 3fa9a19fbb12aff07ae76c3bcc6d3e5298d7faa0862de08c608f1dd235deddbe
```

Estructura:

- 18 hojas totales;
- 14 hojas operativas candidatas de aseguradora;
- 4 hojas de índice, diagnóstico o soporte excluidas;
- 0 bloqueos estructurales de identidad en la primera clasificación;
- 13 recursos de acceso/credenciales detectados;
- 70 recursos bancarios o de pago detectados.

### Colombia

```txt
Directorio - Aseguradoras Colombia 2024.xlsx
SHA256: db441c548fc681e5f4d3a0c4c21a3f63c86e501bdec59e25e0bd0cff673e5a5f
```

Estructura:

- 17 hojas totales;
- 16 hojas candidatas;
- 1 hoja de índice excluida;
- 26 recursos de acceso/credenciales detectados;
- enlaces de pago detectados, sin números bancarios completos clasificados por el parser;
- 4 candidatas bloqueadas para validación.

## 2. Bloqueos Colombia

Los bloqueos se mantienen por hoja y no se resuelven mediante inferencia automática:

1. `Synergias`: clasificada como aliado/red, no aseguradora directa.
2. `Solidaria` y `Solidaria 1.0`: candidatas duplicadas dentro del mismo libro.
3. `Chubb`: el nombre de la hoja no coincide con la identidad encontrada en su contenido.

Estas hojas no se aplican automáticamente. Generan una gestión de validación si se confirma la aplicación de las filas válidas.

## 3. Información sensible

Los libros contienen información operativa sensible. Durante la auditoría se identificó su existencia, pero no se documentan ni suben valores reales.

La regla aplicada es:

```txt
usuario/contraseña detectados
→ usuarioHint enmascarado
→ credentialRef = backend_required
→ valor completo fuera de Orbit.store

cuenta detectada
→ numeroHint enmascarado
→ accountRef = backend_required
→ valor completo fuera de Orbit.store

URL privada o con token
→ dominio/hint sanitizado
→ urlRef = backend_required
```

El payload sensible existe únicamente en memoria durante la sesión de importación. Se elimina al cerrar, cambiar de archivo o aplicar el dry-run. Solo podrá enviarse a un proveedor seguro cuando exista:

```txt
Orbit.secureImport.importInsurerDirectory
```

Sin proveedor conectado, el estado visible es `backend_required`; no se simula conexión.

## 4. Fuente separada y alcance

Tipo canónico:

```txt
directorio_aseguradoras
```

La fuente puede proponer únicamente:

- aseguradoras/aliados clasificados;
- contactos;
- plataformas y accesos por referencia;
- cuentas/enlaces de pago por referencia;
- configuración general;
- actividad y trazabilidad;
- gestiones de validación.

No puede crear o modificar:

```txt
clientes
pólizas
vehículos
recibos/cobros
cartera
comisiones
finmovs
usuarios
roles
permisos
secretos en frontend
```

## 5. Parser especializado

Archivo:

```txt
core/insurer-directory-import-v1202.js
```

Capacidades:

- lectura Excel multihoja;
- país obligatorio GT/CO;
- exclusión de hojas soporte;
- detección de identidad;
- clasificación de aseguradora vs aliado/red;
- mapeo de contactos por área;
- mapeo de plataformas;
- mapeo de bancos/enlaces de pago;
- sanitización de URLs;
- enmascarado de usuarios/cuentas;
- deduplicación país + nombre normalizado;
- comparación con registros existentes;
- crear/actualizar/bloquear;
- trazabilidad archivo/hoja/fila/bloque/país;
- hash del archivo;
- dry-run antes de escribir;
- confirmación reforzada y motivo;
- aplicación únicamente de filas validadas;
- gestión Ops para filas bloqueadas.

## 6. Compatibilidad con dry-run P0

Se reutiliza:

```txt
core/importa-dryrun-p0.js
```

Para evitar que el validador genérico confunda una referencia segura con una credencial cruda, la copia utilizada para validar cambia temporalmente:

```txt
credentialRef → secureAccessRef
accountRef → secureAccountRef
```

La operación real conserva `credentialRef/accountRef = backend_required`.

## 7. Alta manual corregida

Archivo:

```txt
modules/aseguradoras-v1202-import-bridge.js
```

La alta manual anterior podía crear una ficha borrador y asumir Guatemala cuando la vista estaba en “Todos”. El flujo v1.202 exige:

- nombre;
- país explícito;
- motivo;
- deduplicación nombre + país;
- tenant;
- moneda base;
- actor/rol;
- trazabilidad;
- clasificación aseguradora o aliado;
- estado de validación.

No inserta contraseñas ni cuentas completas y abre la ficha principal de Aseguradoras después de crearla.

## 8. UX del importador

El botón `Importar` de Aseguradoras abre el parser especializado y muestra únicamente información sanitizada:

- operaciones;
- crear/actualizar;
- bloqueadas;
- cantidad de contactos;
- cantidad de plataformas;
- cantidad de recursos bancarios/pago;
- cantidad de recursos sensibles detectados;
- avisos por hoja;
- hojas excluidas.

Para escribir se requiere:

```txt
motivo obligatorio
+ frase exacta CONFIRMO DIRECTORIO
+ aplicar solo filas validadas
```

## 9. Pruebas realizadas

Se ejecutó localmente una prueba funcional con matrices ficticias:

```txt
ORBIT360 DIRECTORIOS ASEGURADORAS V1202: OK
```

Cobertura:

- exclusión de hojas soporte;
- extracción de contactos/plataformas/cuentas;
- ausencia de usuario/contraseña/número completo en dry-run y store;
- referencias backend;
- aplicación validada;
- bloqueo de aliado, duplicados e identidad inconsistente;
- Asesor sin permiso de aplicación.

También se ejecutó el parser sobre matrices extraídas de los dos libros reales, sin escribir datos:

```txt
GT: 14 candidatas · 4 excluidas · 0 bloqueadas
CO: 16 candidatas · 1 excluida · 4 bloqueadas
```

La prueba no publicó valores reales ni creó payload en el repositorio.

Se versionaron además:

```txt
tools/orbit360-test-directorio-aseguradoras-v1202.mjs
tools/orbit360-validar-directorio-aseguradoras-v1202.mjs
```

El smoke completo dentro del repositorio local/navegador sigue pendiente.

## 10. Academia

Se agregó:

```txt
data/academia-v1202-directorios-aseguradoras.js
```

Rutas para Dirección, Operativo y Asesor sobre:

- país explícito;
- libro multihoja;
- dry-run;
- duplicados y bloqueos;
- trazabilidad;
- contactos por área;
- plataformas y recursos seguros;
- bancos/pagos;
- relación Aseguradoras → Cotizador → Comparativo;
- límites por rol.

## 11. Pendientes

### Carril B

- bóveda real de credenciales;
- almacenamiento seguro de cuentas;
- reautenticación;
- TTL;
- auditoría durable de acceso/copia;
- Drive/Shared Drives;
- batch/rollback del importador;
- validación server-side tenant/rol/scope.

### Carril C

- ejecutar dry-run visible de GT y CO en la plataforma;
- confirmar mapeos y bloqueos;
- resolver manualmente las 4 candidatas CO;
- decidir cuáles aseguradoras quedan `vinculada=true`;
- completar productos/ramos y fuentes tarifarias por aseguradora;
- relacionar con las pólizas A&S ya procesadas sin inferir pólizas desde el directorio.

### Carril A

- validar responsive del modal de dry-run;
- mejorar estados vacíos;
- completar editor en página;
- eliminar notas técnicas restantes;
- evidencia visual del directorio y ficha con datos sanitizados.

## 12. Estado

```txt
PARSER_MULTIHОJA_GT_CO: IMPLEMENTADO
FUENTE_SEPARADA: IMPLEMENTADA
DRY_RUN_SANITIZADO: IMPLEMENTADO
SECRETOS_EN_STORE: NO
ALTAS_MANUALES_PAIS_EXPLICITO: IMPLEMENTADO
DUPLICADOS_BLOQUEADOS: IMPLEMENTADO
ACADEMIA: ACTUALIZADA
DATOS_REALES_ESCRITOS: NO
DRY_RUN_VISUAL: PENDIENTE
SMOKE_NAVEGADOR: PENDIENTE
DEPLOY: NO
MERGE: NO
```
