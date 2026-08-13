# Actualización plan vivo — empalme hotfix P0 Cobros + Conciliaciones v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Paula pidió continuar en bloques largos y recordar el empalme. Tras la reauditoría de certeza, el orden correcto es corregir primero los P0 que pueden afectar caja, cartera y conciliación.

## Bloque avanzado

| Bloque | Estado | Resultado |
|---|---|---|
| Empalme/hotfix P0 Cobros + Conciliaciones | Preparado y validado en sandbox | Script de hotfix validado localmente contra módulos de prototipo; documentación de empalme agregada. |

## Intermedio agregado

### Intermedio 29 — Hotfix P0 Cobros + Conciliaciones preparado

Motivo: Cobros y M5 son los módulos con mayor riesgo operativo porque pueden confundir soporte/reportado/validado/aplicado/conciliado.

Qué corrige el hotfix preparado:

```txt
Cobros:
- motivo obligatorio al validar reporte;
- motivo obligatorio al aplicar pago;
- país/moneda bloquean aplicación;
- factura metadata-only sin base64;
- factura no concilia automáticamente;
- auditoría registrada;
- validado no aplicado se conserva.

Conciliaciones:
- motivo obligatorio al validar;
- confirmación ANULAR;
- país/moneda bloquean validación;
- VALIDADA · no aplicada;
- auditoría registrada;
- no toca cobros ni aplica pagos.
```

## Estado real

```txt
Hotfix preparado y probado en entorno aislado.
Pendiente aplicar sobre worktree/repo real o convertir a commit de módulos.
```

## Pendientes actualizados

| Prioridad | Pendiente | Estado esperado |
|---|---|---|
| P0 | Aplicar hotfix Cobros + Conciliaciones al repo real | Pendiente |
| P0 | Ejecutar node --check en módulos tocados | Pendiente al aplicar |
| P0 | Documentar cierre con commit SHA | Pendiente |
| P0 | Portal metadata-only/fecha dinámica | Siguiente bloque |
| P0 | Config/Equipo gates/credentialRef | Posterior |
| P0 | Academia post roles/auditoría | Posterior |

## Próximo bloque recomendado

```txt
Aplicar hotfix P0 Cobros + Conciliaciones al repo real y cerrar el empalme de esos dos módulos.
```

Si no se puede aplicar directo por GitHub en ese momento, dejar comando único local para Paula, con backup y validación automática.

## Estado

Plan vivo actualizado. Sin merge, deploy, main ni producción.