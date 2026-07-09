export const getUkraineOffset = (year: number, month: number, day: number): string => {
  if (month > 2 && month < 9) return "+03:00";
  if (month < 2 || month > 9) return "+02:00";
  
  const lastSunday = (m: number) => {
    const d = new Date(year, m + 1, 0);
    const dayOfWeek = d.getDay();
    return d.getDate() - dayOfWeek;
  };
  
  if (month === 2) {
    return day >= lastSunday(2) ? "+03:00" : "+02:00";
  }
  if (month === 9) {
    return day < lastSunday(9) ? "+03:00" : "+02:00";
  }
  return "+02:00";
};

export const parseClientDateRange = (dateStr: string, isEnd: boolean): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const offset = getUkraineOffset(year, month, day);
      const hourStr = isEnd ? "23:59:59" : "00:00:00";
      const isoStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hourStr}${offset}`;
      return new Date(isoStr);
    }
  }
  return new Date(dateStr);
};

export const statusPriority = (s: string): number => {
  if (s === "Купив курс") return 10;
  if (s === "Вирішив подумати") return 8;
  if (s === "Дзвінок проведено") return 7;
  if (s === "Назначено Дзвінок") return 6;
  if (s === "Купив(-ла) Трипвайер") return 5;
  if (s === "Списались") return 4;
  if (s === "Залишив заявку") return 3;
  if (s === "Зацікавлений лід") return 2;
  if (s === "Новий лід") return 1;
  if (s === "Відмова") return -1;
  return 0;
};
