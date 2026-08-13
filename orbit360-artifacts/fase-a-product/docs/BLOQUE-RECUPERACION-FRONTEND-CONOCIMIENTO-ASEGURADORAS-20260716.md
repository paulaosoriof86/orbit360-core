# BLOQUE DE RECUPERACIÓN — FRONTEND CANÓNICO, CONOCIMIENTO DE ASEGURADORAS Y CONTINUIDAD

Fecha: 2026-07-16  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: sin merge a `main`, sin deploy y sin producción

## 1. Motivo del bloque

Al visualizar datos A&S en el runtime ensamblado se detectó una desviación metodológica grave:

1. El frontend publicado no conservaba de forma confiable el comportamiento visual del prototipo canónico.
2. La navegación móvil quedaba truncada y mostraba únicamente `Orbit Inicio`.
3. La ficha de Aseguradoras parecía un formulario bloqueado en lugar de una ficha en modo lectura.
4. El conocimiento ya mapeado para Cotizador/Comparativo no se proyectaba dentro de la pestaña `Tarifas y conocimiento` de cada aseguradora.
5. La aceptación legal podía abrirse varias veces debido a notificaciones repetidas de Auth.
6. La validación estructural previa no cubrió el runtime ensamblado real en escritorio, tableta y móvil.

Este bloque corrige la composición y documenta la regla permanente para evitar que el backend protegido o los adaptadores sustituyan el frontend del prototipo.

## 2. Regla metodológica permanente

### 2.1 Fuente de verdad del frontend

El prototipo/candidata más reciente auditada y aceptada es la fuente de verdad de:

- diseño;
- responsive;
- estructura visual;
- interacción;
- navegación;
- fichas, tarjetas, pestañas y estados;
- experiencia por rol.

La plataforma A&S puede agregar de forma aditiva:

- configuración del tenant;
- datos reales;
- contratos compatibles con `Orbit.store`;
- seguridad y backend;
- adaptadores de campos;
- mejoras específicas del Cotizador/Comparativo A&S;
- fixes locales pequeños, reversibles y documentados.

No puede:

- reemplazar el renderer canónico para adaptar datos;
- reconstruir localmente una ficha completa;
- superponer varias generaciones incompatibles de bridges;
- ocultar trabajo ya mapeado por falta de proyección UI;
- degradar responsive o diseño;
- convertir una validación estática en aprobación visual.

### 2.2 Regla de proyección inteligente

Mapear, persistir y visualizar son etapas distintas:

```text
fuente documental
→ lectura/mapeo
→ normalización
→ persistencia por colecciones
→ relación con aseguradora/producto/variante
→ proyección en ficha
→ validación humana
→ habilitación controlada
```

Si la ficha no muestra un mapeo ya realizado, la acción correcta es **proyectar/sincronizar**, no repetir el mapeo.

### 2.3 Gate de runtime obligatorio

Ningún módulo se considera cerrado únicamente por grep, manifiesto, CI estático o prueba aislada. Debe aprobar:

- Dirección escritorio;
- Operativo tableta;
- Asesor móvil;
- navegación completa;
- lectura y edición separadas;
- datos reales/sanitizados visibles;
- responsive;
- ausencia de dobles eventos;
- coherencia entre frontend canónico y backend.

## 3. Carriles del bloque

### Carril A — Frontend/prototipo

Se conserva `modules/aseguradoras.js` como renderer canónico y se agrega una proyección aditiva y reversible.

Cambios:

- menú móvil con una sola acción de hamburguesa;
- sidebar móvil completo y desplazable;
- cierre correcto por overlay y selección de módulo;
- restauración de estilos de tarjetas, pestañas y ficha;
- modo lectura visualmente distinto del modo edición;
- orden inicial `GT → CO → nombre`;
- organizador visible: Guatemala primero, nombre, activas y actualización reciente;
- proyección por aseguradora de fuentes, reglas tarifarias, propuestas, presentaciones y bindings existentes;
- mensaje explícito cuando el mapeo existe pero la colección aún no está sincronizada en la ficha.

No se reescribe el módulo ni se ejecuta un nuevo mapeo.

### Carril B — Backend protegido

No se modifican:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- Auth ni membresías;
- Firestore Rules;
- loaders/guards LAB;
- validadores/pipeline;
- colecciones de conocimiento;
- reglas de habilitación del Cotizador/Comparativo.

La proyección lee mediante:

```text
Orbit.services.aseguradorasKnowledgeP09.read(...)
```

Y utiliza como fallback únicamente el catálogo documental ya inventariado. No escribe conocimiento ni cambia estados de habilitación.

### Carril C — Información A&S

Se proyectan, cuando existan en `Orbit.store`:

- `aseguradora_manifiestos`;
- `aseguradora_propuestas`;
- `aseguradora_reglas_tarifarias`;
- `aseguradora_presentaciones`;
- `aseguradora_bindings`;
- `aseguradora_revisiones`;
- `aseguradoras.docs`.

La vista separa:

- archivos/fuentes;
- reglas de tarifa/cálculo;
- mapeos/propuestas;
- formatos y reglas de lectura del Comparativo;
- relaciones documento-producto-variante;
- pendientes de validación;
- habilitación real.

No se presentan inventarios como si fueran reglas habilitadas ni se oculta un mapeo existente bajo el texto genérico `lectura pendiente`.

## 4. Corrección de confidencialidad

La causa funcional es que Auth puede ejecutar `showApp()` más de una vez durante la misma autenticación. El gate legal anterior creaba una ventana nueva por cada invocación antes de registrar la aceptación.

Se agrega un wrapper idempotente que:

- identifica el gate por `scopeId`;
- no crea un segundo modal si ya existe uno abierto;
- respeta una aceptación vigente ya persistida;
- ejecuta `onDone` una sola vez;
- elimina cualquier modal del mismo scope al completar;
- no cambia textos legales, versión ni almacenamiento.

Pendiente reutilizable para prototipo: trasladar esta idempotencia directamente a `core/legal.js` en la próxima candidata, evitando que permanezca como estabilización runtime.

## 5. Archivos del bloque

### Modificados

- `orbit360-platform/core/pwa.js`
  - estabilizador legal idempotente;
  - navegación móvil unificada;
  - loader del bridge de proyección de Aseguradoras.

- `orbit360-platform/styles/v1197-empalme.css`
  - responsive sidebar;
  - estilos canónicos de tarjetas/ficha/pestañas;
  - modo lectura;
  - estilos de la proyección de conocimiento.

### Nuevos

- `orbit360-platform/modules/aseguradoras-frontend-projection-v20260716.js`
  - orden configurable;
  - proyección de conocimiento por aseguradora;
  - conserva renderer canónico;
  - no escribe conocimiento ni habilita Cotizador/Comparativo.

- `orbit360-platform/docs/BLOQUE-RECUPERACION-FRONTEND-CONOCIMIENTO-ASEGURADORAS-20260716.md`

## 6. Contrato de seguridad del bridge

El bridge declara y debe conservar:

```text
canonicalRendererPreserved: true
writesKnowledge: false
enablesCotizador: false
enablesComparativo: false
```

No utiliza `MutationObserver`, no reemplaza el host y no modifica colecciones para hacer que la UI parezca completa.

## 7. Nota obligatoria para Claude/prototipo

### Aplica a Claude/prototipo: Sí

Claude debe replicar en la próxima candidata:

1. Menú móvil completo, desplazable y con una sola fuente de comportamiento.
2. Ficha en modo lectura con texto/valores, no formulario visualmente bloqueado.
3. Modo edición explícito con botón `Editar`, draft, guardar/cancelar y motivo.
4. Orden configurable de directorios con país preferido por tenant.
5. Sección canónica de `Tarifas y conocimiento` por aseguradora que consuma un modelo normalizado:
   - fuentes;
   - reglas;
   - presentaciones;
   - bindings;
   - revisiones;
   - habilitaciones.
6. Estado `mapeado pero pendiente de sincronización/proyección`, separado de `no mapeado`.
7. Gate legal idempotente por usuario/tenant/versión.
8. Academia debe explicar la diferencia entre mapear, persistir, proyectar, validar y habilitar.

Claude no debe recibir:

- secretos;
- datos reales;
- rutas locales;
- configuración Firebase/LAB;
- lógica de seguridad exclusiva del backend.

## 8. Impacto en Academia

Agregar/actualizar contenido:

### Ruta Dirección/Superadmin

- Cómo interpretar `Tarifas y conocimiento`.
- Diferencia entre fuente vinculada, regla mapeada, regla validada y producto habilitado.
- Cómo ordenar directorios por país.
- Qué cambios requieren motivo y auditoría.

### Ruta Operativo

- Consultar documentos y reglas sin editar habilitaciones.
- Identificar información pendiente de sincronización.
- Crear gestión de corrección cuando un archivo/regla no aparece.

### Ruta Asesor

- Consultar únicamente conocimiento habilitado/visible según permisos.
- No asumir que un archivo mapeado equivale a tarifa vigente.

### Evaluación aplicada

Caso: “El Excel figura como fuente, pero la regla no aparece en la ficha”. Respuesta correcta: verificar proyección/sincronización y trazabilidad; no volver a importar ni habilitar automáticamente.

## 9. Pendientes explícitos después del bloque

1. Ejecutar prueba visual automática y luego una única confirmación humana de:
   - Dirección escritorio;
   - Operativo tableta;
   - Asesor móvil.
2. Confirmar que las colecciones de reglas/presentaciones contienen el mapeo profundo esperado para cada aseguradora.
3. Resolver únicamente registros que sigan sin relación canónica con aseguradora.
4. Implementar carga real de logotipo mediante almacenamiento seguro y `fileRef`; no usar Data URL persistente.
5. Llevar los fixes reutilizables a Claude/prototipo.
6. Actualizar Academia.
7. Continuar con Cotizador/Comparativo sobre la misma fuente de conocimiento.
8. Mantener el deploy bloqueado hasta cerrar backend productivo, Auth, tenant, carga real y smoke.

## 10. Criterio de cierre

Este bloque se cierra cuando:

- el menú móvil muestra todos los módulos permitidos;
- la aceptación legal desaparece al primer clic y no reaparece;
- el directorio ordena Guatemala primero por defecto;
- tarjetas y ficha conservan el diseño canónico;
- la ficha abre en lectura y solo edita tras acción explícita;
- `Tarifas y conocimiento` muestra el modelo existente por aseguradora;
- no se alteró backend protegido;
- la documentación para Claude y Academia quedó registrada.
