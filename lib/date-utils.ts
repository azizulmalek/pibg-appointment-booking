import { parseISO, startOfDay } from "date-fns";

export function parseDateInput(value: string): Date {
  return startOfDay(parseISO(value));
}
