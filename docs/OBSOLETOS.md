# Copias obsoletas identificadas

El workflow valida las huellas antes de retirar estos archivos. Las carpetas activas de datos, las pruebas y los motores se conservan.

Los 33 archivos del repositorio vigente corresponden a dos copias del sitio anterior. La lista también admite dist/.nojekyll vacío si se cargó desde el ZIP previo.

| Copia anterior | Sustitución |
| --- | --- |
| site/ | App completa en raíz: index.html, módulos y assets/. |
| dist/ guardado en Git | Artefacto temporal construido y publicado por el workflow. |

## Lista permitida

- `dist/app.mjs`
- `dist/assets/apple-touch-icon.png`
- `dist/assets/campaign-frame.png`
- `dist/assets/icon-192.png`
- `dist/assets/icon-512.png`
- `dist/assets/icon-maskable-512.png`
- `dist/assets/icon.svg`
- `dist/assets/logo.svg`
- `dist/data/dashboard.json`
- `dist/export.mjs`
- `dist/index.html`
- `dist/manifest.webmanifest`
- `dist/model.mjs`
- `dist/pwa.mjs`
- `dist/styles.css`
- `dist/sw.js`
- `dist/version.json`
- `site/app.mjs`
- `site/assets/apple-touch-icon.png`
- `site/assets/campaign-frame.png`
- `site/assets/icon-192.png`
- `site/assets/icon-512.png`
- `site/assets/icon-maskable-512.png`
- `site/assets/icon.svg`
- `site/assets/logo.svg`
- `site/data/dashboard.json`
- `site/export.mjs`
- `site/index.html`
- `site/manifest.webmanifest`
- `site/model.mjs`
- `site/pwa.mjs`
- `site/styles.css`
- `site/sw.js`
- `dist/.nojekyll`

No se elimina un archivo desconocido o modificado: se detiene toda la limpieza antes de borrar. El resultado se conserva en LIMPIEZA_OBSOLETOS.json.
