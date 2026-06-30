"use client";

import { cn } from "@/lib/utils";

type SlotItem = {
  startTime: string;
  available: boolean;
  isOpen: boolean;
  slotId?: string;
  booked: number;
  maxBookings: number;
};

export function SlotGrid({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: SlotItem[];
  selectedSlotId?: string;
  onSelect: (slotId: string, startTime: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Slot Masa</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const disabled = !slot.available || !slot.slotId;
          const selected = slot.slotId === selectedSlotId;
          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={disabled}
              onClick={() => slot.slotId && onSelect(slot.slotId, slot.startTime)}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                disabled
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                  : selected
                    ? "border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20"
                    : "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200"
              )}
            >
              {slot.startTime}
              <span className="mt-0.5 block text-[10px] font-normal opacity-70">
                {disabled ? "Tutup" : "Tersedia"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
