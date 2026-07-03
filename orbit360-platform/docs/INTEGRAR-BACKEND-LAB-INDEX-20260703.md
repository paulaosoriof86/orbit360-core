# Integrar Backend LAB en index central

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Script:** `tools/orbit360-integrar-backend-lab-index.ps1`  
**Estado:** script creado, pendiente ejecución local.

## 1. Motivo

El `index.html` central carga `data/store.js` y `data/store-firestore-lab.local.js`, pero puede no cargar permanentemente:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
```

Sin esos archivos, el modo:

```txt
?orbitBackend=firestore-lab&tenant=alianzas-soluciones
```

puede no inicializar Firebase/Auth correctamente desde el index central.

## 2. Por qué se hizo por script y no editando HTML directo desde GitHub

`index.html` es un archivo grande y actualmente tiene señales de codificación sensible/mojibake heredado. Para evitar dañar contenido visual, textos o símbolos del prototipo, se creó un script que:

- valida rama correcta;
- crea backup local;
- inserta solo las dos líneas necesarias;
- verifica orden final;
- genera reporte;
- no hace commit, push ni deploy automático.

## 3. Qué inserta

Antes de:

```html
<script src="data/store.js?v1268"></script>
```

inserta:

```html
<script src="core/backend-lab-loader.js?v=lab-v99"></script>
<script src="core/backend-lab-init.js?v=lab-v99"></script>
```

El orden esperado queda:

```txt
backend-lab-loader.js
backend-lab-init.js
data/store.js
data/store-firestore-lab.local.js
data/seed.js
```

## 4. Restricciones

El script NO hace:

- deploy;
- Hosting;
- producción;
- secretos;
- datos reales;
- commit automático;
- push automático.

## 5. Flujo recomendado

1. Ejecutar `tools/orbit360-integrar-backend-lab-index.ps1`.
2. Revisar reporte automático.
3. Ejecutar `tools/orbit360-smoke-ays-lab-v99.ps1`.
4. Si ambos pasan, documentar resultado.
5. Solo después decidir commit/push o continuar ajustes.

## 6. Estado

**Estado:** LISTO PARA EJECUCIÓN LOCAL.  
**Siguiente acción:** ejecutar primero integración local y luego smoke LAB A&S.
