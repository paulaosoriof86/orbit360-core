# Corrección de rumbo — datos reales y migración A&S

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

Paula señaló una desviación importante: hace varias sesiones se pidió información real inicial, incluyendo directorios de aseguradoras y movimientos financieros, pero después el trabajo se concentró en backend abstracto, empalmes, contratos y prototipo, sin convertir esas fuentes reales en valor operativo visible.

## Respuesta honesta

Sí hubo una desviación parcial de rumbo respecto al frente de migración real.

El trabajo realizado sí aporta infraestructura y seguridad, pero no reemplaza la necesidad de perfilar fuentes reales y empezar matriz de migración.

## Fuentes reales ya recibidas

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx
Manual de Identidad Básica – Versión 1 – Vigente.docx
Logo V. 2026.jpeg
comparativo_final_v110.html
```

## Revisión inicial realizada en esta corrección

### Directorio Guatemala

Archivo:

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
```

Hallazgos estructurales:

```txt
- 18 hojas.
- Índice principal con aseguradoras, códigos, emergencias, oficina y web.
- Hojas por aseguradora: EL ROBLE, MAPFRE, GENERAL, G&T, COLUMNA, LA CEIBA, GUATEMALTECA, UNIVERSALES, RURAL, BAM, BANTRAB, FICOHSA, PRIVANZA, ÓLE.
- Incluye hoja diagnóstico con prioridades y acciones pendientes por aseguradora.
- Contiene contactos, cargos, áreas, emails, celulares, observaciones, accesos/cuentas según aseguradora.
```

Valor para Orbit 360:

```txt
configuracion_catalogo
aseguradoras
contactos_aseguradora
cuentas_pago_aseguradora
accesos_aseguradora metadata-only/credentialRef
pendientes_configuracion
```

### Directorio Colombia

Archivo:

```txt
Directorio - Aseguradoras Colombia 2024.xlsx
```

Hallazgos estructurales:

```txt
- 17 hojas.
- Índice con aseguradoras, clave, teléfono comercial y asistencias/emergencias.
- Hojas por aseguradora/intermediario: Synergias, Solidaria, AXA, Estado, HDI, Equidad, Chub/Chubb, SMI, Previsora, SBS, Zurich, Mapfre, Bolivar, Qualitas, Solidaria 1.0.
- Incluye contactos por aseguradora con cargo, área, email, celular y observaciones.
```

Valor para Orbit 360:

```txt
aseguradoras CO
contactos_aseguradora CO
asistencias/emergencias
claves/referencias como credentialRef, nunca secreto en frontend
```

### Movimientos financieros GT/CO

Archivo:

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

Hallazgos estructurales:

```txt
- Hojas mensuales GT y CO desde Nov 2024 hasta May 2026.
- Rangos aproximados por hoja: 300-360 filas en meses completos.
- Columnas típicas: CONCEPTO, PAGADOR, DÍA, CLASIFICACIÓN, VALOR, ISR/IVA, OBSERVACIONES.
- Incluye bloques INGRESOS, SALDO, IMPUESTOS, DISPONIBLE, EFECTIVO/BANCO.
- Mezcla operación financiera histórica con comisiones, aportes, préstamos, publicidad, pagos y otros movimientos.
```

Valor para Orbit 360:

```txt
financiero_historico
finmovs históricos
clasificación financiera por país/mes
referencias a comisiones y aseguradoras para conciliación futura manual
```

Bloqueos:

```txt
- No debe usarse para crear clientes.
- No debe usarse para crear pólizas.
- No debe usarse para crear cartera.
- No debe usarse para marcar cobros como pagados.
- No debe mezclarse GTQ/COP.
```

## Qué NO tenemos todavía

Para que Orbit 360 tenga datos operativos reales faltan fuentes críticas:

```txt
clientes
pólizas
vehículos
recibos/cobros realizados
planillas aseguradora
planillas comisiones
estado cuenta bancario conciliable
siniestros
documentos soporte de pólizas/recibos
configuración final de tarifas/cotizador si aplica
```

## Decisión de rumbo

Se mantiene el backend protegido y el empalme seguro, pero se abre inmediatamente un carril de migración real por fuentes.

No se suben datos reales al repo.
No se hardcodean datos reales.
No se crean seeds con datos reales.
No se mezclan fuentes.

## Próximo bloque recomendado

Crear inventario/matriz de fuentes reales:

```txt
1. Fuente recibida.
2. Hojas.
3. País.
4. Moneda esperada.
5. Colección destino.
6. Columnas detectadas.
7. Bloqueos.
8. Qué se puede importar.
9. Qué NO se puede importar.
10. Fuentes faltantes que Paula debe aportar.
```

## Estado

Corrección de rumbo documentada. El trabajo backend previo fue útil para seguridad/arquitectura, pero faltó convertir fuentes reales recibidas en plan operativo de migración. Se corrige desde este punto.