# Snapshot operativo de datos A&S post-v1.251

Fecha: 2026-07-14  
Carril: C — datos reales/migración  
Modo: lectura y validación de artefactos sanitizados; sin escritura

## 1. Clientes SIGA CRM

Fuente validada:

```txt
DRY-RUN-CLIENTES-SIGA-CRM-REPORTE-SANITIZADO-20260709.xlsx
Fuente original: Contratantes Datos de Contacto 2026-07-08.xlsx
Registros fuente: 440
```

### Resultado operativo

| Resultado | Conteo |
|---|---:|
| Crear preliminar | 414 |
| Actualizar | 0 |
| Omitir registros | 0 |
| Requiere validación | 26 |
| Personas naturales/físicas | 417 |
| Personas jurídicas | 23 |
| Asignación temporal a Paula | 30 |
| Duplicados exactos | 8 grupos / 16 registros |
| Duplicados probables | 5 pares / 10 registros |

Estado inicial de los 440 registros:

```txt
pendiente_polizas
```

Siguiente fuente operacional requerida:

```txt
Pólizas
```

### Calidad que debe verse en Orbit 360

| Alerta | Registros |
|---|---:|
| Contacto principal incompleto | 437 |
| Falta documento | 425 |
| Falta correo | 413 |
| Falta ciudad | 189 |
| Falta WhatsApp | 173 |
| Falta departamento | 171 |
| Falta contacto telefónico | 168 |
| Asesor temporal / falta asesor confirmado | 30 |

La falta de geografía/contactabilidad genera calidad y validación; no autoriza inventar datos ni bloquear todos los clientes.

### Distribución preliminar por asesor

| Asesor | Registros |
|---|---:|
| Paula Osorio | 400 |
| Fernando Arias | 23 |
| Carlos Castro | 8 |
| Johanna Salgado | 7 |
| Braulio Hernández | 1 |
| Nicole Castro | 1 |
| Samuel Daza | 0 |

Esta distribución es preliminar. Los 30 vendedores vacíos permanecen asignados temporalmente a Paula con alerta hasta validación.

## 2. Directorios de aseguradoras GT/CO

Artefactos validados:

```txt
DRY-RUN-SANITIZADO-CARRIL-C-ASEGURADORAS-GT-CO-CLIENTES-20260713.xlsx
DRY-RUN-CANONICO-CARRILES-B-C-ORBIT360-AYS-20260713.xlsx
```

### Guatemala

```txt
14 aseguradoras detectadas en índice
18 hojas totales
13 entidades perfiladas + 1 fuente en cuarentena
País/moneda: GT / GTQ
```

### Colombia

```txt
16 hojas de aseguradora + índice
13 aseguradoras canónicas
1 aliado/agregador
1 fuente contaminada en cuarentena
País/moneda: CO / COP
```

### Decisiones canónicas preservadas

- Chub/Chubb: no realizar merge ciego; la hoja contaminada queda en cuarentena.
- Solidaria: fusionar entidad canónica y contactos útiles, excluyendo bloques copiados de otras compañías.
- Synergias: clasificar como aliado/agregador, no como aseguradora.
- Credenciales: 151 marcadores sensibles se conservan únicamente como referencias; ningún valor sensible entra al reporte, seed o colección operativa.
- Directorio, contactos, cuentas bancarias, plataformas y referencias de credenciales son dominios separados.

## 3. Financiero histórico GT/CO

Fuente validada:

```txt
DRY-RUN-SANITIZADO-FINANCIERO-HISTORICO-GT-CO-ORBIT360-20260713.xlsx
```

### Cobertura

```txt
Periodos reconciliados: 38 / 38
Periodo: 2024-11 a 2026-05
Filas dry-run: 841
Errores de fórmula de fuente: 3
Montos ambiguos excluidos: 180
Duplicados probables: 39 grupos / 85 filas
```

### Separación por país y moneda

| País | Moneda | Periodos | Filas | Ingresos | Egresos |
|---|---|---:|---:|---:|---:|
| GT | GTQ | 19 | 599 | 176 | 423 |
| CO | COP | 19 | 242 | 90 | 152 |

GTQ y COP nunca se convierten ni suman entre sí.

### Decisiones de dry-run

| Decisión | Filas |
|---|---:|
| Validación mensual agrupada | 729 |
| Requiere validación individual | 37 |
| Solo saldo de apertura | 29 |
| Listo histórico, falta fecha para finmovs | 25 |
| Solo financiero histórico | 13 |
| Listo finmovs | 8 |

Destino primario de todas las filas:

```txt
financiero_historico
```

Este histórico no crea clientes, pólizas, cartera ni cobros. El paso de una fila a `finmovs` requiere plan, diff, confirmación, auditoría y rollback.

## 4. Qué debe verse primero en la plataforma

Antes de cualquier escritura deben existir estas vistas de control:

1. Conteos de Clientes: 440 fuente, 414 crear, 26 validar.
2. Calidad por asesor y tipo de alerta.
3. Duplicados exactos y probables sin mostrar datos personales completos.
4. Directorio GT/CO con entidad canónica, aliado y cuarentena.
5. Bancos operativos separados de credenciales.
6. Histórico financiero por país, moneda y periodo.
7. Estados `REQUIERE_VALIDACION`, `CUARENTENA` y `PENDIENTE_POLIZAS`.
8. Diferencia explícita entre fuente disponible, dry-run y dato ya escrito.

## 5. Próxima acción autorizable

```txt
OP-DATA-1: lectura sanitizada del tenant alianzas-soluciones
→ comparar conteos existentes vs snapshot
→ producir diff por fuente
→ sin escritura
```

Después:

```txt
Clientes: dry-run → diff → confirmación → escritura LAB
Aseguradoras GT/CO: flujo separado
Financiero histórico: flujo separado
Pólizas: siguiente fuente operacional
```

## 6. Estado honesto

El empalme v1.251 no cargó datos reales. Este documento consolida lo que ya está listo para verse y compararse. La plataforma seguirá mostrando seed ficticio hasta ejecutar una carga controlada y autorizada en LAB.
