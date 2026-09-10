export function formatHumanDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatPeriodMonthYear(year?: number, month?: number, startDate?: string): string {
  if (year && month) {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (startDate) {
    const d = new Date(startDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }
  return "";
}

export function formatDurationDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  let year: number, monthIdx: number, dayNum: number;

  if (typeof dateInput === "string") {
    const parts = dateInput.split("T")[0].split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      dayNum = parseInt(parts[2], 10);
    } else {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      year = d.getFullYear();
      monthIdx = d.getMonth();
      dayNum = d.getDate();
    }
  } else {
    year = dateInput.getFullYear();
    monthIdx = dateInput.getMonth();
    dayNum = dateInput.getDate();
  }

  const dayStr = String(dayNum).padStart(2, "0");

  const monthMap: Record<number, string> = {
    0: "JAN",
    1: "FEB",
    2: "MAR",
    3: "APR",
    4: "MAY",
    5: "JUN",
    6: "JUL",
    7: "AUG",
    8: "SEPT",
    9: "OCT",
    10: "NOV",
    11: "DEC",
  };

  const monthStr = monthMap[monthIdx] || "JAN";
  return `${dayStr}-${monthStr}-${year}`;
}
