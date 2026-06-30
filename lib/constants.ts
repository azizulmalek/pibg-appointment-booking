export const SLOT_TIMES = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
] as const;

export const REASON_LABELS: Record<string, string> = {
  GENERAL: "Umum",
  MIDTERM: "Pertengahan Tahun",
  FINAL: "Akhir Tahun",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Diluluskan",
  REJECTED: "Ditolak",
  RESCHEDULED: "Dijadualkan Semula",
  CANCELLED: "Dibatalkan",
};

export const PARENT_SESSION_COOKIE = "pibg_parent_session";
export const PARENT_SESSION_MAX_AGE = 60 * 30;
