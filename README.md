# Seguimiento Comercial · London Consulting Group

Herramienta web para dar seguimiento a la cartera de cuentas y prospectos comerciales.
Es un sitio **100% estático**: no necesita servidor, base de datos ni Node.js. Se abre
directamente en el navegador y se publica en GitHub Pages en menos de cinco minutos.

Contiene las **42 cuentas** del archivo `Seguimiento_Comercial_KRAM.xlsx`, tal como estaban
en el Excel original.

---

## 1. Qué contiene el proyecto

```
index.html      Estructura de la página
styles.css      Todo el diseño (tokens de marca LCG en el bloque :root)
app.js          Toda la lógica (filtros, orden, KPIs, guardado, importar/exportar)
data.js         Las 42 cuentas del Excel
assets/         Logotipo y emblema oficiales de LCG
README.md       Este archivo
```

No hay dependencias externas salvo la tipografía **Manrope**, que se carga desde Google Fonts.
Si no hay internet, la herramienta sigue funcionando con una tipografía de respaldo.

---

## 2. Cómo usarla

1. **Abre la página.** En la parte de arriba tienes la lectura ejecutiva y los cinco
   indicadores: total de cuentas, citas agendadas, citas realizadas, pendientes y % de avance.
2. **Busca la empresa.** Escribe en el buscador (funciona con empresa, contacto o correo, y no
   importan los acentos) o usa los filtros de clasificación, zona, industria y estatus. Los
   filtros se combinan entre sí.
3. **Cambia el estatus** desde la misma tabla, en el menú desplegable de color.
4. **Captura la fecha** en que se consiguió la cita, en la columna de al lado. Si dejas una cuenta
   como "Cita agendada" sin fecha, el campo se marca en ámbar para recordarte que falta el dato.
5. Los KPIs, los resúmenes por zona y por clasificación y la lista de cuentas por trabajar se
   recalculan solos, y aparece un aviso **"Guardado"** abajo de la pantalla.
6. **Clic en el nombre de la empresa** (o en "Detalle") para abrir el panel lateral con toda la
   ficha y un campo de **notas**. Las cuentas con notas muestran un punto verde junto al nombre.

Los teléfonos y correos son enlaces: en celular marcan la llamada y en computadora abren el
cliente de correo.

### Estatus disponibles

Pendiente · Contactado · En seguimiento · Cita por confirmar · Cita agendada · Cita realizada ·
Reprogramar · No responde · No interesado

Cuentan como **cita conseguida** los estatus "Cita agendada" y "Cita realizada"; ambos suman al
porcentaje de avance.

---

## 3. Dónde se guardan los cambios

En el **almacenamiento local del navegador** (`localStorage`), bajo la llave
`lcg.seguimiento.v1`. Esto significa:

- Puedes cerrar la pestaña, apagar la computadora y al volver todo sigue ahí.
- Los cambios **son de ese navegador y esa computadora**. Si abres la página en otra máquina,
  en otro navegador o en modo incógnito, verás la base sin seguimiento.
- Solo se guarda lo que capturas (estatus, fecha y notas). La base de cuentas siempre se lee de
  `data.js`, así que nunca se pierde ni se altera.

Para compartir el avance entre varias personas, usa exportar e importar.

---

## 4. Exportar e importar

**Exportar CSV** descarga `seguimiento-comercial-lcg-AAAA-MM-DD.csv` con las columnas originales
del Excel más el estatus, la fecha de cita y las notas. Se abre en Excel con los acentos
correctos.

**Exportar JSON** descarga el mismo contenido en formato técnico, útil como respaldo.

**Importar** vuelve a cargar cualquiera de esos dos archivos. Las cuentas se identifican por su
`id` (o por el nombre de la empresa si no viene el `id`), así que también puedes editar el CSV en
Excel y volver a subirlo. Si el archivo no es válido, la herramienta te lo dice y no toca nada.

Flujo recomendado para un equipo: cada persona trabaja su cartera, exporta el CSV al final del
día y se consolida en un solo archivo.

**Restablecer** borra todo el seguimiento guardado y deja las 42 cuentas como venían del Excel.
Pide confirmación y no se puede deshacer: exporta antes si quieres conservar el avance.

---

## 5. Publicar en GitHub Pages

1. Entra a [github.com](https://github.com) y haz clic en **New repository**.
2. Ponle un nombre, por ejemplo `seguimiento-comercial-lcg`. Elige **Public** y crea el
   repositorio. (Con un repositorio *Private* necesitas GitHub Pro para publicar el sitio.)
3. En la pantalla del repositorio vacío, haz clic en **uploading an existing file**.
4. Arrastra `index.html`, `styles.css`, `app.js`, `data.js`, `README.md` **y la carpeta
   `assets`** completa. Espera a que terminen de subir y haz clic en **Commit changes**.
5. Ve a la pestaña **Settings** del repositorio y, en el menú de la izquierda, entra a **Pages**.
6. En **Source** elige **Deploy from a branch**. En **Branch** selecciona **main** y la carpeta
   **/ (root)**. Haz clic en **Save**.
7. Espera de uno a dos minutos y recarga la página de Settings → Pages. Aparecerá la liga:

   `https://TU-USUARIO.github.io/seguimiento-comercial-lcg/`

   Esa es la URL pública que puedes compartir con el equipo.

> Importante: todos los archivos deben quedar en la raíz del repositorio, con `index.html` al
> mismo nivel que `styles.css`, `app.js` y `data.js`, y `assets` como subcarpeta.

Para actualizar el sitio después, sube los archivos nuevos al repositorio (Add file → Upload
files) y GitHub Pages se refresca solo en un par de minutos.

---

## 6. Cómo agregar o modificar cuentas

Toda la base vive en `data.js`. Cada cuenta es una línea con la misma forma:

```js
{"id": "oleofinos", "empresa": "Oleofinos", "clasificacion": "AAA", "estado": "Jalisco",
 "zona": "Occidente", "industria": "Bienes de Consumo", "contacto": "Carlos Visbal",
 "cargo": "Director de Estrategia y Finanzas", "telefono": "55 2948 6213",
 "correo": "carlos.visbal@oleofinos.com.mx"},
```

**Para agregar una cuenta**: copia una línea completa, pégala antes del corchete `];` final y
cambia los valores. Reglas:

- El `id` debe ser único, en minúsculas, sin acentos ni espacios (usa guiones). Es la llave con
  la que se guarda el seguimiento: si lo cambias después, esa cuenta pierde su avance.
- Todas las líneas terminan con coma, menos la última.
- Si un dato no existe, escribe `"-"`; la herramienta lo muestra como "—".
- `clasificacion` debe ser `AAA`, `AA` o `A`.
- Los filtros de zona e industria se arman solos con los valores que existan, así que puedes usar
  valores nuevos sin tocar nada más.

**Para modificar una cuenta**: edita sus valores en `data.js` sin cambiarle el `id`.

**Para eliminar una cuenta**: borra su línea completa.

Después de editar, guarda el archivo, súbelo a GitHub y recarga la página. El seguimiento ya
capturado se conserva porque está guardado por `id`.

> Si prefieres partir de nuevo del Excel, exporta el archivo a CSV y arma las líneas con la misma
> estructura; el orden de las columnas del Excel es el mismo que el de los campos.

---

## 7. Personalizar el diseño

Los colores, tipografías, tamaños, radios, sombras y espacios están centralizados al inicio de
`styles.css`, en el bloque `:root`. Están tomados de la guía de identidad de London Consulting
Group: Verde Oscuro `#085E54`, Verde London `#03B585`, Mint `#BAF4E9` y Crema `#F2EEEB`.
Cambiar un valor ahí actualiza toda la herramienta.

La tipografía de marca para cifras es DIN 2014. Como sus archivos son de licencia de prueba, no
se incluyen: la variable `--font-numeric` ya la referencia y usa Manrope como respaldo. Cuando
tengas los archivos con licencia, agrégalos en `assets/fonts/` con una regla `@font-face` y las
cifras cambiarán solas.

---

## 8. Compatibilidad

Funciona en Chrome, Edge, Firefox y Safari actuales, en computadora, laptop y tableta. En
pantallas chicas la tabla se convierte en tarjetas para que siga siendo legible.

En Safari con navegación privada el navegador bloquea el almacenamiento local; en ese caso la
herramienta lo avisa arriba y conviene exportar el seguimiento antes de cerrar.
