# Reauditoría corregida — candidata Claude 2026-07-08T183042.881

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo de reauditoría

Paula pidió revisar de nuevo porque las candidatas Claude deben ser incrementales y no deberían traer regresiones. La auditoría anterior mezcló tres conceptos que deben separarse:

```txt
1. Regresión real contra la candidata anterior.
2. Pendiente no resuelto frente al paquete pedido a Claude.
3. No incorporación de hotfixes ChatGPT/Codex creados después de la candidata previa.
```

Esta reauditoría corrige esa separación.

## Archivos comparados

Nueva candidata:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
Entradas: 98
```

Candidata anterior auditada:

```txt
Prototype Development Request - 2026-07-08T135740.684.zip
SHA256: 97e968810029181dc10747a13d7c4f343f058b6ed9b4400af6d11f68dee6836c
Entradas: 98
```

## Resultado técnico

```txt
Archivos agregados: 0
Archivos eliminados: 0
Archivos modificados: 7
JS/MJS revisados con node --check: 56
Errores de sintaxis: 0
```

Archivos modificados:

```txt
docs/BITACORA-CAMBIOS.md
docs/REPORTE-SMOKE.md
index.html
modules/cliente360.js
modules/cobros.js
modules/configuracion.js
modules/portal.js
```

## Conclusión corregida

La candidata **no parece traer regresiones grandes contra la candidata inmediatamente anterior**. Sí trae avances incrementales en algunos frentes.

Pero **no cierra todo lo pendiente** y **no incorpora plenamente los hotfixes ChatGPT/Codex posteriores**.

Por eso la decisión correcta no es llamarla “regresiva” en bloque, sino:

```txt
Candidata incremental con avances parciales.
No empalmable completa todavía.
Rescatable por fragmentos.
Debe pasar por plan de empalme controlado para no perder hotfixes P0.
```

## Separación por tipo de hallazgo

| Hallazgo | Clasificación corregida | Acción |
|---|---|---|
| index.html solo cache-bust | Riesgo de empalme, no regresión funcional | No reemplazar index; aplicar cache-bust controlado si se empalman módulos. |
| Cliente360 agrega acciones por rol | Avance incremental | Rescatar UX, pero adaptar a contrato Documentos/Parches/Roles. |
| Cliente360 aplica diff al aprobar | Diseño insuficiente frente a contrato posterior, no necesariamente regresión contra candidata anterior | Separar aprobar/aplicar o aplicar con gate reforzado/auditoría. |
| Cobros elimina factData funcional | Avance incremental | Mantener. |
| Cobros conserva comentario readAsDataURL/base64 | Falso positivo técnico para runtime, pero rompe validadores estrictos | Eliminar comentario en hotfix controlado. |
| Cobros factura => conciliado=true | Pendiente preexistente / diseño insuficiente | Corregir porque metadata-only no debe conciliar automáticamente. |
| Portal crea documento metaOnly vinculado | Avance incremental | Rescatar y completar campos/auditoría. |
| Config pasa de key a credentialRef | Avance incremental | Mantener. |
| Config conserva id ci-key/copy API key-token-backend | Incompleto frente a política no secretos/no copy técnico | Corregir copy/ID; no guardar secretos. |
| Academia no cambia | No es regresión; pendiente no atendido | Requiere bloque Academia profunda. |
| Cotizador/Comparativo no cambian | No es regresión; pendiente de smoke/auditoría | Auditar/smokear, no reescribir si está estable. |
| M5/Equipo no cambian | No es regresión; no incorporan hotfix P0 | Mantener hotfixes ChatGPT/Codex. |

## Revisión módulo por módulo

### Cliente360

Estado corregido: **avance parcial, no regresión global**.

Avances:

```txt
- agrega UI de propuestas/diffs;
- agrega Aprobar/Rechazar/Solicitar aclaración;
- exige motivo;
- limita botones por rol;
- crea historialInterno.
```

Pendientes/riesgos:

```txt
- estado de búsqueda sigue `pendiente`; contrato nuevo usa `pendiente_revision`;
- solicitar aclaración usa `aclaracion_solicitada`, contrato usa `requiere_aclaracion`;
- aprobar aplica diff directo al cliente;
- no registra auditoría unificada;
- no valida país/moneda cuando el parche afecte póliza/cobro;
- no usa confirmación reforzada APLICAR para cambios finales.
```

Decisión:

```txt
Rescatar UX, pero no empalmar tal cual. Adaptar al contrato backend Cliente360 Documentos/Parches/Roles v1330.
```

### Cobros

Estado corregido: **avance parcial con un bug/pending relevante**.

Avances:

```txt
- factData funcional eliminado;
- no lee binario de factura;
- agrega motivo de confirmación;
- agrega país/moneda GT=GTQ y CO=COP;
- facturaMetaOnly:true.
```

Pendientes/riesgos:

```txt
- comentario contiene readAsDataURL/base64: no afecta runtime, pero falla validadores estrictos;
- `const conciliado = !!factName` hace que factura metadata-only marque conciliación;
- actividad/toast dicen conciliado si hay factura;
- dispara `pago_aplicado` al confirmar, lo cual puede ser válido para confirmación autorizada, pero debe distinguirse de conciliación bancaria/aseguradora.
```

Decisión:

```txt
No llamarlo regresión completa. Corregir puntualmente conciliación automática por factura y comentario prohibido.
```

### Portal

Estado corregido: **avance parcial**.

Avances:

```txt
- soporte de pago crea documento metaOnly;
- usa storageEstado pendiente_storage;
- vincula soporteDocumentoId al cobro;
- usa fecha dinámica para gestión.
```

Pendientes/riesgos:

```txt
- comentario contiene base64: no runtime, pero rompe validadores estrictos;
- enRevision:false queda semánticamente inconsistente con reporte en revisión;
- documento no trae todos los campos del contrato: tenantId, visibilidadCliente, responsable, updatedAt;
- falta auditoría unificada.
```

Decisión:

```txt
Rescatar patrón metaOnly/soporteDocumentoId y completar contrato.
```

### Configuración

Estado corregido: **avance parcial, no regresión**.

Avances:

```txt
- elimina saved.key y key directo desde querySelector para persistencia;
- agrega credentialRef;
- agrega backend_required;
- reset exige RESTABLECER.
```

Pendientes/riesgos:

```txt
- id `ci-key` permanece como nombre interno; no guarda secreto, pero confunde validadores/patrón;
- copy visible menciona API key/token/backend;
- `status()` reconoce cfg.key por compatibilidad, pendiente de limpieza;
- logo sigue con readAsDataURL, aunque es branding y no soporte operativo; debe tratarse como tema futuro de Storage/config.
```

Decisión:

```txt
Mantener avance de credentialRef/backend_required; limpiar copy e IDs para no parecer secreto en frontend.
```

### Conciliaciones M5

Estado corregido: **sin cambio**.

```txt
No hay regresión contra candidata anterior porque el archivo no cambió.
Pero tampoco incorpora el hotfix P0 más estricto: validada no aplicada, ANULAR, país/moneda, auditoría.
```

### Equipo

Estado corregido: **sin cambio**.

```txt
No hay regresión contra candidata anterior porque el archivo no cambió.
Pero tampoco incorpora hotfix P0 completo: motivo, último admin protegido, reset permisos con RESTABLECER, auditoría.
```

### Academia

Estado corregido: **sin cambio, pendiente crítico de producto**.

```txt
No hay regresión porque academia-plus.js no cambió.
Pero no incorpora el addendum profundo posterior ni los hotfixes post-candidata como contenido formativo.
```

Debe continuar como pendiente para Claude/prototipo, sin desplazar backend crítico.

### Cotizador/Comparativo

Estado corregido: **sin cambio, no regresión**.

```txt
modules/cotizador.js no cambió.
modules/comparativo.js no cambió.
```

Esto significa:

```txt
- no se rompieron por cambios directos;
- no fueron auditados visualmente en esta candidata;
- deben entrar en smoke explícito;
- no deben reescribirse si están estables;
- deben seguir ligados a configuración tenant, país, moneda, aseguradoras, tarifas y Academia.
```

## Por qué puede aparecer “regresión” aunque Claude sea incremental

Puede ocurrir por una de estas razones:

```txt
1. Claude trabaja sobre la candidata anterior, pero no sobre los hotfixes ChatGPT/Codex creados después.
2. El paquete de instrucciones incluye reglas más estrictas que la candidata solo implementa parcialmente.
3. Un cambio UX nuevo resuelve un frente, pero no absorbe el contrato backend posterior.
4. El index cache-bust se considera riesgo de empalme aunque no sea regresión funcional.
5. Los validadores estrictos detectan términos en comentarios/copy aunque el runtime no guarde secretos/base64.
```

## Decisión corregida de empalme

```txt
NO empalmar ZIP completo.
SÍ reconocer avances incrementales.
SÍ rescatar Cliente360/Portal/Cobros/Config por fragmentos.
NO llamar regresión a módulos que no cambiaron.
NO dar por cerrado Academia, M5, Equipo, Cotizador/Comparativo.
```

## Ruta siguiente prioritaria

```txt
1. Auditar/smokear explícitamente Cotizador + Comparativo + Academia contra plan prioritario.
2. Preparar rescate controlado de Cliente360 Documentos adaptado al contrato Documentos/Parches/Roles.
3. Mantener runner P0 ChatGPT/Codex como fuente de verdad para Cobros/M5/Portal/Config/Equipo/Academia.
4. Ejecutar localmente runner + validador cuando Paula tenga computador.
```

## Estado

Reauditoría corregida completada. Se corrige la lectura anterior: la candidata es incremental con avances parciales, no un bloque regresivo completo. El bloqueo de empalme se mantiene por seguridad, no por rechazo total de la candidata.