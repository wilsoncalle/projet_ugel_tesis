import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

/**
 * Genera una matriz de semanas (array de arrays de Date) para un mes/año dado.
 * weekStartsOn: 1 para lunes (por defecto), 0 para domingo.
 */
export const useCalendarMatrix = (month, year, weekStartsOn = 1) => {
  return useMemo(() => {
    const firstDay = startOfMonth(new Date(year, month, 1));
    const lastDay = endOfMonth(firstDay);

    const start = startOfWeek(firstDay, { weekStartsOn });
    const end = endOfWeek(lastDay, { weekStartsOn });

    const days = eachDayOfInterval({ start, end });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [month, year, weekStartsOn]);
};
