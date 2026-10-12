# VaXCuenta: corrección de Python para cargar

**VaXCuenta_Fix_Python.zip** corrige los cuatro errores de Python de la ejecución `38317971674`. Se probaron los archivos del repositorio actual: **66 pruebas aprobadas** y limpieza de **33 copias antiguas**. La segunda ejecución también pasó.

## Cargar la corrección

1. Descomprime el ZIP y sube **el contenido de la carpeta VaXCuenta** a la raíz de **sbx-mex/VaXCuenta**. Reemplaza los seis archivos indicados abajo. Incluye `.github/workflows/deploy-pages.yml` y `.gitignore`. Guarda todos los cambios en un mismo commit en **main**. No subas el ZIP ni una carpeta adicional VaXCuenta dentro del repositorio.
2. En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**. Es la configuración para publicar el artefacto validado del workflow.
3. En **Actions → VaXCuenta - Validar, limpiar y publicar**, abre la ejecución del nuevo commit. También puedes iniciarla con **Run workflow → main**. Comprueba que **validate-clean-build** y **publish** terminen en verde. Abre **https://sbx-mex.github.io/VaXCuenta/** y usa **Ctrl + F5** para actualizar.

Repetir la ejecución del commit anterior no incorpora esta corrección. Primero carga los archivos y después ejecuta el workflow del nuevo commit.

## Los seis archivos para reemplazar o agregar

| Archivo | Función |
| --- | --- |
| `.github/workflows/deploy-pages.yml` | Prepara Python 3.12, valida, limpia y publica. |
| `.gitignore` | Evita volver a guardar el dist/ generado. |
| `tests/test_cleanup.py` | Aísla las pruebas de las carpetas antiguas del checkout. |
| `LEEME_PRIMERO.md` | Instrucciones de esta corrección. |
| `docs/VALIDACION.md` | Resultado de la auditoría y alcance comprobado. |
| `docs/CORRECCION_PYTHON.md` | Causa del fallo y comportamiento del workflow. |

Python valida el CSV, los Excel, la recaudación, las metas y la limpieza protegida. Node valida la app y prepara la publicación. Los tres archivos de datos, las metas y el directorio se conservan. El workflow crea un commit con la limpieza y el corte validado; no necesitas eliminar site/ ni dist/ a mano.

## Información real confirmada

| Corte | Real | Objetivo | Avance | Faltante |
| --- | ---: | ---: | ---: | ---: |
| 11 de octubre de 2026 | $3,349,828 | $3,526,930 | 95.0% | $177,102 |

La semana 40 mantiene su objetivo semanal completo. La validación y el commit se comprobaron localmente con los mismos archivos; el estado verde de GitHub depende de la ejecución del nuevo commit después de cargar este ZIP.
