# Manual de uso — Sistema de Tickets

Bienvenido/a 👋. Este manual te explica cómo usar el sistema de tickets
de soporte de la empresa, paso a paso. No hace falta ningún
conocimiento técnico — si sabés usar el correo, vas a poder usar esto
sin problema.

---

## ¿Qué es y para qué sirve?

El sistema de tickets es la herramienta interna donde **pedís ayuda al
sector de tecnología** cuando algo no funciona o necesitás algo nuevo.
Reemplaza los correos sueltos, los mensajes por WhatsApp, los pedidos
verbales en pasillo. La idea es que **todo quede registrado en un solo
lugar**: lo que pediste, quién te está ayudando, qué se hizo y cuándo
quedó resuelto.

### Ejemplos de cosas para las que sirve

- "No me anda la impresora del piso 3."
- "Necesito acceso a la carpeta compartida de Ventas."
- "El ERP me tira un error cuando facturo."
- "Mi Outlook no sincroniza el correo desde la mañana."
- "Pedido nuevo: instalar AutoCAD en la PC del depósito."

---

## Tu rol en el sistema

Hay tres roles. **El que te asignaron determina qué podés hacer.**

| Rol | Qué hace |
|---|---|
| **Usuario** | Crea tickets para pedir ayuda. Sigue el avance de los suyos. Cierra cuando le confirmaron que está resuelto. |
| **Agente** | Recibe los tickets, los toma, trabaja en ellos, los marca como resueltos. (Personal de tecnología.) |
| **Administrador** | Lo que hace el agente, más: gestiona usuarios, ve métricas y decide reasignaciones. |

Si no estás seguro/a de qué rol tenés, **mirá el menú del perfil** (la
foto/iniciales arriba a la derecha o abajo a la izquierda según el
diseño activo). Tu rol aparece ahí.

La mayor parte de este manual está pensada para **usuarios**. Hay
secciones específicas para agentes y administradores al final.

---

## 1. Entrar al sistema (login)

1. Abrí el sistema en tu navegador. La URL te la pasa el sector de
   tecnología.
2. Vas a ver una pantalla de bienvenida con dos opciones:
   - **Iniciar sesión con tu correo y contraseña** (si ya te dieron
     credenciales).
   - **Continuar con Google** (si tu empresa tiene la integración
     activada).
3. Hacé login con la opción que te corresponda.
4. Si es la primera vez, te puede pedir que **configures una
   contraseña personal**. Elegí una que recuerdes y guardala bien.

> ⚠️ Si te equivocás de contraseña varias veces seguidas, el sistema
> te bloquea por unos minutos para protegerte. Esperá 1 minuto y
> volvé a intentar.

> 🔄 **¿Olvidaste tu contraseña?** Pedile a un administrador que te
> haga un "blanqueo de contraseña". La próxima vez que entres vas a
> poder configurar una nueva.

---

## 2. Tu primer ticket

### Paso 1 — Apretar "Nuevo ticket"

Cuando entrás al sistema vas a ver tu **dashboard** (pantalla principal
con resúmenes). Para crear un ticket nuevo:

- Hay un botón **"Nuevo ticket"** prominente en la barra de navegación
  (puede estar en una sidebar a la izquierda o en una topbar arriba,
  depende del diseño que tengas activo).
- Clickealo.

### Paso 2 — Completar el formulario

Se te abre una pantalla con tres campos importantes:

**Título** (obligatorio)
> Una frase corta que resuma el problema.
> ✅ Bien: "No puedo acceder al ERP, error 500 al loguear"
> ❌ Mal: "Ayuda" / "Tengo un problema"

**Descripción** (obligatorio)
> Acá explayate. Cuanto más contexto des, más rápido te van a poder
> ayudar.
> Buenas cosas para incluir:
> - Qué estabas haciendo cuando pasó el problema.
> - Si te tira un error, copiá el mensaje completo.
> - Si pasa solo a veces o siempre.
> - Si ya intentaste algo (reiniciar, cambiar contraseña, etc.).
> - Si el problema bloquea tu trabajo o solo te molesta.

**Prioridad** (obligatorio)
- **Baja** — no es urgente, podés esperar.
- **Media** — querés solucionarlo en el día.
- **Alta** — está afectando tu trabajo, necesitás respuesta pronto.
- **Urgente** — no podés trabajar hasta que se resuelva.

> Sé honesto/a. Si todo es urgente, nada es urgente. Los agentes
> priorizan según lo que vos marcás; abusar de "Urgente" hace que el
> sistema no funcione bien para nadie.

**Categoría** (opcional)
- Software / Hardware / Red / ERP / Otro.
- Ayuda al sector de tecnología a clasificar y a generar reportes.
  No es obligatoria pero **completala si sabés** a qué corresponde.

### Paso 3 — Apretar "Crear ticket"

Listo. Tu ticket queda en estado **Abierto** y aparece en tu lista.
El sector de tecnología recibe la notificación automáticamente.

> 💡 **Tip:** Si necesitás adjuntar archivos (capturas, documentos,
> logs), podés hacerlo **después** de crear el ticket, desde la
> pantalla del detalle. Mirá la sección "Adjuntar archivos".

---

## 3. Seguir tu ticket

### Ver tus tickets

Andá a la sección **"Tickets"** desde la barra de navegación. Vas a
ver una lista de tus tickets con:

- **Número** (`#00042`) — identificador único.
- **Título**.
- **Estado** (Abierto / En progreso / Resuelto / Cerrado).
- **Prioridad**.
- **Quién lo está atendiendo** (agente asignado).
- **Cuándo se actualizó por última vez**.

Podés filtrar por estado, prioridad, categoría, o buscar por texto.

### Estados de un ticket

Los tickets pasan por estos estados:

| Estado | Qué significa |
|---|---|
| 🔵 **Abierto** | Lo creaste, todavía nadie está trabajando en él. |
| 🟠 **En progreso** | Un agente lo tomó y está resolviéndolo. |
| 🟢 **Resuelto** | El agente terminó. Te toca **revisar y cerrar** si te conformó. |
| ⚪ **Cerrado** | El ticket terminó su ciclo. |

### Ver el detalle de un ticket

Click en cualquier ticket → te lleva a su detalle. Ahí ves:

- Título, descripción y categoría.
- Estado actual con un timeline de cómo cambió a lo largo del tiempo.
- Comentarios entre vos y el agente.
- Archivos adjuntos.
- Tiempo estimado de respuesta (SLA): "Vence en 2h", "Vencido hace
  1d", etc. — esto le indica al equipo de tecnología cuán urgente es.

### Comentar un ticket

Si necesitás agregar información, responder al agente o pedir un
update:

1. Bajá al final del detalle del ticket.
2. Escribí tu comentario en el cuadro de texto.
3. Click en **"Comentar"**.

El agente asignado recibe una notificación.

> 💡 Atajo: **Ctrl+K** (o **Cmd+K** en Mac) abre una **búsqueda
> rápida** desde cualquier pantalla. Escribí el número o el título
> del ticket y te lleva al detalle al toque.

---

## 4. Cerrar un ticket cuando lo resolvieron

Cuando un agente termina de trabajar en tu ticket, lo marca como
**Resuelto**. Vas a recibir una notificación (in-app y por email).

**Es tu responsabilidad revisar y cerrarlo.**

### Pasos

1. Andá al detalle del ticket (desde tu dashboard vas a ver una
   sección "Esperando tu confirmación" con todos los resueltos
   pendientes).
2. **Verificá que el problema esté efectivamente resuelto.** Probá lo
   que reportaste.
3. Si está OK:
   - Click en el botón **"Cerrar"**.
   - El sistema te pide un **comentario explicando por qué cerrás**
     (ej: "Confirmo, ya puedo entrar al ERP. Gracias.").
   - Click en "Cerrar Ticket".
4. Si no está resuelto del todo:
   - **No lo cierres.** Comentá en el ticket explicando qué falta o
     qué no funciona.
   - El agente puede reabrirlo si hace falta.

> 💡 Si no cerrás los tickets resueltos, tu dashboard se llena de
> "Esperando tu confirmación" y empezás a perder de vista qué tenés
> realmente activo. Tomate 30 segundos y cerrá lo que ya funciona.

---

## 5. Notificaciones

Cada vez que pasa algo importante en tus tickets, recibís dos tipos
de notificación:

### Notificaciones in-app

- Aparece un **número rojo** al lado del icono de campana
  (`Notificaciones`) en la barra de navegación.
- Click → ves todas las notificaciones recientes.
- Click en cualquiera → te lleva al ticket correspondiente.

### Notificaciones por email

Te llegan a tu correo cuando:

- Un agente tomó tu ticket.
- Cambió el estado (avance hacia resuelto/cerrado).
- Alguien comentó en un ticket tuyo.
- Cambió la prioridad o asignación.

Cada email incluye un botón **"Ver ticket"** que te lleva directo al
detalle.

### Configurar qué notificaciones querés recibir

1. Andá a **Notificaciones** en la barra de navegación.
2. Click en **"Preferencias"** (arriba o en el menú).
3. Activá/desactivá:
   - **In-app** — el icono de campana.
   - **Email** — los correos.
   - Por **tipo de evento**: asignación, cambio de estado, comentario
     nuevo, cambio de prioridad.

> ⚠️ **Recomendación:** mantené **al menos las in-app activadas**.
> El email es más fácil de pasar por alto si tenés muchos correos.

---

## 6. Adjuntar archivos

### Cómo subir un archivo

1. Andá al detalle de tu ticket.
2. Bajá a la sección **"Archivos adjuntos"**.
3. Arrastrá el archivo a la zona de subida, o click en "Seleccionar
   archivo".
4. Esperá a que termine la subida (vas a ver una barra de progreso).

### Tipos de archivo permitidos

- **Imágenes** (JPG, PNG, GIF, WebP, BMP, etc.) — para capturas de
  pantalla.
- **Documentos** (PDF, Word, Excel, PowerPoint, ODT, etc.).
- **Texto plano** (TXT, CSV, MD, etc.).
- **Comprimidos** (ZIP, RAR, 7Z, TAR).
- **Audio y video corto** (MP3, MP4, WAV, etc.).

### Tamaño máximo

**10 MB por archivo.** Si tu archivo es más grande, comprimilo en ZIP
o pedile al sector de tecnología un mecanismo alterno.

### Lo que NO podés subir

Por seguridad, el sistema rechaza archivos ejecutables (`.exe`,
`.bat`, `.dll`, `.sh`, etc.). Si necesitás compartir uno, comprimilo
en ZIP primero.

---

## 7. Cambiar el aspecto visual

El sistema tiene **dos diseños distintos** que podés elegir según tu
gusto:

- **Quiet Pro** — sobrio, con barra lateral, paleta violeta. Pensado
  para uso intensivo en escritorio.
- **Workshop** — cálido, con barra superior, paleta crema y petróleo.
  Más liviano visualmente.

Cada uno combina con **modo claro u oscuro**. Total: 4 combinaciones
posibles.

### Cómo cambiar

1. Click en tu **avatar/nombre** (en la barra de navegación).
2. En el menú que se abre, sección **"Apariencia"**.
3. Click en el theme que quieras → cambia al instante.
4. Para alternar entre claro y oscuro: hay un botón con un sol/luna
   en la barra de navegación.

Tu elección queda guardada — la próxima vez que entres, el sistema
recuerda tu configuración.

---

## 8. Cambiar tu contraseña

1. Click en tu **avatar/nombre** → **"Cambiar contraseña"**.
2. Ingresá tu contraseña actual y la nueva (dos veces para confirmar).
3. Listo.

> 🔐 Usá una contraseña que no uses en otros sistemas. Mínimo 8
> caracteres.

---

## 9. Cerrar sesión

Click en tu **avatar/nombre** → **"Cerrar sesión"**.

Tu sesión queda activa por 8 horas si no cerrás manualmente. Si
trabajás desde una computadora compartida, **cerrá sesión siempre al
terminar.**

---

## Sección para agentes

> Esta sección es solo para personal del sector de tecnología con rol
> **Agente**.

### Tu cola

El **dashboard** te muestra tu cola de trabajo:

- **Tickets en progreso** que tenés asignados.
- **Tickets resueltos** esperando que el solicitante los cierre.
- **Tickets sin asignar** disponibles para tomar (top 10 por
  prioridad y antigüedad).

### Tomar un ticket

1. En la lista de tickets sin asignar (en el dashboard o en la página
   de Tickets con el filtro "Sin asignar").
2. Abrí el ticket.
3. Click en el botón **"Tomar ticket"**.
4. El ticket pasa a tu cola en estado **En progreso**.

### Trabajar en un ticket

- **Comentá** lo que hacés. Cada comentario público le llega al
  solicitante por email.
- Si necesitás dejar info **privada** (notas para vos o para otro
  agente), usá el modo **"Nota interna"** en el composer. Las notas
  internas no las ve el solicitante.
- Podés **adjuntar archivos** (logs, capturas) igual que el
  solicitante.

### Resolver un ticket

Cuando terminás:

1. En el detalle del ticket, click en **"Resolver"**.
2. Opcionalmente agregá una nota describiendo cómo lo resolviste.
3. El ticket pasa a **Resuelto**. El solicitante recibe email para
   confirmar.

### Reabrir un ticket

Si te das cuenta de que algo no quedó bien o el solicitante reportó
que no funciona:

1. Abrí el ticket (estado Resuelto o Cerrado).
2. Click en **"Reabrir"**.
3. El sistema te pide un **comentario obligatorio** explicando por
   qué.
4. El ticket vuelve a **En progreso** (si tiene asignado) o
   **Abierto** (si no).

### Vista Kanban

Si preferís trabajar visualmente:

1. Andá a **Tickets**.
2. Arriba a la derecha, click en el botón **vista Kanban**.
3. Vas a ver 4 columnas: Abierto / En progreso / Resuelto / Cerrado.
4. **Arrastrá tickets entre columnas** para cambiar su estado:
   - Soltarlo en "Resuelto" → resuelve el ticket.
   - Soltarlo en "Cerrado" → te pide comentario y cierra.
   - Soltarlo en "Abierto" desde "Resuelto/Cerrado" → te pide
     comentario y reabre.
   - Tomar un ticket sin asignar arrastrándolo a "En progreso".
5. La preferencia (Tabla vs Kanban) se guarda automáticamente.

---

## Sección para administradores

> Esta sección es solo para personal del sector de tecnología con rol
> **Administrador**.

### Dashboard de admin

El dashboard tiene métricas operativas y KPIs del sector:

- **Estados:** cuántos tickets hay en cada estado.
- **Sin asignar / Urgentes activos / Vencidos por SLA.**
- **Tiempo promedio de respuesta y resolución.**
- **Tasa de reapertura.**
- **Carga por agente** (cuántos tiene activos cada uno, cuántos
  resolvió en el período, tiempo promedio).
- **Tendencia diaria** de creados vs resueltos.
- **Top 5 reportadores** del período.

Selector de período arriba: **7 días / 30 días / 90 días / Este año.**

### Gestión de usuarios

Andá a **"Usuarios"** en la barra de navegación.

#### Crear un usuario nuevo

1. Click en **"Nuevo Usuario"**.
2. Completá nombre, email, contraseña inicial y rol (Usuario / Agente
   / Admin).
3. Comunicale al usuario sus credenciales por un canal seguro.

> 💡 **Sugerencia:** dale una contraseña inicial genérica y marcá
> "debe cambiarla en el primer login" si querés (función futura).

#### Cambiar el rol de alguien

1. Click en el usuario.
2. **Editar** → cambiá el rol.
3. La próxima vez que el usuario entre, los cambios se aplican.

#### Desactivar un usuario (cuando deja la empresa)

1. Click en el icono de **papelera roja** del usuario.
2. Confirmá la operación.

> ⚠️ **No se borra** definitivamente. Lo que hace es:
> - Lo desactiva: ya no puede entrar al sistema.
> - **Sus tickets, comentarios e historial se conservan.**
> - El usuario aparece como "Inactivo" en la lista (para verlos,
>   tildá "Mostrar inactivos" arriba).
>
> Si lo desactivaste por error o vuelve a la empresa, podés
> **reactivarlo** desde el icono verde circular.

#### Blanquear contraseña

Si un usuario olvidó su contraseña:

1. Click en **"Blanquear contraseña"** del usuario.
2. La próxima vez que entre, el sistema le pide configurar una nueva.

### Gestión de archivos

Sección **"Archivos"** (también accesible para Agentes).

- Lista todos los archivos subidos al sistema.
- Filtrar por categoría / etiqueta / búsqueda por nombre.
- **Click en el icono de papelera** (solo Admins) → borra archivos
  individuales. La eliminación es definitiva (de Cloudinary y de la
  base de datos).
- Crear y editar **categorías** y **etiquetas** para organizar los
  archivos.

### Gestionar tickets ajenos

Como admin podés:

- **Reasignar tickets** a otros agentes (desde el detalle del
  ticket, sidebar "Asignado a").
- **Cambiar prioridad / categoría** de cualquier ticket.
- **Cerrar / reabrir** cualquier ticket.
- **Eliminar tickets** (acción destructiva, solo en casos puntuales).

---

## Preguntas frecuentes

### "Creé un ticket pero nadie respondió. ¿Qué hago?"

Esperá un tiempo prudencial según la prioridad que pusiste:
- Urgente: 4 horas máx.
- Alta: 1 día.
- Media: 3 días.
- Baja: 1 semana.

Si pasó el tiempo y no hay movimiento, **comentá en el ticket
preguntando**. Si el problema escaló (es más grave de lo que parecía),
**subí la prioridad**.

### "Me asignaron un ticket por error / no me corresponde."

Hay dos opciones:
- Si es urgente, comentá en el ticket "@nombre me asignaste por error,
  esto es de [otro sector]" y el admin lo reasigna.
- Si no es urgente, mandá un mensaje directo al admin.

### "El sistema dice que mi cuenta está desactivada."

Tu rol fue dado de baja. Hablá con un administrador para que
verifique y, si corresponde, te reactive.

### "No me llegan los emails."

1. **Revisá tu carpeta de spam.**
2. Andá a **Notificaciones → Preferencias** y verificá que el switch
   de email esté activo.
3. Confirmá que tu email en el sistema sea correcto (en tu perfil).
4. Si todo está OK, comunicalo a un administrador.

### "Subí un archivo con tilde / ñ y se ve mal el nombre."

Si el archivo es viejo, puede ser. Los nuevos uploads ya respetan los
caracteres especiales. Si necesitás recuperar el nombre original,
volvé a subirlo o pedile al admin que lo corrija.

### "No encuentro el ticket que creé hace 2 meses."

Por defecto la lista muestra los **activos** (Abierto + En progreso).
Cambiá la pestaña a **"Cerrados"** o **"Todos"** y aplicá la búsqueda
por número o título.

### "Quiero ver mi historial completo de tickets."

Tickets → tab **"Todos"** → buscar por tu nombre/email como
solicitante. Si sos admin, podés filtrar la lista por requester.

---

## ¿Necesitás ayuda con el sistema?

Si algo de este manual no quedó claro, o el sistema no se comporta
como esperabas:

1. **No** crees un ticket sobre el sistema dentro del sistema 😅 (a
   menos que el sistema esté funcionando).
2. Contactá directamente al administrador o al sector de tecnología
   por su canal habitual (mail, slack, lo que usen).

---

*Última actualización: 2 de mayo de 2026.*
