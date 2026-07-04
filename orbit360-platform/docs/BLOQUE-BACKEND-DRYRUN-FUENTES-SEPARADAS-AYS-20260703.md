# Bloque backend — dry-run fuentes separadas A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** avance backend seguro  
**Estado:** implementado como validación estructural; sin carga LAB.

## 1. Objetivo

Avanzar backend sin esperar a Claude y sin pedir nuevos archivos, creando una compuerta técnica previa a cualquier importación real: validar que cada archivo/fuente esté clasificado correctamente antes de procesar datos.

## 2. Archivos agregados

```txt
tools/orbit360-dryrun-fuente-separada-ays.mjs
tools/orbit360-run-dryrun-fuente-separada-ays.ps1
tools/templates/orbit360-manifest-fuente-separada-ejemplo.json
orbit360-platform/docs/CONTRATO-MANIFEST-FUENTE-SEPARADA-AYS-20260703.md
```

## 3. Qué hace el validador

El script `orbit360-dryrun-fuente-separada-ays.mjs` valida un manifest estructural de fuente separada.

Valida:

- tipo de fuente;
- país declarado;
- moneda coherente;
- columnas mínimas esperadas;
- hojas sospechosas de producción/dashboard/análisis/presupuesto;
- ausencia de `rows[]` para no incluir payload real;
- destinos bloqueados por tipo de fuente;
- que financiero histórico no permita inferencias CRM;
- que mayo/junio/julio se marquen como advertencia si aparecen en histórico.

## 4. Qué NO hace

No hace:

- lectura de Excel real;
- importación;
- escritura Firestore;
- escritura LAB;
- modificación de `data/store.js`;
- creación de clientes/pólizas/cobros/cartera;
- subida de payload real;
- deploy;
- merge.

## 5. Tipos de fuente soportados

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

## 6. Decisiones de salida

```txt
listo_dryrun
requiere_validacion
bloqueado
```

## 7. Runner PowerShell

Se agregó:

```txt
tools/orbit360-run-dryrun-fuente-separada-ays.ps1
```

Características:

- recibe `-ManifestPath`;
- ejecuta el validador Node;
- genera reporte local en `_orbit360_reports`;
- copia resultado al portapapeles;
- abre reporte en Notepad;
- no hace deploy ni escritura remota.

## 8. Ejemplo de manifest

Se agregó plantilla sin filas reales:

```txt
tools/templates/orbit360-manifest-fuente-separada-ejemplo.json
```

La plantilla es estructural y debe adaptarse por fuente.

## 9. Uso futuro

Comando Node:

```txt
node tools/orbit360-dryrun-fuente-separada-ays.mjs --manifest tools/templates/orbit360-manifest-fuente-separada-ejemplo.json
```

Comando PowerShell:

```txt
.\tools\orbit360-run-dryrun-fuente-separada-ays.ps1 -ManifestPath .\tools\templates\orbit360-manifest-fuente-separada-ejemplo.json
```

No se pide ejecutarlo todavía; queda preparado para cuando llegue el primer archivo separado o cuando se quiera validar la compuerta técnica local.

## 10. Valor para backend

Este bloque permite avanzar con seguridad antes de parsear Excel/PDF/Word:

1. obliga a declarar alcance;
2. bloquea inferencias cruzadas;
3. evita que una fuente financiera cree entidades CRM;
4. reduce reprocesos;
5. deja trazabilidad de decisión;
6. mantiene payload real fuera de GitHub;
7. conserva backend LAB protegido.

## 11. Pendientes siguientes

1. Crear parser real por tipo de fuente cuando se autorice.
2. Definir si se incorporará dependencia para Excel en Node o si se procesará con el importador frontend/backend existente.
3. Crear manifests privados para archivos reales cuando Paula los proporcione.
4. Ejecutar dry-run estructural local cuando exista manifest.
5. Solo después preparar dry-run de datos, sin escritura.
6. Solo con autorización explícita considerar carga LAB.

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

**Bloque backend seguro implementado.**
