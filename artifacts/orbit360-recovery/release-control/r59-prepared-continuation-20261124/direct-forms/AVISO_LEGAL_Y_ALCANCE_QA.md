# Aviso legal y alcance de la prueba de renovación

## Estado de la revisión

La fuente reproducida usa los mismos archivos de v28. La prueba nueva verifica demasiado pronto que no hay pantalla legal: el arranque la programa 350 ms después. El error real conservado solo acredita el timeout del click; el run no exportó hit-test ni DOM de DirectForms. Esta revisión no declara retrospectivamente qué elemento interceptó aquel click.

## Texto y alcance visibles

Encabezado: **Acuerdos legales**. Versión: **2.0**. Tipo: **interno**. País del caso: **Guatemala**. Empresa: **Alianzas & Soluciones**. Cuenta: la del actor autenticado.

La casilla dice: «He leído y acepto íntegramente los acuerdos anteriores.» El botón dice: «Aceptar y continuar». En cuentas con varios países, la interfaz requiere elegir uno si no hay contexto de país definido.

Las tres cláusulas GT de E4 y de v28 tienen exactamente el mismo contenido proyectado, con SHA256 `485b07887091063cc7a5d1dc8f11a9bb547f2ef059490bb04d4acee73404f6b2`. Los archivos JavaScript son distintos, pero este contenido mostrado es idéntico.

## Contenido exacto de las cláusulas

### 🔒 Acuerdo de confidencialidad y manejo de información

Este acuerdo regula el acceso del colaborador a la información confidencial contenida y gestionada en la plataforma Orbit 360 en el marco de su relación con Alianzas & Soluciones.

**1. Definición de Información Confidencial**

Se entiende por “Información Confidencial” toda información de clientes (datos personales, pólizas, primas, siniestros), de la cartera, comercial, financiera, técnica, operativa, de aseguradoras, contraseñas, tarifas, así como la arquitectura, lógicas, flujos y know-how de la plataforma, en cualquier formato y soporte.

**2. Obligaciones del colaborador**

- Usar la Información Confidencial exclusivamente para las funciones asignadas, dentro de la plataforma.
- No divulgar, copiar, descargar, fotografiar, exportar ni extraer información de clientes o de la cartera fuera de la plataforma sin autorización escrita.
- No utilizar la información para beneficio propio o de terceros, ni para captar clientes de la cartera al cesar la relación.
- Custodiar las credenciales de acceso de forma personal e intransferible y notificar de inmediato cualquier uso indebido.

**3. Vigencia**

La obligación de confidencialidad rige durante toda la relación con Alianzas & Soluciones y se mantiene de forma indefinida tras su terminación respecto de los datos de clientes y de la cartera. Al cesar la relación, el colaborador devolverá o eliminará toda copia de Información Confidencial en su poder.

**4. Consecuencias del incumplimiento**

El incumplimiento faculta a Alianzas & Soluciones a terminar la relación con justa causa y a ejercer las acciones civiles y penales que correspondan por los daños y perjuicios ocasionados, sin perjuicio de las sanciones disciplinarias aplicables.

Ley aplicable: las leyes de la República de Guatemala · Jurisdicción: los tribunales competentes de la ciudad de Guatemala

### 🛡️ Autorización para el tratamiento de datos personales

En cumplimiento de las normas de protección de datos personales y de confidencialidad bancaria y de seguros vigentes en la República de Guatemala, se informa la política de tratamiento de los datos personales gestionados en la plataforma.

**1. Responsable y finalidad**

Alianzas & Soluciones es responsable del tratamiento. Los datos se tratan con finalidad legítima: cotización, emisión, cobro, renovación, atención de siniestros, gestión comercial y cumplimiento de obligaciones legales y contractuales.

**2. Derechos del titular**

- Conocer, actualizar y rectificar sus datos personales.
- Solicitar prueba de la autorización otorgada.
- Ser informado sobre el uso dado a sus datos.
- Revocar la autorización y/o solicitar la supresión cuando no exista deber legal de conservarlos.
- Presentar quejas ante la autoridad de protección de datos competente.

**3. Transferencias**

Los datos no se comparten con terceros salvo aseguradoras, reaseguradoras y proveedores necesarios para prestar el servicio, o cuando lo exija la ley. Todo encargado queda obligado a las mismas medidas de protección.

**4. Conservación y seguridad**

Los datos se conservan mientras dure la relación y los plazos legales aplicables. Se aplican medidas técnicas y administrativas razonables para proteger la información contra acceso no autorizado, pérdida o alteración.

Marco: las normas de protección de datos personales y de confidencialidad bancaria y de seguros vigentes en la República de Guatemala · Autoridad: la autoridad de protección de datos competente

### 🤖 Descargo sobre resultados de inteligencia artificial

La plataforma incluye funciones asistidas por IA (extracción de documentos, análisis, recomendaciones, generación de contenido y mensajes).

**1. Naturaleza de apoyo**

- Los resultados de la IA son apoyos y deben usarse con criterio profesional.
- La IA puede contener imprecisiones; el usuario valida y verifica antes de tomar decisiones o comunicarlas a clientes/aseguradoras.
- Las cotizaciones, comparativos y textos generados no constituyen oferta vinculante hasta su validación humana.

**2. Responsabilidad**

el titular de Orbit 360 y Alianzas & Soluciones no se responsabilizan por decisiones tomadas con base exclusiva en resultados de IA sin la debida verificación profesional.

## Autoridad encontrada y límite concreto

Los scopes vigentes de Preview y LIVE autorizan solamente la aceptación de Paula como Dirección en Guatemala. Prohíben aceptar por otros actores, sembrar almacenamiento de aceptación o eludir la pantalla. El recibo de Carlos en E4 acredita su aceptación personal del 3 de noviembre en el origen E4; no contiene un registro exacto reutilizable para el origen actual de Preview ni para LIVE.

El origen Preview actual es `https://ays-orbit-360-lab--gi-i66-rc-45448470011-hrham9ah.web.app`; el origen LIVE autorizado para pruebas es `https://app.aysseguros.com`. Las aceptaciones del producto se guardan localmente por origen. El contexto nuevo de Playwright no hereda una sesión del navegador de Carlos.

La propuesta técnica adjunta observa el resultado real del owner legal antes de tocar renovación, verifica únicamente una aceptación ya existente del actor/origen/país/versión y conserva diagnóstico seguro antes de cerrar y restaurar las pruebas. No acepta, no registra, no importa almacenamiento y no altera el producto.

Esta propuesta por sí sola deja un HOLD explícito cuando falta esa aceptación existente. Resolver el requisito exigiría una sesión legítima del origen correspondiente o una decisión específica y revisable sobre el alcance de QA. No debe describirse una simulación técnica como consentimiento personal de Carlos ni como ejecución ya acreditada.

## Archivos de la propuesta

- `direct-forms-readiness-and-safe-diagnostics.patch`: únicamente el driver existente y su prueba existente.
- `source-legal-readiness-race.json`: reproducción de orden de eventos con owners exactos, sin navegador ni red.
- `legal-e4-v28-content-comparison.json`: cláusulas exactas, hashes y alcance.

La propuesta aún no se ha integrado ni publicado. No constituye aceptación Preview o LIVE.
