# PAQUETE CLAUDE RECONCILIADO CON CÓDIGO REAL — ORBIT 360 A&S v1.205

Fecha: 2026-07-11  
Proyecto: Migración Alianzas y Soluciones — Orbit 360  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama viva de referencia: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy, producción ni `main`.

---

# 0. LEER PRIMERO — CORRECCIÓN DEL DESAJUSTE DE BASELINE

Este paquete **sustituye por completo** el paquete v1.204 y cualquier instrucción anterior que dependiera únicamente de la candidata v1.197.

Claude ya tiene una candidata visual propia denominada v1.198, donde informó como cambios realizados:

- corrección de los dos banners de Aseguradoras y cache-bust `v1368`;
- sustitución de “Propuesta manual” por “Registrar cotización recibida”;
- cero errores reportados en su entorno;
- tareas pendientes #66 y #67 registradas.

Esa v1.198 de Claude es la base visual sobre la cual debe continuar. **No debe volver a v1.197 ni borrar lo ya realizado.**

El desajuste detectado fue real: Claude no tenía físicamente los archivos de Carril B/C v1.198–v1.203 y solo recibió una descripción. Este paquete corrige el problema incorporando una carpeta de **código real de referencia extraído de la rama viva**, además de los contratos, pruebas y documentación correspondientes.

La carpeta incluida se denomina:

```txt
CODIGO_RAMA_VIVA_REFERENCIA_SOLO_LECTURA/
```

Los archivos allí incluidos existen físicamente y permiten a Claude:

1. verificar APIs, nombres, estados y eventos reales;
2. construir UX compatible;
3. evitar inventar contratos;
4. actualizar Academia con comportamientos reales;
5. documentar dependencias de empalme con precisión.

**No significa que Claude deba copiar o reimplementar backend.** La carpeta es referencia de solo lectura.

---

# 1. OBJETIVO ÚNICO DE CLAUDE

Entregar **una sola candidata grande, incremental, completa y auditable** sobre su v1.198 actual, cerrando primero P0 y luego P1.

Claude gestiona exclusivamente:

```txt
Carril A
- UX y arquitectura visual del prototipo;
- responsive;
- copy orientado al usuario;
- interacción y estados honestos;
- Academia profunda;
- manuales y bitácora del prototipo;
- evidencia visual;
- compatibilidad visual con los contratos reales incluidos.
```

Claude no gestiona:

```txt
Carril B/C
- Firestore/Auth/Storage reales;
- bóveda y secretos reales;
- OAuth/Drive real;
- migración real;
- escritura de datos A&S;
- reglas server-side;
- deploy;
- producción;
- empalme final en la rama viva.
```

Cuando una función dependa de Carril B/C, Claude debe:

1. usar el hook/API real incluido como referencia;
2. mostrar un estado honesto;
3. mantener la acción deshabilitada si no está disponible;
4. no inventar respuestas ni datos;
5. documentar la dependencia para el empalme posterior.

---

# 2. REGLA DE USO DE LOS ARCHIVOS FÍSICOS

## 2.1 Solo lectura — contratos y motores

Los archivos incluidos bajo estas categorías son de referencia y **no deben modificarse ni copiarse por encima de la candidata**:

```txt
core/access-scope.js
core/access-ceilings-v1199.js
core/policy-receipts-engine.js
core/policy-receipts-v1199-refinements.js
core/issuance-workflow-v1201.js
core/issuance-workflow-v1201-refinements.js
core/endorsement-workflow-v1201.js
core/importa-dryrun-p0.js
core/insurer-directory-import-v1202.js
core/insurer-directory-import-v1202-security.js
core/secure-resource-fields-v1202.js
core/backend-resource-contracts.js
core/document-viewer.js
core/credential-vault.js
core/quote-comparison-contracts-v1203.js
core/quote-comparison-contracts-v1203-refinements.js
```

Su propósito es que Claude lea las firmas y traduzca la UX. No debe duplicar sus colecciones, estados ni lógica.

## 2.2 Bridges reales — leer para compatibilidad

Estos bridges contienen la traducción actual entre contratos y módulos de la rama viva. Se incluyen para que Claude conozca eventos, IDs, hooks y estados:

```txt
modules/crm-v1198-operational-bridge.js
modules/portal-v1198-scope-viewer-bridge.js
modules/policy-receipts-v1199-bridge.js
modules/policy-receipts-v1199-detail-guard.js
modules/renewals-v1200-operational-bridge.js
modules/renewals-v1200-permission-guard.js
modules/issuance-endosos-v1201-bridge.js
modules/issuance-endosos-v1201-refinements.js
modules/ops-workflows-v1201-bridge.js
modules/renewals-v1201-issued-filter.js
modules/aseguradoras-v1197-ux-bridge.js
modules/aseguradoras-v1202-import-bridge.js
modules/aseguradoras-v1202-resources-bridge.js
modules/cotizador-v1203-source-gate.js
modules/comparativo-v1203-operational-bridge.js
```

Claude puede reutilizar patrones visuales o nombres de eventos, pero no debe reemplazar estos archivos en la rama ni declarar que quedaron integrados en su candidata.

## 2.3 Snapshot de módulos vivos — referencia comparativa

El paquete incluye copia de referencia de:

```txt
index.html
modules/aseguradoras.js
modules/cotizador.js
modules/comparativo.js
modules/cliente360.js
modules/polizas.js
modules/academia.js
styles/base.css
styles/infra.css
styles/v1197-empalme.css
```

Estos archivos muestran el estado empalmado actual, incluidos aciertos y regresiones visuales. **No deben sustituir la v1.198 visual de Claude.** Se usan para comparar hooks, load order, APIs y copy pendiente.

## 2.4 Archivos protegidos absolutos

Nunca modificar ni entregar versiones sustitutas de:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
core/auth.js
core/importa.js
firestore.rules
tools/backend, validadores y pipeline protegidos
```

No usar `localStorage` operativo ni Firebase directo desde módulos. Todo dato operativo pasa por `Orbit.store`.

---

# 3. BASELINE ACUMULADO QUE CLAUDE DEBE REPRESENTAR

```txt
Claude v1.198 visual actual
+ v1.198 Cliente360/scope/altas
+ v1.199 Pólizas/Recibos/Recaudo
+ v1.200 Renovaciones
+ v1.201 Solicitud de emisión/Endosos/Ops
+ v1.202 Directorios Aseguradoras GT/CO y recursos seguros
+ v1.203 Cotizador/Comparativo por contratos persistentes
+ evidencia visual del 11 de julio
+ pendientes #66/#67
+ este paquete v1.205
```

Claude no debe afirmar que los motores están dentro de su ZIP. Debe decir:

```txt
UX compatible preparada para empalme con contratos reales incluidos como referencia.
```

---

# 4. PRIORIDAD OBLIGATORIA

## P0.1 — ASEGURADORAS COMPLETA

Aseguradoras debe recuperar la riqueza visual de la ficha anterior y mantenerse como página navegable.

### Directorio

- diseño corporativo, limpio y estratégico;
- KPI clicables con detalle;
- filtros país, vinculación, productos, calidad y búsqueda;
- tarjetas con logo, color, país, contacto, disponibilidad operativa y acciones;
- estados honestos;
- sin banners de arquitectura;
- conservar el fix de los dos banners y cache-bust `v1368`;
- responsive 1440/1024/390 px.

### Ficha en página

Debe incluir encabezado rico con:

- botón Regresar;
- logo destacado;
- nombre;
- país y moneda;
- estado vinculada/activa/calidad;
- código de intermediario;
- color/degradado por aseguradora;
- acciones rápidas;
- iconos/emoticones coherentes;
- edición visible solo para roles autorizados.

Pestañas/secciones obligatorias:

```txt
Resumen
Contactos
Plataformas y accesos
Bancos y pagos
Productos, planes y ramos
Documentos y Drive
Tarifas y conocimiento
Actividad y auditoría visible permitida
```

### Acciones operativas

Según permisos y disponibilidad:

```txt
Contactar
Abrir plataforma
Ver/copiar usuario autorizado
Ver/copiar contraseña temporal autorizada
Ver/copiar cuenta bancaria autorizada
Abrir medio de pago
Abrir documento dentro de Orbit
Abrir Drive como fallback
Crear gestión
Iniciar cotización
Registrar revisión
Editar
Desactivar/reactivar con motivo
```

No mostrar secretos en seed, HTML ni persistencia. Si la conexión segura no existe, mantener la acción deshabilitada y mostrar lenguaje de negocio.

### Nueva/Edita aseguradora

No usar un modal mínimo. Debe ser un editor integral coherente con la ficha completa, con secciones o stepper:

1. Identidad y país.
2. Contactos.
3. Plataformas.
4. Bancos/medios de pago.
5. Productos/planes/ramos.
6. Documentos.
7. Configuración de Cotizador/Comparativo.
8. Revisión y confirmación.

Requisitos:

- país obligatorio;
- moneda derivada del país;
- validación de duplicados;
- campos configurables por tenant;
- agregar/editar/quitar elementos ficticios en la candidata;
- motivo de cambios sensibles;
- no pedir secretos como texto persistente;
- guardar mediante el patrón del prototipo sin tocar archivos protegidos.

### Copy que no debe aparecer

```txt
Firebase
Firestore
backend
LAB
localStorage
mock
seed
smoke
credentialRef
accountRef
documentRef
backend_required
default-deny
gate
binding
runtime
bridge
```

Traducciones de ejemplo:

| Interno | Usuario |
|---|---|
| `backend_required` | Conexión segura pendiente |
| `sin_sensibles` | Sin recursos sensibles registrados |
| `documentRef` | Documento registrado / conexión pendiente |
| `default-deny` | Cotización automática pendiente de configuración |
| `gate` | Requisitos pendientes |
| `enviado` sin canal | Preparado para enviar |

---

## P0.2 — COTIZADOR PROFUNDO

Usar `comparativo_final_v110.html` como referencia funcional/visual, nunca como arquitectura para copiar.

Debe convertirse en flujo guiado con pasos:

```txt
1. Cliente/prospecto y país
2. Producto/riesgo
3. Aseguradoras elegibles
4. Fuentes y planes disponibles
5. Datos específicos del riesgo
6. Generar/registrar propuestas
7. Revisar y enviar a Comparativo
```

### Inteligencia y mínima digitación

- precargar cliente, asesor, país y moneda cuando proviene de Cliente360/Renovaciones;
- reutilizar datos del riesgo/vehículo existentes;
- mostrar solo aseguradoras compatibles;
- mostrar productos/planes configurados;
- mantener campos por país/producto;
- permitir revisar datos faltantes sin volver a escribir lo ya conocido;
- preservar cotizaciones al navegar;
- historial visible por cliente/asesor/estado.

### Fuentes

Regla visual obligatoria basada en los contratos reales:

```txt
sin fuente tarifaria vigente y validada
→ no cálculo automático
→ estado Cotización automática pendiente de configuración
→ opción de registrar cotización recibida
```

Una fuente automática requiere coherencia de:

- aseguradora;
- país;
- moneda;
- ramo;
- producto;
- plan/riesgo cuando aplique;
- versión;
- documento;
- vigencia;
- habilitación validada.

No inventar tarifas ni usar tasas genéricas como oferta real.

### Tarjeta de propuesta

Debe mostrar:

- logo/aseguradora;
- producto/plan;
- prima neta;
- gastos de emisión;
- gastos financieros;
- impuestos;
- prima total;
- pagos/frecuencia;
- coberturas;
- deducibles;
- exclusiones/condiciones;
- vigencia;
- fuente/versión;
- estado de validación;
- acciones revisar, editar, duplicar, excluir y comparar.

---

## P0.3 — COMPARATIVO PROFUNDO

Debe soportar dos entradas:

```txt
A. propuestas generadas/registradas desde Cotizador
B. cotizaciones recibidas por PDF/imagen/Excel/correo/WhatsApp
```

### Comparación

- propuestas persistentes, no solo estado global;
- orden y selección configurables;
- prima desglosada;
- coberturas y límites;
- deducibles;
- exclusiones;
- condiciones;
- pagos;
- vigencias;
- ventajas/desventajas;
- diferencias destacadas;
- recomendación explicable;
- criterio: equilibrio, precio, cobertura, deducible, RC u otro;
- selección manual con justificación;
- impresión/exportación visual preparada;
- historial y trazabilidad.

### Registrar cotización recibida

Conservar y ampliar el cambio ya hecho por Claude. No volver a “Propuesta manual”.

El flujo debe:

1. seleccionar aseguradora del directorio;
2. seleccionar producto/plan;
3. adjuntar o referenciar documento ficticio;
4. proponer extracción/mapeo;
5. permitir corrección humana;
6. capturar versión/fecha/vigencia;
7. separar prima neta/gastos/impuestos/total;
8. capturar pagos;
9. capturar coberturas/deducibles/condiciones;
10. validar cuadre;
11. exigir motivo y confirmación;
12. guardar como borrador o validada.

Minimizar lo manual. Si existe documento, la UI debe presentar una propuesta de extracción y un diff, aun cuando el proveedor real quede pendiente.

---

## P0.4 — PROPUESTA ACEPTADA INTELIGENTE

La acción solo aparece desde una propuesta seleccionada y validada.

Debe autocompletar desde `cotizacionId/comparativoId`:

```txt
cliente
asesor
aseguradora
ramo
producto
plan
país
moneda
prima neta
gastos de emisión
gastos financieros
impuestos
prima total
pagos/frecuencia
fuente
versión/referencia
documento
fechas disponibles
riesgo/vehículo
cotizacionId
comparativoId
póliza origen cuando es renovación
```

El usuario solo completa o confirma:

- aceptación real del cliente;
- evidencia;
- fecha faltante;
- nota excepcional;
- motivo si cambia un dato autocompletado.

No permitir abrir con valores cero o vacíos si no hay propuesta. No permitir cambiar libremente la aseguradora sin advertencia y auditoría.

Resultado representado:

```txt
Solicitud de emisión creada en Ops / Emisiones
```

No crear póliza provisional ni recibos en la candidata.

---

## P0.5 — ACADEMIA PROFUNDA EN LA MISMA ENTREGA

Actualizar Academia y manuales para cada módulo modificado.

Rutas mínimas:

### Dirección/AdminTenant

- directorio Aseguradoras;
- importación/calidad;
- roles/scopes/permisos;
- fuentes/tarifas;
- Cotizador/Comparativo;
- aceptación/emisión/endosos;
- recursos seguros;
- estados honestos;
- auditoría.

### Operativo

- contactos/plataformas/bancos/documentos;
- cotización recibida;
- revisión documental;
- comparativo;
- emisión e inspección;
- endosos y gestiones;
- calidad.

### Asesor

- rol activo y alcance propio;
- Cliente360;
- cotización guiada;
- propuestas y comparativo;
- explicar diferencias;
- aceptación con evidencia;
- solicitudes de corrección;
- límites de edición.

### Portal cliente

- documentos visibles;
- pólizas/cobros;
- solicitudes;
- reporte de pago;
- privacidad y alcance.

Cada lección debe incluir:

```txt
para qué sirve
por qué importa
qué datos usa
qué cambia en la operación
qué permisos aplica
qué errores evitar
qué evidencia queda
```

Conservar progreso, evaluaciones y certificados existentes.

---

# 5. P1 OBLIGATORIO EN LA MISMA CANDIDATA

## #66 Limpieza transversal de copy técnico

Revisar módulos visibles y eliminar términos internos. No limitar el grep a tres archivos. Revisar al menos:

```txt
Aseguradoras
Cotizador
Comparativo
Cliente360
Pólizas
Ops
Portal
Configuración
Equipo
Finanzas
Marketing
Importar
Documentos/visor
Academia
```

Comentarios de código no visibles pueden permanecer.

## #67 Ficha-página Cliente360/Póliza

Atender después de cerrar P0.1–P0.5, sin abrir otro ciclo de versiones.

- Cliente360 y Póliza deben poder abrirse como páginas navegables cuando el contexto lo requiera;
- mantener Regresar;
- conservar tabs, acciones y relación entre cliente/póliza/recibos/documentos/gestiones;
- no degradar los modales rápidos donde sigan siendo útiles;
- responsive;
- permisos por rol/scope;
- visor documental dentro de Orbit.

## KPI con detalle

Todo KPI tocado debe abrir detalle filtrado, accionable y consistente con país/moneda/rol.

## Visor documental transversal

Aplicar patrón común en:

```txt
Aseguradoras
Cliente360
Pólizas
Ops
Cotizador
Comparativo
Portal
Siniestros
Cobros/soportes
```

Con preview cuando exista, metadata, estado honesto y acciones deshabilitadas si no hay proveedor.

## Multirol y scopes

Representar:

```txt
módulos base por rol + extras - restringidos
scope: propios/equipo/todos/ninguno
```

No basta ocultar botones; handlers deben bloquear acciones no autorizadas.

---

# 6. COMPORTAMIENTOS REALES v1.198–v1.203 QUE DEBEN REFLEJARSE

## v1.198 Cliente360/scope

- país y asesor en altas;
- trazabilidad y calidad;
- Asesor ve solo alcance autorizado;
- solicitud de corrección cuando no puede editar;
- Portal/visor según scope.

## v1.199 Pólizas/Recibos/Recaudo

- número real obligatorio;
- prima neta/gastos/impuestos/total separados;
- recibos idempotentes;
- recaudo separado de `finmovs`;
- monedas separadas;
- KPI detallado;
- pagos existentes bloquean cambios incompatibles.

## v1.200 Renovaciones

- KPI/pipeline honestos;
- campaña preparada vs enviada;
- contexto a Cotizador;
- póliza renovada sale del pendiente;
- no cierre automático de póliza anterior sin regla tenant.

## v1.201 Emisión/Endosos/Ops

- propuesta aceptada crea `issuance_request` en Ops/Emisiones;
- documentos/inspección antes de emitir;
- número, vigencia y documento reales;
- `renuevaDe/renovadaPor`;
- endosos como gestiones;
- tipos no configurados bloqueados;
- vehículo anterior queda histórico;
- Asesor no aplica emisión/endoso.

## v1.202 Aseguradoras/importador

- GT/CO por separado;
- país obligatorio;
- dry-run;
- duplicados/bloqueos;
- `credentialRef/accountRef/urlRef` como referencias internas;
- UI en lenguaje de negocio;
- ver/copiar solo con proveedor seguro;
- importar directorio no habilita tarifas.

## v1.203 Cotizador/Comparativo

- contratos persistentes por ID;
- default-deny de cálculo automático;
- prima desglosada y cuadrada;
- fuentes/versión/documento;
- manual/PDF bloqueado hasta validación;
- recomendación solo sobre propuestas validadas;
- aceptación enlazada a Ops, no póliza.

---

# 7. DATOS Y WHITE-LABEL

- El prototipo usa datos ficticios completos y coherentes.
- No hardcodear A&S ni directorios reales.
- A&S se personaliza por configuración de tenant.
- Logo A&S solo en slot white-label y evidencia de tenant.
- Chrome principal mantiene Orbit 360.
- GT: GTQ, IVA 12%.
- CO: COP, IVA 19%.
- No mezclar monedas.
- No mostrar datos reales, contraseñas, cuentas o URLs privadas.

---

# 8. RESPONSIVE Y DISEÑO

Validar y entregar evidencia en:

```txt
1440 px
1024 px
390 px
```

P0 responsive:

- login con órbita visible sin overflow;
- topbar/sidebar;
- KPI;
- directorio y ficha Aseguradoras;
- editores largos;
- Cotizador stepper;
- tarjetas de propuestas;
- tabla/tarjetas Comparativo;
- propuesta aceptada;
- visor documental;
- Cliente360/Póliza si se atiende #67.

Paleta:

```txt
Orbit rojo #C5162E
grafito #1E2227
Manrope
Source Sans 3
JetBrains Mono
fondo oscuro = texto blanco
```

---

# 9. ENTREGABLE ÚNICO

Claude debe entregar una sola candidata posterior a su v1.198, con:

1. ZIP completo de `orbit360-platform/`;
2. inventario total;
3. lista exacta de archivos agregados/modificados/eliminados;
4. diff funcional por módulo;
5. `node --check` de JS/MJS;
6. verificación de referencias de `index.html`;
7. matriz P0/P1 atendido/parcial/pendiente;
8. bitácora acumulada;
9. Academia/manuales actualizados;
10. evidencia 1440/1024/390;
11. evidencia Dirección/Operativo/Asesor;
12. evidencia KPI/detail y estados vacíos;
13. evidencia Registrar cotización recibida;
14. evidencia propuesta aceptada autocompletada;
15. declaración exacta de dependencias Carril B/C;
16. confirmación de archivos protegidos sin cambios;
17. confirmación de que conservó banners corregidos/cache-bust v1368;
18. lista de tareas internas cerradas y pendientes, incluyendo #66/#67.

No abrir mini-versiones. No entregar un fix aislado. No declarar el paquete completo si P0 sigue pendiente.

---

# 10. CRITERIOS DE RECHAZO AUTOMÁTICO

Rechazar la candidata si:

- vuelve a ficha plana de Aseguradoras;
- deja Nueva/Edita como modal mínimo;
- pierde acciones operativas;
- muestra jerga técnica;
- vuelve a “Propuesta manual”;
- propuesta aceptada abre sin propuesta y con ceros;
- inventa tarifas;
- usa tasa genérica como oferta real;
- crea póliza/recibos al aceptar;
- no usa IDs o pierde propuestas al navegar;
- no actualiza Academia;
- rompe responsive;
- modifica archivos protegidos;
- reimplementa backend;
- hardcodea A&S o datos reales;
- afirma integraciones/envíos/Drive activos sin conexión;
- ignora #66/#67 sin documentarlos;
- pierde cambios de su v1.198 actual.

---

# 11. ORDEN DE EJECUCIÓN PARA USAR BIEN LA CAPACIDAD

```txt
1. Leer este archivo.
2. Leer MANIFIESTO_ARCHIVOS_FISICOS_V1205.md.
3. Inspeccionar solo las APIs reales necesarias en CODIGO_RAMA_VIVA_REFERENCIA_SOLO_LECTURA.
4. Continuar sobre la v1.198 visual actual de Claude.
5. Cerrar Aseguradoras.
6. Cerrar Cotizador.
7. Cerrar Comparativo.
8. Cerrar propuesta aceptada.
9. Actualizar Academia.
10. Atender #66 y #67.
11. Ejecutar regresión/evidencia.
12. Entregar un único ZIP.
```

No invertir capacidad en auditar backend general. El código real ya está incluido para consulta dirigida.
