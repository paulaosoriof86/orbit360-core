# CORTE FORMAL ANTI-BUCLE — IMPORTADOR Y DIRECTORIO DE ASEGURADORAS

Fecha: 2026-07-21  
Proyecto: Orbit 360 — Alianzas y Soluciones  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## 0. Carácter vinculante

Este documento formaliza el corte solicitado por Paula y prevalece para el incidente del importador/directorio de aseguradoras hasta que exista evidencia sanitizada de recuperación y cierre.

No reemplaza el Documento Maestro, sus addenda ni el Plan Maestro. Aplica sus reglas de causa raíz al incidente actual y evita que vuelva a convertirse en una cadena de parches, gates o reimportaciones.

Estado obligatorio:

```txt
INCIDENTE: CONGELADO PARA DIAGNÓSTICO READ-ONLY
M1 FUNCIONAL: NO SE RECONSTRUYE
CLIENTES/ASEGURADORAS: NO REIMPORTAR
COLOMBIA: BLOQUEADA
PÓLIZAS/COBROS/BLOQUE 2: NO AVANZAR
GATES AUTOMÁTICOS: NO REINTENTAR
PRODUCCIÓN: NO AUTORIZADA
```

## 1. Contexto real que originó el incidente

La información operativa de aseguradoras ya había sido sanitizada e importada previamente. En la plataforma se visualizaban directorio, links seleccionables, teléfonos y otros datos operativos.

El trabajo se reabrió por dos necesidades legítimas:

1. los usuarios autorizados necesitaban visualizar/copiar las contraseñas de portales mediante revelado protegido;
2. los usuarios autorizados necesitaban visualizar/copiar las cuentas bancarias completas mediante revelado protegido.

La ausencia de esos datos en la ficha llevó a solicitar una nueva importación del directorio. Esa reimportación puso en evidencia que el importador no preservaba de forma suficientemente segura y atómica la información existente y las referencias protegidas.

La decisión funcional vigente es:

```txt
Sí deben poder verse contraseñas y cuentas bancarias completas.
Solo pueden verse bajo permiso, revelado protegido, auditoría y acción explícita.
Nunca deben quedar en texto plano dentro de Orbit.store, HTML, logs, artefactos o repositorio.
```

## 2. Checkpoint sano y regresión observada

Checkpoint sano:

```txt
HEAD: 02a5436bc804b3a861f82375b124d05015389b4b
Run: 29797444980
Aseguradoras: 26
Clientes: 414
Asesores: 7
Valores bancarios completos en store: 0
Referencias protegidas válidas: 91
```

HEAD del diagnóstico:

```txt
HEAD: 1284d1ab2bb16bd8eb77e4f39afd83970d68af4b
Run: 29803066010
Aseguradoras: 26
Valores bancarios completos en store: 0
Referencias protegidas válidas: 23
Error: POST_MIGRATION_STATE_INCOMPLETE
```

Clasificación:

```txt
DATA_CONTRACT_FAILURE
PIPELINE_MECHANISM_FAILURE
```

No se clasifica como fallo del Excel, parser, navegador, timeout, Functions o credenciales de sesión.

## 3. Causa raíz que debe resolverse

El flujo vigente puede actualizar el documento operativo de la aseguradora antes de contar con confirmación durable del proveedor protegido y del read-after-write.

Riesgos demostrados:

- reemplazo de arrays completos desde una caché parcial;
- pérdida de referencias protegidas preexistentes;
- escritura asíncrona declarada como éxito antes de confirmación remota;
- `backend_error` no necesariamente convierte el resultado general en `ok:false`;
- validadores que verifican tokens o funciones nominales sin demostrar atomicidad real.

El problema no se resuelve con otra reimportación ni agregando otro token al gate.

## 4. Protocolo automático ante cualquier nuevo fallo

### 4.1 FUNCTIONAL_DEFECT

Acción permitida:

1. identificar un único owner funcional;
2. corregir solo ese owner;
3. ejecutar preflight;
4. ejecutar el mismo gate una sola vez.

Prohibido modificar otro módulo para compensar el defecto.

### 4.2 VALIDATOR_STALE

Acción obligatoria:

```txt
CONGELAR PRODUCTO
NO TOCAR UX
NO TOCAR DATOS
CORREGIR REGISTRO/VALIDADOR/WORKFLOW
EJECUTAR PREFLIGHT
UN SOLO REINTENTO
```

### 4.3 DATA_CONTRACT_FAILURE

Acción obligatoria:

1. inventario read-only;
2. diff contra checkpoint sano;
3. identificar registros exactos afectados;
4. backup/verificación de bóveda;
5. recuperación selectiva;
6. corrección del adapter/coordinador propietario;
7. read-after-write obligatorio.

Prohibido reimportar la colección completa por defecto.

### 4.4 ENVIRONMENT_FAILURE

Corregir solo secret, servicio, dependencia, canal o entorno. No modificar producto, importador ni datos.

### 4.5 PIPELINE_MECHANISM_FAILURE

Sustituir o corregir solo el mecanismo del pipeline. No crear otro workflow de un solo uso y no modificar módulos para obtener verde.

### 4.6 SECURITY_FAILURE

Detener inmediatamente toda ejecución y escritura. No reanudar hasta demostrar cero exposición, aislamiento tenant y permisos mínimos.

## 5. Regla de dos fallos y detención de línea

Si se repite el mismo código de error o falla la misma etapa por segunda vez:

```txt
STOP_THE_LINE
NO TERCER REINTENTO
NO OTRO PARCHE
NO OTRO GATE
NO OTRO MÓDULO
NO REIMPORTACIÓN
ABRIR DIAGNÓSTICO DE CAUSA RAÍZ
```

Para reanudar se exige un reporte que incluya:

- primer check real fallido;
- clasificación;
- owner único;
- dato/entorno tocado;
- evidencia de que no se repite la causa;
- siguiente acción única.

## 6. Alcance bloqueado durante el incidente

No se permite:

- volver a cargar Guatemala;
- cargar Colombia;
- reimportar las 26 aseguradoras;
- reconstruir Cliente 360 o Aseguradoras;
- avanzar a Pólizas o Cobros;
- iniciar Bloque 2;
- modificar Auth, legal, multirol, PWA o navegación;
- desplegar producción;
- crear otro gate paralelo;
- corregir copy, Academia o UX para satisfacer un validador.

## 7. Secuencia exacta de recuperación

### Fase A — diagnóstico read-only

1. inventariar por aseguradora las referencias actuales de `portales` y `cuentas`;
2. comparar contra el checkpoint de 91 referencias;
3. localizar el batch, actor, `updatedAt` y operación que afectó cada registro;
4. confirmar si la bóveda conserva las versiones protegidas;
5. generar diff sanitizado, sin valores completos.

### Fase B — recuperación selectiva

1. backup previo;
2. restaurar únicamente referencias faltantes;
3. no reemplazar documentos completos;
4. conservar contactos, links, teléfonos y demás mejoras operativas válidas;
5. confirmar 26 aseguradoras y cero duplicados.

### Fase C — corrección del owner

El coordinador del importador debe ejecutar:

```txt
dry-run aprobado
→ proveedor protegido confirma y devuelve mappings opacos
→ merge por identidad estable
→ preservar referencias existentes
→ escritura durable esperada
→ read-after-write
→ auditoría
→ éxito visible
```

Cualquier fallo en proveedor, escritura o readback debe resultar en:

```txt
ok:false
sin mensaje de éxito
sin reemplazo parcial
rollback o compensación
```

### Fase D — único gate de cierre

Se ejecuta una vez y debe aprobar:

```txt
clientes = 414
aseguradoras = 26
asesores = 7
valores completos en store = 0
referencias protegidas antes = 91
referencias protegidas después >= 91
referencias inválidas = 0
referencias duplicadas = 0
segunda dry-run = 0
confirmación proveedor = true
escritura durable = true
read-after-write = true
auditoría = true
rollback = true
bloqueados sin modificación = true
revelar/copiar por permiso = true
copy técnico visible = 0
ok = true
```

Después se realiza una sola revisión visual con Paula y se congela definitivamente M1.

## 8. Importador inteligente — contrato obligatorio futuro

El importador de Orbit 360 no es un cargador rígido. Debe:

- aceptar fuentes variables;
- detectar encabezados y sinónimos;
- interpretar bloques y hojas;
- proponer mapeo corregible;
- normalizar y deduplicar;
- completar registros existentes sin borrar información válida;
- separar datos operativos de secretos;
- mostrar dry-run crear/actualizar/omitir/requiere validación;
- conservar trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo;
- exigir confirmación antes de escribir;
- usar escrituras durables y atómicas;
- ofrecer auditoría y rollback;
- no declarar éxito hasta confirmar proveedor y read-after-write.

Principio de merge:

```txt
COMPLEMENTAR, NO REEMPLAZAR
PRESERVAR, NO BORRAR
DEDUPLICAR, NO DUPLICAR
PROPONER, NO INVENTAR
CONFIRMAR, NO ASUMIR
```

## 9. Registro de fixes locales y sincronización Claude

Todo cambio realizado localmente o en LAB debe registrarse antes del cierre con:

```txt
fecha
módulo
necesidad
esperado
causa raíz
archivo/función owner
fix aplicado
prueba/evidencia
impacto generalizable
clasificación Claude
impacto Academia
estado y retiro de temporales
```

Clasificaciones obligatorias:

- `REPLICABLE_CLAUDE_INMEDIATO`;
- `REPLICABLE_CLAUDE_ACUMULADO`;
- `ACADEMIA_ACTUALIZAR`;
- `TENANT_AYS_ONLY`;
- `BACKEND_PROTEGIDO_NO_CLAUDE`;
- `SECRETO_DATO_REAL`;
- `TEMPORAL_RETIRO`.

No se enviarán a Claude secretos, datos reales, Functions, IAM, bóveda ni backend protegido. Sí se enviarán jerarquía visual, estados honestos, responsive, flujos, validaciones UX, merge no destructivo y patrones del importador.

## 10. Regla de salud arquitectónica

No se acepta como cierre:

- patch sobre patch;
- bridges sin owner y fecha de retiro;
- scripts duplicados;
- éxito basado solo en tokens;
- workflows temporales permanentes;
- escritura optimista sin confirmación;
- cache del navegador como fuente durable;
- reimportación como remedio de visualización;
- documentación sin acción operativa.

Cada corrección debe quedar en el propietario canónico. Los temporales deben retirarse en el mismo cierre o quedar registrados con bloque de retiro.

## 11. Condición para levantar el congelamiento

Solo se levanta cuando exista evidencia sanitizada `ok:true` que demuestre simultáneamente:

1. recuperación de referencias protegidas;
2. importador no destructivo y sin falso éxito;
3. visibilidad autorizada de contraseñas y cuentas mediante proveedor protegido;
4. datos operativos previamente importados preservados;
5. cero duplicados y cero reimportación masiva;
6. único gate aprobado;
7. ledger Claude y Academia actualizado;
8. PR, HEAD, documentación y estado del incidente sincronizados.

Hasta entonces, el siguiente estado es exclusivamente:

```txt
DIAGNÓSTICO READ-ONLY DEL INCIDENTE
```
