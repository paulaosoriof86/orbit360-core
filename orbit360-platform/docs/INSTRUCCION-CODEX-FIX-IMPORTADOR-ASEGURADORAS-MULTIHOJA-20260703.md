# Instrucción Codex — fix importador aseguradoras multi-hoja

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** pendiente de aplicación técnica segura; documentado desde análisis de Excel reales A&S.

## Objetivo

Habilitar el importador manual de `directorio-aseguradoras` para libros Excel multi-hoja como:

- `Directorio Aseguradoras Guatemala 2026.xlsx`
- `Directorio - Aseguradoras Colombia 2024.xlsx`

## Problema

El importador actual lee Excel, pero estos archivos tienen una estructura especial:

- cada hoja representa una aseguradora/canal;
- las primeras filas son portada/datos generales;
- la tabla de contactos inicia más abajo;
- hay filas de portales, app, web, claves y accesos;
- no se debe crear una aseguradora por cada contacto.

## Cambio requerido en `core/importa.js`

Para `state.kind === 'directorio-aseguradoras'`:

1. En lectura de Excel, antes de combinar hojas genéricamente, invocar un parser específico.
2. El parser debe devolver `state.parsed` con encabezados:

```txt
nombre, pais, codigo, nit, telefono, emergencias, whatsapp, direccion, web, app, contactosJson, portalesJson
```

3. Cada hoja operativa debe generar una sola fila de aseguradora.
4. Hojas auxiliares a excluir:

```txt
ÍNDICE / Indice
DIAGNÓSTICO
T&A
Tech
```

5. Contactos deben ir agrupados en `contactosJson`.
6. Web/app deben ir a `portalesJson`.
7. Claves/contraseñas deben marcarse como sensibles y no guardarse como texto plano.
8. `IMPORT_MAP['directorio-aseguradoras'].build()` debe parsear `contactosJson` y `portalesJson` para guardar:

```txt
contactos[]
portales[]
facturacion{}
```

## Cambio requerido en `modules/aseguradoras.js`

Agregar campo visible y editable:

```txt
Código / clave
```

Debe guardarse en `aseguradoras.codigo` y mostrarse en tarjeta/ficha.

## Verificación requerida

1. `node --check orbit360-platform/core/importa.js`
2. `node --check orbit360-platform/modules/aseguradoras.js`
3. Prueba visual manual:
   - abrir Aseguradoras;
   - botón Importar;
   - cargar Excel GT;
   - confirmar que crea 14 aseguradoras, no 152 contactos como aseguradoras;
   - cargar Excel CO;
   - confirmar que crea 16 aseguradoras/canales, no 89 contactos como aseguradoras;
   - revisar una ficha con contactos agrupados.

## Restricciones

- No subir datos reales al repo.
- No subir claves ni contraseñas.
- No tocar `Orbit.store` desde módulos.
- No reemplazar backend LAB.
- No deploy ni main.

## Estado

Pendiente de aplicación técnica segura por Codex/local. El análisis y normalización ya están realizados desde ChatGPT.
