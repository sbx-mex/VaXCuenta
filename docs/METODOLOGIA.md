# Reglas de VaXCuenta

## Qué compara

**Real** es la suma monetaria de `vaXcuenta$`, por CeCo y fecha. Se conservan los importes originales en centavos, incluidos ajustes o importes que no son múltiplos de $10.

**Objetivo semanal** es `DONACIÓN SEMANAL ESTIMADA`. Cada fila debe conciliar con `7% - ORD_PROYECTADAS_SEMANAL × $10`.

**Objetivo diario** es `7% - ORD_PROYECTADAS_DIARIAS`: un número de donativos, no dinero. Se conservan sus decimales. Algunas tiendas usan 5.5 días como base diaria; no se reemplaza ese dato por semanal ÷ 7.

El **7%** es la participación utilizada para elaborar la proyección. Este tablero no calcula participación real de tickets: el archivo real no incluye el total de órdenes.

## Calendario y corte

La semana 40 tiene lunes **28/sept/2026** y domingo **4/oct/2026**. Cada semana siguiente avanza siete días. El periodo termina el **30/nov/2026**, primer día de la semana 49.

Las fechas de la exportación original están en **mes/día/año**. `10/11/2026` significa **11 de octubre**, no 10 de noviembre. También se admiten fechas ISO `AAAA-MM-DD`.

El corte general es la fecha máxima de las filas reales **dentro de la campaña**. La fecha de consulta, la de publicación y la última meta cargada no adelantan el corte. Una tienda puede tener un último registro anterior: se muestra ese dato en su detalle, pero su comparación usa el corte común para el mismo alcance.

Las exportaciones nuevas deben contener el acumulado desde el inicio. Se rechaza un corte que retrocede o un reemplazo que pierde las primeras fechas de la carga anterior. Una corrección del mismo corte actualiza los importes y la revisión publicada. Los datos no se añaden por duplicado.

## Objetivo al corte

| Periodo | Real incluido | Objetivo monetario |
| --- | --- | --- |
| Semana 40 | Desde 1/oct hasta el corte o 4/oct | Meta semanal completa, aunque sólo hay cuatro días de campaña. |
| Semanas completas posteriores | Lunes a domingo, dentro de la campaña | Meta semanal completa del Excel. |
| Semana posterior en curso | Lunes hasta el último día real | Meta semanal × días calendario transcurridos ÷ 7. |
| Semana futura | No se presentan importes reales futuros | No aumenta el objetivo acumulado al corte. |
| Semana 49, 30/nov | Sólo el día incluido en campaña | Si se agrega una meta semanal, aplica 1/7 de ella. Si falta, se muestra meta pendiente. |

La distribución por días calendario es una regla del proyecto para semanas posteriores en curso, porque no hay calendario de apertura por tienda en las fuentes. El objetivo diario del Excel se conserva como referencia independiente. Puede ajustarse la regla central en config y en el motor si se proporciona otro calendario oficial.

La meta de una semana parcial se redondea al centavo por tienda antes de agregarse. La semana 40 no se prorratea. No se reparten los $1,610 del ejemplo entre sólo cuatro días ni se reduce su objetivo.

## Agregación

Se une por **CeCo**, nunca por nombre. Cada objetivo debe tener una clave única **CeCo + semana** y cada real **CeCo + fecha**. El importador rechaza duplicados financieros y conserva el último sitio válido durante una carga fallida. Las filas repetidas del directorio se consolidan sólo cuando coinciden nombre, Región y DM, sin multiplicar importes. Una asignación contradictoria detiene la actualización.

Las tiendas con metas que comienzan después del corte no entran todavía al alcance de ese periodo. Una tienda activa que no tiene fila de recaudación conserva su objetivo y se identifica como **sin registro**. Eso no asegura que su recaudación real sea cero; sólo indica que el archivo no la reporta.

En cada alcance:

```text
Recaudado = suma de los pesos registrados
Objetivo al corte = suma de los objetivos monetarios elegibles
Avance = Recaudado / Objetivo al corte
Faltante = máximo(Objetivo al corte - Recaudado, 0)
Donativos equivalentes = Recaudado / $10
```

Los porcentajes de tiendas **no se promedian** para obtener un DM o Región. Se utiliza la razón de sus totales. El avance puede superar 100%; el tablero conserva el porcentaje y muestra cuánto se supera la meta.

Una tienda con recaudación y meta ausente mantiene sus pesos visibles. El alcance afectado identifica el objetivo como incompleto y no muestra un porcentaje que mezcle esa recaudación con un denominador insuficiente.

## Asignaciones y diferencias del origen

El nombre, la región y el DM se toman de **data/Directorio.xlsx de VaXCuenta**, vinculado por CeCo. El Excel de objetivos aporta metas monetarias y proyecciones diarias; su región original se conserva en `targetRegion` para contrastarla con la vigente. Tanto el real como el objetivo usan la región vigente. Un cambio de directorio reasigna ambos juntos y conserva los totales nacionales.

Si una tienda falta en el directorio, su región es **Por asignar** y su DM **DM pendiente de asignación**. El nombre del Excel de objetivos funciona como referencia mientras se incorpora al directorio; sus importes no se excluyen. Una asignación contradictoria de nombre, región o DM para el mismo CeCo rechaza la carga antes de escribir el corte. Las filas repetidas coincidentes se consolidan. Un estatus de apertura contradictorio se marca **Por confirmar**, sin excluir ni multiplicar los importes.

Con los archivos actuales, Centro Norte en semana 40 tiene **72 CeCo y $132,480 de objetivo**. Atana Lindavista (43194) está en Centro Norte. La suma de objetivos se verifica por CeCo frente al Excel; la distribución regional sigue el directorio. El origen no incluye metas ni real para todos los CeCo del directorio: el tablero muestra tiendas con meta activa o recaudación en el periodo.

La tienda Miguel Aleman MTY no tiene un CeCo válido en el Excel: no se le atribuye la recaudación de otra tienda. Sus metas se conservan como pendientes en la auditoría.

## Exportación

Se conserva el alcance, periodo y búsqueda al abrir Exportar. La búsqueda pendiente se aplica antes de tomar la consulta. El resumen monetario se comprueba contra todas las tiendas y las filas originales del mismo periodo; una inconsistencia bloquea la descarga y muestra su causa.

**Resumen PDF** agrupa las mismas tiendas por Región en el alcance nacional y por DM cuando se elige una Región. Una tienda individual se identifica por CeCo y nombre. El resumen muestra real, objetivo, avance, faltante, cobertura de registros y reglas del periodo. El **PDF con todas las tiendas** añade la lista completa de CeCo; las filas no se recortan para resumir.

**Excel** abre en Resumen. Tiendas calcula el real desde Real diario y el objetivo desde Metas mediante CeCo. Metas conserva el importe semanal y la proyección diaria del Excel original, y calcula la meta del periodo con los días aplicables. La semana 40 utiliza siete días de objetivo aunque sólo haya cuatro días de campaña; una semana posterior parcial usa sus días calendario al corte. Se redondea por tienda al centavo.

La hoja Validación observa esas fuentes y cálculos: compara el real y las metas con el corte original, comprueba la conciliación del detalle, cuenta tiendas y filas, e identifica faltas de registro o meta. Sus resultados son terminales: no determinan importes ni alimentan la proyección. Modificar una fuente dentro del Excel actualiza los importes y cambia a REVISAR el control contra el corte original.

Importes, porcentajes, fechas y donativos diarios se exportan como valores tipados. La proyección diaria se conserva como número independiente. Las fuentes de cada hoja se identifican por su nombre original. Los nombres se escriben como texto, evitando fórmulas ejecutables introducidas por una cadena.

Semana 40 y acumulado son vistas distintas. En Centro Norte, la semana 40 suma **$58,420 reales / $132,480 de meta = 44.1%**, con **$74,060 de faltante**. El acumulado del 1 al 11 de octubre suma **$188,780 / $258,960 = 72.9%**, con **$70,180 de faltante**. Jinetes (38661) no tiene registro en semana 40 y conserva su objetivo de $1,510.

## Uso sin conexión

La primera visita con conexión descarga la app y el último corte. Sin conexión se puede consultar ese corte, con aviso y fecha visible. Al recuperar conexión se solicita el archivo vigente. Una carga fallida no vacía los resultados que ya estaban abiertos.
