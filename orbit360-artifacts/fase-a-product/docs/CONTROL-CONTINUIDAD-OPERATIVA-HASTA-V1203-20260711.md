# CONTROL DE CONTINUIDAD OPERATIVA HASTA v1.203

Fecha: 2026-07-11  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; no merge, deploy ni producción.

## 1. Baseline vivo

```txt
Claude v1.197 empalmada
+ Cliente360/alcance v1.198
+ Pólizas/Recibos/Recaudo v1.199b
+ Renovaciones v1.200b
+ Emisión/Endosos/Ops v1.201
+ Directorios Aseguradoras GT/CO v1.202
+ Cotizador/Comparativo v1.203
+ Academia acumulada
+ backend protegido
```

No retroceder a módulos base sin los bridges y contratos acumulados.

## 2. Carril A — prototipo, UX y Academia

### Cerrado funcionalmente

- ficha Aseguradora en página;
- KPI con acceso a detalle;
- importador de directorio;
- alta manual con país;
- rutas Academia Aseguradoras;
- rutas Academia Cotizador/Comparativo;
- estados de tarifa/fuente;
- resultados de cotización normalizados;
- comparativo derivado;
- recomendación replanteable;
- propuesta aceptada conectada a Ops.

### Pendiente visual/documentado para Claude

- responsive de login y módulos;
- limpieza transversal de notas técnicas;
- experiencia v110 profunda;
- formularios completos por país/producto;
- carga/reemplazo PDF por aseguradora;
- diff visual de extracción;
- tabla avanzada por schema;
- impresión individual/grupal;
- historial ganado/perdido/vencido;
- visor documental embebido transversal;
- estados vacíos y errores útiles.

## 3. Carril B — backend protegido

### Implementado

- `Orbit.store` como única API;
- contratos de recursos seguros;
- `credentialRef`, `accountRef`, `documentRef`;
- contratos de cotización/comparativo;
- default-deny;
- trazabilidad y auditoría llamable;
- solicitud de emisión en Ops;
- bloqueo de escritura real del directorio sin conexión operativa.

### Pendiente

- persistencia remota real de nuevas colecciones;
- transacciones/batch/rollback;
- bóveda y reautenticación;
- Drive/Shared Drives;
- extracción documental durable;
- callbacks de WhatsApp/correo;
- PDF renderer;
- CI y pruebas navegador;
- reglas server-side por tenant/rol/scope;
- importación real controlada de directorios.

## 4. Carril C — datos reales A&S

### Fuentes procesadas

- clientes Siga CRM;
- pólizas;
- vehículos;
- recibos/cobros/cartera/comisiones conforme reportes previos;
- directorios aseguradoras GT/CO;
- comparativo v110 como referencia funcional;
- movimientos financieros separados, no usados para CRM/pólizas/cobros.

### Fuente real utilizada en v1.202

```txt
GT: 14 candidatas operativas
CO: 16 candidatas; 4 bloqueadas
```

No se aplicó payload real.

### Fuente siguiente requerida después del smoke

Solicitar únicamente fuentes separadas de:

```txt
planes/tarifarios/cotizadores/cotizaciones ejemplo por aseguradora
```

Orden recomendado:

1. Guatemala — una aseguradora/producto con fuente completa;
2. cotización ejemplo oficial de la misma combinación;
3. condiciones/coberturas/deducibles;
4. caso de prueba esperado;
5. Colombia en una combinación separada.

No pedir otra vez Clientes, Pólizas, Vehículos, Cobros, Cartera o Comisiones.

## 5. Estado por módulo

| Módulo | Estado | Bloqueo para cierre |
|---|---|---|
| Cliente360 | contrato operativo implementado | smoke visual |
| Pólizas/Recibos | implementado | batch remoto + smoke |
| Renovaciones | encaminadas a Cotizador | reglas A&S finales |
| Emisión/Endosos | implementado inicial | Drive/transacciones + reglas complejas |
| Ops | recibe emisión/endosos | evidencia visual |
| Aseguradoras | importador y ficha v1.202 | smoke + decisión 4 hojas CO |
| Cotizador | default-deny y DTO v1.203 | fuente tarifaria real + smoke |
| Comparativo derivado | contrato operativo v1.203 | smoke + UX v110 profunda |
| Comparativo independiente | parcial | persistencia/diff/Drive/schema |
| Finanzas | por retomar | fuentes financieras separadas |
| Marketing | por retomar | calendario real sanitizado |
| Academia | acumulada | validación visual/progreso |

## 6. Validación visual integrada

Script corregido:

```txt
tools/orbit360-iniciar-validacion-integrada-v1203.ps1
```

El script:

- verifica rama;
- conserva cambios locales;
- ejecuta `node --check`;
- ejecuta validadores v1.199–v1.203 disponibles;
- inicia una ventana de servidor visible y persistente;
- espera HTTP 200;
- abre Aseguradoras y Cotizador;
- copia reporte al portapapeles.

## 7. Condición para avanzar a tarifas reales

Antes de cargar una fuente tarifaria:

```txt
sintaxis OK
validadores OK
servidor activo
Aseguradoras visualmente coherente
Cotizador bloquea automático sin fuente
Comparativo derivado abre con dos propuestas validadas
```

Después:

```txt
inventario de una fuente real
→ mapeo/dry-run
→ configuración tarifaria propuesta
→ caso de prueba
→ validación humana
→ validado_habilitado
→ cálculo automático
```

## 8. Restricciones

- no inventar tarifas A&S;
- no usar tasas genéricas;
- no mezclar GTQ/COP;
- no inferir producto/plan desde directorio de contactos;
- no comparar extracción pendiente como definitiva;
- no afirmar envío sin proveedor;
- no crear póliza desde aceptación;
- no subir documentos o datos reales al repo;
- no merge/deploy/main;
- no repetir auditorías sin nuevo insumo.

## 9. Siguiente acción

Ejecutar la validación integrada v1.203. Con el reporte y capturas:

1. corregir errores de sintaxis/runtime si aparecen;
2. cerrar visualmente Aseguradoras;
3. cerrar el flujo derivado Cotizador → Comparativo;
4. pedir una primera fuente tarifaria real y separada de A&S;
5. continuar con el importador tarifario y casos de prueba;
6. mantener documentación acumulada para Claude.
