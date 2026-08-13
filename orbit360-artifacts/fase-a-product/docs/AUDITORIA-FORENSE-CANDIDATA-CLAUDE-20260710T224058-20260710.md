# AUDITORÍA FORENSE PROFUNDA — CANDIDATA CLAUDE ORBIT 360 A&S

Fecha local: 2026-07-10  
Candidata: `Prototype Development Request - 2026-07-10T224058.273.zip`  
SHA256: `ebae02763b6cde1d8daa3104558bbf08b1e3024339893973147176da7d63069c`  
Base exigida: `Prototype Development Request - 2026-07-08T183042.881.zip`  
SHA256 base: `94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open, sin merge, deploy ni producción  
HEAD antes de documentar: `6a534d34db9269ed3f9806609164498292c7819d`

## Decisión

**NO APROBADA PARA EMPALME DIRECTO NI PARA REEMPLAZAR EL BASELINE VIVO.**

Clasificación:

```txt
APROBADA COMO FUENTE PARCIAL DE UX/ACADEMIA
+ REQUIERE CORRECCIÓN CLAUDE
+ REQUIERE EMPALME SELECTIVO POSTERIOR
+ PROHIBIDO COPIARLA COMPLETA SOBRE LA RAMA
```

La candidata sí corrige la orientación visual de Aseguradoras: directorio como portada, ficha por pestañas, Tarifas y conocimiento como sección secundaria y ausencia de contraseña en esa ficha. También aporta CSS móvil básico y contenido útil de Academia.

No se empalma porque perdería contratos ya aceptados y contiene fallos de integridad, permisos, seguridad y datos ficticios.

## Carriles

- **A — Prototipo/UX/Academia:** auditado a nivel de inventario, diff, sintaxis, seguridad estática y contratos funcionales.
- **B — Backend protegido:** no se modificó. Se verificó que los protegidos presentes en ambos ZIP no cambiaron contra la candidata base. La rama viva mantiene composición LAB que no existe en el `index.html` de Claude.
- **C — Datos reales/migración:** no se procesó ni escribió payload real. Directorios GT/CO solo como referencia estructural sanitizada.

## Evidencia técnica

```txt
Entradas ZIP: 98
Archivos nueva candidata: 98
Archivos base: 98
Agregados: 0
Eliminados: 0
Modificados: 10
Sin cambios: 88
Path traversal: 0
Symlinks: 0
Archivos cifrados: 0
Referencias locales de index.html: 55
Referencias faltantes: 0
IDs estáticos duplicados en index.html: 0
Resultado node --check de todos los JS/MJS: ALL_JS_MJS_OK
```

Archivos modificados:

```txt
data/academia-plus.js
modules/academia.js
modules/aseguradoras.js
modules/cotizador.js
modules/comparativo.js
styles/infra.css
index.html
docs/BITACORA-CAMBIOS.md
docs/manual-maestro.html
docs/manual-integraciones.html
```

No fue posible reproducir el smoke visual dentro del entorno de auditoría porque Chromium está bloqueado por una política administrada que impide navegar incluso a localhost/file. No se adopta como evidencia propia la frase de Claude “verificado en vivo”. La validación visual queda para un único smoke local después de la corrección y el empalme.

## Hallazgos P0 — bloqueantes

### P0-01 — borrado destructivo sin validar vínculos

`modules/aseguradoras.js` ejecuta `S().remove('aseguradoras', id)` tras una confirmación genérica. No revisa pólizas, cobros, comisiones, reclamos, documentos, cotizaciones o histórico.

La rama viva ya contiene un patrón superior: si hay vínculos, bloquea el borrado y propone desactivar conservando histórico; además exige motivo.

**Corrección:** conservar el patrón de la rama. Borrar solo sin vínculos, con motivo, confirmación reforzada y auditoría antes/después.

### P0-02 — no hay gates de rol activo, permisos ni scope

Cualquier usuario que entre al módulo puede crear, activar/desactivar, editar y borrar aseguradoras, contactos, plataformas, cuentas, productos, comisiones y documentos. La frase “se controla en Equipo” no implementa un gate.

**Corrección:** Dirección/AdminTenant administra; Operativo según permiso; Asesor en lectura operativa. Acciones sensibles con motivo y confirmación.

### P0-03 — pérdida del motor avanzado y de `_fuentes`

La rama viva expone y usa un contrato P0.1/P0.1b para normalización y suficiencia de fuentes por país, moneda, ramo, producto, familia, segmento, riesgo, vehículo, uso y plan. También exporta:

```txt
normalizarFuente
evaluarFuente
resumenFuentes
resumenGrupos
sourceDimensions
sourceCombinationKey
groupLabel
legacyType
SOURCE_TYPES
SOURCE_STATES
DIMENSION_KEYS
```

La candidata reescribe el archivo y retorna solo `{ render, ficha }`. La pestaña Tarifas queda como badges decorativos y elimina el contrato acumulado.

**Corrección:** construir la nueva ficha alrededor del motor existente, no sustituirlo.

### P0-04 — Cotizador promete un gate inexistente

El nuevo copy dice que consume solo aseguradoras/productos habilitados. El código real filtra únicamente:

```js
a.vinculada !== false && país
```

No valida producto/plan, estado `validado_habilitado`, suficiencia, vigencia, moneda, reglas, presentación ni segundo gate.

**Corrección:** conectar elegibilidad canónica o cambiar el copy a estado pendiente/honesto hasta implementarlo.

### P0-05 — reset destructivo del estado documental

Al editar nombre/categoría de documentos, reconstruye cada fila con:

```js
estado: 'Documento recibido'
```

Esto borra estados como `Requiere validación`, `Listo para habilitar` o `Habilitado` y pierde otros metadatos.

**Corrección:** preservar id, estado, versión, vigencia, trazabilidad, visibilidad y referencias.

### P0-06 — curso Aseguradoras invisible para Asesor/Operativo

El curso usa `destinatarios:'Todos'`. `cursosPorRol()` solo reconoce `clientes`, `ambos`, `equipo` o rol exacto. Dirección/Admin lo ven por excepción, pero Asesor/Operativo no.

**Corrección:** usar `equipo` o soportar `Todos` canónicamente y probar por rol activo.

### P0-07 — Academia mezcla comisiones con tarifas

El caso y quiz dicen que una planilla de comisiones deja tarifas pendientes de habilitación. Esto mezcla fuentes distintas:

```txt
planilla_comisiones → comisiones/conciliación de comisiones
cotizador/tarifario/cotización ejemplo → conocimiento tarifario
```

**Corrección:** usar un tarifario/cotizador/cotización ejemplo en el curso de Aseguradoras.

### P0-08 — nombres reales en seed

`data/seed.js` conserva:

```txt
El Roble
G&T Seguros
Mapfre
Sura
Bolívar
Allianz
```

La bitácora declara que todo el directorio es ficticio. Aunque no hay secretos reales, incumple el criterio de demo ficticia.

**Corrección:** nombres totalmente ficticios; payload real solo en Carril C con dry-run.

### P0-09 — procedencia no acreditada

La bitácora afirma que Claude no recibió el ZIP base exacto y trabajó sobre otro “baseline vivo real”. Aunque el diff muestra 98 archivos y solo 10 cambios, no acredita SHA/base exacta.

**Corrección:** próxima entrega con SHA256 base/nueva, inventario y diff.

### P0-10 — API keys todavía se capturan en Automatizaciones

El ZIP conserva `input type="password"` para API key y persiste `cfg.ia.key` en frontend. Es un problema heredado, pero contradice el paquete y la equivalencia de hotfixes.

**Corrección:** `credentialRef:'backend_required'`, cero secreto en UI/store/logs y estado pendiente de conexión.

## Hallazgos P1 — altos

1. **Importador insuficiente:** `directorio-aseguradoras` solo mapea nombre, ramos, email, teléfono y país. No soporta múltiples contactos, plataformas, bancos, códigos, emergencias, productos/planes, Drive, vigencias ni estructuras reales por hojas/bloques GT/CO. El dry-run existente crea/actualiza/omite, pero no cubre el importador profundo. Pertenece a B/C; Claude no debe modificar `core/importa.js` ni declararlo cerrado.
2. **Ficha incompleta:** faltan gestión preferida/vigencia/país en contactos; tipo/responsable/verificación en plataformas; uso/link/instrucciones/vigencia en bancos; modelo completo de productos/planes; versión/vigencia/visibilidad/estado en documentos; motivo/antes-después/fuente/actor real en actividad.
3. **KPIs incorrectos:** “contacto principal” cuenta cualquier contacto; “documentación” no valida vigencia; “acceso disponible” puede elegirse manualmente; legacy `portal` no alimenta KPIs que consultan `portales`.
4. **Actividad insuficiente:** usa `responsable:'usuario actual'`; varias acciones no registran actividad ni motivo.
5. **Vinculación sin confirmación:** toggle directo, sin motivo ni revisión del impacto en Cotizador/Comparativo.
6. **Logo base64 en entidad:** guarda `FileReader.readAsDataURL()` en `Orbit.store`; debe usar referencia/Storage pendiente o asset ficticio.
7. **Tarifas decorativas:** no presenta inventario por combinación, vigencia, propuesta/diff, validación, habilitación, historial ni casos de prueba.
8. **Sin DTO canónico:** Comparativo sigue con estructuras ad hoc; no existe `CotizacionNormalizada`.
9. **Manual de integraciones regresivo:** cambia a “la conexión se activa por configuración del tenant”; configurar no equivale a conectar. Debe separar Configurada / Pendiente de conexión / Conectada-verificada.
10. **Responsive parcial:** media query móvil sin evidencia tablet, screenshots o prueba por rol; tabs sin ARIA.
11. **Academia a nivel curso, no lección:** `metaLeccion` se renderiza una vez por curso; el addendum exige profundidad por cada lección.
12. **Recurso nominal inexistente:** `Guía de Aseguradoras.pdf` no está en el ZIP; debe marcarse pendiente o incluirse correctamente.

## Compatibilidad con la rama viva

### `index.html`

La rama carga:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
modules/portal-v1142-copyfix.js
```

La candidata no. **Nunca copiar `index.html` completo**; aplicar solo cache-busts sobre el vivo.

### `modules/aseguradoras.js`

La rama tiene el motor avanzado y borrado seguro, pero todavía conserva un campo de contraseña/compatibilidad `p.pass`. La candidata corrige esa parte, pero no puede reemplazar el archivo completo. El empalme futuro debe combinar:

```txt
rama: motor _fuentes + validación de vínculos + motivo/auditoría
candidata corregida: directorio/tabs + credentialRef + UX operativa
```

## Componentes reutilizables

1. directorio y ficha por pestañas;
2. CSS `.asg-tabbar`/`.asg-tab` y adaptación móvil básica;
3. eliminación de contraseña en Aseguradoras;
4. `credentialRef:'backend_required'`;
5. render de `metaLeccion`;
6. curso Aseguradoras después de corregir destinatario y contenido;
7. impresión de `manual-maestro.html`;
8. navegación cruzada después de corregir el copy/gate.

## Componentes rechazados

1. `modules/aseguradoras.js` completo;
2. `index.html` completo;
3. eliminación de `_fuentes`;
4. borrado directo;
5. toggles/edición sin permisos;
6. reset de estados documentales;
7. promesa de gate no implementado;
8. `destinatarios:'Todos'` sin soporte;
9. comisión→tarifa en Academia;
10. footer de Integraciones;
11. afirmación “sin datos reales” con marcas reales;
12. smoke declarado sin evidencia reproducible.

## Instrucción de corrección para Claude

Trabajar incrementalmente sobre la candidata recibida, pero reconciliar el baseline vivo:

```txt
1. Conservar directorio/tabs.
2. Reinsertar motor P0.1/P0.1b y export _fuentes.
3. Completar campos por sección.
4. Implementar gates visuales por rol/scope.
5. Bloquear borrado con vínculos y exigir motivo.
6. Preservar estados/metadatos documentales.
7. No guardar logo base64.
8. Normalizar portal→portales sin perder compatibilidad.
9. Corregir KPIs.
10. No marcar acceso disponible sin confirmación segura.
11. Conectar elegibilidad real Cotizador/Comparativo o usar copy pendiente.
12. Definir CotizacionNormalizada.
13. Corregir destinatario y contenido Academia.
14. Retirar API key/password de Automatizaciones.
15. Reemplazar nombres reales del seed.
16. Entregar ZIP, SHA, inventario, diff, node --check, regresión, evidencia responsive/roles e instrucciones de empalme.
```

## Plan posterior

```txt
1. Recibir corrección Claude.
2. Verificar SHA/inventario.
3. Comparar contra esta candidata y rama viva.
4. Fusionar Aseguradoras por funciones, no por archivo.
5. Preservar backend, _fuentes y borrado seguro.
6. Fusionar Academia selectivamente.
7. CSS aditivo.
8. Cache-bust manual sobre index vivo.
9. Ejecutar validador backend LAB.
10. Ejecutar un único smoke local por rol/viewport.
11. Continuar Carril C con directorios reales en dry-run.
```

## Registro

Carril actual: A auditado contra B/C  
Avance visible: candidata inventariada, comparada, validada y clasificada  
Cerrado: diagnóstico y decisión de no empalme directo  
Pendiente: candidata de corrección Claude + empalme selectivo  
Acción manual: enviar a Claude esta auditoría; no ejecutar PowerShell todavía  
Estado: `REQUIERE_CORRECCION_CLAUDE_NO_EMPALMAR_DIRECTO`.
