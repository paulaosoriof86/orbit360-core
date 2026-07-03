# Pendiente prototipo base — importador movimientos multi-sección

**Fecha:** 2026-07-03  
**Área:** Importador inteligente / Finanzas / Producción  
**Estado:** ABIERTO para prototipo base; documentado desde normalización A&S.

## Síntoma/necesidad

El archivo real `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` no es un Excel plano. Tiene:

- hojas por mes y país;
- sección de ingresos;
- sección de egresos;
- presupuestos laterales;
- análisis y dashboards;
- listado de producción dentro del mismo libro.

Si se importa como tabla simple, puede mezclar resúmenes como movimientos reales.

## Esperado

El importador manual debe detectar secciones internas y clasificar correctamente:

```txt
Ingresos/Egresos reales -> finmovs
Pendiente/No Facturado -> facturas CxC/CxP
Listado producción -> polizas/clientes/aseguradoras/asesores
Dashboards/resúmenes -> no importar como movimientos
```

## Lógica requerida

1. Detectar país por hoja: GT / CO.
2. Detectar periodo por hoja: mes/año.
3. Ubicar encabezado de ingresos: CONCEPTO / PAGADOR.
4. Ubicar encabezado de egresos: CONCEPTO / BENEFICIARIO.
5. Ignorar cuadros laterales de presupuesto, dashboard y análisis.
6. Clasificar estado:
   - Recaudado/Pagado/Histórico -> `finmovs`.
   - Pendiente/No Facturado -> CxC/CxP.
7. Aplicar moneda por país sin mezclar.
8. Detectar hoja `Listado producción 2025-2026` como fuente de pólizas, no finanzas.

## Impacto comercializable

Este ajuste aplica a cualquier corredor que lleve caja y producción en libros mensuales multi-sección. Debe formar parte del prototipo base Orbit 360.

## Estado

ABIERTO / aplicar a prototipo base.
