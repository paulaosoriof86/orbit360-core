# ACTUALIZACIÓN DELTA PARA CLAUDE — RENOVACIONES v1.200

Fecha: 2026-07-11  
Base Claude: candidata v1.197  
Base viva: rama `ays/backend-tenant-lab-v99-20260703`.

## Cambios posteriores que la siguiente candidata debe recibir

```txt
modules/renewals-v1200-operational-bridge.js
data/academia-v1200-renewals.js
```

Claude debe traducir los contratos de producto y UX, no copiar backend, datos reales ni proveedores.

## Patrones obligatorios

- KPI con detalle real;
- GTQ y COP separados;
- “Abrir WhatsApp” como acción manual, no como automatización;
- campaña preparada ≠ campaña enviada;
- integración activa solo con estado conectado/verificado;
- no usar hashes, porcentajes aleatorios o proyecciones como primas de aseguradora;
- Solicitar propuestas crea/reutiliza una gestión y abre Cotizador;
- Cotizador recibe contexto de póliza origen;
- Comparativo solo usa ofertas reales/cargadas y fuentes validadas;
- no crear una nueva Póliza con número ficticio o provisional;
- mantener `renuevaDe`/`renovadaPor` en el futuro flujo de emisión;
- Asesor inicia/consulta la gestión, no emite ni altera la póliza;
- estados vacíos y bloqueos honestos;
- Academia por rol activo.

## Copy operativo requerido

Usar:

```txt
Preparar campaña
Seguimientos preparados; no enviados
Pendiente de canal conectado
Pendiente de cotización real
Abrir Cotizador
Comparar ofertas recibidas
Pendiente de emisión
```

No usar:

```txt
Propuesta enviada
WhatsApp + correo enviados
Prima estimada de aseguradora
Cotización oficial
Emisión completada
```

salvo que exista evidencia real del evento.

## Pendiente que no debe declararse cerrado

El flujo final de renovación sigue pendiente de decisión:

```txt
A) crear nueva póliza solo después del número real emitido;
B) crear una entidad Solicitud de emisión / Propuesta aceptada y convertirla después.
```

La entidad Póliza no debe usarse como borrador de pre-emisión.

## Academia

Enseñar:

- horizonte de renovación;
- KPI verificables;
- gestión única;
- cotización con fuente vigente;
- Comparativo real;
- campañas honestas;
- límites de rol;
- decisión y emisión;
- no renovación/recuperación;
- canales conectados.

## No entregar a Claude

```txt
payload real A&S
secretos/OAuth
URLs privadas
proveedores backend
reglas Firestore/Auth
configuración LAB
cuentas reales
```

Estado: `ACUMULADO_PARA_PROXIMO_PAQUETE_CLAUDE`.
