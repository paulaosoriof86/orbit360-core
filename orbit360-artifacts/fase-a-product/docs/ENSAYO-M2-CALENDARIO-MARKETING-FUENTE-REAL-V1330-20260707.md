# Ensayo M2 — Calendario de contenidos v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir el primer ensayo controlado de importación real usando una fuente de bajo riesgo: calendario de contenidos.

Esta fuente no debe tocar cartera, pólizas, cobros, producción, comisiones, finanzas ni clientes.

## Fuente revisada localmente

Archivo local:

```txt
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx
```

Solo se revisó estructura.
No se subió el archivo al repo.
No se copiaron contenidos del calendario al repositorio.
No se cargaron datos reales.

## Estructura observada

- Una hoja principal llamada `Cronograma 90D`.
- Panel superior de control.
- Tabla operativa con encabezados a partir de fila 6.
- Bloque de aproximadamente 90+ piezas de contenido.

## Mapeo recomendado

| Campo Orbit | Fuente sugerida |
|---|---|
| fecha | Fecha programada |
| titulo | Tema / gancho |
| tipo | Formato del recurso |
| canal | Plataformas previstas |
| enfoque | Pilar de contenido, Funnel o Segmento |
| hora | Hora sugerida |

## Riesgos del ensayo

1. La tabla no inicia en fila 1; el importador debe detectar o permitir ajustar fila de encabezado.
2. Algunas celdas contienen varias plataformas; para primer ensayo se recomienda conservarlas como texto único.
3. El archivo tiene textos largos por plataforma; para primer ensayo solo deben importarse campos base.
4. No se debe publicar, pautar, enviar ni activar canales reales desde el importador.

## Criterio de aceptación

El ensayo pasa si:

- el dry-run muestra crear, actualizar y omitir;
- se genera reporte de importación;
- solo escribe o propone registros en `contenidos`;
- no afecta otros módulos;
- conserva trazabilidad de archivo, hoja y fila;
- no marca contenido como publicado sin evidencia.

## Resultado esperado

Contenidos creados o propuestos en estado programado/pendiente, sin ejecución externa real.

## Claude

Claude no es necesario para este ensayo.
Puede entrar después para mejorar vista calendario, UX de Marketing, copy visual y Academia de Marketing.

## Estado

Documento creado.
No se tocó código funcional.
No se subió la fuente real.
No se cargaron datos reales.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No secretos.
