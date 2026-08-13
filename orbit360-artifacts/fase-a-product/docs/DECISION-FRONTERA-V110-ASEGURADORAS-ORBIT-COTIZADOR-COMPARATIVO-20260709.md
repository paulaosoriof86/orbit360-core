# Decisión de frontera — Aseguradoras Orbit vs Cotizador/Comparativo v110

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy.

## Decisión obligatoria

El módulo **Aseguradoras de Orbit 360** es la única fuente operativa y de configuración para aseguradoras dentro de la plataforma.

El archivo `comparativo_final_v110.html` nació como aplicación separada y contiene su propio módulo/directorio de aseguradoras, estadísticas, almacenamiento y configuraciones auxiliares. Esa parte **no debe migrarse ni tomarse como base**.

## Qué sí se reutiliza de v110

Se debe conservar e integrar, con la mayor fidelidad funcional posible:

1. Cotizador.
2. Comparativo.
3. Lógicas de lectura de Excel/CSV para tarifas.
4. Lógicas de lectura/extracción de PDF para cotizaciones y pólizas ejemplo.
5. Reglas de cálculo.
6. Detección de encabezados y sinónimos.
7. Preview, propuesta de mapeo y validación.
8. Estructuras de coberturas, deducibles, primas, pagos, condiciones y restricciones.
9. Instrucciones de extracción y formatos conocidos por aseguradora/producto.
10. Generación de comparativos y salidas asociadas.

## Qué NO se reutiliza de v110

No se debe copiar, empalmar ni tomar como fuente:

```txt
módulo de aseguradoras del HTML
estadísticas de aseguradoras del HTML
directorio interno del HTML
usuarios o administradores hardcodeados
Firebase/Firestore/Storage directos
configuración de aseguradoras embebida
credenciales o accesos del HTML
almacenamiento propio del HTML
KPIs propios del HTML
navegación propia del HTML
branding propio del HTML
```

## Fuente de verdad final

```txt
modules/aseguradoras.js
+ Orbit.store
+ configuración tenant
+ importadores/documentos validados
```

Cotizador y Comparativo deberán consultar desde Orbit 360:

```txt
aseguradoraId
país
moneda
productos
ramos
documentos fuente
versiones
configuraciones extraídas y validadas
instrucciones de extracción
formatos conocidos
coberturas conocidas
tarifas activas
vigencias
```

## Arquitectura de integración

```txt
Aseguradoras Orbit 360
  ├─ directorio operativo
  ├─ contactos
  ├─ accesos y credenciales por rol
  ├─ cuentas bancarias por rol
  ├─ documentos PDF/Excel
  ├─ trazabilidad y versiones
  ├─ propuestas extraídas
  ├─ configuraciones validadas para Cotizador
  └─ conocimiento validado para Comparativo
            ↓
      Cotizador v110 adaptado
      Comparativo v110 adaptado
```

## Regla de planes y tarifas

Planes y tarifas no se crean manualmente.

Se originan exclusivamente desde documentos cargados en la ficha de la aseguradora de Orbit 360:

```txt
PDF
XLS
XLSX
CSV
imagen con OCR cuando aplique
```

Flujo:

```txt
Aseguradoras Orbit
→ cargar documento
→ leer/extraer
→ proponer estructura
→ preview/diff
→ validación humana
→ versionar
→ habilitar para Cotizador/Comparativo
```

## Impacto Claude/prototipo

Claude debe trabajar sobre el módulo Aseguradoras existente de Orbit 360.

No debe recrear ni importar el directorio de aseguradoras de v110.

Claude solo debe adaptar visualmente los puntos de integración necesarios para:

- documentos fuente;
- estados de lectura;
- propuestas extraídas;
- validación;
- versiones;
- activación para Cotizador/Comparativo;
- accesos y cuentas restringidos por rol.

## Impacto backend

El backend debe desacoplar de v110:

- lectura de archivos;
- reglas de extracción;
- configuración validada;
- almacenamiento;
- permisos;
- auditoría.

Todos los módulos deben consumir `Orbit.store` o servicios backend compatibles, nunca Firebase directo desde el HTML.

## Impacto Academia

Academia debe enseñar:

- que Aseguradoras Orbit es la fuente de verdad;
- cómo cargar documentos desde la aseguradora;
- diferencia entre documento, propuesta extraída y configuración activa;
- cómo se alimenta Cotizador;
- cómo se alimenta Comparativo;
- cómo versionar y validar;
- por qué no se edita una tarifa sin documento fuente.

## Estado

Decisión cerrada y obligatoria. Cualquier empalme que importe el módulo de aseguradoras o estadísticas de v110 se considera regresión arquitectónica.