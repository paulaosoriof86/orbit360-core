# Preflight sanitizado de directorios GT/CO v1.219

Fecha: 2026-07-13  
Carril: C — fuentes separadas  
Modo: lectura estructural, cero escrituras

## Alcance

Se analizaron por separado los dos libros recibidos para medir cobertura de bloques y anticipar validaciones. Este documento contiene únicamente agregados; no incluye contenido fila a fila ni valores de los recursos operativos.

## Guatemala

```txt
Hojas totales: 18
Candidatas operativas: 14
Hojas excluidas: 4
Candidatas con bloque de contactos: 13/14
Registros de contacto detectables: 152
Candidatas con bloque de plataformas: 14/14
Filas de plataforma detectables: 38
Candidatas con bloque de pagos: 13/14
Filas de pago detectables: 69
Parejas probables por nombre: 0
```

Conclusiones:

- cobertura operativa alta;
- una candidata requiere revisión de contactos;
- una candidata requiere revisión del bloque de pagos;
- las hojas excluidas permanecen fuera del parser;
- no se completa información faltante por inferencia.

## Colombia

```txt
Hojas totales: 17
Candidatas operativas: 16
Hojas excluidas: 1
Candidatas con bloque de contactos: 15/16
Registros de contacto detectables: 84
Candidatas con bloque de plataformas: 14/16
Filas de plataforma detectables: 24
Candidatas con bloque de pagos: 6/16
Filas de pago detectables: 8
Parejas probables por nombre: 2
Candidatas de red o aliado: 1
```

Conclusiones:

- cobertura de pagos incompleta y no inferible;
- dos parejas deben bloquearse para revisión humana;
- una candidata debe clasificarse como red/aliado;
- los bloques faltantes quedan como calidad incompleta.

## Reglas del dry-run

```txt
GT y CO se procesan por separado.
No hay fusiones automáticas.
Red o aliado no equivale a aseguradora directa.
Directorio importado no habilita tarifas.
La fuente no crea clientes, pólizas, cobros, cartera ni movimientos financieros.
Falta país o moneda = REQUIERE_VALIDACION.
```

## Salida esperada

Por candidata:

```txt
crear
actualizar
omitir
bloquear
requiere_validacion
```

Trazabilidad mínima:

```txt
archivo
hoja
fila
bloque
país
moneda
```

## Estado

```txt
Preflight GT: completado
Preflight CO: completado
Escrituras: 0
Aplicaciones: 0
Dry-run parser GT: pendiente tras gate visual
Dry-run parser CO: pendiente después de GT
```
