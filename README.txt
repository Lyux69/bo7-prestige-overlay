BO7 Prestige Overlay para OBS

Como usarlo en OBS:
1. Ejecuta Iniciar todo.cmd o iniciar_overlay.cmd.
2. Se abrira el servidor, el panel de control y OBS.
3. En OBS la fuente debe usar esta URL:
   http://localhost:8765
4. Ajusta el tamano a:
   Width: 700
   Height: 480
   FPS: 60
5. Para usar los botones, clic derecho en la fuente de OBS y elige Interact.

Como cambiar tus datos desde el panel:
1. Ejecuta Iniciar todo.cmd.
2. Marca los checks de cada arma y prestigio.
3. El panel guarda automaticamente despues de cada cambio.
4. OBS se actualiza solo en unos segundos.

Como usarlo en la nube con GitHub Pages:
1. Sube esta carpeta a un repositorio de GitHub, por ejemplo bo7-prestige-overlay.
2. En GitHub, entra en Settings > Pages.
3. En Build and deployment elige Deploy from a branch.
4. Selecciona la rama main y la carpeta /root.
5. La URL del overlay sera algo como:
   https://TU-USUARIO.github.io/bo7-prestige-overlay/
6. El panel admin sera:
   https://TU-USUARIO.github.io/bo7-prestige-overlay/admin.html
7. En OBS usa la URL del overlay de GitHub Pages, no localhost.

Como editar desde movil con GitHub:
1. Crea un token en GitHub con permiso Contents read/write para este repositorio.
2. Abre admin.html desde el movil.
3. En GitHub Cloud rellena usuario, repositorio, rama main, ruta data.json y pega el token.
4. Pulsa Guardar conexion GitHub.
5. Desde ese momento los cambios del admin se guardan haciendo commits en GitHub.
6. GitHub Pages puede tardar unos segundos en publicar cada cambio.

Nota de seguridad:
1. El token se guarda solo en el navegador donde lo pegas.
2. No compartas capturas ni enlaces con el token visible.
3. Si pierdes el movil, revoca el token desde GitHub.

Como personalizar el overlay:
1. Abre el panel en http://localhost:8765/admin.html.
2. Usa la seccion Personalizacion para cambiar titulo, subtitulo, colores, opacidad, tamano y rotacion.
3. Para usar un logo, escribe una URL o una ruta dentro de la carpeta del overlay, por ejemplo images/logo.png.
4. Si usas una ruta local, crea la carpeta images y mete ahi tu archivo de logo.

Si quieres usar iPhone/iPad:
1. Ejecuta Iniciar todo con iPhone iPad.cmd.
2. Acepta el permiso de administrador si Windows lo pide.
3. Abre esta URL en Safari:
   http://192.168.2.104:8765/admin.html

Opcion alternativa como archivo local:
1. Anade una fuente nueva: Browser Source / Fuente de navegador.
2. Marca archivo local y usa esta ruta:
   C:\Users\Luis\Desktop\bo7-prestige-overlay\index.html
3. Ajusta el tamano a:
   Width: 700
   Height: 480
   FPS: 60
4. Para usar los botones, clic derecho en la fuente de OBS y elige Interact.

Como cambiar tus datos:
1. Abre data.json con Bloc de notas.
2. Cambia weaponProgress, pendingWeapons o categoryStage.
   Tambien puedes cambiar customization para personalizar texto, colores, logo y tamano.
3. Guarda el archivo.
4. El overlay se actualiza solo cada 5 segundos.

Ejemplo de progreso:
"weaponProgress": {
  "Maddox RFB": { "prestige1": true }
}

No cambies los nombres de los archivos index.html, style.css, script.js o data.json.
