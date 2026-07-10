# Registro de control maestro — P0.9m

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open, sin merge ni deploy.

## Carril actual

Carriles B + C, con traducción acumulada al Carril A.

## Qué parte del plan avanzó

Se implementó un preflight técnico reanudable del primer flujo documental de Aseguradoras:

```txt
host same-origin
→ sesión segura
→ index en memoria
→ referencia AseGuate
→ lectura Excel training
→ reporte sanitizado
→ gate Claude
```

## Paso intermedio, si hubo

Se confirmó que las carpetas privadas de fuentes y reportes están ignoradas por Git. Se añadió un CLI portable para evitar diferencias de ejecución entre Linux y Windows.

## Qué quedó cerrado

### Backend/contratos

- runner P0.9m;
- CLI portable;
- wrapper PowerShell de un comando;
- reporte JSON + Markdown;
- resumen estructural sin valores;
- decisión Claude por criterios;
- workflow con Excel ficticio;
- verificación de `index.html` intacto;
- cero escritura y cero habilitación.

### Carril C

La fuente inicial queda fijada como el tarifario AseGuate ya auditado. El runner solo necesita que esté disponible dentro de la carpeta privada autorizada; no solicita rutas manuales en la interfaz.

### Claude/Academia

Se añadieron requisitos de progresión visual, copy de usuario, roles y contenidos de Academia. El paquete súper acumulado continúa creciendo desde la candidata del 8 de julio.

## Qué falta

- ejecutar el comando P0.9m en el checkout local completo;
- comprobar el reporte con la fuente real;
- abrir el formulario en navegador;
- generar preview real;
- confirmar Auth y rol activo;
- ejecutar lectura training desde la interfaz;
- persistir solo el historial mediante confirmación separada;
- recargar;
- confirmar read model;
- smoke visual/responsive;
- cerrar frontera visual con Cotizador/Comparativo;
- solicitar candidata Claude únicamente después de lo anterior.

## Riesgos controlados

| Riesgo | Control | Estado |
|---|---|---|
| Ejecutar en rama incorrecta | branch gate | cerrado |
| Pisar cambios locales | worktree clean | cerrado |
| Filtrar rutas/referencias | sanitizador + CI | cerrado |
| Publicar tasas/PII | solo conteos | cerrado |
| Modificar index | hash antes/después | cerrado |
| Escribir conocimiento | modo training/read-only | cerrado |
| Habilitar módulos | flags forzados a false | cerrado |
| Pedir Claude demasiado pronto | gate explícito | cerrado |

## Estado honesto

```txt
código P0.9m: implementado
workflow: configurado
P0.9m real local: pendiente
preview visual real: pendiente
historial tras recarga: pendiente
read model: pendiente
Claude: todavía no
```

## Siguiente acción

P0.9n — observador de runtime y reporte visual sanitizado:

```txt
capturar montaje del panel/formulario
→ estado de bridge y Auth
→ preview real
→ lectura training
→ historial
→ recarga/read model
→ checklist visual
→ decisión Claude
```

## Acción manual requerida

No requerida para continuar preparando P0.9n. La ejecución real del navegador se solicitará únicamente cuando el comando y el reporte estén completamente consolidados.
