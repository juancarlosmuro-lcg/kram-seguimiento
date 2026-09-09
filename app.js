/* =====================================================================
   LCG · Seguimiento Comercial — Lógica de la aplicación
   ---------------------------------------------------------------------
   Vanilla JS, sin dependencias. Secciones:
     1. Configuración y estado
     2. Utilidades
     3. Persistencia (localStorage)
     4. Cálculo de métricas
     5. Render (portada, KPIs, resúmenes, tabla)
     6. Filtros y ordenamiento
     7. Edición inline y cajón de detalle
     8. Exportar / importar / restablecer
     9. Arranque
   ===================================================================== */
(function () {
  'use strict';

  /* ============ 1. CONFIGURACIÓN Y ESTADO ============ */

  const CLAVE_ALMACEN = 'lcg.seguimiento.v1';
  const VERSION_DATOS = 1;

  // Orden del embudo comercial: también define el orden al ordenar por estatus.
  const ESTATUS = [
    { valor: 'Pendiente',          clase: 'pill-pendiente' },
    { valor: 'Contactado',         clase: 'pill-contactado' },
    { valor: 'En seguimiento',     clase: 'pill-en-seguimiento' },
    { valor: 'Cita por confirmar', clase: 'pill-cita-por-confirmar' },
    { valor: 'Cita agendada',      clase: 'pill-cita-agendada' },
    { valor: 'Cita realizada',     clase: 'pill-cita-realizada' },
    { valor: 'Reprogramar',        clase: 'pill-reprogramar' },
    { valor: 'No responde',        clase: 'pill-no-responde' },
    { valor: 'No interesado',      clase: 'pill-no-interesado' }
  ];
  const ESTATUS_VALORES = ESTATUS.map(e => e.valor);
  const ESTATUS_INICIAL = 'Pendiente';
  const CON_CITA = ['Cita agendada', 'Cita realizada'];
  const PRIORIDAD = { AAA: 3, AA: 2, A: 1 };

  // Columnas del CSV de exportación (mismo orden que el Excel original).
  const COLUMNAS_CSV = [
    ['empresa',        'Empresa'],
    ['clasificacion',  'Clasificación'],
    ['estado',         'Estado de la República'],
    ['zona',           'Zona'],
    ['industria',      'Industria'],
    ['contacto',       'Contacto'],
    ['cargo',          'Cargo'],
    ['telefono',       'Teléfono'],
    ['correo',         'Correo'],
    ['estatus',        'Estatus de cita'],
    ['fechaCita',      'Fecha de consecución de cita'],
    ['notas',          'Notas'],
    ['id',             'id']
  ];

  const CLAVE_NOMBRE = 'lcg.nombre';

  const estado = {
    cuentas: [],
    filtros: { buscar: '', clasificacion: '', zona: '', industria: '', estatus: '' },
    orden: { campo: null, dir: 'asc' },   // null = orden original del Excel
    idAbierto: null,
    focoExpandido: false,
    ultimoGuardado: null,
    almacenDisponible: true,
    modo: 'local',        // 'local' = localStorage · 'nube' = base compartida
    autor: '',            // nombre de quien usa la herramienta (solo en modo nube)
    conectado: false      // canal de tiempo real activo
  };

  const enNube = () => estado.modo === 'nube';

  const $ = sel => document.querySelector(sel);
  const el = {};

  /* ============ 2. UTILIDADES ============ */

  /** En el Excel los datos ausentes vienen como "-": eso se conserva y se muestra como "—". */
  const esVacio = v => v === undefined || v === null || v === '' || v === '-' || v === '—';
  const mostrar = v => (esVacio(v) ? '—' : v);

  const normalizar = t => String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const escapar = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const claseEstatus = valor => (ESTATUS.find(e => e.valor === valor) || ESTATUS[0]).clase;

  const tieneCita = c => CON_CITA.indexOf(c.estatus) !== -1;

  const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

  /** "2026-03-14" -> "14 mar 2026" (sin desfase de zona horaria). */
  function fechaLegible(iso) {
    if (!iso) return '—';
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return Number(partes[2]) + ' ' + meses[Number(partes[1]) - 1] + ' ' + partes[0];
  }

  function hoyIso() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  let temporizadorAviso = null;
  function aviso(texto, tipo) {
    el.aviso.textContent = texto;
    el.aviso.classList.toggle('aviso--error', tipo === 'error');
    el.aviso.classList.add('aviso--visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.aviso.classList.remove('aviso--visible'),
      tipo === 'error' ? 5000 : 1600);
  }

  /* ============ 3. PERSISTENCIA ============ */

  /** Devuelve { id: {estatus, fechaCita, notas} } con lo guardado en este navegador. */
  function leerAlmacen() {
    try {
      const crudo = localStorage.getItem(CLAVE_ALMACEN);
      if (!crudo) return {};
      const obj = JSON.parse(crudo);
      estado.ultimoGuardado = obj.actualizado || null;
      return (obj && typeof obj.seguimiento === 'object' && obj.seguimiento) || {};
    } catch (e) {
      estado.almacenDisponible = false;
      return {};
    }
  }

  function escribirAlmacen() {
    const seguimiento = {};
    estado.cuentas.forEach(c => {
      // Solo se guarda lo que el usuario capturó; la base viene siempre de data.js.
      if (c.estatus !== ESTATUS_INICIAL || c.fechaCita || c.notas) {
        seguimiento[c.id] = { estatus: c.estatus, fechaCita: c.fechaCita, notas: c.notas };
      }
    });
    estado.ultimoGuardado = new Date().toISOString();
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify({
        version: VERSION_DATOS,
        actualizado: estado.ultimoGuardado,
        seguimiento: seguimiento
      }));
      return true;
    } catch (e) {
      estado.almacenDisponible = false;
      return false;
    }
  }

  /** Une la base del Excel con un mapa de seguimiento { id: {...} }. */
  function construirCuentas(seguimiento) {
    const guardado = seguimiento || {};
    estado.cuentas = CUENTAS_INICIALES.map(base => {
      const extra = guardado[base.id] || {};
      return Object.assign({}, base, camposSeguimiento(extra));
    });
  }

  /** Normaliza los campos editables; sirve tanto para localStorage como para la nube. */
  function camposSeguimiento(extra) {
    return {
      estatus: ESTATUS_VALORES.indexOf(extra.estatus) !== -1 ? extra.estatus : ESTATUS_INICIAL,
      fechaCita: typeof extra.fechaCita === 'string' ? extra.fechaCita : '',
      notas: typeof extra.notas === 'string' ? extra.notas : '',
      actualizadoPor: typeof extra.actualizadoPor === 'string' ? extra.actualizadoPor : '',
      actualizadoEn: typeof extra.actualizadoEn === 'string' ? extra.actualizadoEn : ''
    };
  }

  /** Guarda una cuenta donde corresponda según el modo, y avisa al usuario. */
  function persistir(cuenta, mensaje) {
    if (enNube()) {
      NubeLCG.guardar(cuenta, estado.autor)
        .then(() => { estado.ultimoGuardado = new Date().toISOString(); renderMetaGuardado(); aviso(mensaje || 'Guardado'); })
        .catch(e => aviso('No se guardó: ' + e.message, 'error'));
      return;
    }
    const ok = escribirAlmacen();
    renderMetaGuardado();
    if (ok) aviso(mensaje || 'Guardado');
    else aviso('Este navegador no permite guardar. Exporta tu seguimiento.', 'error');
  }

  /* ============ 4. MÉTRICAS ============ */

  function metricas(lista) {
    const total = lista.length;
    const agendadas = lista.filter(tieneCita).length;
    const realizadas = lista.filter(c => c.estatus === 'Cita realizada').length;
    return {
      total: total,
      agendadas: agendadas,
      realizadas: realizadas,
      pendientes: total - agendadas,
      avance: porcentaje(agendadas, total)
    };
  }

  function agrupar(campo, ordenPersonalizado) {
    const mapa = new Map();
    estado.cuentas.forEach(c => {
      const clave = c[campo] || '—';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(c);
    });
    let claves = Array.from(mapa.keys());
    if (ordenPersonalizado) {
      claves.sort((a, b) => ordenPersonalizado.indexOf(a) - ordenPersonalizado.indexOf(b));
    } else {
      claves.sort((a, b) => mapa.get(b).length - mapa.get(a).length);
    }
    return claves.map(k => Object.assign({ clave: k }, metricas(mapa.get(k))));
  }

  /* ============ 5. RENDER ============ */

  function renderLecturaEjecutiva() {
    const m = metricas(estado.cuentas);
    const prioritariasSinCita = estado.cuentas
      .filter(c => c.clasificacion === 'AAA' && !tieneCita(c)).length;

    el.lectura.innerHTML =
      '<b>' + m.total + '</b> cuentas en la cartera. <b>' + m.agendadas + '</b> ya tienen cita conseguida y ' +
      '<b>' + m.pendientes + '</b> siguen pendientes, con un avance de <b>' + m.avance + '%</b>. ' +
      (prioritariasSinCita > 0
        ? 'Quedan <b>' + prioritariasSinCita + '</b> cuentas AAA por convertir.'
        : 'Todas las cuentas AAA ya tienen cita.');
  }

  /** Devuelve la cuenta modificada más recientemente (para el encabezado). */
  function ultimoMovimiento() {
    let ultima = null;
    estado.cuentas.forEach(c => {
      if (c.actualizadoEn && (!ultima || c.actualizadoEn > ultima.actualizadoEn)) ultima = c;
    });
    return ultima;
  }

  function fechaHoraCorta(iso) {
    const f = new Date(iso);
    return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }) +
      ' a las ' + f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function renderMetaGuardado() {
    if (enNube()) {
      const ultima = ultimoMovimiento();
      const conexion = estado.conectado ? 'Seguimiento compartido en vivo' : 'Conectando con la base compartida…';
      el.metaGuardado.textContent = ultima
        ? conexion + '. Último cambio: ' + escapar(ultima.empresa) + ', el ' + fechaHoraCorta(ultima.actualizadoEn) +
          (ultima.actualizadoPor ? ' por ' + ultima.actualizadoPor : '') + '.'
        : conexion + '. Todavía no hay cambios registrados.';
      return;
    }
    if (!estado.almacenDisponible) {
      el.metaGuardado.textContent = 'Este navegador bloquea el almacenamiento local: los cambios no se conservarán al recargar. Usa Exportar para respaldarlos.';
      return;
    }
    if (!estado.ultimoGuardado) {
      el.metaGuardado.textContent = 'Aún no hay cambios guardados en este navegador.';
      return;
    }
    const f = new Date(estado.ultimoGuardado);
    el.metaGuardado.textContent = 'Último cambio guardado en este navegador el ' +
      f.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' a las ' + f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function renderKpis() {
    const m = metricas(estado.cuentas);
    el.kpiTotal.textContent = m.total;
    el.kpiAgendadas.textContent = m.agendadas;
    el.kpiRealizadas.textContent = m.realizadas;
    el.kpiPendientes.textContent = m.pendientes;
    el.kpiAvance.textContent = m.avance + '%';
    el.barraAvance.style.width = m.avance + '%';
  }

  function filaResumen(r) {
    return '<tr>' +
      '<td>' + escapar(r.clave) + '</td>' +
      '<td class="num">' + r.total + '</td>' +
      '<td class="num">' + r.agendadas + '</td>' +
      '<td class="num">' + r.realizadas + '</td>' +
      '<td class="num">' + r.pendientes + '</td>' +
      '<td class="celda-avance">' +
        '<div class="barra"><div class="barra__relleno" style="width:' + r.avance + '%"></div></div>' +
        '<span class="barra-pct">' + r.avance + '%</span>' +
      '</td>' +
    '</tr>';
  }

  function renderResumenes() {
    el.resumenZona.innerHTML = agrupar('zona').map(filaResumen).join('');
    el.resumenClasificacion.innerHTML =
      agrupar('clasificacion', ['AAA', 'AA', 'A']).map(filaResumen).join('');
  }

  const FOCO_VISIBLES = 3;   // cuántas cuentas se listan sin expandir

  /** Cuentas AAA/AA sin cita conseguida: la lista de trabajo del día. */
  function renderFoco() {
    const foco = estado.cuentas
      .filter(c => !tieneCita(c) && c.estatus !== 'No interesado' && PRIORIDAD[c.clasificacion] >= 2)
      .sort((a, b) => (PRIORIDAD[b.clasificacion] - PRIORIDAD[a.clasificacion]) ||
                      a.empresa.localeCompare(b.empresa, 'es'));

    el.ayudaFoco.textContent = foco.length
      ? foco.length + ' cuentas AAA y AA sin cita conseguida. Haz clic para abrir el detalle.'
      : 'Sin pendientes en las cuentas de mayor prioridad.';

    if (!foco.length) {
      el.listaFoco.innerHTML = '<li class="lista-foco__vacio">No hay cuentas AAA ni AA pendientes de cita.</li>';
      el.btnVerTodasFoco.hidden = true;
      el.cuerpoFoco.classList.remove('esta-expandido');
      return;
    }

    const visibles = estado.focoExpandido ? foco : foco.slice(0, FOCO_VISIBLES);
    el.btnVerTodasFoco.hidden = foco.length <= FOCO_VISIBLES;
    el.btnVerTodasFoco.textContent = estado.focoExpandido
      ? 'Ver menos'
      : 'Ver todas (' + foco.length + ')';
    el.btnVerTodasFoco.setAttribute('aria-expanded', String(estado.focoExpandido));
    el.cuerpoFoco.classList.toggle('esta-expandido', estado.focoExpandido);

    el.listaFoco.innerHTML = visibles.map(c =>
      '<li><button class="foco" type="button" data-id="' + escapar(c.id) + '">' +
        '<span class="clasif clasif--' + c.clasificacion + '">' + c.clasificacion + '</span>' +
        '<span class="foco__empresa">' + escapar(c.empresa) + '</span>' +
        '<span class="foco__zona">' + escapar(c.estatus) + '</span>' +
      '</button></li>'
    ).join('');
  }

  function opcionesEstatus(seleccionado) {
    return ESTATUS.map(e =>
      '<option value="' + e.valor + '"' + (e.valor === seleccionado ? ' selected' : '') + '>' +
      e.valor + '</option>'
    ).join('');
  }

  function celdaTelefono(c) {
    if (esVacio(c.telefono)) return '<span class="vacio-dato">—</span>';
    return '<a href="tel:' + escapar(c.telefono.replace(/\s+/g, '')) + '">' + escapar(c.telefono) + '</a>';
  }

  function celdaCorreo(c) {
    if (esVacio(c.correo)) return '<span class="vacio-dato">—</span>';
    return '<a href="mailto:' + escapar(c.correo) + '" title="' + escapar(c.correo) + '">' +
      escapar(c.correo) + '</a>';
  }

  function textoSimple(v) {
    return esVacio(v) ? '<span class="vacio-dato">—</span>' : escapar(v);
  }

  /** Una cita agendada sin fecha capturada se marca en ámbar: falta un dato. */
  function faltaFecha(c) {
    return tieneCita(c) && !c.fechaCita;
  }

  function fila(c) {
    return '<tr data-id="' + escapar(c.id) + '">' +
      '<td class="col-empresa" data-label="Empresa">' +
        '<span class="celda-empresa">' +
          '<button class="empresa-btn" type="button" data-accion="detalle">' + escapar(c.empresa) + '</button>' +
          (c.notas ? '<span class="marca-nota" title="Tiene notas"></span>' : '') +
        '</span>' +
      '</td>' +
      '<td class="c-clasif" data-label="Clasificación"><span class="clasif clasif--' + c.clasificacion + '">' + escapar(c.clasificacion) + '</span></td>' +
      '<td class="c-estado" data-label="Estado">' + textoSimple(c.estado) + '</td>' +
      '<td class="c-zona" data-label="Zona">' + textoSimple(c.zona) + '</td>' +
      '<td class="c-industria" data-label="Industria">' + textoSimple(c.industria) + '</td>' +
      '<td class="celda-contacto c-contacto" data-label="Contacto">' + textoSimple(c.contacto) + '</td>' +
      '<td class="celda-cargo c-cargo" data-label="Cargo">' + textoSimple(c.cargo) + '</td>' +
      '<td class="celda-tel c-tel" data-label="Teléfono">' + celdaTelefono(c) + '</td>' +
      '<td class="celda-correo c-correo" data-label="Correo">' + celdaCorreo(c) + '</td>' +
      '<td class="c-estatus" data-label="Estatus">' +
        '<select class="pill-estatus ' + claseEstatus(c.estatus) + '" data-accion="estatus" ' +
          'aria-label="Estatus de ' + escapar(c.empresa) + '">' + opcionesEstatus(c.estatus) + '</select>' +
      '</td>' +
      '<td class="c-fecha" data-label="Fecha de cita">' +
        '<input type="date" class="fecha-inline' + (faltaFecha(c) ? ' fecha-inline--alerta' : '') + '" ' +
          'data-accion="fecha" value="' + escapar(c.fechaCita) + '" ' +
          'title="' + (faltaFecha(c) ? 'Cita conseguida sin fecha registrada' : 'Fecha de consecución de la cita') + '" ' +
          'aria-label="Fecha de cita de ' + escapar(c.empresa) + '">' +
      '</td>' +
      '<td class="celda-accion c-detalle" data-label=""><button class="btn-detalle" type="button" data-accion="detalle" title="Ver ficha completa">Ver</button></td>' +
    '</tr>';
  }

  function renderTabla() {
    const lista = ordenar(filtrar());
    el.cuerpoTabla.innerHTML = lista.map(fila).join('');
    el.mensajeVacio.hidden = lista.length > 0;
    el.conteo.textContent = lista.length === estado.cuentas.length
      ? 'Mostrando las ' + lista.length + ' cuentas'
      : 'Mostrando ' + lista.length + ' de ' + estado.cuentas.length + ' cuentas';
  }

  /** Actualiza solo la fila tocada: evita repintar la tabla y perder el foco. */
  function refrescarFila(id) {
    const c = obtener(id);
    const tr = el.cuerpoTabla.querySelector('tr[data-id="' + CSS.escape(id) + '"]');
    if (!c || !tr) return;

    const sel = tr.querySelector('[data-accion="estatus"]');
    if (sel) {
      sel.value = c.estatus;
      sel.className = 'pill-estatus ' + claseEstatus(c.estatus);
    }
    const fecha = tr.querySelector('[data-accion="fecha"]');
    if (fecha) {
      if (fecha.value !== c.fechaCita) fecha.value = c.fechaCita;
      fecha.classList.toggle('fecha-inline--alerta', faltaFecha(c));
    }
    const celda = tr.querySelector('.celda-empresa');
    const marca = celda.querySelector('.marca-nota');
    if (c.notas && !marca) {
      const s = document.createElement('span');
      s.className = 'marca-nota';
      s.title = 'Tiene notas';
      celda.appendChild(s);
    } else if (!c.notas && marca) {
      marca.remove();
    }
  }

  function renderMetricas() {
    renderKpis();
    renderResumenes();
    renderFoco();
    renderLecturaEjecutiva();
  }

  function renderTodo() {
    renderMetricas();
    renderTabla();
    renderMetaGuardado();
  }

  /* ============ 6. FILTROS Y ORDENAMIENTO ============ */

  function coincide(c) {
    const f = estado.filtros;
    if (f.clasificacion && c.clasificacion !== f.clasificacion) return false;
    if (f.zona && c.zona !== f.zona) return false;
    if (f.industria && c.industria !== f.industria) return false;
    if (f.estatus && c.estatus !== f.estatus) return false;
    if (f.buscar) {
      const q = normalizar(f.buscar);
      const heno = normalizar(c.empresa + ' ' + c.contacto + ' ' + c.correo);
      if (heno.indexOf(q) === -1) return false;
    }
    return true;
  }

  const filtrar = () => estado.cuentas.filter(coincide);

  function valorOrden(c, campo) {
    if (campo === 'clasificacion') return PRIORIDAD[c.clasificacion] || 0;
    if (campo === 'estatus') return ESTATUS_VALORES.indexOf(c.estatus);
    return normalizar(c[campo]);
  }

  function ordenar(lista) {
    const campo = estado.orden.campo;
    if (!campo) return lista;                    // orden original del Excel
    const signo = estado.orden.dir === 'asc' ? 1 : -1;

    return lista.slice().sort((a, b) => {
      if (campo === 'fechaCita') {
        // Las cuentas sin fecha siempre van al final, en cualquier dirección.
        if (!a.fechaCita && !b.fechaCita) return a.empresa.localeCompare(b.empresa, 'es');
        if (!a.fechaCita) return 1;
        if (!b.fechaCita) return -1;
        return (a.fechaCita < b.fechaCita ? -1 : a.fechaCita > b.fechaCita ? 1 : 0) * signo;
      }
      const va = valorOrden(a, campo);
      const vb = valorOrden(b, campo);
      let cmp;
      if (typeof va === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), 'es');
      if (cmp === 0) return a.empresa.localeCompare(b.empresa, 'es');
      return cmp * signo;
    });
  }

  function alternarOrden(campo) {
    if (estado.orden.campo === campo) {
      estado.orden.dir = estado.orden.dir === 'asc' ? 'desc' : 'asc';
    } else {
      estado.orden.campo = campo;
      // Clasificación y estatus arrancan de mayor a menor: es lo útil comercialmente.
      estado.orden.dir = (campo === 'clasificacion' || campo === 'estatus') ? 'desc' : 'asc';
    }
    document.querySelectorAll('.tabla th.orden').forEach(th => {
      if (th.dataset.orden === campo) {
        th.setAttribute('aria-sort', estado.orden.dir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });
    renderTabla();
  }

  function llenarFiltrosDinamicos() {
    const unicos = campo => Array.from(new Set(estado.cuentas.map(c => c[campo])))
      .filter(v => !esVacio(v)).sort((a, b) => a.localeCompare(b, 'es'));

    const pintar = (select, valores) => {
      valores.forEach(v => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = v;
        select.appendChild(o);
      });
    };
    pintar(el.fZona, unicos('zona'));
    pintar(el.fIndustria, unicos('industria'));
    pintar(el.fEstatus, ESTATUS_VALORES);
  }

  /* ============ 7. EDICIÓN INLINE Y CAJÓN ============ */

  const obtener = id => estado.cuentas.find(c => c.id === id);

  /**
   * Aplica un cambio de seguimiento, guarda y refresca lo mínimo necesario.
   * Si la fila deja de cumplir los filtros (o el orden depende del campo tocado)
   * se repinta la tabla completa.
   */
  function actualizar(id, cambios, opciones) {
    const c = obtener(id);
    if (!c) return;
    Object.assign(c, cambios);
    c.actualizadoPor = enNube() ? estado.autor : '';
    c.actualizadoEn = new Date().toISOString();
    persistir(c, (opciones && opciones.mensaje) || 'Guardado');
    refrescarTrasCambio(id, cambios);
  }

  /** Refresca la vista tras cambiar una cuenta, repintando lo mínimo posible. */
  function refrescarTrasCambio(id, cambios) {
    const c = obtener(id);
    if (!c) return;
    renderMetricas();
    const campoOrden = estado.orden.campo;
    const afectaOrden = cambios
      ? !!(campoOrden && Object.prototype.hasOwnProperty.call(cambios, campoOrden))
      : (campoOrden === 'estatus' || campoOrden === 'fechaCita');
    if (afectaOrden || !coincide(c)) renderTabla();
    else refrescarFila(id);
    if (estado.idAbierto === id) pintarCajon(c);
  }

  /** Llega un cambio hecho por otra persona: se aplica sin tocar lo que estás editando. */
  function alCambioRemoto(id, datos) {
    if (!id) { recargarDesdeNube(); return; }
    const c = obtener(id);
    if (!c) return;
    const nuevo = camposSeguimiento(datos || {});
    const igual = c.estatus === nuevo.estatus && c.fechaCita === nuevo.fechaCita && c.notas === nuevo.notas;
    Object.assign(c, nuevo);
    renderMetaGuardado();
    if (igual) return;                       // es el eco de mi propio cambio
    refrescarTrasCambio(id);
    const quien = nuevo.actualizadoPor && nuevo.actualizadoPor !== estado.autor ? nuevo.actualizadoPor : '';
    aviso(quien ? quien + ' actualizó ' + c.empresa : c.empresa + ' se actualizó');
  }

  function recargarDesdeNube() {
    return NubeLCG.cargar()
      .then(mapa => { construirCuentas(mapa); renderTodo(); })
      .catch(e => aviso('No se pudo leer la base: ' + e.message, 'error'));
  }

  function pintarCajon(c) {
    el.cajonEmpresa.textContent = c.empresa;
    el.cajonClasif.textContent = c.clasificacion === 'AAA' ? 'AAA · máxima prioridad'
      : c.clasificacion === 'AA' ? 'AA · alta prioridad'
      : 'A · prioridad estándar';

    const filas = [
      ['Clasificación', mostrar(c.clasificacion)],
      ['Estado', mostrar(c.estado)],
      ['Zona', mostrar(c.zona)],
      ['Industria', mostrar(c.industria)],
      ['Contacto', mostrar(c.contacto)],
      ['Cargo', mostrar(c.cargo)],
      ['Teléfono', esVacio(c.telefono) ? '—'
        : '<a href="tel:' + escapar(c.telefono.replace(/\s+/g, '')) + '">' + escapar(c.telefono) + '</a>'],
      ['Correo', esVacio(c.correo) ? '—'
        : '<a href="mailto:' + escapar(c.correo) + '">' + escapar(c.correo) + '</a>'],
      ['Estatus', '<span class="badge ' + claseEstatus(c.estatus) + '">' + escapar(c.estatus) + '</span>'],
      ['Fecha de cita', fechaLegible(c.fechaCita)],
      ['Último cambio', c.actualizadoEn
        ? fechaHoraCorta(c.actualizadoEn) + (c.actualizadoPor ? ' · ' + c.actualizadoPor : '')
        : 'Sin cambios']
    ];
    el.cajonDatos.innerHTML = filas.map(f =>
      '<dt>' + f[0] + '</dt><dd>' + (f[0] === 'Teléfono' || f[0] === 'Correo' || f[0] === 'Estatus'
        ? f[1] : escapar(f[1])) + '</dd>'
    ).join('');

    el.cajonEstatus.value = c.estatus;
    el.cajonEstatus.className = 'campo__control';
    el.cajonFecha.value = c.fechaCita;
    if (document.activeElement !== el.cajonNotas) el.cajonNotas.value = c.notas;
  }

  let ultimoFoco = null;
  function abrirCajon(id) {
    const c = obtener(id);
    if (!c) return;
    ultimoFoco = document.activeElement;
    estado.idAbierto = id;
    pintarCajon(c);
    el.cajon.hidden = false;
    el.velo.hidden = false;
    el.btnCerrarCajon.focus();
  }

  function cerrarCajon() {
    if (el.cajon.hidden) return;
    estado.idAbierto = null;
    el.cajon.hidden = true;
    el.velo.hidden = true;
    if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus();
  }

  /* ============ 7b. MENSAJES PARA WHATSAPP Y CORREO ============ */

  const SIN_NOMBRE = '[nombre del contacto]';

  /** Primera palabra del nombre, para un saludo natural en WhatsApp. */
  function primerNombre(contacto) {
    if (esVacio(contacto)) return SIN_NOMBRE;
    return String(contacto).trim().split(/\s+/)[0];
  }

  /* --- Negritas ---------------------------------------------------------
     En las plantillas se marcan con **dobles asteriscos**. De ahí salen tres
     formas: la de WhatsApp (*un asterisco*, que es su formato nativo), la de
     texto plano (sin marcas) y la de HTML (negritas reales al portapapeles). */
  const RE_NEGRITA = /\*\*([^*\n]+)\*\*/g;

  const aWhatsapp = t => String(t).replace(RE_NEGRITA, '*$1*');
  const sinMarcas = t => String(t).replace(RE_NEGRITA, '$1');

  function aHtml(texto) {
    return '<div>' + escapar(texto)
      .replace(RE_NEGRITA, '<b>$1</b>')
      .split('\n').join('<br>') + '</div>';
  }

  /** Sustituye las etiquetas de la plantilla con los datos de la cuenta. */
  function armarMensaje(plantilla, c) {
    return String(plantilla)
      .split('[Primer nombre]').join(primerNombre(c.contacto))
      .split('[Nombre contacto]').join(esVacio(c.contacto) ? SIN_NOMBRE : c.contacto)
      .split('[Nombre empresa]').join(c.empresa)
      .split('[Cargo]').join(esVacio(c.cargo) ? '[cargo]' : c.cargo);
  }

  function llenarSelectorEmpresas() {
    const ordenadas = estado.cuentas.slice().sort((a, b) => a.empresa.localeCompare(b.empresa, 'es'));
    el.msjEmpresa.innerHTML = '<option value="">Selecciona una empresa…</option>' +
      ordenadas.map(c => '<option value="' + escapar(c.id) + '">' + escapar(c.empresa) + '</option>').join('');
  }

  /** Habilita o apaga los controles según haya o no una empresa elegida. */
  function estadoAccionesMensaje(c) {
    const hayCuenta = !!c;
    el.msjWhats.disabled = !hayCuenta;
    el.msjCorreo.disabled = !hayCuenta;
    el.msjAsunto.disabled = !hayCuenta;
    document.querySelectorAll('[data-copiar]').forEach(b => { b.disabled = !hayCuenta; });
  }

  /** Genera los dos mensajes para la cuenta elegida. */
  function generarMensajes(id) {
    const c = obtener(id);

    if (!c) {
      el.msjContacto.innerHTML = '<option value="">—</option>';
      el.msjFicha.textContent = 'Elige una empresa para generar los mensajes.';
      el.msjWhats.value = '';
      el.msjAsunto.value = '';
      el.msjCorreo.value = '';
      estadoAccionesMensaje(null);
      return;
    }

    // Hoy cada cuenta tiene un contacto; el selector queda listo para más.
    el.msjContacto.innerHTML = '<option value="' + escapar(c.contacto) + '">' +
      (esVacio(c.contacto) ? 'Sin contacto registrado' : escapar(c.contacto)) + '</option>';

    const partes = [];
    if (!esVacio(c.cargo)) partes.push(c.cargo);
    if (!esVacio(c.telefono)) partes.push(c.telefono);
    if (!esVacio(c.correo)) partes.push(c.correo);
    el.msjFicha.textContent = partes.length ? partes.join(' · ') : 'Sin datos de contacto en la base.';

    el.msjWhats.value = aWhatsapp(armarMensaje(PLANTILLAS.whatsapp, c));
    el.msjAsunto.value = sinMarcas(armarMensaje(PLANTILLAS.correoAsunto, c));
    el.msjCorreo.value = armarMensaje(PLANTILLAS.correoCuerpo, c);
    estadoAccionesMensaje(c);
  }

  /** Copia con formato real: usa un contenedor oculto y el portapapeles del sistema. */
  function copiarHtmlRespaldo(html) {
    const caja = document.createElement('div');
    caja.contentEditable = 'true';
    caja.innerHTML = html;
    caja.setAttribute('style', 'position:fixed;left:-9999px;top:0;white-space:pre-wrap;');
    document.body.appendChild(caja);
    const rango = document.createRange();
    rango.selectNodeContents(caja);
    const seleccion = window.getSelection();
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
    try { document.execCommand('copy'); } catch (e) { /* sin portapapeles */ }
    seleccion.removeAllRanges();
    document.body.removeChild(caja);
  }

  function copiarPlanoRespaldo(campo) {
    campo.focus();
    campo.select();
    try { document.execCommand('copy'); } catch (e) { /* sin portapapeles */ }
    campo.setSelectionRange(0, 0);
    campo.blur();
  }

  /**
   * Copia al portapapeles. Con formato "html" (el correo) se copian negritas
   * reales y, como respaldo, el mismo texto sin los asteriscos.
   */
  function copiarTexto(campo, formato) {
    const crudo = campo.value;
    const plano = sinMarcas(crudo);
    const listo = () => aviso('Mensaje copiado');

    if (formato === 'html') {
      const html = aHtml(crudo);
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plano], { type: 'text/plain' })
        })]).then(listo, () => { copiarHtmlRespaldo(html); listo(); });
      } else {
        copiarHtmlRespaldo(html);
        listo();
      }
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(plano).then(listo, () => { copiarPlanoRespaldo(campo); listo(); });
    } else {
      copiarPlanoRespaldo(campo);
      listo();
    }
  }

  /** Desde el cajón: prepara el mensaje de esa cuenta y baja a la sección. */
  function prepararMensajeDesdeCajon() {
    if (!estado.idAbierto) return;
    el.msjEmpresa.value = estado.idAbierto;
    generarMensajes(estado.idAbierto);
    el.bloqueMensajes.hidden = false;
    el.btnToggleMensajes.textContent = 'Ocultar';
    cerrarCajon();
    if (el.bloqueMensajes.scrollIntoView) {
      el.bloqueMensajes.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    el.msjWhats.focus();
  }

  /* ============ 8. EXPORTAR / IMPORTAR / RESTABLECER ============ */

  function descargar(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo + ';charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const nombreArchivo = ext => 'seguimiento-comercial-lcg-' + hoyIso() + '.' + ext;

  function campoCsv(v) {
    const s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportarCsv() {
    const lineas = [COLUMNAS_CSV.map(col => campoCsv(col[1])).join(',')];
    estado.cuentas.forEach(c => {
      lineas.push(COLUMNAS_CSV.map(col => campoCsv(c[col[0]])).join(','));
    });
    // El BOM hace que Excel abra el archivo con los acentos correctos.
    descargar('\ufeff' + lineas.join('\r\n'), nombreArchivo('csv'), 'text/csv');
    aviso('Seguimiento exportado en CSV');
  }

  function exportarJson() {
    const datos = {
      aplicacion: 'LCG · Seguimiento Comercial',
      version: VERSION_DATOS,
      exportado: new Date().toISOString(),
      cuentas: estado.cuentas
    };
    descargar(JSON.stringify(datos, null, 2), nombreArchivo('json'), 'application/json');
    aviso('Seguimiento exportado en JSON');
  }

  /** Parser CSV mínimo compatible con RFC 4180 (comillas y saltos de línea incluidos). */
  function parsearCsv(texto) {
    texto = texto.replace(/^\ufeff/, '');
    const primeraLinea = texto.split('\n')[0];
    const delim = (primeraLinea.split(';').length > primeraLinea.split(',').length) ? ';' : ',';

    const filas = [];
    let fila = [], campo = '', comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (comillas) {
        if (ch === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; } else { comillas = false; }
        } else campo += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === delim) { fila.push(campo); campo = ''; }
      else if (ch === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else if (ch !== '\r') campo += ch;
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter(f => f.some(v => v.trim() !== ''));
  }

  const ALIAS = {
    'id': 'id',
    'empresa': 'empresa',
    'estatus': 'estatus',
    'estatus de cita': 'estatus',
    'fecha de cita': 'fechaCita',
    'fechacita': 'fechaCita',
    'fecha de consecucion de cita': 'fechaCita',
    'fecha de consecucion': 'fechaCita',
    'notas': 'notas'
  };

  function registrosDesdeCsv(texto) {
    const filas = parsearCsv(texto);
    if (filas.length < 2) throw new Error('El archivo no tiene filas de datos.');
    const encabezados = filas[0].map(h => ALIAS[normalizar(h).trim()] || null);
    if (encabezados.indexOf('empresa') === -1 && encabezados.indexOf('id') === -1) {
      throw new Error('No encontré una columna "Empresa" ni "id".');
    }
    return filas.slice(1).map(f => {
      const r = {};
      encabezados.forEach((clave, i) => { if (clave) r[clave] = (f[i] || '').trim(); });
      return r;
    });
  }

  function registrosDesdeJson(texto) {
    const obj = JSON.parse(texto);
    const lista = Array.isArray(obj) ? obj : obj.cuentas;
    if (!Array.isArray(lista)) throw new Error('El JSON no contiene una lista de cuentas.');
    return lista;
  }

  /** Aplica registros importados sobre la base actual. Nunca borra la base del Excel. */
  function aplicarImportacion(registros) {
    const porId = new Map(estado.cuentas.map(c => [c.id, c]));
    const porNombre = new Map(estado.cuentas.map(c => [normalizar(c.empresa), c]));
    let aplicados = 0, sinCoincidencia = 0;
    const tocadas = [];

    registros.forEach(r => {
      const cuenta = (r.id && porId.get(String(r.id).trim())) ||
                     (r.empresa && porNombre.get(normalizar(r.empresa)));
      if (!cuenta) { sinCoincidencia++; return; }

      let cambio = false;
      if (r.estatus && ESTATUS_VALORES.indexOf(String(r.estatus).trim()) !== -1) {
        cuenta.estatus = String(r.estatus).trim();
        cambio = true;
      }
      if (r.fechaCita !== undefined) {
        const f = String(r.fechaCita).trim();
        if (f === '' || f === '—' || f === '-') { cuenta.fechaCita = ''; cambio = true; }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(f)) { cuenta.fechaCita = f; cambio = true; }
      }
      if (r.notas !== undefined) { cuenta.notas = String(r.notas); cambio = true; }
      if (cambio) { aplicados++; tocadas.push(cuenta); }
    });

    if (!aplicados) throw new Error('El archivo es válido pero ninguna cuenta coincidió con la base.');

    const marca = new Date().toISOString();
    tocadas.forEach(c => { c.actualizadoPor = enNube() ? estado.autor : ''; c.actualizadoEn = marca; });

    const resumen = 'Importadas ' + aplicados + ' cuentas' +
      (sinCoincidencia ? ' · ' + sinCoincidencia + ' sin coincidencia' : '');

    if (enNube()) {
      NubeLCG.guardarVarias(tocadas, estado.autor)
        .then(() => { renderTodo(); aviso(resumen); })
        .catch(e => aviso('No se pudo subir la importación: ' + e.message, 'error'));
      return;
    }
    escribirAlmacen();
    renderTodo();
    aviso(resumen);
  }

  function importarArchivo(archivo) {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const texto = String(lector.result);
        const esJson = /\.json$/i.test(archivo.name) || texto.trim().charAt(0) === '{' || texto.trim().charAt(0) === '[';
        aplicarImportacion(esJson ? registrosDesdeJson(texto) : registrosDesdeCsv(texto));
      } catch (e) {
        aviso('No pude leer el archivo: ' + e.message, 'error');
      }
    };
    lector.onerror = () => aviso('No pude leer el archivo. Intenta de nuevo.', 'error');
    lector.readAsText(archivo, 'UTF-8');
  }

  let accionModal = null;
  function abrirModal(titulo, texto, etiquetaConfirmar, accion) {
    el.modalTitulo.textContent = titulo;
    el.modalTexto.textContent = texto;
    el.btnModalConfirmar.textContent = etiquetaConfirmar;
    accionModal = accion;
    el.modal.hidden = false;
    el.btnModalCancelar.focus();
  }
  function cerrarModal() {
    el.modal.hidden = true;
    accionModal = null;
  }

  function restablecer() {
    cerrarCajon();
    if (enNube()) {
      NubeLCG.limpiar()
        .then(() => { construirCuentas({}); renderTodo(); aviso('Seguimiento restablecido para todo el equipo'); })
        .catch(e => aviso('No se pudo restablecer: ' + e.message, 'error'));
      return;
    }
    try { localStorage.removeItem(CLAVE_ALMACEN); } catch (e) { /* sin almacenamiento */ }
    estado.ultimoGuardado = null;
    construirCuentas(leerAlmacen());
    estado.ultimoGuardado = null;
    renderTodo();
    aviso('Datos iniciales restablecidos');
  }

  /* ============ 9. ARRANQUE ============ */

  /* --- Nombre de quien usa la herramienta (para saber quién movió qué) --- */
  function leerNombre() {
    try { return localStorage.getItem(CLAVE_NOMBRE) || ''; } catch (e) { return ''; }
  }
  function guardarNombre(nombre) {
    estado.autor = nombre;
    try { localStorage.setItem(CLAVE_NOMBRE, nombre); } catch (e) { /* sin almacenamiento */ }
  }

  /* --- Pantalla de acceso --- */
  function mostrarAcceso(error) {
    el.acceso.hidden = false;
    el.accesoError.hidden = !error;
    if (error) el.accesoError.textContent = error;
    setTimeout(() => (estado.autor ? el.accesoClave : el.accesoNombre).focus(), 50);
  }

  function ocultarAcceso() {
    el.acceso.hidden = true;
    el.accesoError.hidden = true;
  }

  function intentarEntrar() {
    const nombre = el.accesoNombre.value.trim();
    const clave = el.accesoClave.value;
    if (!nombre) { mostrarAcceso('Escribe tu nombre para saber quién actualiza cada cuenta.'); return; }
    if (!clave) { mostrarAcceso('Escribe la contraseña del equipo.'); return; }

    el.btnEntrar.disabled = true;
    el.btnEntrar.textContent = 'Entrando…';
    NubeLCG.entrar(clave)
      .then(() => { guardarNombre(nombre); el.accesoClave.value = ''; return entrarAlTablero(); })
      .catch(e => mostrarAcceso(e.message))
      .then(() => { el.btnEntrar.disabled = false; el.btnEntrar.textContent = 'Entrar'; });
  }

  /** Ya con sesión: carga la base compartida y se queda escuchando los cambios. */
  function entrarAlTablero() {
    ocultarAcceso();
    return recargarDesdeNube().then(() => {
      NubeLCG.escuchar(alCambioRemoto, conectado => {
        estado.conectado = conectado;
        renderMetaGuardado();
      });
      renderMetaGuardado();
    });
  }

  function cerrarSesion() {
    const terminar = () => {
      estado.conectado = false;
      cerrarCajon();
      construirCuentas({});
      renderTodo();
      mostrarAcceso();
    };
    NubeLCG.salir().then(terminar, terminar);
  }

  function arrancarNube() {
    el.btnSalir.hidden = false;
    el.accesoNombre.value = estado.autor;
    NubeLCG.haySesion()
      .then(hay => (hay ? entrarAlTablero() : mostrarAcceso()))
      .catch(e => mostrarAcceso(e.message));
  }

  function cachearNodos() {
    const ids = ['lecturaEjecutiva', 'metaGuardado', 'kpiTotal', 'kpiAgendadas', 'kpiRealizadas',
      'kpiPendientes', 'kpiAvance', 'barraAvance', 'resumenZona', 'resumenClasificacion',
      'listaFoco', 'ayudaFoco', 'cuerpoTabla', 'mensajeVacio', 'conteoResultados', 'aviso', 'cajon', 'velo',
      'cajonEmpresa', 'cajonClasif', 'cajonDatos', 'cajonEstatus', 'cajonFecha', 'cajonNotas',
      'btnCerrarCajon', 'modal', 'modalTitulo', 'modalTexto', 'btnModalCancelar', 'btnModalConfirmar',
      'archivoImportar', 'fBuscar', 'fClasificacion', 'fZona', 'fIndustria', 'fEstatus',
      'acceso', 'accesoNombre', 'accesoClave', 'accesoError', 'btnEntrar', 'btnSalir',
      'bloqueMensajes', 'btnToggleMensajes', 'msjEmpresa', 'msjContacto', 'msjFicha',
      'msjWhats', 'msjAsunto', 'msjCorreo', 'btnPrepararMensaje',
      'cuerpoFoco', 'btnVerTodasFoco'];
    ids.forEach(id => { el[id] = document.getElementById(id); });
    el.lectura = el.lecturaEjecutiva;
    el.conteo = el.conteoResultados;
  }

  function conectarEventos() {
    // --- Filtros ---
    const mapaFiltros = {
      fBuscar: 'buscar', fClasificacion: 'clasificacion',
      fZona: 'zona', fIndustria: 'industria', fEstatus: 'estatus'
    };
    Object.keys(mapaFiltros).forEach(id => {
      const evento = id === 'fBuscar' ? 'input' : 'change';
      el[id].addEventListener(evento, () => {
        estado.filtros[mapaFiltros[id]] = el[id].value;
        renderTabla();
      });
    });

    $('#btnLimpiar').addEventListener('click', () => {
      Object.keys(estado.filtros).forEach(k => { estado.filtros[k] = ''; });
      Object.keys(mapaFiltros).forEach(id => { el[id].value = ''; });
      renderTabla();
      el.fBuscar.focus();
    });

    // --- Ordenamiento ---
    document.querySelectorAll('.tabla th.orden').forEach(th => {
      th.addEventListener('click', () => alternarOrden(th.dataset.orden));
      th.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarOrden(th.dataset.orden); }
      });
    });

    // --- Edición inline (delegación) ---
    el.cuerpoTabla.addEventListener('change', e => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const accion = e.target.dataset.accion;
      if (accion === 'estatus') actualizar(tr.dataset.id, { estatus: e.target.value });
      if (accion === 'fecha') actualizar(tr.dataset.id, { fechaCita: e.target.value });
    });

    el.cuerpoTabla.addEventListener('click', e => {
      const boton = e.target.closest('[data-accion="detalle"]');
      if (!boton) return;
      const tr = boton.closest('tr[data-id]');
      if (tr) abrirCajon(tr.dataset.id);
    });

    el.listaFoco.addEventListener('click', e => {
      const boton = e.target.closest('.foco');
      if (boton) abrirCajon(boton.dataset.id);
    });

    // --- Cajón de detalle ---
    el.cajonEstatus.innerHTML = opcionesEstatus('');
    el.cajonEstatus.addEventListener('change', () => {
      if (estado.idAbierto) actualizar(estado.idAbierto, { estatus: el.cajonEstatus.value });
    });
    el.cajonFecha.addEventListener('change', () => {
      if (estado.idAbierto) actualizar(estado.idAbierto, { fechaCita: el.cajonFecha.value });
    });
    let temporizadorNotas = null;
    el.cajonNotas.addEventListener('input', () => {
      clearTimeout(temporizadorNotas);
      const id = estado.idAbierto;
      temporizadorNotas = setTimeout(() => {
        if (id) actualizar(id, { notas: el.cajonNotas.value });
      }, 600);
    });

    el.btnCerrarCajon.addEventListener('click', cerrarCajon);
    el.velo.addEventListener('click', cerrarCajon);

    // --- Resumen plegable ---
    const btnResumen = $('#btnToggleResumen');
    btnResumen.addEventListener('click', () => {
      const oculto = !$('#bloqueResumen').hidden;
      $('#bloqueResumen').hidden = oculto;
      btnResumen.textContent = oculto ? 'Mostrar resumen' : 'Ocultar resumen';
      btnResumen.setAttribute('aria-expanded', String(!oculto));
    });

    // --- Exportar / importar / restablecer ---
    $('#btnExportarCsv').addEventListener('click', exportarCsv);
    $('#btnExportarJson').addEventListener('click', exportarJson);
    $('#btnImportar').addEventListener('click', () => el.archivoImportar.click());
    el.archivoImportar.addEventListener('change', e => {
      const archivo = e.target.files && e.target.files[0];
      if (archivo) importarArchivo(archivo);
      e.target.value = '';   // permite volver a importar el mismo archivo
    });

    $('#btnReset').addEventListener('click', () => {
      const alcance = enNube()
        ? 'Se borrará el seguimiento de TODO EL EQUIPO en la base compartida (estatus, fechas y notas) y las '
        : 'Se borrará todo el seguimiento guardado en este navegador (estatus, fechas y notas) y las ';
      abrirModal(
        'Restablecer datos iniciales',
        alcance + estado.cuentas.length + ' cuentas volverán a su estado original. ' +
        'Esta acción no se puede deshacer. Si quieres conservar el avance, cancela y exporta primero.',
        'Sí, restablecer',
        restablecer
      );
    });

    // --- Enviar mensaje ---
    el.msjEmpresa.addEventListener('change', () => generarMensajes(el.msjEmpresa.value));
    document.querySelectorAll('[data-copiar]').forEach(boton => {
      boton.addEventListener('click', () => copiarTexto(el[boton.dataset.copiar], boton.dataset.formato));
    });
    el.btnPrepararMensaje.addEventListener('click', prepararMensajeDesdeCajon);

    el.btnVerTodasFoco.addEventListener('click', () => {
      estado.focoExpandido = !estado.focoExpandido;
      renderFoco();
    });

    el.btnToggleMensajes.addEventListener('click', () => {
      const oculto = !el.bloqueMensajes.hidden;
      el.bloqueMensajes.hidden = oculto;
      el.btnToggleMensajes.textContent = oculto ? 'Mostrar' : 'Ocultar';
      el.btnToggleMensajes.setAttribute('aria-expanded', String(!oculto));
    });

    // --- Acceso al tablero compartido ---
    el.btnEntrar.addEventListener('click', intentarEntrar);
    el.accesoClave.addEventListener('keydown', e => { if (e.key === 'Enter') intentarEntrar(); });
    el.accesoNombre.addEventListener('keydown', e => { if (e.key === 'Enter') el.accesoClave.focus(); });
    el.btnSalir.addEventListener('click', cerrarSesion);
    el.btnModalCancelar.addEventListener('click', cerrarModal);
    el.btnModalConfirmar.addEventListener('click', () => {
      const accion = accionModal;
      cerrarModal();
      if (accion) accion();
    });

    // --- Teclado ---
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!el.modal.hidden) cerrarModal();
        else cerrarCajon();
      }
    });
  }

  function iniciar() {
    if (typeof PLANTILLAS === 'undefined') {
      window.PLANTILLAS = { whatsapp: '', correoAsunto: '', correoCuerpo: '' };
    }
    if (typeof CUENTAS_INICIALES === 'undefined' || !Array.isArray(CUENTAS_INICIALES)) {
      document.body.innerHTML = '<p style="padding:32px">No se pudo cargar data.js. ' +
        'Verifica que el archivo esté junto a index.html.</p>';
      return;
    }
    cachearNodos();
    estado.modo = (window.NubeLCG && NubeLCG.configurado()) ? 'nube' : 'local';
    estado.autor = leerNombre();
    construirCuentas(enNube() ? {} : leerAlmacen());
    llenarFiltrosDinamicos();
    llenarSelectorEmpresas();
    conectarEventos();
    generarMensajes('');
    renderTodo();
    if (enNube()) arrancarNube();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
