# Validación del proyecto

Corrección de publicación y limpieza: campaña 2026, información real al **11 de octubre**.

## Resultado

**66 pruebas automatizadas aprobadas: 30 de Python y 36 de JavaScript.** La preparación del sitio y la verificación de los archivos de publicación también finalizaron correctamente.

| Control | Resultado |
| --- | --- |
| Conciliación del CSV completo | $3,353,948 = $3,349,828 de campaña + $4,120 fuera de campaña. |
| Objetivo al corte, semanas 40 y 41 | $3,526,930. |
| Avance nacional, razón de totales | 94.978579%; se presenta redondeado a 95.0%. |
| Faltante nacional | $177,102. |
| Tiendas activas al corte | 975; 944 con recaudación registrada y 31 sin fila de campaña. |
| Región, DM y Tienda | Los tres niveles conservan las mismas sumas de real y objetivo. |
| Claves financieras | Sin duplicados de CeCo + fecha ni CeCo + semana. |
| Semana 40 parcial | El real empieza el 1 de octubre; se conserva la meta semanal completa. |
| Objetivo diario | Se conserva como número, incluidos decimales y bases diarias del origen. |
| Siguientes cortes | Se probaron el avance al lunes 12 de octubre y una corrección del mismo corte. |
| Carga acumulada | Rechaza retroceso de corte o pérdida del inicio de campaña. |
| Datos faltantes | Distingue sin registro, cero real y objetivo pendiente. |
| DM pendiente | 10 tiendas en el catálogo; 8 activas al corte y 2 con metas posteriores. |
| Caché de PWA | Sólo toca su propia ruta; usa el corte de red y conserva el descargado sin conexión. |
| Exportación | Comparte el mismo alcance, periodo, búsqueda y sumas de la pantalla. |
| Recursos de publicación | Rutas relativas, iconos PNG con tamaño correcto y módulos disponibles. |
| Archivos de origen | Quedan fuera de la carpeta publicada. |

## Cobertura de aplicación

Se probaron la carga inicial y eventos de filtros, agrupación, detalle de tienda, búsqueda, restablecimiento, ayuda de instalación y recuperación ante una actualización fallida en un DOM simulado en Node. Las pruebas del Service Worker verifican precarga, actualización del corte, lectura sin conexión, navegación con filtros y separación de cachés por proyecto.

Se comprobaron de forma independiente las sumas vigentes contra el origen y las reglas con un conjunto fijo de regresión. Una actualización legítima de los archivos no queda bloqueada por valores históricos fijados en una prueba.

## Límites de la verificación

No se ejecutó una revisión visual en un navegador real, ni el diálogo nativo de impresión o instalación en un dispositivo, durante esta entrega. La PWA y la vista PDF están implementadas y sus archivos y reglas fueron comprobados; su apariencia y los diálogos nativos deben revisarse al abrir el sitio preparado.

Se verificó el repositorio sbx-mex/VaXCuenta en el commit 822d7fd14a55462d0b07175a1a7a320490c9de5e. Los 56 archivos consultados coinciden por huella con la copia usada para la corrección. Esta entrega es un ZIP correctivo para cargar al repositorio; no se alteró el remoto desde esta sesión. El flujo de publicación está incluido y sus acciones se contrastaron con la documentación oficial vigente.

Las notas de los archivos de origen siguen visibles en el tablero y en AUDITORIA.md. Las pruebas aprobadas validan su tratamiento; no convierten una asignación o una meta faltante en un dato confirmado.

## Corrección comprobada

- index.html contiene la app completa en raíz, con todos sus recursos relativos.
- Se probó la actualización sobre una copia exacta del repositorio vigente y un remoto Git local: se retiraron 33 archivos de site/ y dist/, se guardó el commit y se reconstruyó la publicación.
- Los tres orígenes CSV/Excel y config.json permanecieron idénticos por SHA-256.
- La publicación usa la misma entrada, corte y versión PWA de la raíz; no contiene el README ni archivos de origen.
- El fixture de regresión fue reducido a 6,650 bytes; los datos operativos siguen completos.
- El ZIP excluye los orígenes que ya existen en el repositorio, para conservarlos al cargar esta corrección.

La vista previa HTML carga de forma autónoma el corte y los indicadores correctos, sin red ni módulos externos, comprobado en un entorno DOM simulado. No sustituye la revisión visual en un navegador real.
