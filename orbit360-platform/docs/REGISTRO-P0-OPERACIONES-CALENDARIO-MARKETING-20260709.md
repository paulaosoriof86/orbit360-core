# REGISTRO P0 — Operaciones propuestas Calendario Marketing

Fecha: 2026-07-09  
Carril: C con soporte B  
Fuente real de referencia: `AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx`  
Estado: `IMPLEMENTADO_ADITIVO_PENDIENTE_SMOKE_VISIBLE`

## Objetivo

Convertir el calendario maestro de contenidos en operaciones propuestas sanitizadas para Orbit 360, sin escribir datos reales y sin mezclar marketing con clientes, pólizas, cobros, cartera, comisiones o finanzas.

## Alcance P0

El builder `core/importa-calendario-marketing-p0.js` normaliza filas del calendario y propone operaciones para:

- `contenidos`
- `campanasMarketing`
- `gestiones`

La fuente queda registrada como:

```txt
calendario_marketing
```

## Fuente inspeccionada

El archivo real contiene un cronograma maestro de 90 días, con panel de control y una tabla operativa de contenidos. El panel indica:

- Periodo: junio a agosto 2026.
- Total piezas: 92.
- Estado inicial: pendientes.
- Canales previstos: Facebook GT, Facebook CO, Instagram GT, LinkedIn binacional, WhatsApp GT y WhatsApp CO.
- Pauta: algunos contenidos tienen pauta sugerida y presupuesto recomendado.

No se sube el payload real al repo.

## Reglas de conversión

### `contenidos`

Por cada fila válida se propone un registro con:

- código de contenido;
- fecha programada;
- hora sugerida;
- estado general;
- funnel;
- campaña;
- pilar;
- segmento;
- tema/gancho;
- desarrollo central;
- formato;
- herramienta sugerida;
- prompt de recurso;
- plataformas previstas;
- copies por canal;
- CTA por país;
- hashtags;
- WhatsApp GT/CO;
- producción/aprobación/programación;
- trazabilidad de fuente.

### `campanasMarketing`

Solo se propone si la fila indica pauta activa o sugerida. Incluye:

- país pauta;
- campaña Meta sugerida;
- objetivo de pauta;
- audiencia;
- cobertura;
- fechas de pauta;
- días;
- presupuesto sugerido en GTQ;
- UTM campaign/content;
- estado pauta.

### `gestiones`

Se crea gestión si falta recurso final, si producción está pendiente o si requiere aprobación humana antes de publicar/programar.

## Bloqueos

La fuente `calendario_marketing` no puede crear ni modificar:

```txt
clientes
polizas
cobros
recibosEsperados
carteraPrimas
finmovs
cxcComisiones
cxpAsesores
usuarios
roles
permisos
secrets
credenciales
```

## Validación humana

Todas las operaciones quedan con `validationStatus: pendiente_revision`, por lo que el dry-run no debe pasar a escritura automática.

Flujo esperado:

```txt
calendario real
→ filas normalizadas
→ operaciones propuestas
→ dry-run sanitizado
→ revisión humana
→ confirmación futura
→ escritura controlada vía Orbit.store
```

## Academia

Debe agregarse en Academia:

- cómo importar calendario de contenidos;
- cómo revisar contenidos propuestos;
- diferencia entre contenido orgánico y pauta;
- cómo validar presupuesto sugerido sin crear movimiento financiero;
- cómo aprobar recurso final antes de programar;
- cómo usar IA/Canva/HeyGen/NotebookLM sin exponer integraciones no conectadas.

## Pendientes

1. Ejecutar smoke visible en GitHub Actions o validación local.
2. Conectar reporte visual específico para calendario dentro del drawer/importador.
3. Ejecutar dry-run real local sanitizado con el archivo completo si se autoriza la validación local.
4. No hacer escritura real hasta dry-run aprobado + confirmación reforzada.
