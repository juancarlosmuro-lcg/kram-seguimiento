/* =====================================================================
   LCG · Seguimiento Comercial — Plantillas de mensaje
   ---------------------------------------------------------------------
   Estos son los textos que Ari Sevilla (Comercializadora KRAM) envía a
   los prospectos para recomendar a London Consulting Group y abrir la
   conversación con Leonardo Pimentel. Edítalos libremente: la herramienta
   solo sustituye las etiquetas y respeta todo lo demás, incluidos los
   saltos de línea.

   Negritas: encierra el texto entre dobles asteriscos, **así**.
     · En WhatsApp se convierten al formato propio de la app (*así*), que es
       lo que se pega en el chat y se ve en negritas al enviarlo.
     · En el correo se copian como negritas reales al portapapeles, listas
       para pegar en Outlook o Gmail.
   Úsalas con medida: si se resalta todo, no resalta nada.

   Etiquetas disponibles:
     [Primer nombre]     → primera palabra del contacto (ej. "Diana")
     [Nombre contacto]   → nombre completo tal como está en data.js
     [Nombre empresa]    → nombre de la empresa
     [Cargo]             → cargo del contacto
     [o/a]               → concordancia de género. "Estimad[o/a]" produce
                           "Estimado" o "Estimada" según el selector de
                           trato que aparece junto al contacto.

   Si una cuenta no tiene contacto registrado, las etiquetas de nombre se
   sustituyen por un marcador visible para que no se envíe incompleto.
   ===================================================================== */

const PLANTILLAS = {

  /* ---------------- WhatsApp: personal y directo ---------------- */
  whatsapp:
`Hola [Primer nombre], ¿cómo estás? Te saluda Ari Sevilla, Director Comercial y miembro del Consejo de Comercializadora KRAM.

Te escribo porque quiero recomendarte retomar una conversación con **Leonardo Pimentel**, Director de Operaciones de London Consulting Group. Nosotros trabajamos con LCG un primer proyecto de transformación enfocado en rentabilidad e inteligencia artificial aplicada a la operación, y los resultados hablan por sí solos: crecimos **70% en ventas globales**, incrementamos **9.1 puntos nuestro margen neto** y alcanzamos un **ROI de 7 a 1**. Y actualmente estamos en el despliegue de un segundo proyecto enfocado en Sell Out y nuestro segundo CEDIS más importante en el país.

Algo que para nosotros hizo una diferencia importante es que **LCG no se queda en recomendaciones**: implementan directamente con los equipos y dentro de la operación, hasta convertir las oportunidades identificadas en resultados.

Además, Leonardo puede mostrarte sobre el despliegue que están haciendo de **modelos agénticos de IA** ya aplicados e implementados en procesos reales de negocio, y cómo los están utilizando para potenciar productividad, rentabilidad y toma de decisiones.

Creo que para [Nombre empresa] puede ser especialmente interesante. Estoy seguro de que desde el **prediagnóstico** pueden comenzar a generarles valor, porque ahí podrás ver de manera tangible dónde están los principales gaps de la operación, cuánto potencial existe por liberar y qué beneficio económico podría representar para la empresa.

¿Te parece bien si tenemos una llamada breve los dos con Leonardo y conversamos?

Saludos,
Ari Sevilla
Director Comercial y miembro del Consejo
Comercializadora KRAM`,

  /* ---------------- Correo: ejecutivo, con el caso completo ---------------- */
  correoAsunto:
`[Primer nombre], una recomendación para [Nombre empresa] | Rentabilidad + IA aplicada`,

  correoCuerpo:
`Estimad[o/a] [Primer nombre]:

Espero que te encuentres muy bien. Soy Ari Sevilla, Director Comercial y miembro del Consejo de Comercializadora KRAM.

Quise escribirte personalmente para recomendarte conocer a **Leonardo Pimentel**, Director de Operaciones de London Consulting Group, firma con la que hemos venido trabajando en KRAM y con la que hemos obtenido resultados muy relevantes.

Con LCG desarrollamos un primer proyecto de transformación enfocado en rentabilidad e inteligencia artificial aplicada a la operación, y los resultados hablan por sí solos: crecimos **70% en ventas globales**, incrementamos **9.1 puntos nuestro margen neto** y alcanzamos un **ROI de 7 a 1**. A partir de esos resultados, actualmente estamos desplegando con ellos un segundo proyecto enfocado en Sell Out y en nuestro segundo CEDIS más importante del país.

Algo que para nosotros hizo una diferencia importante es que **LCG no se queda en recomendaciones**: implementan directamente con los equipos y dentro de la operación, hasta convertir las oportunidades identificadas en resultados.

Adicionalmente, Leonardo puede mostrarte el despliegue que están realizando de **modelos agénticos de IA** ya aplicados e implementados en procesos reales de negocio, y cómo los están utilizando para potenciar productividad, rentabilidad y toma de decisiones.

Por el tipo de operación de [Nombre empresa], creo que puede ser especialmente interesante que conozcas lo que están haciendo. Estoy seguro de que desde el **prediagnóstico** pueden comenzar a generarles valor, porque es ahí donde podrán visualizar de manera tangible los principales gaps de la operación, dimensionar cuánto potencial existe por liberar y qué beneficio económico podría representar para la empresa.

Por eso quería hacerte personalmente esta recomendación.

¿Te parece bien si tenemos una llamada breve los dos con Leonardo y conversamos?

Saludos,
Ari Sevilla
Director Comercial y miembro del Consejo
Comercializadora KRAM`

};
