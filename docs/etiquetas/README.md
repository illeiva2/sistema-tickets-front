# Etiquetas de muestra en la Xprinter XP-410B (rollo 50 × 30 mm)

Procedimiento validado el 30/09/2026 en el laboratorio. Se hace **una vez por PC** que imprime etiquetas.

## Por qué hace falta

La vista previa de Chrome le describe el papel al driver siempre "en vertical" (30 de ancho × 50 de alto), sin importar cómo esté definido el material. El driver Seagull de la Xprinter toma ese ancho como ancho físico del rollo, así que la etiqueta sale girada 90° (con diseño horizontal) o chica y ocupando dos etiquetas (con diseño vertical). No hay combinación de material u orientación que lo arregle desde la vista previa: se probó con el material 50 × 30, con 30 × 50 y con las cuatro orientaciones.

La salida es que Chrome use el **diálogo de impresión de Windows**, que le pasa al driver el material tal como está definido en la impresora. Para eso hay que dejar dos cosas fijas: la política de Chrome y el material predeterminado de la impresora.

Con la DYMO LabelWriter esto no pasa: su rollo es angosto (28 mm) y la etiqueta sale acostada, así que la página horizontal de 89 × 28 es justo lo que hace falta. Por eso en `src/features/lab/etiqueta.ts` los rollos "derechos" (Xprinter, Brother) llevan `paginaAuto` y la DYMO no.

## Pasos

1. **Driver.** Instalar el driver de la XP-410B y, en Preferencias de impresión → Preparar página → Material → Nuevo…, crear el material **"Etiquetas"**, tipo etiquetas troqueladas, **ancho 50,0 mm, altura 30,0 mm**. Orientación Vertical.
2. **Impresora.** Con la herramienta Diagnostic Tool de Xprinter (USB): Get, y después Paper Width 50, Paper Height 30, Media Sensor GAP, Gap 3 (medir el espacio entre etiquetas), Speed 4, Density 8, Post-Print Action TEAR → Set. Calibrate Sensor → Paper Height 30, Gap 3, Media Type Gap → Calibrate. Print TestPage tiene que salir en una sola etiqueta.
3. **Material predeterminado.** La ventana del driver no persiste el material (vuelve a "USER 78 × 130"). Se graba por PowerShell, en la PC con la impresora:

   ```powershell
   .\xp410b-material-etiquetas.ps1 -SoloLeer   # lista los materiales del driver
   .\xp410b-material-etiquetas.ps1             # deja "Etiquetas" como predeterminado del usuario y del dispositivo
   ```

   Deja un respaldo del ticket original en Descargas (`xp410b-printticket-original.xml`).
4. **Chrome.** Importar `chrome-dialogo-sistema.reg` (doble clic). Activa la política `DisablePrintPreview`: el botón de imprimir abre el diálogo de Windows en vez de la vista previa. **Cerrar Chrome del todo** (queda en segundo plano; Administrador de tareas o reiniciar la PC). Verificar en `chrome://policy` que `DisablePrintPreview` figure en `true` y "Correcto". Para deshacer: `chrome-dialogo-sistema-deshacer.reg`.
5. **Probar.** En la app, Imprimir etiqueta → se abre el diálogo de Windows con la XP-410B y el material "Etiquetas" ya elegidos → Imprimir. La etiqueta sale derecha, entera y en una sola etiqueta.

## Si algo sale mal

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Sale girada 90° | Se está usando la vista previa de Chrome | Paso 4 (y cerrar Chrome del todo) |
| Sale chica y usa dos etiquetas | Ídem, con diseño vertical | Paso 4 |
| Deja etiquetas en blanco y asoma un pedazo en una esquina | El diálogo de Windows arrancó con otro material (USER 78 × 130) | Paso 3 |
| Cabeza abajo | Sentido del rollo | Diagnostic Tool: Direction 1 → Set |
| Corrida hacia un costado | Rollo descentrado en las guías | Acomodar las guías; si no alcanza, Shift X |

## Otras opciones del driver

`xp410b-opcion.ps1` lista las características que el driver expone en el PrintTicket (tamaño de papel, orientación, velocidad, "usar la configuración actual de la impresora") y permite fijar una:

```powershell
.\xp410b-opcion.ps1                                                    # lista
.\xp410b-opcion.ps1 -Feature psk:PageOrientation -Opcion psk:Vertical -Aplicar
```

La acción posterior a la impresión (avance hasta la barra de corte) no está en el ticket: se maneja desde la impresora (Diagnostic Tool, Post-Print Action TEAR) porque el driver está en "usar la configuración actual de la impresora".
