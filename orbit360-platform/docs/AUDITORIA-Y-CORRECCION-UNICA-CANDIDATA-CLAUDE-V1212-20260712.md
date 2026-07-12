# AUDITORÍA Y CORRECCIÓN ÚNICA — CANDIDATA CLAUDE v1.212

Fecha: 2026-07-12  
Proyecto: Orbit 360 A&S  
Rama protegida: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open  
Decisión: `RECHAZADA / NO EMPALMAR / REQUIERE CORRECCIÓN PROFUNDA`

---

## 0. Esta es la única fuente operativa para corregir v1.212

Este documento sustituye el uso disperso de múltiples notas para esta corrección.

Claude debe trabajar sobre la candidata física v1.212:

```txt
Prototype Development Request - 2026-07-11T224600.224.zip
SHA256: e9f517217af687afe20f53bb63037a6062cd1abe143b4c07986bcb7f91f3dca0
```

No debe afirmar que algo está implementado por haberlo leído en documentación. Cada afirmación debe demostrar:

```txt
archivo
+ función/bloque
+ comportamiento observable
+ prueba ejecutada
+ resultado
```

---

## 1. Carriles y frontera

```txt
Carril A — candidata/prototipo Claude v1.212: auditado y rechazado.
Carril B — backend protegido, seguridad y Orbit.store: intactos; no sobrescribir.
Carril C — fuentes reales A&S y bindings: fuera del prototipo; no copiar datos ni reglas.
```

No merge, no deploy, no producción y no `main`.

---

## 2. Auditoría física del ZIP

La candidata contiene `102` archivos.

Comparación física contra la candidata Claude inmediatamente anterior recibida:

```txt
archivos añadidos: 0
archivos eliminados: 0
archivos modificados: 3
```

Archivos modificados:

```txt
CHANGELOG.md
data/seed.js
index.html
```

Cambios reales:

1. `CHANGELOG.md`: agrega una entrada v1.212.
2. `data/seed.js`: agrega el curso `cur10` y cambia `seed.__v` de 64 a 65.
3. `index.html`: cambia únicamente el cache-bust de `data/seed.js`.

Ningún módulo operativo de Cotizador, Comparativo, Configuración, Equipo, Calidad, Pólizas, Aseguradoras, Integraciones o visor documental fue corregido en v1.212.

Conclusión: la frase “no hay más pendientes” no está sustentada por cambios físicos.

---

## 3. Hallazgo crítico 01 — Academia duplicada, no cerrada

La candidata ya contenía:

```txt
data/academia-plus.js
id: cur_p_aseg_cotiz
título: Aseguradoras, Cotizador y Comparativo
```

v1.212 agregó además:

```txt
data/seed.js
id: cur10
título: Cotizador y Comparativo
```

Ambos cursos pueden coexistir en el store, por lo que v1.212 introduce duplicación temática.

Además, el curso nuevo enseña comportamientos que el runtime todavía no garantiza:

- propuestas PDF/manual acumulables y validadas;
- recomendación explicable solo entre propuestas válidas;
- “Preparado” frente a “Enviado”;
- aceptación únicamente de una propuesta validada.

### Corrección obligatoria

- Eliminar `cur10`.
- Profundizar o reorganizar el curso existente `cur_p_aseg_cotiz`.
- Evitar cursos duplicados por título, módulo o competencia.
- El contenido académico debe reflejar funciones verificadas, no funciones deseadas.

---

## 4. Hallazgo crítico 02 — tasas genéricas siguen activas

Archivo:

```txt
modules/cotizador.js
```

Evidencias:

```txt
const TASAS_DEF = ...
```

y:

```txt
const tabla = (...) ? a.cotTasas.auto : TASAS_DEF.auto;
```

La candidata usa `TASAS_DEF.auto` cuando la aseguradora no tiene tabla propia.

El seed habilita el ramo para Cotizador, pero no contiene configuraciones `cotTasas` explícitas. Por tanto, el modo automático puede producir una prima con una tasa genérica/de ejemplo.

Esto viola el contrato obligatorio:

```txt
sin fuente vigente
+ sin tarifa validada y habilitada
→ cálculo automático bloqueado
```

### Corrección obligatoria

- Eliminar el fallback operativo a `TASAS_DEF`.
- No reemplazarlo por otra tabla genérica, seed o tasa ficticia.
- La opción automática debe quedar deshabilitada cuando no exista configuración explícita compatible.
- Mostrar un estado de negocio:
  - `Pendiente de configuración validada`;
  - `Fuente pendiente`;
  - `Requiere revisión`.
- Mantener disponibles únicamente:
  - propuesta manual como borrador pendiente;
  - propuesta documental pendiente de extracción/revisión;
  - cálculo automático con fuente, versión, dimensiones y habilitación.

### Rechazo automático

La próxima candidata se rechaza si contiene cualquiera de estos patrones operativos:

```txt
TASAS_DEF
tasa fallback
prima automática sin fuenteDocumentoId/versionFuente
ramo habilitado interpretado como tarifa habilitada
```

---

## 5. Hallazgo crítico 03 — transferencia Cotizador → Comparativo volátil

Archivos:

```txt
modules/cotizador.js
modules/comparativo.js
```

La candidata usa:

```txt
Orbit._cots
```

como puente principal entre módulos.

Esto deja el comparativo dependiente de estado global en memoria, sin entidad persistida, versión, origen ni recuperación robusta.

### Corrección obligatoria

- Persistir cotizaciones normalizadas mediante `Orbit.store`.
- Transferir únicamente IDs canónicos.
- Comparativo debe recuperar las entidades por ID.
- Si falta una entidad o hay inconsistencia de país, moneda, producto, cliente o versión, mostrar el error y bloquear la comparación.
- `Orbit._cots` no puede ser la entidad final ni la única fuente.

---

## 6. Hallazgo crítico 04 — propuestas pendientes entran al ranking y cierre

Archivo:

```txt
modules/comparativo.js
```

Evidencias:

- la propuesta manual queda `estadoValidacion = 'requiere_revision'`;
- `ranking()` procesa todas las propuestas;
- impresión y comunicación usan el conjunto completo;
- `aceptarOpcion()` permite elegir entre todas;
- las propuestas PDF se agregan al comparativo antes de un diff/confirmación formal.

### Corrección obligatoria

Separar estados:

```txt
borrador
requiere_revision
validada
rechazada
vencida
```

Solo `validada` puede:

- participar en ranking/recomendación;
- habilitar selección final;
- imprimirse como propuesta elegible;
- prepararse para cliente;
- originar solicitud de emisión.

PDF/manual debe seguir:

```txt
archivo o fuente
→ extracción/propuesta
→ diff
→ corrección humana
→ motivo
→ actor/fecha
→ confirmación
→ validada
```

No basta con asignar `requiere_revision`; el sistema debe hacer cumplir ese estado.

---

## 7. Hallazgo crítico 05 — “enviado” sin confirmación del proveedor

Archivo:

```txt
modules/comparativo.js
```

La candidata llama notificación con:

```txt
tipo: 'Comparativo enviado'
```

aunque el flujo únicamente prepara mensaje/adjunto y abre WhatsApp o correo.

### Corrección obligatoria

Usar estados honestos:

```txt
Preparar para cliente
WhatsApp Web abierto
Correo preparado
Pendiente de confirmación
Enviado confirmado
Error de entrega
```

`Enviado confirmado` requiere callback o confirmación explícita verificable.

No registrar actividad “enviado” por abrir una ventana o compositor.

---

## 8. Hallazgo crítico 06 — aceptación correcta en concepto, incompleta en gate

La candidata sí encamina aceptación hacia una solicitud en Ops y no crea una póliza directamente. Ese patrón debe conservarse.

Pero `aceptarOpcion()` no exige que la propuesta esté validada.

### Corrección obligatoria

```txt
propuesta validada
→ cliente acepta
→ solicitud de emisión tipada en Ops
→ documentos/inspección
→ número y vigencias reales
→ póliza y recibos
```

Bloquear aceptación cuando la propuesta:

- requiera revisión;
- carezca de fuente;
- tenga país/moneda incompatibles;
- esté vencida;
- tenga desglose inconsistente.

---

## 9. Hallazgo crítico 07 — copy técnico visible

La candidata mantiene textos técnicos o de configuración interna en UI de cliente.

### `modules/configuracion.js`

Ejemplos:

```txt
APIs y credenciales
scopes mínimos
configuración interna
Configuración interna · Orbit
provisioning del cliente
Referencia de credencial
API key/token
Client ID / Tenant (OAuth)
```

### `modules/automatizaciones.js`

Ejemplos:

```txt
Webhook de Make
Webhook propio
API Key
URL de hook
modelo/proveedor
heurística gratuita
```

### `modules/ia.js`

Ejemplos:

```txt
Modo heurístico
Conecta una API key
proveedor/modelo
```

### Corrección obligatoria

Separar:

```txt
UI cliente
UI administrativa autorizada
configuración técnica interna
```

La UI cliente no debe revelar:

- backend;
- LAB;
- Firebase/Firestore;
- localStorage/store;
- mock/demo/smoke;
- API key/token/secret;
- webhook/hook URL;
- scopes/OAuth/client ID;
- provider/snapshot;
- referencias técnicas.

Copy de negocio sugerido:

| Estado interno | Copy visible |
|---|---|
| `backend_required` | Conexión segura pendiente |
| `default-deny` | Pendiente de configuración validada |
| `sin_sensibles` | Sin recursos sensibles registrados |
| integración sin configurar | Pendiente de conexión |
| prueba local | Verificación pendiente |
| mensaje construido | Comunicación preparada |

Las credenciales deben manejarse por referencia segura y nunca capturarse o persistirse en el prototipo.

---

## 10. Cambios locales reutilizables que sí debieron reportarse mejor

Estos patrones ya existen en la rama protegida y deben reflejarse en el prototipo sin copiar runtime ni datos A&S:

### Aplicados y reutilizables

1. **Default-deny de Cotizador**
   - automático bloqueado sin fuente/configuración validada;
   - manual/PDF como pendiente de revisión.

2. **Contrato de cotización normalizada**
   - origen;
   - aseguradora;
   - país/moneda/producto/plan;
   - prima neta/gastos/impuestos/total;
   - fuente/versión;
   - validación y estado comercial.

3. **Comparativo por IDs**
   - entidades persistidas;
   - consistencia;
   - exclusión de propuestas no validadas.

4. **Preparado frente a enviado**
   - no confirmar entrega sin proveedor.

5. **Aceptación → solicitud de emisión**
   - no póliza ni recibos antes de emisión real.

6. **Aseguradoras como módulo operativo**
   - origen/calidad;
   - contactos/plataformas/cuentas/productos/documentos/conocimiento;
   - estados comprensibles;
   - fuente recibida no equivale a tarifa habilitada.

7. **Estados de capacidad**
   - no contratada;
   - configurada;
   - pendiente de conexión;
   - fuente recibida;
   - requiere validación;
   - persistida y verificada;
   - lista para aprobación;
   - habilitada.

8. **Acciones sensibles**
   - rol activo;
   - motivo;
   - antes/después;
   - confirmación reforzada;
   - auditoría.

9. **Renovación, emisión y endosos**
   - gestiones tipadas;
   - no edición simulada de póliza;
   - documentos y número real antes de emitir.

### Exclusivo A&S — no copiar al prototipo

- nombres/IDs de aseguradoras;
- tasas y reglas;
- documentos reales;
- Auth LAB;
- bindings reales;
- runtime tenant;
- referencias internas de fuentes;
- decisiones de habilitación.

### Pendiente también en la rama viva — no declarar resuelto

La auditoría confirmó que no todo el copy técnico fue eliminado localmente. Aún existe deuda transversal en:

```txt
Configuración
Automatizaciones
IA
algunos estados/integraciones
```

Por tanto, la próxima candidata debe corregirlo, pero la documentación local también debe mantenerlo como pendiente abierto. No volver a afirmar “copy técnico limpio” sin prueba transversal.

---

## 11. Otros gaps reales de v1.212

### Visor documental no transversal

El visor común aparece principalmente en Cliente360. Aseguradoras, Pólizas, Ops, Cotizador, Comparativo y Siniestros no demuestran uso transversal consistente.

**Estado:** pendiente.

### Equipo multirol incompleto

Existe selección de múltiples roles y módulos, pero no está demostrado:

```txt
rol activo
rol default
scope propios/equipo/todos/ninguno
países por usuario
motivo y antes/después al ampliar acceso
```

**Estado:** parcial.

### Calidad por responsable incompleta

Calidad muestra pendientes globales, pero no demuestra:

- vista por asesor;
- alcance de datos;
- gestión de corrección por cliente ausente/mal asignado;
- límites de edición del Asesor.

**Estado:** parcial.

### Pólizas sin ficha-página propia

El listado delega el detalle a Cliente360/drawer. No existe evidencia suficiente de una ficha-página completa de Póliza con regreso y acciones controladas.

**Estado:** parcial.

### Responsive sin evidencia real

Existen breakpoints CSS, pero no hay evidencia nueva v1.212 a:

```txt
1440/1366 px
1024/768 px
390 px
```

No basta con declarar responsive.

### Documentación de entrega obsoleta

La candidata conserva documentos/manifiestos anteriores y no incluye:

- manifiesto v1.212;
- delta real de tres archivos;
- matriz de aceptación;
- log de pruebas;
- capturas/evidencia responsive;
- relación entre requisitos y archivos.

---

## 12. Matriz de aceptación v1.212

| ID | Requisito | Estado físico |
|---|---|---|
| CL-A-01 | Baseline/manifiesto/delta verificable | FALLA |
| CL-A-02 | Aseguradoras operativa profunda | PARCIAL |
| CL-A-03 | Copy técnico visible eliminado | FALLA |
| CL-A-04 | Cotizador configurable sin tasas ficticias | FALLA |
| CL-A-05 | Impresión A4 fiel y trazable | PARCIAL |
| CL-A-06 | Comparativo profundo con propuestas válidas | FALLA |
| CL-A-07 | Replantear completo y explicable | PARCIAL |
| CL-A-08 | Preparado vs enviado verificable | FALLA |
| CL-A-09 | PDF/manual con diff y confirmación | PARCIAL |
| CL-A-10 | Aceptación → emisión con gate | PARCIAL |
| CL-A-11 | Academia profunda sin duplicados | FALLA |
| CL-A-12 | Cliente360 ficha-página + modales | MAYORMENTE IMPLEMENTADO |
| CL-A-13 | Póliza ficha-página | PARCIAL |
| CL-A-14 | KPIs accionables transversalmente | NO DEMOSTRADO |
| CL-A-15 | Visor documental transversal | FALLA |
| CL-A-16 | Equipo multirol + scopes | PARCIAL |
| CL-A-17 | Calidad por asesor + correcciones | PARCIAL |
| CL-A-18 | Integraciones honestas | PARCIAL/FALLA |
| CL-A-19 | Marketing historial/detalle | MAYORMENTE IMPLEMENTADO |
| CL-A-20 | Responsive con evidencia | FALLA |
| CL-A-21 | Documentación final verificable | FALLA |

---

## 13. Archivos mínimos que deben cambiar en la corrección

La entrega no será aceptada si estos archivos obligatorios permanecen idénticos:

```txt
modules/cotizador.js
modules/comparativo.js
modules/configuracion.js
modules/automatizaciones.js
modules/ia.js
data/academia-plus.js
data/seed.js
README.md
CHANGELOG.md
```

Según la implementación elegida, también deberán cambiar:

```txt
modules/equipo.js
modules/calidad.js
modules/polizas.js
modules/aseguradoras.js
modules/cliente360.js
modules/ops.js o core/ciclo.js
styles/base.css
styles/infra.css
```

No sobrescribir:

```txt
data/store.js
core/auth.js
core/importa.js
backend protegido
reglas Firestore
```

---

## 14. Pruebas obligatorias de la próxima entrega

### Estáticas

- sintaxis de todos los JS;
- scripts del index existentes y sin duplicados;
- cero `TASAS_DEF` operativo;
- cero `Orbit._cots` como entidad final;
- cero ranking/aceptación de `requiere_revision`;
- cero actividad “enviado” sin confirmación;
- cero captura visible de API keys/tokens/webhooks en modo cliente;
- cursos Academia sin duplicados;
- protegidos byte-identical.

### Funcionales

1. Aseguradora sin fuente:
   - automático deshabilitado;
   - no calcula prima.

2. Propuesta manual:
   - queda pendiente;
   - no entra al ranking;
   - no se puede aceptar.

3. Propuesta PDF:
   - muestra extracción/diff;
   - requiere corrección/confirmación;
   - solo después puede compararse.

4. Comunicación:
   - abrir WhatsApp/correo = preparado;
   - no “enviado”.

5. Aceptación:
   - solo propuesta validada;
   - crea solicitud de emisión;
   - no crea póliza/recibos.

6. Roles:
   - Asesor no ve configuración técnica;
   - alcance propios/equipo/todos/ninguno verificable.

7. Responsive:
   - evidencia a escritorio/tablet/móvil.

### Entrega

Incluir un único manifiesto con:

```txt
ZIP SHA256
inventario
delta exacto
requisitos → archivos/funciones
pruebas ejecutadas
resultados
pendientes honestos
```

---

## 15. Decisión final de auditoría

```txt
v1.212: RECHAZADA
empalme: NO
valor rescatable exclusivo de v1.212: ninguno
curso cur10: eliminar/absorber por duplicación
backend protegido: intacto
siguiente acción: corrección sobre v1.212, no reconstrucción
```

La candidata corregida debe resolver los gaps anteriores sobre su propia base v1.212 y entregar evidencia física. No debe responder nuevamente “ya estaba implementado” sin demostrarlo archivo por archivo.
