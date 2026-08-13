# Auditoría candidata Claude v1.214 — gate de paquete

Fecha: 2026-07-12  
ZIP: `Prototype Development Request - 2026-07-12T084423.733.zip`  
SHA256: `2ba8c6b03a1b3f5dabbd01f0a311834fe31588f23b539e62cb97fc958289b860`  
Versión interna: `v1.214`  
Baseline comparado: candidata Claude v1.213  
Decisión: `P0 PRESENTES / PAQUETE CRÍTICO PEQUEÑO / NO EMPALME COMPLETO`.

## 1. Integridad y delta físico

```txt
archivos v1.214: 103
añadidos: 1
modificados: 13
eliminados: 0
JS con error de sintaxis: 0
protegidos alterados: 0
```

Archivo añadido:

```txt
docs/MANIFIESTO-ENTREGA-v1214.md
```

Archivos modificados:

```txt
CHANGELOG.md
core/correo.js
index.html
modules/aseguradoras.js
modules/automatizaciones.js
modules/cliente360.js
modules/cobros.js
modules/comparativo.js
modules/correo.js
modules/cotizador.js
modules/notificaciones.js
modules/portal.js
modules/renovaciones.js
```

## 2. Cambios realmente implementados — conservar, no repetir

La candidata sí corrige trabajo importante:

1. elimina tasas y recargos globales `TASAS_DEF`, `RECARGO_FRACC`, 8 % de antigüedad y 5 % de emisión;
2. mueve las tarifas a configuración por aseguradora/ramo;
3. agrega campos de fuente, versión, vigencia, confirmación, estado comercial y trazabilidad al DTO;
4. sustituye el handoff directo por una colección `quoteTransfers` mediante `Orbit.store`;
5. persiste el historial general de comparativos en `comparativos`;
6. elimina la inferencia ejecutable `total / 1.12`;
7. filtra ranking a propuestas validadas con total positivo;
8. crea una solicitud `workflowType: issuance_request` al aceptar;
9. agrega editor de tarifas en Aseguradoras;
10. corrige varias afirmaciones de envío a estados preparados;
11. agrega manifiesto v1.214;
12. mantiene intactos `data/store.js`, `core/auth.js` y `core/importa.js`.

Estos puntos se marcan `SUPERADO_NO_REPETIR`.

## 3. P0 reales — bloquean el empalme completo

### P0-214-01 — cambios de tarifas pueden no guardarse

Archivo: `modules/aseguradoras.js`  
Función: `diffResumen()`.

`cotTasas` y `cotTasasValidadas` no están en la lista de campos comparados. Si el usuario modifica únicamente tarifas, `cambios.length` puede quedar en cero y cerrar la edición sin escribir ni auditar.

Corrección:

- incluir tarifas y validación en el diff;
- registrar antes/después, actor, fecha y motivo;
- no habilitar tarifa solo por marcar un checkbox.

### P0-214-02 — validación tarifaria insuficiente

`puedeValidar` acepta `fuenteDocumentoId OR version`; debe exigir fuente, versión, vigencia, país, moneda, ramo/producto y tramos válidos.

`tieneTasaValidada()` solo usa booleano + filas. Debe verificar metadata y vigencia.

Validar además:

- tasas finitas y positivas;
- rangos ordenados, no superpuestos y utilizables;
- mínimos no negativos;
- confirmación reforzada;
- registro de validación separado del booleano.

### P0-214-03 — gate de propuestas insuficiente

Archivo: `modules/comparativo.js`  
Función: `validarProp()`.

Actualmente cualquier usuario visible puede marcar directamente `validada`; el motivo es opcional y no se comprueban fuente, versión, vigencia, desglose, país/moneda/producto, total positivo, rol o confirmación.

Solo un rol autorizado puede validar y debe exigir:

```txt
fuente/documento o clasificación manual explícita
versión y vigencia cuando aplique
prima neta/gastos/impuesto/total coherentes
país/moneda/producto compatibles
motivo obligatorio
antes/después
actor/rol/fecha
confirmación reforzada
```

### P0-214-04 — manual/PDF no son entidades persistidas

Las propuestas manuales y PDF se agregan al array local `props`; pueden perderse antes de guardar el comparativo y llegar a emisión sin `quoteId` canónico.

Corrección:

- persistir cada propuesta en colección canónica mediante `Orbit.store`;
- recuperar por ID;
- PDF debe conservar referencia documental, fuente, versión, vigencia y estado;
- edición debe guardar diff, motivo y actor;
- `estimado propio` nunca puede presentarse como propuesta validada de aseguradora.

### P0-214-05 — aceptación puede vincular el comparativo equivocado

La aceptación usa:

```txt
(S().all('comparativos')[0] || {}).id
```

Esto puede vincular una solicitud de emisión a un comparativo antiguo o ajeno. Además, el comparativo actual se guarda después de crear la solicitud.

Corrección:

1. persistir o actualizar el comparativo actual primero;
2. obtener su ID exacto;
3. crear la solicitud con ese `comparisonId` y el `quoteId` validado;
4. evitar duplicar filas de historial.

### P0-214-06 — afirmaciones de envío restantes

Persisten afirmaciones no confirmadas, entre ellas:

```txt
modules/renovaciones.js — Campaña de renovación enviada
modules/equipo.js — credenciales enviadas
core/correo.js — Correo enviado
modules/cobros.js — recordatorios enviados
```

Abrir o preparar un canal no equivale a entrega confirmada. Usar `preparado`, `pendiente de confirmación` o `entrega confirmada` solo con callback/evidencia.

### P0-214-07 — configuración técnica sin guard de rol

Configuración, Automatizaciones, IA y Correo siguen mostrando APIs, OAuth, scopes, webhooks, API keys, proveedor/modelo y configuración interna sin una separación demostrable por rol/vista.

Corrección:

- UI de negocio para usuario cliente;
- UI técnica solo para rol autorizado;
- nunca capturar/persistir API keys o secretos en el prototipo;
- estados visibles de negocio: pendiente de conexión, conectado, requiere validación.

### P0-214-08 — corrupción visible en Configuración

`modules/configuracion.js` contiene:

```txt
</button></td>itar</button></td>
```

Debe eliminarse y validarse el render de la tabla.

### P0-214-09 — copy técnico y frase corrupta en Aseguradoras

La ficha muestra términos como `motor de fuentes`, capabilities y colección `auditoriaAseguradoras`; la pestaña Actividad contiene una frase dañada.

Debe traducirse a lenguaje operativo y ocultar detalles internos según rol.

### P0-214-10 — registro documental engañoso en Cliente360

`subirDocumento()` permite registrar incluso sin archivo/referencia, guarda solo metadata y anuncia “Documento agregado al expediente”.

Corrección:

- exigir archivo o referencia documental válida;
- si solo hay metadata, mostrar `Referencia registrada / archivo pendiente de resguardo`;
- no afirmar que el documento está almacenado;
- conservar `documentRef`, estado y trazabilidad.

### P0-214-11 — catálogo real hardcodeado en parser genérico

`core/ia.js` contiene una lista fija de aseguradoras reales. El prototipo reusable debe resolver aseguradoras desde `Orbit.store`, configuración tenant y aliases configurables; el fallback debe ser ficticio/genérico o requerir validación.

### P0-214-12 — Academia y manifiesto no reflejan el flujo nuevo

El editor/validación de tarifas cambió, pero el curso profundo no se actualizó.

El manifiesto v1.214:

- no coincide con el delta real;
- omite `modules/aseguradoras.js` y `modules/cliente360.js`;
- afirma que no existe editor de tarifas cuando sí existe;
- README continúa obsoleto.

Actualizar el curso existente, no crear otro. Entregar manifiesto v1.215 exacto y README coherente.

## 4. P1 documentados — no incluir como condición del ciclo crítico

Para agilizar, estos puntos no bloquean v1.215 si los P0 quedan cerrados y se documentan honestamente:

- Replantear profundo con selección manual/restablecer automático;
- visor documental transversal en todos los módulos;
- multirol completo con rol activo/default y scopes;
- ficha-página independiente de Póliza;
- evidencia responsive completa;
- limpieza de manifiestos legacy.

Se conservarán en backlog Claude posterior o se resolverán durante el empalme si son cambios locales seguros.

## 5. Falsos positivos descartados

El validador anterior marcó tres patrones presentes solo en comentarios:

```txt
sessionStorage/localStorage
Orbit._compHist
total / 1.12
```

No son código ejecutable en v1.214. El nuevo validador debe eliminar comentarios antes de inspeccionar patrones.

## 6. Gate aplicado

```txt
P0 reales: sí
paquete Claude: sí, uno pequeño
empalme completo: no
mejoras rescatables: conservar en la misma candidata; Claude corrige sobre v1.214
backend protegido: intacto
carriles B/C: pueden continuar en paralelo sin esperar este ciclo
```

## 7. Evidencia requerida v1.215

Cada P0 debe demostrar:

```txt
archivo
función
antes/después
prueba estática
prueba funcional
resultado
```

No se aceptará “ya estaba hecho” sin evidencia física. Después de v1.215 se aplica de nuevo el gate: si P0=0, no habrá otro paquete; se documentarán P1/P2, se empalmará selectivamente y se continuará operación.