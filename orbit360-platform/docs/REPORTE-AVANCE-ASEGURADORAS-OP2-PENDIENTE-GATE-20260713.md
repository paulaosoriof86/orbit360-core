# Reporte de avance Aseguradoras OP-2 — pendiente gate visual y dry-run

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni main

## Decisión

```txt
Cierre funcional OP-2: IMPLEMENTADO
Validador estático: CONFIGURADO, pendiente ejecución observable
Smoke visual: PREPARADO, pendiente ejecución local
Dry-run real GT/CO: PENDIENTE y separado
Aprobación humana: PENDIENTE
Estado final: EN VALIDACIÓN, no cerrado
```

## Carriles

```txt
Carril A: directorio, ficha, copy, responsive y Academia
Carril B: permisos, referencias seguras, sanitización, auditoría y validadores
Carril C: directorios reales GT/CO inventariados; sin escritura real
```

## Base existente conservada

No se reconstruyó el módulo. Se conservaron:

- directorio y KPI con detalle;
- ficha-página con regreso y pestañas;
- contactos, plataformas, bancos, productos, documentos y tarifas;
- visor documental;
- importador multihoja GT/CO;
- dry-run y trazabilidad;
- guard de escritura backend;
- recursos seguros;
- Academia v1.202.

## Cambios funcionales OP-2

### Visibilidad de módulo

Archivo:

```txt
core/aseguradoras-op2-role-visibility.js
```

- Operativo y Asesor pueden consultar el módulo.
- No cambia scope de clientes.
- No amplía sensibles ni escritura.
- La acción final sigue dependiendo de `Orbit.access`.

### Alias y duplicados probables

Archivo:

```txt
core/aseguradoras-op2-source-guard.js
```

- normaliza versiones, copias y sufijos;
- detecta diferencia de una letra;
- compara contra el directorio existente;
- bloquea operaciones ambiguas;
- no fusiona ni escribe automáticamente.

### Seguridad uniforme en importación y edición

Archivo:

```txt
modules/aseguradoras-op2-closure-bridge.js
```

- intercepta `insert/update` solo para la colección Aseguradoras;
- elimina usuario, contraseña y cuenta completa;
- conserva `usuarioHint/numeroHint`;
- genera `credentialRef/accountRef`;
- migra recursos legacy a referencias protegidas;
- marca validación y audita la migración real;
- deshabilita campos sensibles del editor antiguo;
- no registra auditoría si el guardado se cancela.

### Guard de entradas

Archivo:

```txt
modules/aseguradoras-op2-permission-guard.js
```

- protege llamadas directas al editor;
- protege alta e importación;
- no depende únicamente de ocultar botones;
- informa al usuario cuando su rol es de consulta.

### Operación diaria

La ficha resumen agrega:

- código de intermediario;
- oficina;
- emergencias/asistencia;
- WhatsApp;
- contacto principal;
- fuente y última revisión;
- copiar código;
- preparar correo;
- abrir sitio seguro;
- reportar corrección mediante gestión.

### Copy

Estados internos se traducen a lenguaje operativo. No deben aparecer:

```txt
backend_required
credentialRef
accountRef
Orbit.store
Firebase
Firestore
```

### Responsive

Archivo:

```txt
styles/aseguradoras-op2-v1217.css
```

Adaptación a 1366, 768 y 390 px.

### Academia

Archivo:

```txt
data/academia-v1217-aseguradoras-op2.js
```

Actualiza los mismos tres cursos v1.202. No crea duplicados y conserva progreso/certificados.

## Fuentes reales

Documento:

```txt
docs/AUDITORIA-SANITIZADA-DIRECTORIOS-ASEGURADORAS-GT-CO-OP2-20260713.md
```

Resultado sanitizado:

```txt
GT: 18 hojas totales, 14 candidatas, 4 soporte
CO: 17 hojas totales, 16 candidatas, 1 soporte
alias/duplicados probables: presentes
entidad aliada/no aseguradora directa: presente
recursos sensibles: presentes
escritura real: no ejecutada
```

GT y CO deben ejecutarse como dry-runs separados. No se muestran datos sensibles en documentación o código.

## Claude

Documento:

```txt
docs/PATRON-CLAUDE-ASEGURADORAS-OP2-V1217-20260713.md
```

Obliga a replicar directorio operativo, seguridad uniforme, roles, alias, correcciones, estados honestos y Academia, sin compartir runtime o datos A&S.

## Validación

### Estática

```txt
tools/orbit360-validar-aseguradoras-op2.mjs
```

Valida archivos, permisos, fuente separada, trazabilidad, sensibles, alias, ficha, visor, copy, Academia, responsive, sintaxis y hashes protegidos.

### Visual OP-2

```txt
tools/orbit360-smoke-visual-aseguradoras-op2.mjs
```

Matriz de 13 escenarios:

- Dirección: directorio, resumen, contactos, plataformas, bancos, documentos y tarifas en desktop;
- Operativo: directorio y resumen en tablet;
- Asesor: directorio, resumen, plataformas y bancos en móvil.

Comprueba errores, overflow, copy técnico y privilegios sensibles.

### PowerShell común

```txt
tools/orbit360-run-operacion-op1-op2-visual.ps1
```

Una sola ejecución futura:

1. rama y fast-forward seguro;
2. integración con backup;
3. backend protegido;
4. CRM OP-1;
5. Cotizador/Comparativo;
6. Aseguradoras OP-2;
7. 10 escenarios CRM;
8. 13 escenarios Aseguradoras;
9. reporte y capturas.

No ejecuta dry-runs reales, no despliega y no hace commit/push.

## Pendientes antes de cerrar OP-1/OP-2

- ejecutar el PowerShell común;
- revisar 23/23 escenarios y capturas;
- corregir P0/P1;
- registrar aprobación visual humana;
- después ejecutar dry-run GT y CO por separado con backend seguro;
- no aplicar filas bloqueadas ni recursos sensibles sin proveedor autorizado.

## Siguiente bloque operativo después del gate

```txt
1. dry-run directorio GT
2. dry-run directorio CO
3. resolución de alias/entidades aliadas
4. aplicación de filas validadas
5. solicitar/importar fuente separada Pólizas
```
