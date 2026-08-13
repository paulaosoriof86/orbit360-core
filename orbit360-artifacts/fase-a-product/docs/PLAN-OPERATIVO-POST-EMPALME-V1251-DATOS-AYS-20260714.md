# Plan operativo post-empalme v1.251 — datos A&S

Fecha: 2026-07-14

## Carriles

### Carril A — prototipo

- v1.251 aceptada y empalmada mediante puente aditivo.
- Próximo trabajo visual: un único gate focalizado, no otra auditoría amplia.

### Carril B — backend

- `Orbit.store`, Auth, loaders LAB, reglas y contratos protegidos permanecen intactos.
- Política efectiva, catálogo read-only y matriz de rutas están implementados.
- Escrituras reales continúan bloqueadas hasta validar identidad, membresía y reglas equivalentes.

### Carril C — datos actuales A&S

Fuentes actuales disponibles:

```txt
Clientes SIGA CRM
Directorios Aseguradoras Guatemala y Colombia
Movimientos financieros GT/CO
Calendario maestro de contenidos
Manual de identidad y logo
Comparativo final v110
```

Artefactos sanitizados disponibles:

```txt
DRY-RUN-CLIENTES-SIGA-CRM-REPORTE-SANITIZADO-20260709.xlsx
DRY-RUN-SANITIZADO-CARRIL-C-ASEGURADORAS-GT-CO-CLIENTES-20260713.xlsx
DRY-RUN-SANITIZADO-FINANCIERO-HISTORICO-GT-CO-ORBIT360-20260713.xlsx
MANIFIESTO-IMPORTACION-SANITIZADO-ASEGURADORAS-GT-CO-20260713.json
MANIFIESTO-SANITIZADO-FINANCIERO-HISTORICO-GT-CO-20260713.json
```

## Objetivo inmediato

Ver Orbit 360 con la situación actual de A&S sin confundir prototipo, histórico y operación real.

## Secuencia operativa

### OP-DATA-1 · Verificación read-only del LAB

1. Confirmar tenant `alianzas-soluciones`.
2. Confirmar membresía/rol activo.
3. Leer únicamente conteos y campos sanitizados de colecciones requeridas.
4. Comparar contra los dry-runs recibidos.
5. No crear, actualizar ni eliminar.

Resultado esperado:

```txt
PASS read-only
conteos por fuente
faltantes por colección
sin datos cruzados de otro tenant
```

### OP-DATA-2 · Clientes

Usar el dry-run ya realizado:

- 440 filas fuente;
- 414 candidatos preliminares;
- 26 requieren validación;
- duplicados exactos/probables ya identificados;
- vendedor vacío → Paula temporal + alerta;
- estado inicial `pendiente_polizas`.

Primero se presenta el diff de crear/actualizar/omitir/validar. No escribir hasta confirmación.

### OP-DATA-3 · Aseguradoras

Cargar por fuentes separadas GT y CO:

- identidad canónica;
- contactos;
- cuentas bancarias operativas;
- plataformas mediante `credentialRef` sin secretos;
- aliados y cuarentena;
- país/moneda y trazabilidad.

### OP-DATA-4 · Financiero histórico

Mantener en `financiero_historico`:

- no crear clientes;
- no crear pólizas;
- no crear cartera;
- no crear cobros;
- no promover a `finmovs` sin plan y confirmación.

### OP-DATA-5 · Pólizas

Después de cerrar el dry-run de clientes, la siguiente fuente operacional requerida es Pólizas. Esta fuente define:

- estado real del cliente;
- vigencias;
- recibos esperados;
- cartera;
- renovaciones;
- asignación final por asesor.

No inferir pólizas desde movimientos financieros.

## Qué puede verse antes de escribir datos

- conteos reales sanitizados;
- calidad y duplicados;
- directorio GT/CO sanitizado;
- histórico financiero por país/moneda/periodo;
- pendientes de validación;
- diferencia entre datos disponibles y colecciones aún vacías.

## Bloqueo honesto

El empalme no convierte automáticamente el seed ficticio en operación real. Para ver fichas reales de clientes/pólizas en la plataforma se necesita ejecutar la carga controlada:

```txt
dry-run → diff → confirmación → escritura LAB → validación → smoke
```

No habrá deploy productivo ni mezcla de fuentes durante esta fase.
