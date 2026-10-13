# Validación · Avance de toda la campaña

Base: sbx-mex/VaXCuenta, commit 3811f32c0bde38f2127baafc291595776ce336ec. Fuentes actuales del repositorio; corte 12 de octubre de 2026.

## Cifras conciliadas

| Control | Resultado |
| --- | --- |
| Universo | 967 CeCo con objetivo positivo; 9 con meta total cero excluidos |
| Meta total cargada | $16,353,570 |
| Acumulado al corte | $3,631,748; 10,288 registros |
| Avance contra meta cargada | 22.2% |
| Por recaudar | $12,721,822 |
| Registro | 947 tiendas con registro; 20 sin registro |
| Meta pendiente | Semana 49, 30 de noviembre; no se extrapola |
| Asignación | Nombre, Región y DM de Directorio.xlsx aplicado al real y las metas |

## Verificación

48 pruebas Python y 60 JavaScript verifican importación, claves, exclusión sin objetivo, conciliación monetaria, cambios de directorio, metas futuras y exportaciones. Un caso sintético comprueba que los importes sin objetivo se concilian aparte y sus fechas no adelantan el corte. La comparación principal es independiente del selector semanal.

Excel genera ocho hojas y abre en Campaña. Un lector independiente de Python verifica importes originales, todos los CeCo del alcance, el resumen de campaña, fórmulas y valores financieros. Los 12 controles de Validación presentan diferencias cero. No se realizó una sesión de Microsoft Excel.

Se generaron PDF nacional y regional con las fuentes actuales. Se revisó el render horizontal para comprobar que los indicadores y el resumen fueran legibles. Las fuentes están embebidas. Las notas señalan que falta una meta sin inventar el importe.

Las pruebas de interacción se ejecutaron con un DOM simulado. No se completó una sesión visual de navegador en este entorno porque Chromium no estaba disponible. El diseño conserva los estilos adaptables y añade el resumen de campaña con una columna en móvil.

El build y scripts/verify_release.py comprueban 26 archivos públicos, referencias, caché, corte, importes y hashes del origen. El ZIP no modifica CSV ni Excel de fuentes y no contiene dist/ ni archivos temporales. No se ha publicado este cambio en el remoto: el workflow existente lo validará al subir los archivos.
