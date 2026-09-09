/* =====================================================================
   LCG · Seguimiento Comercial — Plantillas de mensaje
   ---------------------------------------------------------------------
   Estos son los textos que Ari Sevilla (Comercializadora KRAM) envía a
   los prospectos para recomendar a London Consulting Group y abrir la
   cita. Edítalos libremente: la herramienta solo sustituye las etiquetas
   y respeta todo lo demás, incluidos los saltos de línea.

   Etiquetas disponibles:
     [Primer nombre]     → primera palabra del contacto (ej. "Carlos")
     [Nombre contacto]   → nombre completo tal como está en data.js
     [Nombre empresa]    → nombre de la empresa
     [Cargo]             → cargo del contacto

   Si una cuenta no tiene contacto registrado, las etiquetas de nombre se
   sustituyen por un marcador visible para que no se envíe incompleto.
   ===================================================================== */

const PLANTILLAS = {

  /* ---------------- WhatsApp: personal, directo, breve ---------------- */
  whatsapp:
`Hola [Primer nombre], ¿cómo estás? Te saluda Ari Sevilla, Director Comercial de Comercializadora KRAM.

Te escribo por algo que a nosotros nos funcionó muy bien. Trabajamos con London Consulting Group en un proyecto de rentabilidad e inteligencia artificial aplicada a la operación, y los resultados hablan solos: crecimos 70% en ventas globales y subimos 9.1 puntos de margen neto, con un ROI de 7 a 1.

No son una firma que entrega recomendaciones y se va: implementan con tu gente, dentro de tu operación.

Me gustaría conectarte con su equipo directivo para que te muestren el caso y cómo lo aplicarían en [Nombre empresa]. Es una sesión de una hora, sin costo ni compromiso. Yo únicamente los presento.

Si te parece, les paso tu contacto y ellos te buscan. Estos son los horarios que su equipo tiene disponibles:

Lun 14 sep · 1:00 o 2:00 pm
Mar 15 sep · 1:00, 3:00 o 4:00 pm
Jue 17 sep · 10:00 am
Vie 18 sep · 12:00 pm

Si esa semana la traes cargada, la del 21 al 25 también tienen espacio. Quedo pendiente de tu confirmación.`,

  /* ---------------- Correo: ejecutivo, con el caso completo ---------------- */
  correoAsunto:
`Recomendación para [Nombre empresa] · rentabilidad e IA aplicada a la operación`,

  correoCuerpo:
`Estimado [Primer nombre],

Espero que te encuentres muy bien. Te saluda Ari Sevilla, Director Comercial de Comercializadora KRAM.

Te escribo para recomendarte de manera directa a London Consulting Group, la firma con la que trabajamos en KRAM y que quiero que conozcas.

Como contexto, en KRAM llevamos más de 35 años en la importación y distribución de confitería y chocolates, con marcas como Feastables, Ritter Sport, PEZ y Jelly Belly, y atendiendo a clientes como Costco, Walmart, 7-Eleven y Liverpool. En un negocio así, el reto no es tener información: es actuar sobre ella a la velocidad a la que se mueve el mercado.

Con London Consulting Group implementamos un modelo de rentabilidad y agentes de inteligencia artificial conectados a nuestra operación, para decidir presupuesto, portafolio y puntos de venta con datos y no por intuición. Los resultados del proyecto fueron los siguientes:

• Crecimiento de 70% en ventas globales
• Incremento de 9.1 puntos porcentuales en margen neto
• ROI de 7.1 a 1

Lo que más valoro de ellos es que son una firma de implementación, no de recomendación: trabajan dentro de la operación, junto con el equipo, y firman por contrato un ROI mínimo de 1 a 1. Están certificados por Anthropic para el diseño e implementación de ecosistemas de inteligencia artificial agéntica.

Considero que en [Nombre empresa] hay una oportunidad clara de aplicar algo similar. Me gustaría presentarte a su equipo directivo en una sesión de una hora, sin costo ni compromiso, en la que te compartan el caso a detalle y cómo lo abordarían en tu operación. La reunión sería directamente con ellos; yo únicamente hago la presentación.

Te comparto las opciones de agenda de su equipo:

Semana del 14 al 18 de septiembre
• Lunes 14: 1:00 pm, 2:00 pm
• Martes 15: 1:00 pm, 3:00 pm, 4:00 pm
• Jueves 17: 10:00 am
• Viernes 18: 12:00 pm

Semana del 21 al 25 de septiembre
• Lunes 21: 1:00 pm, 3:00 pm
• Martes 22: 1:00 pm, 3:00 pm, 4:00 pm
• Miércoles 23: 3:00 pm, 4:00 pm
• Jueves 24: 3:00 pm, 4:00 pm
• Viernes 25: 12:00 pm

Confírmame el horario que te acomode y con gusto los conecto.

Saludos cordiales,

Ari Sevilla
Director Comercial
Comercializadora KRAM`

};
