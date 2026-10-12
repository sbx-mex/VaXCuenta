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

Se une por **CeCo**, nunca por nombre. Cada objetivo debe tener una clave única **CeCo + semana** y cada real **CeCo + fecha**. El importador rechaza duplicados financieros y conserva el último sitio válido durante una carga fallida. Las filas repetidas del directorio se consolidan sólo cuando coinciden Región y DM, sin multiplicar importes. Si esas asignaciones entran en conflicto, se marca la asignación como pendiente.

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

Región y DM se toman del directorio operativo del proyecto Esfuerzo Operativo. Se aplica la misma asignación a la meta y al real. El nombre y el estado de la tienda provienen del Excel de objetivos. Las regiones distintas entre ambas fuentes se documentan en la auditoría.

Si falta una tienda en el directorio, su región se toma del Excel y su DM se muestra como **DM pendiente de asignación**. Los totales se conservan y ese grupo participa en la vista DM. Si también falta región, se identifica como **Por asignar**.

La tienda Miguel Aleman MTY no tiene un CeCo válido en el Excel: no se le atribuye la recaudación de otra tienda. Sus metas se conservan como pendientes en la auditoría.

## Exportación

CSV y vista de impresión utilizan el mismo alcance, periodo, búsqueda y agrupación de la pantalla. Exportan todas las filas de esa consulta y sus totales. El CSV incluye importes y objetivo diario numéricos, sin convertir el número diario en moneda. La opción PDF abre la vista horizontal de impresión para elegir **Guardar como PDF** en el navegador.

## Uso sin conexión

La primera visita con conexión descarga la app y el último corte. Sin conexión se puede consultar ese corte, con aviso y fecha visible. Al recuperar conexión se solicita el archivo vigente. Una carga fallida no vacía los resultados que ya estaban abiertos.
