/* =====================================================================
   LCG · Seguimiento Comercial — Configuración de la base compartida
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar para activar el modo
   "en vivo", en el que todo el equipo ve los mismos cambios.

   Mientras url y anonKey estén vacíos, la herramienta funciona en modo
   local: cada persona guarda su seguimiento en su propio navegador.

   Los tres valores salen de tu proyecto de Supabase (el README explica
   dónde encontrarlos, paso a paso).
   ===================================================================== */

const SUPABASE_CONFIG = {

  // 1. URL del proyecto. Se ve así: https://abcdefghijkl.supabase.co
  url: 'https://bfzroedzypjxmioqoaoo.supabase.co',

  // 2. Llave pública "anon". Es un texto largo que empieza con "eyJ".
  //    Es segura de publicar: sin la contraseña del equipo no da acceso
  //    a nada, porque la base exige haber iniciado sesión.
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmenJvZWR6eXBqeG1pb3FvYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjgyNzMsImV4cCI6MjEwNDU0NDI3M30.vwjo3cWRX7vJRtwk12IcWBQwe3Dq0DeDgyka7vqVWxE',

  // 3. Correo del usuario compartido que creaste en Supabase.
  //    No hace falta que exista de verdad: es solo la identidad interna
  //    a la que va ligada la contraseña del equipo.
  correoEquipo: 'juancarlos.muro@londoncg.mx'

};
