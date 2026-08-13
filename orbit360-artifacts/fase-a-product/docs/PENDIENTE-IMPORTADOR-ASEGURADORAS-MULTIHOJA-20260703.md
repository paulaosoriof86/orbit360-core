# Pendiente aplicado a prototipo base — importador aseguradoras multi-hoja

**Fecha:** 2026-07-03  
**Área:** Importador inteligente / Aseguradoras  
**Estado:** ABIERTO para prototipo base; documentado desde normalización A&S.

## Síntoma/necesidad

Los directorios reales de aseguradoras de A&S en Guatemala y Colombia no son tablas simples. Cada hoja representa una aseguradora/canal y contiene:

- datos generales en portada;
- contactos en tabla interna;
- portales, apps, web y claves;
- teléfonos y emergencias;
- observaciones operativas.

## Esperado

El importador manual debe importar este tipo de libro Excel sin convertir cada contacto en aseguradora separada.

## Lógica requerida

Para `directorio-aseguradoras`:

1. cada hoja operativa = una aseguradora/canal;
2. extraer nombre, país, código/clave, NIT, oficina, emergencias, WhatsApp, dirección, app y web;
3. detectar fila interna de contactos por encabezados como NOMBRE/CARGO/EMAIL/CELULAR;
4. guardar contactos en `contactos[]`;
5. guardar web/app en `portales[]`;
6. marcar claves/usuarios/contraseñas como sensibles y no guardar texto plano;
7. deduplicar por nombre + país;
8. permitir remapeo manual si no detecta encabezados.

## Impacto comercializable

Este ajuste no es exclusivo de A&S. Aplica al prototipo base Orbit 360 porque otros corredores pueden entregar directorios similares por hoja de aseguradora.

## Estado

ABIERTO / aplicar a prototipo base.
