# Matriz viva — fuentes reales, estado operativo y faltantes A&S

Fecha original: 2026-07-09  
Actualización: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Corrección de continuidad

La versión inicial de esta matriz quedó desactualizada porque todavía decía que Clientes, Pólizas, Vehículos, Cobros y otras fuentes debían pedirse desde cero. Ese orden ya fue superado por el trabajo posterior y no debe reutilizarse.

Prevalece el baseline documentado en:

```txt
PROTOCOLO-ANTI-DESVIACION-PLAN-OPERATIVO-DATOS-REALES-AYS-20260709.md
```

## Regla

Esta matriz documenta inventario, destino, calidad, bloqueo y siguiente acción. No incorpora payload real al repositorio.

```txt
Dato real -> archivo local/controlado -> perfil/dry-run -> validación humana
-> escritura LAB autorizada -> smoke operativo -> producción solo con autorización futura.
```

## Fuentes reales procesadas o modeladas — no repetir sin evidencia nueva

| Dominio | Fuente/insumo | Estado actual | Resultado aceptado | Siguiente uso operativo |
|---|---|---|---|---|
| Clientes | `Contratantes Datos de Contacto 2026-07-08.xlsx` / Siga CRM | Procesada | 440 filas; dry-run sanitizado: crear 414, requiere validación 26; normalización, asesores, dedupe y calidad definidos | Cerrar Cliente360, Calidad, scopes y flujo de correcciones; mantener escritura real bloqueada hasta smoke |
| Pólizas | Fuentes principales/complementarias ya perfiladas en bloques previos | Procesada/modelada | Llave canónica, estados, vigencias, país/moneda y prima neta/gastos/IVA/total definidos; motor/wire P0 implementados | Smoke transversal con CRM, aseguradoras, recibos y cartera; corregir solo fallos concretos |
| Vehículos | Fuente Auto/complementaria | Procesada/modelada | Vehículo se vincula a cliente+póliza; no crea pólizas adicionales | Validar visualmente expediente y Cotizador/Comparativo |
| Recibos/Cobros/Cartera | Fuentes cruzadas en bloques previos | Procesada/modelada | Forma de pago, recibos esperados, cartera, recaudo y conciliación propuesta separados de finmovs | Smoke Cliente360/Cobros/Conciliaciones/Portal; no aplicar cobros desde banco automáticamente |
| Comisiones/Facturas/Banco | Planillas/facturas/banco modelados | Procesada/modelada | Comisión devengada → factura → CxC → recaudo → liquidación → CxP → pago; primas pendientes excluidas | Validación transversal en Finanzas/Comisiones; carga real posterior por fuente separada |
| Dry-run/importación | Builders, manifest, confirmación y workflow | Implementado P0 | Crear/actualizar/omitir/requiere validación, trazabilidad y escritura controlada | Conectar cada fuente al mismo pipeline sin mezclar dominios |

## Fuentes reales recibidas activas

| Fuente | Destino | Qué sí aporta | Qué no debe hacer | Estado/siguiente acción |
|---|---|---|---|---|
| `Directorio Aseguradoras Guatemala 2026.xlsx` | `aseguradoras`, contactos, configuración, referencias de plataforma/cuentas/documentos | Directorio operativo GT, contactos, asistencia, productos y estructura de accesos/pagos | No crear clientes, pólizas, cartera o cobros; no subir contraseñas ni links privados | Procesada estructuralmente y con dry-run sanitizado; usar para cerrar Aseguradoras |
| `Directorio - Aseguradoras Colombia 2024.xlsx` | `aseguradoras`, contactos, configuración CO | Directorio CO y contactos | No crear operación fuera de su fuente; no subir secretos | Procesada estructuralmente y con dry-run sanitizado; usar para cerrar Aseguradoras |
| `comparativo_final_v110.html` | Cotizador, Comparativo, historial, asesoría y configuración tarifaria | Fuente funcional avanzada A&S | No copiar Firebase/Auth/storage/navegación/monolito; no hardcodear tarifas | Fuente activa después del cierre operativo de Aseguradoras |
| `Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx` | `financiero_historico` / `finmovs` | Histórico de ingresos/egresos por país, periodo, concepto y valor | No inferir clientes/pólizas/cartera/cobros/producción | Mantener separado hasta fase Finanzas; GT→GTQ, CO→COP |
| `AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx` | Marketing/calendario/campañas | Cronograma real de contenidos | No simular publicación/integraciones activas | Fuente congelada hasta cierre de Marketing |
| `Manual de Identidad Básica – Versión 1 – Vigente.docx` | Configuración marca, Academia y Marketing | Paleta, tipografía, voz, GT/CO y Registro SIB CS-254 | No hardcodear A&S en core | Aplicar como configuración tenant y contenido formativo |
| `Logo V. 2026.jpeg` | `tenant.logo` / slot white-label | Logo de A&S | No reemplazar la marca Orbit 360 del chrome | Configurable por tenant; no guardar como Data URL en entidad operativa |
| `DRY-RUN-CLIENTES-SIGA-CRM-REPORTE-SANITIZADO-20260709.xlsx` | Evidencia sanitizada | Validación de conteos/calidad sin payload personal | No usar como fuente para reconstruir datos reales | Evidencia de cierre CRM/importador |

## Orden operativo de módulos y fuentes

### 1. Cierre CRM

Usa el baseline ya procesado de Clientes, Pólizas, Vehículos, Recibos, Cobros, Cartera y Comisiones.

Debe quedar coherente en:

```txt
Cliente360
Pólizas
Cobros
Conciliaciones
Portal
Calidad
Renovaciones
Cancelaciones
Comisiones
Historial
scopes por asesor
```

No se vuelve a perfilar la fuente salvo archivo nuevo o fallo demostrado.

### 2. Cierre Aseguradoras

Usa los directorios GT/CO sanitizados para validar:

```txt
identidad y país
contactos y áreas
plataformas y usuario operativo
credentialRef sin secreto
cuentas/instrucciones de pago por permiso
productos/ramos/planes
Documentos y Drive mediante documentRef
desactivar vs borrar
última revisión/responsable/calidad
relación con Cotizador/Comparativo
```

### 3. Cierre Cotizador/Comparativo

Usa `comparativo_final_v110.html` como referencia funcional, no como archivo a copiar completo.

Debe parametrizar:

```txt
aseguradora
país/moneda
ramo/producto/plan
riesgo/vehículo/uso
coberturas/deducibles/exclusiones
prima neta/gastos/IVA/total
vigencia
fuente/versión/validación
presentación e historial
```

### 4. Ops/Leads

Usa los clientes y gestiones reales sanitizados; confirma cadencias, responsables, estados, conversión a cliente/póliza y solicitudes de corrección.

### 5. Finanzas

Usa movimientos reales por fuente separada después de cerrar los contratos de cobros/comisiones. No mezcla países ni interpreta financiero histórico como producción.

### 6. Marketing

Usa calendario y manual de marca reales, con publicaciones e integraciones en estado honesto mientras no exista conexión.

## Información que podrá pedirse durante el avance

Solo se solicitará cuando el módulo correspondiente llegue a su cierre y la lógica no esté ya documentada:

```txt
- archivo/fuente faltante concreta;
- regla comercial que no pueda inferirse;
- responsable o permiso;
- catálogo/estado/flujo desconocido;
- evidencia visual o resultado local imprescindible.
```

No se pedirán nuevamente fuentes o decisiones ya procesadas.

## Condiciones para entrada directa futura en plataforma

Todo registro creado manualmente debe heredar o exigir:

```txt
tenantId
país
moneda
catálogos del tenant
rol/scope del actor
responsable/asesor
estado operativo válido
fecha y fuente
trazabilidad antes/después
calidad/requiereValidación
```

Si falta país, moneda, vínculo o permiso, no debe completarse silenciosamente: queda `REQUIERE_VALIDACION` o se crea una gestión de corrección.

## Próxima fuente/acción

No corresponde pedir nuevamente Clientes ni Pólizas como si no existieran.

La siguiente acción operativa es:

```txt
Cerrar CRM transversal con el baseline ya cruzado y, en paralelo inmediato,
finalizar Aseguradoras con los directorios GT/CO; después integrar Cotizador/Comparativo v110.
```

## Estado

```txt
CLIENTES: PROCESADOS_DRYRUN_SANITIZADO
POLIZAS_VEHICULOS_RECIBOS_COBROS_CARTERA: MODELADOS_Y_CRUZADOS
COMISIONES_BANCO: MODELADOS
ASEGURADORAS_GT_CO: FUENTE_ACTIVA_PARA_CIERRE
COTIZADOR_COMPARATIVO_V110: FUENTE_ACTIVA_DESPUES_DE_ASEGURADORAS
FINANZAS_MOVIMIENTOS: FUENTE_RECIBIDA_SEPARADA
MARKETING: FUENTE_RECIBIDA_CONGELADA_HASTA_SU_FASE
ESCRITURA_REAL: BLOQUEADA_HASTA_SMOKE_Y_AUTORIZACION
```
