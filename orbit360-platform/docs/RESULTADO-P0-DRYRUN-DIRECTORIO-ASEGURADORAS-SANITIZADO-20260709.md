# Resultado P0 — dry-run sanitizado Directorio de Aseguradoras

Fecha: 2026-07-09  
Carril: C con soporte B  
Fuente: configuración catálogo / aseguradoras  
Estado: lectura local sanitizada, sin escritura real, sin payload real en repo.

## Fuente revisada

Archivos reales usados en lectura local:

- Directorio Aseguradoras Guatemala 2026.xlsx
- Directorio - Aseguradoras Colombia 2024.xlsx

No se subieron datos personales, correos, teléfonos, cuentas, usuarios, contraseñas ni valores de acceso al repositorio.

## Resultado consolidado sanitizado

| País | Hojas operativas | Filas inspeccionadas | Aseguradoras propuestas | Contactos propuestos | Gestiones credentialRef | Filas con posible acceso/credencial | Filas con datos banco/pago |
|---|---:|---:|---:|---:|---:|---:|---:|
| GT | 14 | 572 | 14 | 152 | 14 | 22 | 31 |
| CO | 16 | 695 | 16 | 88 | 16 | 95 | 16 |
| Total | 30 | 1267 | 30 | 240 | 30 | 117 | 47 |

## Operaciones P0 propuestas, sin escritura

| Colección destino | Operaciones sanitizadas | Estado |
|---|---:|---|
| aseguradoras | 30 | Propuestas, pendientes de revisión humana. |
| contactosAseguradora | 240 | Propuestas, datos sensibles sanitizados en reporte. |
| gestiones | 30 | Solo referencia segura `credentialRef: backend_required`; no guarda valores de acceso. |

## Bloqueos aplicados

La fuente `directorio_aseguradoras` no puede crear ni modificar:

- clientes
- polizas
- cobros
- recibosEsperados
- carteraPrimas
- finmovs
- cxcComisiones
- cxpAsesores
- usuarios
- roles
- permisos
- secrets
- credenciales

## Hallazgo técnico corregido

Durante la preparación de ejecución real se detectó un riesgo en el builder del directorio:

- Causa raíz: la deduplicación de aseguradora cortaba el procesamiento de filas repetidas de la misma aseguradora.
- Impacto: se podía crear una aseguradora correctamente, pero perder contactos adicionales en filas posteriores.
- Fix: ahora la deduplicación solo crea una aseguradora por llave, pero conserva múltiples contactos, catálogos y gestiones asociadas a esa misma aseguradora.
- Archivo: `orbit360-platform/core/importa-directorio-aseguradoras-p0.js`.
- Smoke actualizado: `tools/orbit360-test-importa-directorio-aseguradoras-p0.mjs`.

## Decisión segura

Este dry-run no queda aprobado para escritura. Para avanzar a escritura real se requiere:

1. reporte sanitizado revisado;
2. confirmación humana de dry-run;
3. frase exacta `CONFIRMO DRY RUN`;
4. lote de escritura controlada;
5. frase exacta `CONFIRMO ESCRITURA CONTROLADA`;
6. auditoría antes/después y rollback disponible.

## Estado

`DRYRUN_DIRECTORIO_ASEGURADORAS_SANITIZADO_EJECUTADO_SIN_ESCRITURA`
