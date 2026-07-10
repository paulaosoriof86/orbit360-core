# Reporte de ejecución sanitizada — ocho cotizadores Excel P0.6b

Fecha: 2026-07-10  
Carril: C con traducción a B  
Estado: `EJECUTADO_FUERA_REPOSITORIO / MANIFIESTOS_NO_PUBLICADOS / VALIDACION_PENDIENTE`

## 1. Alcance

Se ejecutó el extractor P0.6b sobre los ocho libros reales entregados por A&S. Cada archivo se procesó por separado, conservando su hash, hojas, rangos, fórmulas, rutas de salida y combinación propuesta.

No se subieron:

- libros fuente;
- manifiestos completos;
- tasas o importes exactos;
- nombres de clientes;
- documentos, placas o contactos;
- fórmulas completas vinculadas a datos reales.

Los conteos siguientes describen volumen y complejidad, no datos comerciales.

## 2. Resultados por fuente

| Fuente | Hechos | Numéricos | Con fórmula cacheada | Tablas candidatas | Grupos | Rutas de salida | PII redactada | Errores fórmula |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| AseGuate tarifario | 41 | 27 | 0 | 0 | 5 | 0 | 0 | 0 |
| BAM Salud | 534 | 309 | 218 | 16 | 70 | 6 | 10 | 0 |
| BAM Vehículos | 2,340 | 1,993 | 1,678 | 76 | 260 | 7 | 121 | 0 |
| Banrural Autos | 484 | 256 | 240 | 11 | 107 | 1 | 22 | 1 |
| Banrural Salud | 945 | 594 | 460 | 20 | 64 | 5 | 14 | 0 |
| Bantrab Autos | 861 | 708 | 597 | 21 | 86 | 3 | 26 | 2 |
| Bantrab Motos | 667 | 578 | 503 | 10 | 68 | 3 | 22 | 0 |
| Columna Vehículos | 485 | 225 | 226 | 12 | 145 | 1 | 102 | 1 |

Estos conteos proceden de la ejecución forense completa usada para calibrar el contrato. El extractor reusable incorporado al repositorio conserva el mismo esquema de salida y las fronteras de seguridad, pero los resultados operativos siempre deben regenerarse desde la fuente autorizada.

## 3. Clústeres detectados

### AseGuate

```text
pricing: 3
financing: 1
dimensions: 1
```

Se detectaron tres bloques tarifarios de producto y un calendario de financiamiento global. El financiamiento no se asignó automáticamente a ninguno de los productos.

### BAM Salud

```text
pricing: 31
health_matrix: 14
dimensions: 17
presentation: 3
financing: 5
```

Confirma matrices, planes y salidas múltiples.

### BAM Vehículos

```text
pricing: 96
dimensions: 97
presentation: 44
financing: 23
```

Es la fuente más amplia y confirma la necesidad de routing por tipo/uso de vehículo.

### Banrural Autos

```text
pricing: 13
dimensions: 84
presentation: 4
financing: 6
```

Una fórmula con error debe quedar bloqueada. La alta cantidad de dimensiones confirma que las reglas no pueden reducirse a una tasa única.

### Banrural Salud

```text
pricing: 27
health_matrix: 19
dimensions: 7
presentation: 8
financing: 3
```

Confirma tratamiento separado de edad, género, maternidad, dental y planes.

### Bantrab Autos

```text
pricing: 20
dimensions: 34
presentation: 9
financing: 23
```

Se detectaron errores y referencias externas. No se trasladan al runtime.

### Bantrab Motos

```text
pricing: 10
dimensions: 20
presentation: 11
financing: 27
```

Las rutas Completo, Robo y RC deben permanecer separadas.

### Columna

```text
pricing: 42
dimensions: 80
presentation: 16
financing: 7
```

Se detectaron PII, referencias externas y un error de fórmula. La salida dinámica requiere revisión antes de normalizarla.

## 4. Advertencias reales

```text
Banrural Autos: FORMULA_ERRORS_DETECTED
Bantrab Autos: FORMULA_ERRORS_DETECTED + EXTERNAL_REFERENCES_DETECTED
Bantrab Motos: EXTERNAL_REFERENCES_DETECTED
Columna: FORMULA_ERRORS_DETECTED + EXTERNAL_REFERENCES_DETECTED
```

Una referencia externa o fórmula rota no se interpreta como cero ni como regla válida. Permanece `REQUIERE_VALIDACION`.

## 5. Resultado de PII

Se redactaron celdas sensibles en cinco fuentes con ejemplos operativos. La redacción contempla:

- etiqueta y valor en una misma celda;
- etiqueta en una celda y valor en la celda adyacente;
- correos;
- teléfonos;
- documentos e identificadores largos;
- placas, chasis y motor.

Los valores tarifarios no se consideran PII, pero tampoco se publican en la documentación o core reusable.

## 6. Estado de las propuestas

La ejecución genera candidatos, no reglas activas.

```text
fuente leída
→ hechos candidatos
→ grupos semánticos
→ mapping propuesto
→ diff
→ revisión humana
→ reconciliación con cotización ejemplo
→ segundo gate
```

Ningún libro quedó habilitado para Cotizador o Comparativo.

## 7. Próxima revisión priorizada

1. AseGuate: completar componentes faltantes mediante cotizaciones oficiales.
2. BAM Vehículos: validar routing y componentes por categoría.
3. Bantrab Autos/Motos: aislar referencias externas y reglas válidas.
4. Columna: comprobar gasto, financiamiento y salida dinámica.
5. Banrural Autos: resolver fórmula y tabla de mínimos divergente.
6. Salud: validar matrices, bases brutas/netas y opcionales.
