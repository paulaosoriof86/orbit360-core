# PAQUETE SÚPER ACUMULADO PARA CLAUDE — ORBIT 360 A&S

Fecha de emisión: 2026-07-10  
Proyecto: Migración Alianzas y Soluciones — Orbit 360  
Repositorio de control: `paulaosoriof86/orbit360-core`  
Rama protegida de continuidad: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy y sin producción  
HEAD verificado antes de emitir este paquete: `ac29ccadeaac49e09ffece8933c96e88a060788c`

Estado: **LISTO PARA ENTREGAR A CLAUDE**.

Este documento reemplaza como instrucción de entrega el estado `EN CONSTRUCCIÓN / TODAVÍA NO ENTREGAR` del archivo anterior:

```txt
PAQUETE-SUPER-ACUMULADO-CLAUDE-DESDE-CANDIDATA-20260708-EN-CONSTRUCCION.md
```

Los contratos técnicos, addenda y registros previos siguen siendo fuentes de evidencia. Lo que cambia es la decisión de producto: no se abrirán más subfases preparatorias P0.9 antes de obtener una nueva candidata visual y funcional.

---

## 1. INSTRUCCIÓN EJECUTIVA PARA CLAUDE

Trabaja sobre la última candidata aceptada:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

No empieces desde cero. No regreses a una candidata anterior. No reconstruyas Orbit 360 como un producto distinto. La candidata debe evolucionar de forma incremental y conservar todas las funcionalidades útiles existentes.

Tu objetivo principal es producir una nueva candidata auditable en la que **Aseguradoras sea primero un módulo operativo y estratégico de la correduría**, y el motor documental/tarifario avanzado quede como una sección secundaria administrativa dentro de cada aseguradora o dentro de una vista administrativa autorizada.

Aseguradora Guatemalteca/AseGuate fue únicamente el primer caso técnico controlado para validar referencias opacas, lectura de archivos, preview, sanitización e historial. No es el centro funcional ni visual del módulo y no debe dominar la solución.

No conviertas este encargo en otra ampliación técnica de P0.9. No crees más observadores, gates, bridges, runners, paneles internos o fases preparatorias. Los contratos técnicos ya existen; ahora deben reflejarse en una experiencia de producto correcta.

---

## 2. BASELINE VIVO QUE DEBES RESPETAR

La base válida no es solo el ZIP y tampoco es solo el repositorio.

```txt
Baseline vivo =
última candidata Claude aceptada
+ empalmes y hotfixes aceptados en la rama activa
+ contratos backend protegidos
+ documentación acumulada
+ evidencia visual real del 10 de julio
+ este paquete súper acumulado.
```

La candidata del 8 de julio fue reauditable como incremental: no eliminó archivos ni introdujo regresiones globales grandes, pero solo modificó siete archivos y no incorporó todos los hotfixes posteriores. Debes conservar sus avances, absorber los contratos posteriores y evitar revertir mejoras locales.

### 2.1 Fuentes maestras obligatorias

Antes de modificar, revisa como mínimo:

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
ADDENDUM-MAESTRO-CONTINUIDAD-CLIENTES-MULTIROL-IMPORTADORES-20260709.md
CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md
REAUDITORIA-CORREGIDA-CANDIDATA-CLAUDE-20260708T183042-20260709.md
ADDENDUM-PAQUETE-SUPER-ACUMULADO-CLAUDE-HOTFIX-VALIDACION-VISUAL-ASEGURADORAS-20260710.md
AUDITORIA-FORENSE-PROFUNDA-COTIZADOR-COMPARATIVO-V110-CONTRATO-AYS-20260709.md
```

También debes considerar todos los addenda, contratos, implementaciones y registros P0/P0.9 posteriores al 8 de julio como contratos de compatibilidad, no como instrucciones para convertir la UI principal en una consola técnica.

---

## 3. ARQUITECTURA Y PROHIBICIONES NO NEGOCIABLES

Orbit 360 es un SaaS greenfield, white-label y multi-tenant para intermediarios de seguros.

- A&S es el primer tenant, no un fork.
- Toda personalización vive en configuración/`Orbit.tenant`.
- La marca del chrome es Orbit 360.
- El logo del cliente se muestra únicamente en el slot white-label.
- El prototipo usa datos ficticios.
- No hardcodees A&S, usuarios reales, aseguradoras reales, cuentas reales, contactos reales, tarifas reales ni rutas privadas.
- País, moneda, impuestos, productos, aseguradoras, roles, módulos, integraciones y Academia deben ser configurables.

### 3.1 Archivos protegidos

No reemplaces, elimines ni reescribas:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
```

Los módulos usan exclusivamente `Orbit.store`.

No agregues acceso operativo directo a:

```txt
localStorage
Firebase
Firestore
Auth externo
APIs externas
archivos locales
rutas privadas
```

La nueva candidata puede modificar su propio `index.html` solo cuando sea indispensable para cargar componentes del prototipo, pero debe entregar un diff exacto y no eliminar, reordenar ni sustituir scripts protegidos del baseline vivo. ChatGPT/Codex realizará después el empalme selectivo.

---

## 4. DIAGNÓSTICO DE PRODUCTO QUE DEBES CONVERTIR EN ACCIÓN

La validación visual real confirmó que los contratos técnicos funcionan parcialmente, pero la arquitectura visual actual está invertida.

### 4.1 Reutilizable

Conservar como capacidad avanzada:

- inventario de fuentes;
- clasificación por país, moneda, ramo, producto, segmento, riesgo, vehículo y plan;
- lectura de Excel/PDF;
- manifiestos;
- propuestas y diffs;
- reglas tarifarias propuestas;
- presentaciones propuestas;
- reconciliaciones;
- bindings;
- validación humana;
- historial metadata-only;
- referencias documentales opacas;
- separación entre documento leído y conocimiento habilitado;
- gates de rol activo y trazabilidad.

### 4.2 Técnico interno que no debe dominar la UI

No debe aparecer como lenguaje principal para usuarios:

```txt
BRIDGE REGISTERED
BATCH_*
dry-run técnico
fingerprint
metadata-only
provider
runtime
bootstrap
bridge
binding interno
gate técnico
snapshot
referencia backend
```

Cuando una parte de este lenguaje sea necesaria para administración, tradúcela a copy comprensible y colócala en una vista secundaria.

### 4.3 Debe ocultarse

- rutas locales o privadas;
- hashes y tickets internos;
- payloads;
- nombres de proveedores técnicos;
- credenciales, contraseñas, tokens o llaves;
- estados Firebase/Firestore/LAB;
- IDs de control sin valor operativo;
- identidad ficticia incoherente con el actor efectivo.

### 4.4 Debe pasar a sección secundaria

El motor documental avanzado debe vivir en:

```txt
Ficha de aseguradora
→ Tarifas y conocimiento
→ Fuentes
→ Lecturas y manifiestos
→ Propuestas/diffs
→ Validación
→ Historial
```

Puede existir además una bandeja administrativa transversal para usuarios autorizados, pero no puede reemplazar el Directorio ni la Ficha de Aseguradora.

### 4.5 Falta para la operación real

- directorio utilizable GT/CO;
- búsqueda y filtros;
- contactos por gestión;
- emergencias;
- plataformas y estado de acceso;
- cuentas e instrucciones de pago;
- productos, ramos y planes;
- Drive y documentos;
- actividad y auditoría;
- importación de directorios;
- navegación clara entre Aseguradoras, Cotizador y Comparativo;
- estados honestos y lenguaje operativo;
- responsive móvil real;
- Academia profunda del módulo.

---

## 5. REORGANIZACIÓN OBLIGATORIA DE ASEGURADORAS

### 5.1 Portada / Directorio

La ruta principal debe abrir un directorio operativo, no el motor documental.

Debe incluir:

- buscador por nombre legal, comercial, producto, contacto o código;
- filtro país GT/CO;
- filtro por ramo/producto;
- filtro activas/inactivas;
- filtro por estado de plataformas;
- filtro por estado de documentación;
- vista tarjetas y/o tabla responsive;
- KPIs honestos y operativos;
- acción `Importar`;
- acción `Nueva aseguradora` según permisos.

Cada tarjeta o fila debe priorizar:

- logo o avatar configurable;
- nombre comercial;
- país;
- vinculación activa/inactiva;
- contacto principal;
- teléfono general;
- emergencia/asistencia;
- productos principales;
- estado de plataformas;
- estado de documentación;
- acciones: `Abrir ficha`, `Contactar`, `Abrir plataforma`, `Abrir Drive`.

Las acciones deben estar deshabilitadas o mostrar estado pendiente cuando no exista conexión/configuración real. No simules accesos activos.

KPIs sugeridos:

- aseguradoras activas por país;
- con contacto principal;
- con acceso disponible;
- con documentación vigente;
- con productos habilitados;
- pendientes de actualización.

No uses como KPI principal `manifiestos`, `bindings`, `fingerprints` o `runs`.

### 5.2 Ficha de aseguradora

Organiza mediante tabs o secciones claras.

#### A. Resumen

- nombre legal;
- nombre comercial;
- logo;
- país;
- estado de vinculación;
- identificación fiscal/NIT;
- código del intermediario;
- dirección y oficina;
- teléfonos;
- emergencias;
- sitio web y aplicación;
- observaciones;
- responsable interno;
- fecha de última revisión.

#### B. Contactos

Cada aseguradora puede tener múltiples contactos.

Campos:

- nombre;
- cargo;
- área;
- correo;
- celular;
- teléfono/extensión;
- país;
- observaciones;
- canal preferido;
- vigencia/estado;
- tipo de gestión para la cual es contacto preferido.

Áreas configurables, por ejemplo:

```txt
Comercial
Cotizaciones
Emisiones
Inspecciones
Endosos/modificaciones
Renovaciones
Cobros
Aplicación de pagos
Siniestros
Facturación
Comisiones
Soporte de plataforma
```

Permite identificar contacto preferido por gestión, sin asumir un único ejecutivo universal.

#### C. Plataformas y accesos

Una aseguradora puede tener varios portales o sistemas.

Campos:

- producto/sistema;
- URL;
- tipo de plataforma;
- país;
- estado de acceso;
- `credentialRef` seguro;
- responsable;
- última verificación;
- observaciones;
- acción `Abrir plataforma` cuando esté disponible.

Estados visibles permitidos:

```txt
Acceso pendiente de conexión segura
Acceso disponible
Requiere actualización
Sin acceso registrado
```

No muestres, captures ni almacenes contraseñas reales en el prototipo.

#### D. Bancos y pagos

Una aseguradora puede tener varias cuentas, monedas e instrucciones.

Campos:

- banco;
- tipo de cuenta;
- número enmascarado en datos ficticios;
- moneda;
- país;
- titular;
- uso;
- link de pago;
- instrucciones para soporte;
- dirección/correo para enviar soporte;
- vigencia;
- última verificación.

No incluyas cuentas reales en seed, documentación, capturas o paquete Claude.

#### E. Productos y planes

Modelo uno-a-muchos por aseguradora:

- país;
- moneda;
- ramo;
- producto;
- plan;
- segmento;
- estado;
- forma de cotizar;
- requisitos;
- modalidad de emisión;
- documentos requeridos;
- vigencia;
- disponibilidad para Cotizador;
- disponibilidad para Comparativo.

No asumas que todas las aseguradoras tienen cotizador propio ni que todos los productos se calculan automáticamente.

#### F. Documentos y Drive

- Drive/repositorio;
- carpetas por tipo;
- formularios;
- clausulados;
- condiciones generales y particulares;
- pólizas ejemplo;
- cotizaciones ejemplo;
- anexos;
- manuales;
- circulares;
- fecha, versión y vigencia;
- visibilidad por rol;
- estado de lectura/validación.

Acciones honestas:

```txt
Abrir Drive
Ver documento
Cargar nueva versión
Solicitar revisión
Ver propuesta de extracción
```

#### G. Tarifas y conocimiento — secundaria y administrativa

Conservar aquí las capacidades técnicas existentes:

- fuentes Excel/PDF;
- manifiestos;
- reglas propuestas;
- presentaciones propuestas;
- diferencias;
- reconciliaciones;
- bindings;
- validación;
- historial;
- habilitación explícita para consumo.

La sección debe explicar en lenguaje de usuario:

```txt
Documento recibido
Lectura preparada
Propuesta lista para revisar
Requiere validación
Conocimiento incompleto
Listo para habilitar
Habilitado para Cotizador
Habilitado para Comparativo
```

Procesar un documento nunca habilita automáticamente producto, tarifa, Cotizador o Comparativo.

#### H. Actividad y auditoría

- cambio;
- responsable;
- fecha/hora;
- motivo;
- antes/después;
- fuente;
- categoría;
- visibilidad por rol.

No mezcles historial visible al usuario con auditoría interna restringida.

---

## 6. IMPORTACIÓN DE ASEGURADORAS

El botón `Importar` debe abrir el hub transversal existente, no otro importador paralelo.

Tipos permitidos:

```txt
Directorio de aseguradoras GT
Directorio de aseguradoras CO
Documentos tarifarios
Cotizaciones ejemplo
Pólizas ejemplo
Formularios y clausulados
Datos de configuración
```

Flujo visual mínimo:

```txt
1. Seleccionar tipo de fuente
2. Cargar archivo
3. Detectar hojas, bloques y encabezados
4. Proponer mapeo
5. Permitir corrección humana
6. Identificar duplicados y posibles coincidencias
7. Clasificar crear / actualizar / omitir / requiere validación
8. Mostrar calidad y bloqueos
9. Generar dry-run
10. Confirmar antes de escribir
11. Registrar trazabilidad
```

La UI debe mostrar descartados e irrelevantes sin obligar a mapearlos.

Trazabilidad:

```txt
archivo
hoja
fila/bloque
país
moneda
periodo
fecha de procesamiento
actor
versión
```

No mezcles fuentes:

- el directorio no crea clientes;
- el directorio no crea pólizas;
- el directorio no crea cobros ni cartera;
- el directorio no crea finmovs;
- tarifas no actualizan cuentas o contactos;
- documentos solo proponen datos hasta revisión.

### 6.1 Estructura real de referencia — sin payload

Los directorios GT/CO contienen estructuras reutilizables para:

- identidad legal/comercial;
- códigos e identificación fiscal;
- direcciones y teléfonos;
- emergencias;
- aplicaciones y sitios web;
- contactos por área;
- portales y sistemas;
- bancos e instrucciones de pago;
- productos y condiciones;
- notas operativas.

También contienen bloques sensibles e internos. No copies nombres, teléfonos, correos, usuarios, contraseñas, cuentas, enlaces privados ni observaciones reales a la candidata, documentación, logs o seed.

Usa únicamente datos ficticios que demuestren la arquitectura.

---

## 7. SEGURIDAD DE CREDENCIALES — REGLA ACTUAL Y PREVALENTE

Esta instrucción supersede cualquier documento previo que propusiera revelar contraseñas reales bajo demanda.

Nunca:

- muestres contraseñas reales;
- incluyas un campo `password/pass/clave` operativo en seed o módulos;
- copies secretos a Claude;
- subas secretos al repositorio;
- imprimas secretos en logs, reportes, exportaciones o auditoría;
- guardes tokens/API keys en frontend;
- muestres usuarios privados si no son necesarios para la operación autorizada.

Patrón reusable obligatorio:

```js
credentialRef: 'backend_required'
```

La acción segura futura será abrir la plataforma mediante backend de bóveda o conexión autorizada. El usuario puede conocer el estado y abrir el portal, pero no ver el secreto.

No reutilices de la candidata cualquier implementación que persista `pass`, `password`, `clave`, `token` o equivalentes.

---

## 8. ASEGURADORAS, COTIZADOR Y COMPARATIVO

Relación correcta:

```txt
Aseguradoras
→ administra directorio, contactos, plataformas, productos, documentos y conocimiento validado.

Cotizador
→ consume aseguradoras, productos y tarifas expresamente habilitados.

Comparativo
→ consume cotizaciones, coberturas, deducibles, condiciones y exclusiones normalizadas.
```

`comparativo_final_v110.html` es una fuente avanzada de experiencia y conocimiento A&S desarrollada durante meses.

No:

- lo copies completo dentro de Aseguradoras;
- lo reemplaces por el cotizador genérico actual;
- copies su Firebase/Auth/storage;
- copies su navegación, estadísticas, usuarios o módulo interno de aseguradoras;
- mantengas hardcode de datos A&S.

Sí:

- conserva sus flujos valiosos;
- usa su experiencia como referencia funcional;
- mantén Cotizador y Comparativo como módulos aislados y configurables;
- soporta cotización automática con tarifa validada;
- soporta cotización externa en PDF;
- permite que ambos tipos convivan en el mismo tablero;
- permite Comparativo derivado desde Cotizador;
- permite Comparativo independiente con múltiples PDFs;
- conserva corrección humana y trazabilidad;
- prepara un DTO canónico `CotizacionNormalizada` para evitar tablas vacías;
- no habilites automáticamente ningún consumo por haber leído un documento.

La nueva candidata debe mejorar la navegación y la relación conceptual, no intentar resolver toda la migración técnica de v110 en este bloque.

---

## 9. MULTIROL, PERMISOS Y SCOPES

Un usuario puede tener varios roles, un rol activo y un rol predeterminado.

La visibilidad final se calcula como:

```txt
módulos base del rol activo
+ extras autorizados
- módulos restringidos
```

El alcance de datos es independiente:

```txt
propios
equipo
todos
ninguno
```

La UI debe:

- mostrar rol/vista activa;
- permitir cambiar vista solo entre roles asignados;
- mostrar el alcance actual cuando sea relevante;
- adaptar botones y tabs según permiso;
- solicitar motivo y registrar antes/después en cambios sensibles;
- exigir confirmación reforzada cuando se abre acceso a `todos`.

Roles operativos de referencia:

- Dirección/SuperAdmin/AdminTenant/Admin: administración completa según scope;
- Operativo: operación autorizada, sin administración global salvo extra;
- Asesor: consulta de información operativa necesaria, sin secretos ni auditoría interna;
- ClientePortal: sin acceso al módulo interno;
- AuditorSoloLectura: lectura sin acciones salvo configuración explícita.

No hardcodees personas reales.

---

## 10. COPY Y ESTADOS HONESTOS

No mostrar en UI cliente:

```txt
Firebase
Firestore
backend
LAB
mock
demo
smoke
localStorage
provider
secret
token
API key
fingerprint
bridge
runtime
```

Usa lenguaje comprensible:

```txt
Pendiente de configuración
Pendiente de conexión
Pendiente de lectura
Requiere validación
Disponible
No disponible
Vista previa lista
Propuesta lista para revisar
Documento procesado
Conocimiento incompleto
Listo para habilitar
Habilitado
Requiere actualización
```

No afirmes:

- conectado si solo está configurado;
- enviado si solo se preparó;
- conciliado si solo hay soporte o factura;
- persistido si la sesión es temporal;
- tarifa activa si solo se extrajo;
- acceso disponible si no existe bóveda/conexión;
- Cotizador habilitado si falta segundo gate.

La identidad visible debe coincidir con el actor efectivo y su rol activo. No mostrar `Andrea Beltrán` ni otro seed incoherente durante sesiones temporales.

---

## 11. HOTFIXES Y PENDIENTES POSTERIORES A LA CANDIDATA DEL 8 DE JULIO

La nueva candidata debe mantener equivalencia con estos avances, aunque el foco principal sea Aseguradoras.

### Cliente360 y documentos/parches

- conservar propuestas/diffs y acciones por rol;
- separar revisar/aprobar de aplicar cambios finales;
- confirmación reforzada y auditoría unificada;
- documentos metadata-only;
- no modificar entidad maestra automáticamente;
- asesor limitado a sus clientes y relacionados;
- gestiones de corrección en lugar de acciones destructivas.

### Portal

- soporte de pago metadata-only;
- estado pendiente de revisión;
- no conciliar automáticamente;
- completar trazabilidad, visibilidad y auditoría;
- historial cliente separado de auditLog interno.

### Cobros y conciliaciones

- factura o soporte no significa conciliado;
- pago reportado no significa confirmado;
- validado no significa aplicado;
- banco no aplica cobros automáticamente;
- país/moneda obligatorios;
- estados honestos;
- motivo y confirmación reforzada para acciones críticas.

### Configuración y Equipo

- `credentialRef/backend_required`;
- no guardar secretos;
- rol activo, roles asignados, extras, restricciones y scopes;
- proteger último administrador;
- auditoría y motivo;
- integraciones configuradas no se muestran activas hasta conexión real.

### Importadores

- hub transversal único;
- fuentes separadas;
- mapeo editable;
- dry-run;
- duplicados y calidad;
- trazabilidad;
- confirmación antes de escritura;
- no nombres técnicos visibles;
- `core/importa.js` protegido.

### Pólizas, cartera, producción y comisiones

- solo `Vigente`/`Por renovar` genera cartera;
- otros estados son histórico/recuperación;
- recibo esperado no es cobro confirmado;
- producción, metas y comisiones sobre prima neta recaudada;
- prima neta, gastos, impuestos y total separados;
- no mezclar países ni monedas.

### Integraciones, correo y automatizaciones

- preparado no significa enviado;
- configurado no significa conectado;
- no llamadas directas a proveedores desde módulos;
- no secretos en frontend;
- estados honestos y trazabilidad.

### Otros módulos

No elimines ni reduzcas funcionalidades existentes de:

```txt
Inicio
CRM/Cliente360
Pólizas
Cobros
Renovaciones
Cancelaciones
Siniestros
Comisiones
Finanzas
Marketing
Portal
Ops
Leads
Calidad
Reportes
Configuración
Equipo
Notificaciones
Automatizaciones
Academia
Cotizador
Comparativo
```

---

## 12. ACADEMIA PROFUNDA — ACTUALIZACIÓN OBLIGATORIA

Academia debe actualizarse en la misma candidata, no quedar como nota futura.

Crear o actualizar una ruta/lección del módulo Aseguradoras con adaptación por rol activo.

Contenido mínimo:

1. objetivo operativo y estratégico del módulo;
2. cómo buscar y abrir una aseguradora;
3. cómo elegir el contacto correcto según gestión;
4. cómo interpretar el estado de plataforma;
5. acceso seguro sin ver contraseñas;
6. códigos del intermediario;
7. cuentas, links e instrucciones de soporte de pago;
8. Drive, formularios, clausulados y documentos;
9. productos, ramos y planes;
10. diferencia entre documento recibido, documento leído, propuesta, conocimiento validado y tarifa habilitada;
11. relación Aseguradoras → Cotizador → Comparativo;
12. importación de directorios y documentos;
13. permisos por rol;
14. protección de credenciales y datos sensibles;
15. actividad y auditoría.

Cada lección debe explicar:

- para qué sirve;
- por qué importa;
- quién la usa;
- qué datos lee/escribe;
- qué acción realiza;
- qué cambia en otros módulos;
- errores frecuentes;
- caso práctico;
- evaluación aplicada;
- evidencia de aprendizaje.

Rutas:

- Dirección/AdminTenant;
- Operativo;
- Asesor;
- usuario nuevo.

No enseñes secretos, rutas privadas ni detalles internos del backend.

---

## 13. DISEÑO, MARCA, RESPONSIVE Y ACCESIBILIDAD

Lineamientos:

- paleta base rojo `#C5162E`, grafito `#1E2227`, blanco y grises;
- Manrope para titulares;
- Source Sans 3 para cuerpo;
- JetBrains Mono solo para contenido técnico interno autorizado;
- fondo oscuro siempre con texto blanco;
- uso de rojo controlado;
- diseño corporativo, sobrio, limpio y moderno;
- no saturar la interfaz;
- iconografía simple;
- jerarquía y espacios amplios.

Responsive obligatorio:

- desktop;
- tablet;
- móvil;
- tarjetas sin desbordes;
- tablas con adaptación o vista alternativa;
- tabs desplazables o menú compacto;
- botones accionables con tamaño táctil;
- modales y drawers dentro del viewport;
- textos legibles;
- no depender de hover;
- foco y etiquetas accesibles.

---

## 14. DATOS FICTICIOS Y CONFIGURACIÓN DEMO

La nueva candidata debe demostrar la arquitectura con información ficticia.

Debe incluir variedad suficiente para probar:

- dos países;
- aseguradoras activas e inactivas;
- varios contactos por aseguradora;
- varios portales;
- varios productos/planes;
- cuentas ficticias enmascaradas;
- documentos en distintos estados;
- aseguradoras con tarifa automática;
- aseguradoras solo con cotización PDF;
- aseguradoras con conocimiento incompleto;
- Drive configurado y pendiente;
- roles y scopes diferentes.

No uses datos reales de los directorios, tarifas, cotizaciones, clientes o equipo A&S.

---

## 15. ENTREGABLES OBLIGATORIOS DE CLAUDE

Entrega una candidata auditable que incluya:

1. ZIP completo de la candidata incremental;
2. inventario de archivos agregados, modificados y eliminados;
3. explicación de cada cambio;
4. lista de funcionalidades preservadas;
5. lista de hotfixes absorbidos;
6. lista de contratos técnicos que solo se representan en UX;
7. actualización de `CHANGELOG`/bitácora correspondiente;
8. actualización de Academia;
9. checklist de regresión;
10. resultado de validación sintáctica de todos los JS/MJS;
11. evidencia de responsive;
12. pendientes honestos;
13. instrucciones de empalme selectivo;
14. confirmación expresa de que no tocaste archivos protegidos;
15. confirmación expresa de que no incluiste secretos ni datos reales.

No entregues únicamente fragmentos o mockups. La candidata debe abrir y permitir recorrer el módulo operativo de Aseguradoras.

---

## 16. CHECKLIST DE ACEPTACIÓN Y REGRESIÓN

La candidata será rechazada si:

- empieza desde cero;
- usa una versión anterior;
- elimina funcionalidades;
- pisa archivos protegidos;
- reemplaza `Orbit.store`;
- usa Firebase/localStorage directo en módulos;
- hardcodea A&S o datos reales;
- conserva contraseñas en frontend/seed;
- muestra copy técnico interno;
- mantiene AseGuate como centro del módulo;
- deja el motor documental como portada principal;
- no incorpora directorio y ficha operativa;
- no soporta múltiples contactos/portales/productos/cuentas/documentos;
- simula accesos o integraciones activas;
- habilita Cotizador/Comparativo por leer un documento;
- copia el monolito v110 o su Firebase;
- omite multirol/scopes;
- mezcla fuentes migratorias;
- concilia pagos por factura/soporte;
- mezcla GTQ/COP;
- omite responsive;
- omite Academia;
- no entrega inventario y documentación;
- introduce fechas fijas o estados falsos.

Criterios de éxito visibles:

```txt
1. Aseguradoras abre en un directorio operativo.
2. La ficha permite recorrer Resumen, Contactos, Plataformas, Bancos, Productos, Documentos, Tarifas/Conocimiento y Actividad.
3. Los accesos usan estados seguros y nunca muestran contraseñas.
4. Importar conduce a un flujo de mapeo/dry-run/trazabilidad.
5. El motor documental sigue disponible, pero secundario.
6. Aseguradoras, Cotizador y Comparativo se entienden como módulos relacionados pero separados.
7. La UI responde al rol activo y scope.
8. Academia enseña el flujo.
9. No hay regresiones en módulos existentes.
10. La candidata es empalmable selectivamente sin tocar backend protegido.
```

---

## 17. METODOLOGÍA DE ENTREGA Y EMPALME POSTERIOR

Claude debe trabajar solo en Carril A:

```txt
Prototipo / UX / Academia / documentación de la candidata
```

No debe implementar ni reemplazar:

```txt
Carril B — backend protegido, Auth, Firestore, Orbit.store, seguridad, herramientas
Carril C — payload real, escritura de directorios, tarifas reales, clientes, pólizas, cobros o finmovs
```

Al recibir la candidata, ChatGPT/Codex hará:

```txt
1. Auditar archivos reales del ZIP.
2. Comparar con candidata base y repo vivo.
3. Inventariar.
4. Validar JS.
5. Revisar rutas/módulos/docs.
6. Detectar hardcode y secretos.
7. Revisar copy técnico.
8. Revisar país/moneda/fechas.
9. Revisar Aseguradoras.
10. Revisar Cotizador/Comparativo.
11. Revisar Academia.
12. Empalmar aditivamente.
13. Proteger backend.
14. Ejecutar smoke visual una sola vez.
15. Continuar migración real de directorios y fuentes.
```

No solicites cambios backend para completar el diseño. Representa estados honestos y deja hooks compatibles.

---

## 18. FUENTES DISPONIBLES PARA REFERENCIA — NO COPIAR PAYLOAD

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
comparativo_final_v110.html
ocho Excel de cotizadores/tarifas
tres PDF de cotizaciones/presentaciones
Tasas AseGuate.xlsx
Manual de Identidad Básica – Versión 1 – Vigente.docx
logo A&S
documentación maestra y addenda
```

Los archivos reales sirven para entender estructura y flujos. No deben transformarse en seed, código o documentación con payload real.

---

## 19. REGISTRO DE DECISIÓN

Fecha: 2026-07-10  
Carril: A, derivado de evidencia de B/C  
Módulo: Aseguradoras + Cotizador/Comparativo + Academia  
Necesidad: corregir desviación de producto y volver a una arquitectura operativa.  
Esperado: directorio y ficha como experiencia principal; conocimiento documental como sección secundaria.  
Causa raíz: la secuencia técnica P0.9 terminó ocupando la portada del producto y concentró la continuidad en el caso piloto AseGuate.  
Corrección: emitir paquete integral y congelar nuevas subfases preparatorias hasta recibir candidata Claude.  
Impacto: UX, multirol, importador, seguridad, Cotizador/Comparativo, Academia y empalme.  
Estado: `LISTO_PARA_CLAUDE`.

## 20. ORDEN FINAL

Construye ahora la nueva candidata incremental. Prioriza producto operativo antes que instrumentación técnica. Conserva el conocimiento avanzado existente sin permitir que domine la experiencia principal. No pidas redefiniciones que ya están contenidas en este paquete. Documenta cualquier limitación real y entrega una candidata completa, trazable y auditable.
