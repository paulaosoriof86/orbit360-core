# Checklist prevalidación LAB — fuentes separadas A&S

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** checklist operativo documental  
**Estado:** vigente; no ejecuta carga ni requiere archivo inmediato.

## 1. Objetivo

Definir una lista de control para revisar cada archivo separado antes de cualquier dry-run, carga LAB o escritura Firestore.

## 2. Checklist general por archivo

Antes de procesar un archivo, confirmar:

| Control | Debe cumplirse |
|---|---|
| Alcance del archivo identificado | Sí |
| Tipo de fuente seleccionado | Sí |
| País detectado o declarado | Sí |
| Moneda coherente con país | Sí |
| Columnas principales detectadas | Sí |
| Mapeo columna → campo revisado | Sí |
| Datos sensibles no se subirán al repo | Sí |
| No se modifica `data/store.js` | Sí |
| No se escribe Firestore | Sí, salvo autorización explícita |
| Dry-run previo disponible | Sí |
| Reporte de exclusiones generado | Sí |
| Reglas de deduplicación aplicadas | Sí |
| Errores bloqueantes revisados | Sí |

## 3. Validación de alcance

El importador/backend debe clasificar el archivo en una sola opción principal:

```txt
clientes
polizas
cobros_realizados
planilla_aseguradora
estado_cuenta
financiero_historico
siniestros
documentos_soporte
configuracion/catalogo
```

Si el archivo mezcla varias entidades:

```txt
estado = requiere_validacion
accion = pedir separación o mapeo explícito
```

## 4. Checklist clientes

Debe validar:

- documento/NIT/DPI/cédula si existe;
- nombre completo o razón social;
- país;
- teléfono/correo si existen;
- asesor responsable si aplica;
- duplicados por documento;
- duplicados probables por nombre/teléfono/correo;
- clientes sin identificador;
- registros sin país.

Bloquea carga si:

- no hay forma confiable de identificar cliente;
- país no es confiable;
- hay duplicados críticos sin resolución;
- se intenta crear pólizas/cobros desde clientes.

## 5. Checklist pólizas

Debe validar:

- número de póliza;
- cliente asociado;
- aseguradora homologada;
- país;
- moneda;
- ramo/producto;
- estado de póliza explícito o regla validada;
- vigencia inicio/fin;
- prima neta y prima total si aplica;
- forma de pago si se generarán recibos;
- asesor responsable.

Bloquea carga si:

- país/moneda no confiables;
- aseguradora no existe en catálogo del país;
- cliente no se puede asociar;
- número de póliza duplicado con conflicto;
- estado cancelada/anulada se infiere sin dato explícito;
- se intenta crear cartera sin saldo/estado real.

## 6. Checklist cobros realizados

Debe validar:

- fecha de pago;
- monto pagado;
- moneda;
- país;
- cliente o póliza asociable;
- recibo/referencia si existe;
- aseguradora si aplica;
- medio de pago/cuenta si existe;
- estado confirmado de pago.

Bloquea carga si:

- pago no está confirmado;
- moneda no coincide con país;
- no se puede asociar ni dejar como pendiente controlado;
- se intenta convertir cobro realizado en cartera pendiente;
- se intenta duplicar el mismo pago.

## 7. Checklist planillas de aseguradoras

Debe validar:

- aseguradora homologada;
- periodo;
- país/moneda;
- póliza/cliente si existen;
- prima neta;
- comisión base/porcentaje;
- estado de cobro/pago reportado por aseguradora;
- fecha de reporte.

Bloquea carga si:

- aseguradora no homologada;
- periodo no confiable;
- prima/comisión no numérica;
- mezcla monedas;
- intenta crear clientes/pólizas sin validación;
- intenta reconocer comisión sin prima neta recaudada cuando aplique.

## 8. Checklist estados de cuenta

Debe validar:

- banco;
- cuenta;
- país;
- moneda;
- fecha;
- descripción;
- débito/crédito/saldo;
- referencia bancaria si existe.

Bloquea carga si:

- moneda no coincide con país;
- no se puede distinguir débito/crédito;
- hay saldos inconsistentes;
- intenta crear pólizas/cobros automáticamente;
- contiene cuentas o datos sensibles que se pretendan subir al repo.

## 9. Checklist financiero histórico

Debe validar:

- hoja mensual GT/CO;
- periodo;
- país;
- moneda;
- bloque ingreso/egreso/saldo anterior;
- subtotal/total excluido;
- saldo anterior separado;
- mayo/junio/julio no mezclados con histórico cerrado;
- categorías preliminares con validación.

Bloquea carga si:

- se procesa hoja de producción;
- se crean entidades CRM;
- se mezcla GTQ/COP;
- no hay regla de saldo anterior;
- hay registros sin periodo/país/monto.

## 10. Checklist siniestros

Debe validar:

- cliente;
- póliza si existe;
- aseguradora;
- fecha de reclamo;
- estado;
- responsable;
- monto reclamado/pagado si aplica;
- última y próxima gestión;
- documentos soporte.

Bloquea carga si:

- no hay cliente/póliza asociable y no se marca como pendiente;
- estado no confiable;
- se intenta crear cobros/cartera;
- faltan fechas críticas.

## 11. Reporte mínimo de dry-run por archivo

Cada dry-run debe reportar:

```txt
tipo_fuente
archivo
hojas_procesadas
hojas_excluidas
registros_detectados
registros_listos
registros_requieren_validacion
registros_excluidos
duplicados_probables
duplicados_criticos
errores_bloqueantes
campos_faltantes
siguiente_accion_recomendada
```

## 12. Decisión final por archivo

Cada archivo debe terminar en una de estas decisiones:

| Estado | Significado |
|---|---|
| listo_dryrun | Puede probarse sin escritura. |
| listo_lab_autorizacion | Requiere autorización explícita para escribir LAB. |
| requiere_validacion | Hay pendientes resolubles. |
| bloqueado | No debe procesarse. |
| superado | No usar como fuente activa. |

## 13. Restricciones cumplidas

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

**Checklist de prevalidación definido.**
