/* =====================================================================
   LCG · Seguimiento Comercial — Capa de base compartida (Supabase)
   ---------------------------------------------------------------------
   Encapsula todo lo que tiene que ver con la nube: iniciar sesión con la
   contraseña del equipo, leer el seguimiento, guardarlo y escuchar los
   cambios que hacen los demás en tiempo real.

   app.js no sabe nada de Supabase: solo llama a estas funciones. Si el
   archivo config.js está vacío, `configurado()` devuelve false y la
   aplicación trabaja en modo local con localStorage.
   ===================================================================== */
(function () {
  'use strict';

  const TABLA = 'seguimiento';
  const cfg = (typeof SUPABASE_CONFIG !== 'undefined') ? SUPABASE_CONFIG : {};

  let cliente = null;
  let canal = null;

  /** ¿El equipo ya llenó config.js? */
  function configurado() {
    return !!(cfg.url && cfg.anonKey && String(cfg.url).indexOf('http') === 0);
  }

  function obtenerCliente() {
    if (cliente) return cliente;
    const lib = window.supabase;
    if (!lib || typeof lib.createClient !== 'function') {
      throw new Error('No se pudo cargar la librería de Supabase. Revisa tu conexión a internet y recarga.');
    }
    cliente = lib.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return cliente;
  }

  /** Traduce los errores técnicos de Supabase a algo que cualquiera entienda. */
  function mensajeAmable(error) {
    const texto = String((error && error.message) || error || '');
    if (/Invalid login credentials/i.test(texto)) return 'Contraseña incorrecta.';
    if (/Email not confirmed/i.test(texto)) return 'El usuario del equipo no está confirmado en Supabase.';
    if (/relation .* does not exist|Could not find the table/i.test(texto)) {
      return 'La tabla "seguimiento" no existe todavía en Supabase. Corre el script supabase.sql.';
    }
    if (/Failed to fetch|NetworkError/i.test(texto)) return 'Sin conexión con la base. Revisa tu internet.';
    if (/JWT|not authenticated|permission denied|row-level security/i.test(texto)) {
      return 'Tu sesión expiró. Vuelve a entrar con la contraseña del equipo.';
    }
    return texto || 'Ocurrió un error inesperado.';
  }

  /** Fila de la base -> objeto que usa la aplicación. */
  function desdeFila(fila) {
    return {
      estatus: fila.estatus || 'Pendiente',
      fechaCita: fila.fecha_cita || '',
      notas: fila.notas || '',
      actualizadoPor: fila.actualizado_por || '',
      actualizadoEn: fila.actualizado_en || ''
    };
  }

  /** Cuenta de la aplicación -> fila para la base. */
  function haciaFila(cuenta, autor) {
    return {
      id: cuenta.id,
      empresa: cuenta.empresa,
      estatus: cuenta.estatus,
      fecha_cita: cuenta.fechaCita || null,
      notas: cuenta.notas || '',
      actualizado_por: autor || '',
      actualizado_en: new Date().toISOString()
    };
  }

  async function haySesion() {
    const { data } = await obtenerCliente().auth.getSession();
    return !!(data && data.session);
  }

  async function entrar(clave) {
    const { error } = await obtenerCliente().auth.signInWithPassword({
      email: cfg.correoEquipo,
      password: clave
    });
    if (error) throw new Error(mensajeAmable(error));
  }

  async function salir() {
    if (canal) { try { obtenerCliente().removeChannel(canal); } catch (e) { /* ignorar */ } canal = null; }
    await obtenerCliente().auth.signOut();
  }

  /** Devuelve { id: {estatus, fechaCita, notas, actualizadoPor, actualizadoEn} }. */
  async function cargar() {
    const { data, error } = await obtenerCliente().from(TABLA).select('*');
    if (error) throw new Error(mensajeAmable(error));
    const mapa = {};
    (data || []).forEach(fila => { mapa[fila.id] = desdeFila(fila); });
    return mapa;
  }

  async function guardar(cuenta, autor) {
    const { error } = await obtenerCliente().from(TABLA).upsert(haciaFila(cuenta, autor));
    if (error) throw new Error(mensajeAmable(error));
  }

  async function guardarVarias(cuentas, autor) {
    if (!cuentas.length) return;
    const filas = cuentas.map(c => haciaFila(c, autor));
    const { error } = await obtenerCliente().from(TABLA).upsert(filas);
    if (error) throw new Error(mensajeAmable(error));
  }

  /** Borra el seguimiento de todo el equipo (la base de cuentas vive en data.js). */
  async function limpiar() {
    const { error } = await obtenerCliente().from(TABLA).delete().neq('id', '');
    if (error) throw new Error(mensajeAmable(error));
  }

  /**
   * Escucha los cambios de los demás.
   * alCambio(id, datos)  → datos = null cuando la fila se borró.
   * alEstado(conectado)  → true/false según el estado del canal.
   */
  function escuchar(alCambio, alEstado) {
    const c = obtenerCliente();
    if (canal) { try { c.removeChannel(canal); } catch (e) { /* ignorar */ } }
    canal = c.channel('seguimiento-lcg')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLA }, carga => {
        if (carga.eventType === 'DELETE') {
          alCambio((carga.old && carga.old.id) || null, null);
        } else if (carga.new) {
          alCambio(carga.new.id, desdeFila(carga.new));
        }
      })
      .subscribe(estadoCanal => {
        if (alEstado) alEstado(estadoCanal === 'SUBSCRIBED');
      });
    return canal;
  }

  window.NubeLCG = {
    configurado: configurado,
    haySesion: haySesion,
    entrar: entrar,
    salir: salir,
    cargar: cargar,
    guardar: guardar,
    guardarVarias: guardarVarias,
    limpiar: limpiar,
    escuchar: escuchar,
    mensajeAmable: mensajeAmable
  };
})();
