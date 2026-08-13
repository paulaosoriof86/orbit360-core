# Hallazgo de seguridad sanitizado — fuentes de directorios OP-2

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Alcance: fuentes recibidas para Aseguradoras  
Clasificación: revisión separada del dry-run

## Hallazgo

Una de las fuentes contiene hojas ajenas al directorio operativo con señales de configuración, acceso o información interna.

Este documento no registra:

- valores;
- nombres de personas;
- usuarios;
- contraseñas;
- identificadores técnicos;
- enlaces;
- rutas;
- proyectos relacionados;
- contenido celda por celda.

## Riesgo

Sin cuarentena, una hoja ajena podría:

- interpretarse como una entidad del directorio;
- generar operaciones inválidas;
- llegar a una sesión de recursos protegidos;
- contaminar la trazabilidad de Aseguradoras;
- mezclar proyectos o fuentes independientes.

## Control aplicado

```txt
core/aseguradoras-op2-sheet-quarantine.js
```

La hoja queda excluida antes de:

```txt
parser
normalización
captura protegida
operaciones
dry-run
aplicación
```

El reporte conserva únicamente hoja, motivo y conteos agregados. No conserva el contenido excluido.

## Decisión operativa

```txt
Directorio Aseguradoras:
  continúa mediante hojas permitidas

Contenido ajeno:
  no se importa
  no se documenta con valores
  no se traslada al repositorio
  no se usa para configurar Orbit 360
```

## Revisión separada requerida

Antes de producción, una persona autorizada debe revisar fuera del importador si los accesos o configuraciones presentes en la fuente continúan vigentes y, cuando corresponda, rotarlos o revocarlos.

Esta revisión:

- no forma parte del dry-run de Aseguradoras;
- no autoriza cambios de Auth, reglas o integraciones;
- no debe mezclar Orbit 360 con otros proyectos;
- debe dejar auditoría sin revelar valores.

## Estado

```txt
Cuarentena: implementada
Contenido excluido del parser: sí
Valores copiados al repositorio: no
Valores mostrados en reportes: no
Escrituras: 0
Revisión de vigencia/rotación: pendiente fuera del importador
Producción: no autorizada
```

## Carriles

```txt
Carril A:
  Academia enseña cuarentena y mensajes operativos.

Carril B:
  contenido excluido antes del parser y captura.

Carril C:
  hojas permitidas continúan al dry-run por país;
  contenido ajeno permanece fuera de la migración.
```
