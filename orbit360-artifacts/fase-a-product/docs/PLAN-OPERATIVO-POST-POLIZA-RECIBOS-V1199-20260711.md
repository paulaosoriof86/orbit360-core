# PLAN OPERATIVO POST CIERRE PÓLIZA/RECIBOS v1.199b

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Baseline vivo

```txt
candidata Claude v1.197 empalmada selectivamente
+ backend LAB protegido
+ cierre CRM scope/alta v1.198
+ motor Póliza/Recibos/Recaudo v1.199b
+ datos/modelos A&S sanitizados ya procesados
```

## Cierre 1 — Renovaciones y Endosos

### Renovación

Debe definir y comprobar:

- póliza origen;
- gestión previa;
- cotización/comparativo seleccionado;
- decisión del cliente;
- aseguradora y producto;
- nuevo número emitido;
- nueva vigencia;
- prima desglosada;
- recibos nuevos;
- vínculo `renuevaDe` / `renovadaPor`;
- cierre de cartera pendiente de la póliza anterior según regla;
- no duplicación;
- auditoría;
- canal de comunicación honestamente conectado.

No usar primas deterministas como propuestas reales.

### Endoso

Catálogo inicial reusable:

```txt
cambio de vehículo/bien
inclusión/exclusión de asegurado
cambio de suma asegurada
cambio de dirección/riesgo
cambio de beneficiario
cambio de forma de pago
corrección administrativa
cancelación
otro requiere validación
```

Cada tipo debe declarar:

- campos permitidos;
- fecha efectiva;
- documento soporte;
- impacto en prima/recibos;
- si preserva o sustituye cartera;
- motivo;
- antes/después;
- aprobación requerida.

## Cierre 2 — Aseguradoras con directorios GT/CO

- ejecutar dry-run sanitizado;
- comprobar identidad, contactos, plataformas, bancos, productos y documentos;
- no cargar secretos/cuentas reales mientras Carril B no esté conectado;
- completar calidad, responsable y última revisión;
- validar vínculo con las pólizas existentes;
- cerrar edición en página;
- dejar Cotizador/Comparativo consumiendo solo combinaciones habilitadas.

## Cierre 3 — Cotizador y Comparativo

- gate default-deny;
- país/moneda/ramo/producto/segmento/riesgo/vehículo/uso/plan;
- fuente y versión validadas;
- DTO canónico sin pérdida de campos;
- patrones avanzados del comparativo v110;
- trazabilidad a Lead/Ops/Cliente360;
- historial y documentos por referencia;
- emisión real solo después de confirmación y número de póliza.

## Validación visual consolidada

Se solicitará después de cerrar Renovaciones/Endosos y antes de avanzar a Ops/Leads.

Rutas mínimas:

```txt
Cliente360 lista y expediente
alta de cliente
alta/edición de póliza
cuadro de recibos
pago reportado/validado/aplicado
propuesta de conciliación
Renovaciones
Aseguradoras
Cotizador
Comparativo
Portal preview
Calidad
```

Breakpoints:

```txt
360 · 390 · 412 · 768 · 834 · 1024 · 1366 · 1440
```

## Carril B pendiente

- batch/transacción backend durable;
- constraints de llave canónica;
- validación server-side tenant/rol/scope;
- bóveda y Drive OAuth;
- Portal Auth cliente;
- Equipo multirol persistente;
- canales correo/WhatsApp verificados.

## Carril C pendiente

- dry-run directorios aseguradoras;
- datos reales solo por importador y confirmación;
- pólizas/documentos posteriores sin inferencias;
- movimientos financieros como fuente separada;
- banco solo propone conciliación;
- trazabilidad completa.

## Criterio para abrir Ops/Leads

No se avanza al siguiente grupo hasta que CRM + Aseguradoras + Cotizador/Comparativo tengan:

- contratos estables;
- datos A&S sanitizados comprobados;
- permisos/scopes;
- KPI con detalle;
- Academia;
- smoke visual consolidado;
- pendientes backend explícitos sin falsa declaración de cierre.
