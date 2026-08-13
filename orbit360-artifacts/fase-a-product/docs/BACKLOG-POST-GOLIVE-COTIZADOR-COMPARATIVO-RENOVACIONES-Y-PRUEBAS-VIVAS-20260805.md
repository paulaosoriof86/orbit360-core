# Backlog post-go-live — Cotizador, Comparativo, Renovaciones y pruebas vivas

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Frontera del primer go-live

El primer go-live operativo prioriza:

```text
Orbit Ops
Orbit Leads
Orbit Aseguradoras
Cliente 360
Pólizas
Recibos
Cobros y cartera
Equipo/Auth
multirol/scopes
```

Cotizador, Comparativo y el backend completo de Renovaciones no bloquean esta primera salida, siempre que sus accesos no prometan una función inexistente ni interrumpan los módulos operativos.

La plataforma continuará por releases incrementales: cada módulo o función adicional que obtenga PASS técnico, prueba viva y aceptación se incorpora a producción sin esperar una reconstrucción total.

## 2. Cotizador y Comparativo

Hallazgo humano:

- la candidata canónica no presenta la última versión aprobada del Cotizador/Comparativo;
- no están visibles todos los razonamientos y decisiones de la versión v110 aprobada;
- no se debe considerar cerrada la composición de estos módulos por el solo hecho de que las rutas existan.

Acción post-go-live prioritaria:

1. auditar la última versión aprobada v110 contra la candidata viva;
2. recuperar razonamientos, comparaciones, reglas y salidas aprobadas;
3. empalmar selectivamente, sin reemplazo total;
4. validar impresión, exportación, WhatsApp y correo;
5. verificar tenant/configuración, scopes y ausencia de hardcode A&S;
6. ejecutar prueba viva y gate específico antes de incorporarlo a producción.

Clasificación:

```text
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
NO_BLOQUEANTE_PRIMER_GOLIVE
```

## 3. Renovaciones — decisión por rol

La acción de cotización desde Renovaciones debe aplicar esta matriz:

### Dirección, Administración y Operativo con capacidad comercial

Al seleccionar cotización debe preguntar:

```text
¿Qué deseas hacer?
1. Abrir Cotizador
2. Solicitar gestión de cotización
```

- `Abrir Cotizador`: abre el flujo comercial con cliente/póliza/renovación preseleccionados.
- `Solicitar gestión de cotización`: crea una gestión trazable en Ops, con cliente, póliza, asesor, fecha objetivo y origen Renovaciones.

### Asesor

La acción predeterminada debe ser:

```text
Generar gestión de cotización
```

No debe abrir un flujo fuera de su permiso ni permitir una acción administrativa no autorizada.

### Comparar

Antes de habilitar `Comparar` como acción operativa se debe verificar:

- existencia y estado del backend durable de Renovaciones;
- relación renovación ↔ póliza vigente ↔ propuesta;
- idempotencia;
- scopes por rol;
- estado vacío honesto cuando aún no existe propuesta;
- ausencia de navegación a una ruta que no tenga datos preparados.

Clasificación:

```text
FUNCTIONAL_DEFECT_NO_BLOQUEANTE_PRIMER_GOLIVE
DATA_CONTRACT_REVIEW_REQUIRED
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
```

## 4. Nueva política obligatoria de pruebas

Las pruebas técnicas de backend no sustituyen la prueba desde la plataforma.

A partir de esta RC, cada módulo pasa por dos niveles:

### Nivel A — prueba viva read-only

- navegador real;
- roles y viewports definidos;
- navegación, carga, KPIs, detalles, filtros y estados vacíos;
- snapshot antes/después;
- cero escrituras;
- capturas sanitizadas;
- diagnóstico visible desde la plataforma cuando aplique.

### Nivel B — CRUD sintético con rollback

Para módulos que crean o modifican información:

1. crear registros sintéticos claramente marcados;
2. leerlos desde la misma interfaz;
3. editar campos permitidos;
4. verificar relaciones y scopes;
5. eliminar o archivar según el contrato real;
6. ejecutar rollback exacto;
7. comprobar snapshot final equivalente al inicial;
8. dejar evidencia sanitizada y cero datos sintéticos residuales.

Este Nivel B requiere autorización separada cuando implique Firestore/Auth/operational writes. No se ejecuta bajo una autorización read-only.

## 5. Siguiente secuencia

```text
1. Rootfix visual LAB + prueba viva read-only
2. PASS_VISUAL_POST_AUTH
3. Gate CRUD sintético con rollback para Cliente 360/Pólizas/Recibos/Cobros/Ops/Leads
4. Materialización durable del ledger de Cobros
5. Correcciones críticas de pólizas y corte de datos
6. Release candidate del núcleo operativo
7. Go-live autorizado
8. Reposición v110 Cotizador/Comparativo
9. Renovaciones durable y matriz de decisiones por rol
10. Releases incrementales sucesivos
```

No se considera terminado un módulo solo porque su prueba técnica pase; debe funcionar desde la interfaz con el rol real y el backend real correspondiente.
