# Bloque de sincronización — mapeo ya ejecutado en Aseguradoras

Fecha: 2026-07-16  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: sin merge, sin deploy, sin producción

## 1. Problema atendido

La ficha de cada aseguradora mostraba únicamente el catálogo documental inicial y estados como `lectura_pendiente`, aunque el procesamiento forense de los cotizadores Excel y cotizaciones PDF ya se había ejecutado fuera del repositorio.

La causa no era ausencia de trabajo, sino separación incompleta entre:

```text
mapeo forense ejecutado
→ resultado sanitizado documentado
→ persistencia operativa por colecciones
→ proyección en la ficha
```

El frontend devolvía anticipadamente el modelo del servicio aunque estuviera vacío y no fusionaba el catálogo, los resultados sanitizados y las colecciones persistidas. Esto ocultaba el trabajo existente y podía inducir a repetir el mapeo.

## 2. Fuentes reales utilizadas

Se utilizaron únicamente resultados ya documentados y verificables:

- `REPORTE-EJECUCION-SANITIZADA-OCHO-COTIZADORES-P06B-20260710.md`;
- `REPORTE-MANIFIESTOS-REALES-PDF-P07B-20260710.md`;
- catálogo de 11 fuentes de `tenant-alianzas-soluciones-source-batch-p09g.js`;
- configuración de aliases y perfiles por tenant de `tenant-alianzas-soluciones-insurers-p10.js`.

No se volvieron a leer los archivos originales y no se inventaron tasas, importes o fórmulas.

## 3. Avance visible

La pestaña `Tarifas y conocimiento` queda preparada para mostrar por aseguradora:

- resumen sanitizado del mapeo ya ejecutado;
- archivo Excel o PDF vinculado;
- país, moneda, ramo, producto y variante;
- cantidad de hechos y hechos numéricos detectados;
- tablas candidatas y rutas de salida;
- clústeres de pricing, dimensiones, presentación, financiamiento y matrices de salud;
- advertencias reales de fórmulas o referencias externas;
- reglas, propuestas, presentaciones y bindings persistidos cuando existan;
- diferencia entre `mapeado`, `sincronización pendiente`, `requiere validación` y `habilitado`.

Cuando existe resumen mapeado, una fuente ya no debe presentarse únicamente como `lectura pendiente`. El estado visible pasa a `Mapeado · pendiente de sincronización` o `Mapeado · requiere validación`, según la evidencia.

## 4. Carril A — frontend/prototipo

Se conserva `modules/aseguradoras.js` como renderer canónico.

La proyección aditiva ahora:

1. fusiona el modelo vivo de `Orbit.services.aseguradorasKnowledgeP09.read(...)`;
2. fusiona `aseguradoras.docs`;
3. fusiona el catálogo documental y bindings iniciales;
4. fusiona el resumen sanitizado configurado por tenant;
5. elimina duplicados por `documentId/id/nombre`;
6. no sobrescribe un estado operativo más avanzado;
7. muestra una advertencia honesta cuando el mapeo existe pero la persistencia operativa sigue incompleta.

El orden preferido del directorio también deja de ser una regla visual rígida y se configura desde el tenant mediante:

```js
preferredInsurerCountryOrder: ['GT', 'CO']
```

## 5. Carril B — backend protegido

No se modificaron:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- Auth;
- Firestore Rules;
- loaders/guards de backend;
- writers documentales;
- gates de habilitación;
- reglas de Cotizador/Comparativo.

El resumen sanitizado declara:

```text
containsCommercialRates: false
containsPII: false
containsSecrets: false
enablesCotizador: false
enablesComparativo: false
```

La proyección solo lee y compone. No escribe conocimiento, no activa productos y no convierte resultados sanitizados en reglas vigentes.

## 6. Carril C — información A&S

Se registró un resumen sanitizado de:

- 6 aseguradoras de Guatemala;
- 8 libros Excel;
- 3 cotizaciones PDF;
- 6,357 hechos candidatos detectados en Excel;
- alertas reales por fórmulas rotas y referencias externas;
- estructuras de presentación y comparación detectadas.

Este resumen no sustituye los manifiestos completos ni las tasas exactas. Su objetivo es que la plataforma muestre el trabajo realizado mientras se completa la sincronización operativa de las colecciones.

## 7. Archivos

### Modificados

- `data/tenant-alianzas-soluciones-insurers-p10.js`
  - orden de países configurable;
  - referencia configurable al resumen de conocimiento.

- `modules/aseguradoras-frontend-projection-v20260716.js`
  - fusión de conocimiento vivo, catálogo y resumen sanitizado;
  - estados honestos;
  - API verificable de proyección;
  - carga de estilos y resumen por configuración del tenant.

### Nuevos

- `data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js`;
- `styles/aseguradoras-frontend-projection-v20260716.css`;
- `tools/orbit360-validar-recuperacion-frontend-conocimiento-v20260716.mjs`;
- `.github/workflows/orbit360-frontend-knowledge-recovery-v20260716.yml`;
- este documento.

## 8. Gate automático

El validador comprueba:

- sintaxis JavaScript;
- conservación del renderer canónico;
- ausencia de escritura/habilitación desde la proyección;
- existencia de guardas de menú móvil y confidencialidad;
- configuración GT antes de CO;
- 6 aseguradoras, 11 fuentes, 8 Excel y 3 PDF;
- total sanitizado de 6,357 hechos;
- ausencia de secretos y rutas locales;
- proyección de tres fuentes de AseGuate;
- cambio de estado desde lectura pendiente a mapeado/sincronización pendiente.

La validación automática no sustituye el gate visual de escritorio, tableta y móvil.

## 9. Claude/prototipo — replicable

Claude debe incorporar de forma canónica, no como bridge acumulado:

1. Sección normalizada `Tarifas y conocimiento` que combine fuentes, reglas, presentaciones, bindings, revisiones y estados.
2. Estado diferenciado `mapeado_pendiente_sincronizacion`.
3. Orden de país preferido configurable por tenant.
4. Fusión de modelos sin devolver prematuramente una colección vacía.
5. Mensaje que impida repetir una importación o mapeo ya ejecutado.
6. Métricas responsive de conocimiento.
7. Lectura separada de edición.
8. Gate legal idempotente y menú móvil con un único comportamiento.

No se traslada a Claude:

- información comercial exacta A&S;
- tasas;
- PII;
- secretos;
- rutas;
- configuración Firebase;
- lógica exclusiva de seguridad o persistencia.

## 10. Impacto en Academia

### Dirección/Superadmin

- Interpretar diferencia entre mapeo forense, sincronización, validación y habilitación.
- Revisar advertencias de fórmulas/referencias externas.
- Confirmar relaciones por producto y variante antes del segundo gate.

### Operativo

- Consultar qué fuentes ya fueron procesadas.
- Crear gestión de corrección si una fuente mapeada no aparece en las colecciones operativas.
- No volver a importar el archivo para resolver una falla de proyección.

### Asesor

- Distinguir una fuente mapeada de una tarifa vigente.
- Usar únicamente productos y reglas expresamente habilitados.

### Evaluación

Caso: “La ficha muestra 2,340 hechos mapeados para BAM Vehículos, pero cero reglas persistidas”. Respuesta correcta: el mapeo existe; debe sincronizarse, revisarse y pasar los gates. No debe repetirse ni habilitarse automáticamente.

## 11. Pendientes y siguiente acción

1. Esperar resultado del gate automático del nuevo HEAD.
2. Ejecutar gate runtime de Dirección escritorio, Operativo tableta y Asesor móvil.
3. Confirmar visualmente una sola vez:
   - menú completo;
   - confidencialidad al primer clic;
   - GT antes de CO;
   - ficha en lectura;
   - resumen mapeado visible en AseGuate, BAM, Banrural, Bantrab, Columna y Universales.
4. Inventariar qué reglas/presentaciones/bindings completos ya están en Firestore y cuáles permanecen solo en resultados temporales.
5. Sincronizar únicamente los resultados faltantes mediante diff, revisión y confirmación; no remapear.
6. Implementar carga segura de logotipo con `fileRef`.
7. Cerrar Aseguradoras y continuar Cotizador/Comparativo sobre la misma fuente canónica.

## 12. Estado del plan

```text
CRM: no reabrir sin regresión comprobada.
Aseguradoras frontend: recuperación implementada; gate automático/visual pendiente.
Aseguradoras conocimiento: trabajo mapeado ya visible en resumen; sincronización operativa pendiente.
Cotizador/Comparativo: siguiente módulo tras cierre de Aseguradoras.
Ops/Leads: posterior.
Producción: bloqueada hasta backend productivo, Auth/tenant, carga controlada y smoke final.
```
