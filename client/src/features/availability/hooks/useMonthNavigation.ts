import { useState } from 'react';
import { addMonths, subMonths } from 'date-fns';

export function useMonthNavigation() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const minDate = subMonths(now, 3);
  const maxDate = addMonths(now, 6);

  const minYear = minDate.getFullYear();
  const minMonth = minDate.getMonth();
  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();

  const canGoPrev =
    currentYear > minYear ||
    (currentYear === minYear && currentMonth > minMonth);

  const canGoNext =
    currentYear < maxYear ||
    (currentYear === maxYear && currentMonth < maxMonth);

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  return {
    currentMonth,
    currentYear,
    goNextMonth,
    goPrevMonth,
    canGoNext,
    canGoPrev,
  };
}
