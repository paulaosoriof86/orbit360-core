# Claude acumulado — writer de comisiones y barrera de aprobación visual

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Para importaciones que materializan una misma fila en varios destinos:

1. construir un conjunto candidato determinista;
2. sellarlo con digest;
3. verificar snapshot de destinos;
4. rechazar estados parciales;
5. crear todos los documentos en una sola transacción;
6. verificar cada documento después del commit;
7. disponer de rollback exacto bajo ownership del mismo gate;
8. separar el estado de escritura del estado de aprobación visual.

## Aplicación cerrada

```text
candidatas: 5
colecciones destino: 3
documentos: 15
transacción: única
post-verificación: 15/15
```

No replicar datos reales, IDs, montos, pólizas, recibos ni fuentes privadas.

## Regla visual

El writer preservó expresamente:

```text
Clientes: aprobado
Pólizas: no aprobado
Vehículos: no aprobado
Recibos: no aprobado
Cartera: no aprobado
Resto CRM: no aprobado
```

Claude puede reutilizar la arquitectura y UX de estados honestos, pero no debe convertir `WRITE_PASS` en aprobación visual, habilitación de producción o avance automático del roadmap.

## Exclusiones

```text
BACKEND_PROTEGIDO_NO_CLAUDE:
- credenciales y secrets
- paquete privado
- writer Firestore LAB
- reglas de autorización
- IDs y trazabilidad real
```
