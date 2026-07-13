# Patrón reusable Claude — importadores seguros v1.220

Fecha: 2026-07-13  
Alcance: prototipo comercializable y todos los tenants  
No contiene datos, nombres ni configuraciones de A&S

Este documento amplía el patrón v1.219. Debe aplicarse a Importadores, Aseguradoras, Configuración y Academia.

## 1. Secuencia obligatoria

```txt
archivo recibido
→ cuarentena de hojas
→ revisión preliminar sin captura
→ normalización
→ identidad y duplicados
→ dry-run
→ validación humana
→ confirmación reforzada
→ aplicación mediante servicio seguro
```

Ninguna fase posterior puede saltarse la anterior.

## 2. Cuarentena previa

Un libro multihoja no puede confiar únicamente en el nombre de las hojas. Antes del parser debe separar:

```txt
hojas operativas
índices y resúmenes
hojas de diagnóstico
hojas de personal interno
hojas técnicas o de configuración
hojas vacías
```

El dry-run muestra solamente:

```txt
nombre de hoja
motivo de exclusión
conteo agregado
```

No muestra ni conserva los valores que provocaron la exclusión.

## 3. Revisión e importación son fases diferentes

```txt
Revisión preliminar:
  captureSecure = false
  detecta hojas, versiones, alias y duplicados
  no crea una sesión de recursos protegidos
  no construye una aplicación definitiva
  no escribe

Importación preparada:
  captureSecure = true por defecto
  solo procesa hojas permitidas
  separa recursos protegidos antes del store
  permanece bloqueada hasta validación y confirmación
```

La UI no debe hacer una segunda lectura que capture nuevamente los mismos recursos.

## 4. Identidad exacta antes de actualizar

Una coincidencia aproximada nunca equivale a una identidad confirmada.

```txt
Identidad canónica exacta:
  puede proponer actualización

Versión de hoja:
  requiere revisión

Diferencia de una letra:
  requiere revisión

Inclusión parcial de nombres:
  requiere revisión

Coincidencia en país diferente:
  no se mezcla

Red o aliado:
  no se convierte en aseguradora directa
```

Las coincidencias probables reciben estado bloqueante. Nunca se fusionan ni se actualizan automáticamente.

## 5. Mensajes operativos

La interfaz debe explicar:

- qué falta;
- por qué la acción está bloqueada;
- qué puede corregir el usuario;
- cuál es el siguiente paso.

No debe mostrar:

```txt
códigos internos
nombres de almacenamiento
nombres de adaptadores
rutas técnicas
estados de laboratorio
mensajes de infraestructura
```

Un error desconocido se presenta como revisión adicional requerida, no como código crudo.

La sanitización usa texto seguro; no reescribe contenido mediante HTML.

## 6. Contrato multi-tenant

- Configurable por tipo de fuente y tenant.
- Sin nombres de empresas hardcodeados.
- Sin datos reales en el prototipo.
- Módulos operativos usan exclusivamente `Orbit.store`.
- Recursos protegidos permanecen fuera del payload operativo.
- País y moneda provienen de configuración o quedan `REQUIERE_VALIDACION`.
- El directorio no habilita tarifas.
- La aplicación exige proveedor seguro y confirmación reforzada.

## 7. UX requerida

Secciones mínimas del dry-run:

```txt
Hojas permitidas
Hojas excluidas
Crear
Actualizar
Omitir
Bloqueados
Requiere validación
Coincidencias probables
Recursos protegidos separados
```

Acciones:

```txt
Corregir fuente
Repetir revisión
Confirmar identidad
Aplicar solo validados
Cancelar sin cambios
```

## 8. Academia

La ruta por rol debe enseñar:

1. cuarentena antes del parser;
2. revisión sin captura;
3. diferencia entre identidad exacta y probable;
4. por qué no se fusiona automáticamente;
5. diferencia entre directorio y tarifa habilitada;
6. mensajes operativos sin detalles internos;
7. trazabilidad y confirmación reforzada;
8. cómo corregir y repetir el dry-run.

La actualización conserva curso, progreso y certificado; no crea rutas duplicadas.

## 9. Pruebas mínimas

1. Índice excluido por nombre.
2. Hoja técnica renombrada excluida por contenido.
3. Directorio interno excluido.
4. Hoja operativa con plataforma preservada.
5. Resultado sin valores excluidos.
6. Revisión con `captureSecure=false`.
7. Importación normal con captura protegida por defecto.
8. Versión numérica bloqueada frente a la original.
9. Diferencia de una letra bloqueada.
10. Actualización probable bloqueada.
11. Identidad canónica exacta permitida para propuesta.
12. País diferente no mezclado.
13. Error conocido traducido.
14. Error desconocido sin código crudo.
15. Cero escrituras durante cuarentena, revisión y detección.

## 10. Impacto reusable

```txt
Patrón reusable: Sí
Debe compartirse con Claude: Sí
Frontend/UX: Sí
Academia: Sí
Backend compatible: Sí
Datos A&S incluidos: No
Recursos protegidos incluidos: No
```
