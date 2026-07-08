# Ensayo M3 — Directorios de aseguradoras GT/CO v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Definir el ensayo controlado para importar directorios de aseguradoras Guatemala y Colombia sin crear clientes, pólizas, cobros, cartera, producción ni comisiones.

Este ensayo es de riesgo medio-bajo: actualiza catálogo/directorio, pero puede contener contactos, teléfonos, enlaces y datos operativos sensibles. Por eso primero debe correr en dry-run y no debe subir archivos fuente al repo.

## Fuentes revisadas localmente

Archivos locales:

- `Directorio Aseguradoras Guatemala 2026.xlsx`
- `Directorio - Aseguradoras Colombia 2024.xlsx`

Revisión realizada solo sobre estructura.
No se subieron archivos reales al repositorio.
No se copiaron contactos, teléfonos, correos, claves ni datos operativos al repo.
No se cargaron datos reales.

## Estructura observada

### Guatemala

- Libro con hoja índice y hojas por aseguradora.
- Hoja índice con tabla de directorio.
- Encabezado de tabla detectado alrededor de fila 7.
- Varias hojas adicionales contienen detalle por aseguradora.
- Incluye hojas internas/no operativas que no deben mapearse como aseguradoras.

### Colombia

- Libro con hoja índice y hojas por aseguradora.
- Hoja índice con tabla de directorio.
- Encabezado de tabla detectado alrededor de fila 7.
- También contiene bloque de personal/contactos internos que no debe importarse como aseguradora.
- Varias hojas adicionales contienen detalle por aseguradora.

## Mapeo recomendado hacia Orbit

El importador `directorio-aseguradoras` espera:

- `nombre`.
- `ramosTxt`.
- `email`.
- `telefono`.
- `pais`.

Mapeo recomendado para primer ensayo:

| Orbit | Fuente sugerida | Observación |
|---|---|---|
| nombre | Aseguradora | Campo clave de deduplicación |
| telefono | Teléfono comercial / oficina / emergencias | No mezclar múltiples teléfonos sin etiqueta si el campo no soporta estructura |
| email | Contacto / correo | Solo si existe correo claro |
| pais | País de la fuente | GT para archivo Guatemala, CO para archivo Colombia |
| ramosTxt | Ramos / productos | Si no está en índice, dejar pendiente o leer de hoja detalle en fase posterior |

## Regla de país/moneda

Aunque el archivo sea claramente de GT o CO, el importador debe dejar trazabilidad de país por fuente/hoja/fila.

- Guatemala -> país `GT`.
- Colombia -> país `CO`.

La fuente de país debe quedar explícita en metadata/dry-run. No debe depender de una suposición silenciosa.

## Riesgos detectados

### 1. Hojas por aseguradora

Cada libro contiene hojas por aseguradora. Para primer ensayo se recomienda usar solo la hoja índice.

Las hojas de detalle pueden importarse después como complemento, con mapeo separado para:

- contactos;
- portales;
- cuentas;
- documentos;
- ramos;
- observaciones.

### 2. Hojas internas o no operativas

Algunas hojas no son directorio de aseguradora. Deben excluirse del mapeo estructurado.

### 3. Datos sensibles

El directorio puede contener datos operativos como contactos, enlaces, códigos, claves de productor, teléfonos y correos.

Regla:

- No subir fuente al repo.
- No hardcodear datos reales.
- No guardar contraseñas.
- Si aparece clave/código operativo, tratar como dato sensible o `credentialRef/backend_required` según aplique.

### 4. Duplicados entre GT/CO y nombres similares

Puede haber aseguradoras con nombres iguales o similares en ambos países.

La deduplicación debe considerar país además del nombre cuando sea necesario.

### 5. Vinculación

Las aseguradoras importadas deben quedar como directorio/catálogo. No deben quedar activas para cotizar/emisión sin revisión.

Estado recomendado:

```txt
vinculada = false
```

## Criterio de aceptación M3

El ensayo pasa si:

- dry-run separa GT y CO;
- solo propone crear/actualizar `aseguradoras`;
- no crea clientes;
- no crea pólizas;
- no crea cobros;
- no crea cartera;
- no toca comisiones ni tarifarios;
- deja `vinculada=false` por defecto para nuevos registros;
- conserva trazabilidad de archivo, hoja y fila;
- genera reporte descargable;
- omite hojas no operativas;
- no guarda claves ni contraseñas reales.

## Resultado esperado

Resultado aceptable:

```txt
Aseguradoras propuestas/creadas como directorio por país.
Sin clientes.
Sin pólizas.
Sin cobros.
Sin cartera.
Sin tarifas aplicadas.
Sin credenciales reales.
```

## Relación con el hotfix de Aseguradoras

Este ensayo se apoya en el hotfix ya aplicado:

- borrar aseguradora queda bloqueado si hay vínculos;
- desactivar conserva histórico;
- credenciales reales no se guardan en frontend;
- borrado solo aplica si no hay vínculos operativos.

## Impacto Claude/prototipo

Claude debe conservar cuando entre:

- importación de directorios como catálogo, no como activación automática;
- estado visible de aseguradora vinculada/no vinculada;
- ficha con contactos y portales sin contraseñas reales;
- acción segura de desactivar en vez de borrar con historial;
- separación por país.

## Impacto Academia

Academia debe enseñar:

- diferencia entre aseguradora en directorio y aseguradora vinculada;
- por qué no se borran aseguradoras con historial;
- cómo revisar contactos y portales;
- por qué las credenciales no se guardan en frontend;
- cómo validar país antes de usar una aseguradora en cotización/emisión.

## Estado

Documento creado.
No se tocó código funcional.
No se subieron fuentes reales.
No se cargaron datos reales.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No secretos.
