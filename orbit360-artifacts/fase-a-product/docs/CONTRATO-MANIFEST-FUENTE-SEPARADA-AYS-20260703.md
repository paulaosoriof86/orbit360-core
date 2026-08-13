# Contrato de manifest — fuente separada A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Script relacionado:** `tools/orbit360-dryrun-fuente-separada-ays.mjs`  
**Estado:** implementado como validación estructural sin datos reales.

## 1. Objetivo

Definir el formato mínimo de manifest para validar una fuente separada antes de cualquier dry-run real, carga LAB o escritura Firestore.

El manifest describe estructura, no datos reales.

## 2. Restricciones

El manifest NO debe incluir:

- filas reales;
- nombres de clientes;
- números de póliza;
- importes;
- terceros reales;
- teléfonos;
- correos;
- cuentas bancarias;
- secretos;
- credenciales;
- payload JSON importable.

Debe incluir solo:

- tipo de fuente;
- archivo declarado;
- país/moneda declarados;
- hojas;
- columnas;
- conteos estructurales si aplica;
- intención de destino;
- banderas de seguridad.

## 3. Tipos de fuente soportados

```txt
clientes
polizas
cobros_realizados
planilla_aseguradora
estado_cuenta
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
```

## 4. Estructura mínima sugerida

```json
{
  "source_type": "clientes",
  "file_name": "clientes_actualizados.xlsx",
  "declared_country": "GT",
  "declared_currency": "NO_APLICA",
  "contains_real_data": true,
  "contains_real_payload": false,
  "requested_targets": ["clientes"],
  "sheets": [
    {
      "name": "Clientes",
      "country": "GT",
      "currency": "NO_APLICA",
      "rows_detected": 0,
      "columns": [
        "nombre_cliente",
        "documento_numero",
        "pais",
        "telefono",
        "correo"
      ]
    }
  ]
}
```

## 5. Estados de salida

| Estado | Significado |
|---|---|
| `listo_dryrun` | El manifest no tiene errores ni advertencias estructurales. |
| `requiere_validacion` | Hay advertencias; no debe escribirse LAB hasta revisar. |
| `bloqueado` | Hay errores bloqueantes. |

## 6. Validaciones del script

El script valida:

1. `source_type` permitido.
2. País declarado.
3. Moneda coherente con país.
4. Columnas mínimas por tipo de fuente.
5. Hojas sospechosas de producción/dashboard/análisis/presupuesto.
6. Que el manifest no contenga `rows[]`.
7. Que no se soliciten destinos bloqueados para la fuente.
8. Que financiero histórico no permita inferencias CRM.
9. Que mayo/junio/julio queden como advertencia si se declaran en histórico.

## 7. Destinos permitidos por fuente

| Fuente | Destino permitido |
|---|---|
| clientes | `clientes` |
| polizas | `polizas` |
| cobros_realizados | `cobros` |
| planilla_aseguradora | `comisiones`, `conciliacion` |
| estado_cuenta | `finmovs`, `conciliacion` |
| financiero_historico | `finmovs` |
| siniestros | `reclamos`, `gestiones` |
| documentos_soporte | `documentos` |
| configuracion_catalogo | `aseguradoras`, `asesores`, `catalogos` |

## 8. Destinos bloqueados

El script bloquea inferencias cruzadas, por ejemplo:

- financiero histórico → clientes/pólizas/cobros/cartera;
- estados de cuenta → clientes/pólizas/cobros automáticos/cartera;
- clientes → pólizas/cobros/cartera/finmovs;
- cobros realizados → cartera pendiente;
- siniestros → cobros/cartera.

## 9. Comando de uso futuro

No ejecutar sin tener manifest estructural preparado.

```txt
node tools/orbit360-dryrun-fuente-separada-ays.mjs --manifest ruta/al/manifest.json
```

El reporte se escribe localmente en:

```txt
_orbit360_reports/
```

## 10. Salida permitida

El reporte contiene:

- archivo declarado;
- tipo de fuente;
- destino permitido;
- decisión;
- hash estructural;
- errores;
- advertencias;
- notas.

No contiene filas reales ni payload importable.

## 11. Relación con importador real

Este script no reemplaza el importador real.

Sirve como gate previo para garantizar que, antes de leer datos completos o ejecutar un parser de Excel/PDF/Word, la fuente esté clasificada y no contamine otras entidades.

## 12. Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.

## Estado

**Contrato de manifest definido e implementado en validador estructural.**
