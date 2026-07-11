# AUDITORÍA VISUAL Y REAPERTURA — ASEGURADORAS / COTIZADOR / COMPARATIVO v1.203

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.  
Carriles: A — UX/prototipo/Academia; B — contratos/backend protegido; C — datos reales A&S.

## Estado ejecutivo

La validación visual local logró abrir Aseguradoras, Cotizador y Comparativo, pero evidenció regresiones y faltantes suficientes para reabrir los tres módulos.

```txt
ASEGURADORAS: NO CERRADO
COTIZADOR: NO CERRADO
COMPARATIVO: NO CERRADO
SMOKE VISUAL: PARCIAL
DATOS A&S VISIBLES: NO
SEED FICTICIO: SÍ
```

No debe afirmarse que estos módulos están cerrados hasta corregir los hallazgos y repetir una única validación consolidada.

## 1. Aseguradoras — hallazgos

### 1.1 Avances que sí funcionan

- directorio abre;
- KPI son clicables y muestran detalle;
- ficha abre como página completa;
- existe botón de regreso al directorio;
- las pestañas funcionales existen;
- el visor documental abre dentro de la plataforma;
- el estado de vista previa no disponible es honesto;
- el alta exige país y motivo;
- Cotizador se mantiene en default-deny.

### 1.2 Regresiones visuales y funcionales

La ficha en página completa perdió la riqueza visual de la ficha modal incremental aceptada previamente:

- hero degradado por aseguradora;
- logo destacado;
- estado vinculada/sin vincular;
- tabs con iconos/emojis;
- tarjetas y jerarquía visual por sección;
- acciones contextuales por pestaña;
- edición completa y consistente;
- footer de acciones;
- experiencia compacta y elegante.

La instrucción correcta no era sustituir el diseño del modal por una ficha plana, sino reutilizar esa misma experiencia visual dentro de una ruta/página con regreso.

### 1.3 Alta de aseguradora

El alta actual es un formulario mínimo en modal. No corresponde a la ficha completa requerida.

Debe transformarse en una ficha nueva de página completa o editor integral con las mismas secciones:

```txt
Resumen
Contactos
Plataformas
Bancos y pagos
Productos y planes
Documentos y Drive
Tarifas y conocimiento
Actividad
```

Debe permitir guardar por etapas o guardar la ficha completa, conservar borrador controlado, mostrar logo/país/estado y aplicar validaciones por sección.

### 1.4 Acciones preliminares faltantes

Las tarjetas y la ficha deben recuperar acciones operativas rápidas, según permisos y disponibilidad:

- contactar responsable;
- abrir plataforma;
- ver/copiar acceso mediante bóveda;
- ver/copiar cuenta mediante recurso seguro;
- abrir Drive/documento dentro de Orbit;
- crear gestión de actualización/corrección;
- iniciar cotización para producto habilitado;
- registrar revisión;
- editar;
- desactivar de forma segura.

### 1.5 Edición

El botón `Editar` aparece en la cabecera, pero el editor actual no reproduce el alcance completo de la ficha incremental anterior. Debe editar por sección, con:

- antes/después;
- motivo;
- actor/rol;
- confirmación reforzada cuando abre accesos;
- auditoría;
- prohibición de borrado inseguro.

### 1.6 Copy técnico visible

Deben retirarse o traducirse para usuario final:

```txt
sin_sensibles
default-deny
documentRef
backend_required
referencias seguras
```

Copy operativo sugerido:

```txt
Sin recursos sensibles registrados
Cotización automática pendiente de configuración
Documento pendiente de conexión
Acceso seguro pendiente de conexión
```

### 1.7 Datos ficticios

La pantalla muestra aseguradoras ficticias como Seguros Atlas, Aseguradora Cumbre, MundoSeguro, Pacífico Seguros, Andes Seguros y Vértice Seguros.

Esto confirma que el módulo sigue sobre seed de prototipo. La validación no equivale a carga A&S.

Pendiente Carril C:

- dry-run GT;
- dry-run CO;
- resolver bloqueos CO;
- aplicar datos no sensibles al tenant A&S mediante backend operativo;
- generar referencias seguras para credenciales/cuentas;
- conservar seed ficticio solo para tenants demo, nunca para A&S operativo.

## 2. Cotizador — hallazgos

### 2.1 Estado actual

El bridge v1.203 introduce default-deny, persistencia y validación de fuentes, pero la pantalla visual sigue siendo un formulario básico del prototipo.

No corresponde todavía al alcance de `comparativo_final_v110.html`.

### 2.2 Faltantes frente a v110

- flujo guiado/stepper;
- selección inteligente de producto y aseguradoras elegibles;
- planes por aseguradora;
- tarjetas de resultado ricas;
- coberturas;
- deducibles;
- restricciones;
- vigencias;
- formas de pago;
- propuestas por PDF asociadas a cada aseguradora;
- reemplazo/revisión del PDF;
- selección de planes;
- impresión por aseguradora;
- generación avanzada de comparativo;
- historial profundo;
- configuración administrativa por tenant;
- adaptación completa GT/CO y moneda.

### 2.3 Automatización esperada

El usuario debe digitar lo mínimo.

El Cotizador debe precargar, cuando existe contexto:

- cliente/prospecto;
- país;
- asesor;
- producto/ramo;
- vehículo/riesgo;
- suma asegurada;
- aseguradoras elegibles;
- planes configurados;
- fuentes vigentes;
- cuotas/formas de pago.

Al subir una cotización debe extraer y proponer:

- aseguradora;
- plan;
- prima neta;
- gastos;
- impuestos;
- prima total;
- coberturas;
- deducibles;
- exclusiones/restricciones;
- vigencia;
- forma de pago;
- versión/referencia.

La confirmación humana corrige excepciones; no reconstruye manualmente toda la cotización.

## 3. Comparativo — hallazgos

### 3.1 Estado actual

La pantalla muestra un formulario independiente básico y no la profundidad visual/funcional de v110.

El botón `Registrar opción aceptada` aparece aun cuando no existe una propuesta validada y seleccionada. Eso es incorrecto.

### 3.2 Registro de propuesta aceptada

El modal actual prellena solo algunos campos y deja valores críticos vacíos o en cero.

Debe abrir únicamente desde una propuesta validada y seleccionada. Debe autocompletar:

```txt
cliente
aseguradora
ramo
producto/plan
país
moneda
prima neta
gastos de emisión
gastos financieros
impuestos
prima total
cantidad de pagos
fuente/referencia
documentRef
inicio/fin cuando estén disponibles
cotizacionId
comparativoId
```

El usuario solo debe confirmar:

- que el cliente aceptó;
- evidencia/motivo;
- fechas faltantes;
- una excepción justificada.

No debe existir dropdown libre de aseguradora si ya se seleccionó una propuesta, salvo acción explícita de cambio con advertencia y auditoría.

### 3.3 Propuesta manual

El modal que pregunta únicamente `Nombre de la aseguradora / propuesta` es ambiguo, insuficiente y no debe quedar.

Debe reemplazarse por `Registrar cotización recibida` o `Agregar propuesta de aseguradora`, con:

- aseguradora del directorio;
- producto/plan;
- fuente o documento;
- versión/fecha;
- prima desglosada;
- pagos;
- coberturas;
- deducibles;
- condiciones;
- vigencia;
- motivo;
- validación humana.

La propuesta queda `requiere_validacion` hasta completar y confirmar la fuente.

### 3.4 Botones y estados

- `Registrar opción aceptada`: oculto o deshabilitado sin propuesta elegible.
- `Cargar propuestas (PDF)`: debe abrir flujo por aseguradora y extracción/revisión.
- `Propuesta manual`: debe ser excepcional, estructurada y comprensible.
- la recomendación no aparece con menos de dos propuestas validadas comparables.
- no puede crearse solicitud de emisión con valores cero o producto vacío.

## 4. Visor documental

El visor dentro de Orbit cumple la dirección solicitada para Aseguradoras, Cliente 360 y demás módulos.

Pendientes:

- deshabilitar acciones que no tienen proveedor disponible;
- copy operativo, no técnico;
- conservar metadata;
- mostrar preview real cuando Drive/backend responda;
- no abrir nueva pestaña salvo fallback autorizado;
- usar el mismo visor transversalmente.

## 5. Decisión de baseline

No volver a una versión vieja completa.

Conservar:

```txt
backend protegido
Orbit.store
scope/multirol
importadores
contratos v1.198–v1.203
pólizas/recibos
renovaciones
emisión/endosos
source gate
quote/comparison contracts
Academia acumulada
```

Recuperar selectivamente de la candidata incremental anterior:

```txt
diseño rico de ficha Aseguradoras
editor completo por pestañas
iconografía/jerarquía visual
acciones contextuales
```

Integrar selectivamente de v110:

```txt
flujo guiado Cotizador
planes/resultados/coberturas/deducibles
PDF por aseguradora
Comparativo profundo
impresión/historial
```

No copiar:

```txt
Firebase/Auth directos
localStorage operativo
API keys
hardcodes de aseguradora/tarifa
navegación monolítica
seed real A&S
```

## 6. Próximo bloque correcto

### Carril A

1. restaurar riqueza visual de Aseguradoras en página completa;
2. convertir alta en ficha/editor integral;
3. recuperar acciones por ficha;
4. corregir copy técnico;
5. reconstruir Cotizador/Comparativo con UX v110, no con formulario básico;
6. corregir propuesta aceptada y propuesta manual;
7. responsive móvil/tablet/escritorio;
8. actualizar Academia.

### Carril B

1. conservar contratos v1.202/v1.203;
2. completar proveedor seguro para ver/copiar credenciales y cuentas;
3. completar Drive/document provider;
4. validar server-side tenant/rol/scope;
5. mantener default-deny y trazabilidad.

### Carril C

1. cargar directorios GT/CO por dry-run;
2. resolver bloqueos CO;
3. aplicar datos no sensibles al tenant A&S;
4. solicitar/usar fuentes reales de tarifas y planes;
5. validar Cotizador/Comparativo con casos A&S sanitizados.

## 7. Uso de Claude

Claude ya tiene capacidad. No enviar un delta parcial.

El siguiente paquete debe ser completamente acumulado e incluir:

- candidata visual viva;
- esta auditoría;
- evidencia visual del 2026-07-11;
- contratos v1.198–v1.203;
- archivos protegidos;
- recuperación selectiva de la ficha anterior;
- integración visual de v110;
- responsive;
- copy sin notas técnicas;
- Academia;
- checklist y rechazo automático.

## 8. Evidencia suficiente

No se requieren más capturas en este momento.

La siguiente validación visual se solicitará únicamente después de entregar una candidata/empalme corregido y deberá ser una sola ronda consolidada.
