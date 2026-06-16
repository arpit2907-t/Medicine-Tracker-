import React, { useState } from "react";
import { Pill, AlertTriangle, CheckSquare, Plus, RefreshCw, Calendar, PackageCheck } from "lucide-react";
import { Medicine } from "../types";
import { playChimeAlert } from "../utils/audio";

interface InventoryManagerProps {
  medicines: Medicine[];
  onRestock: (medicineId: string, quantityToAdd: number) => void;
  onDeleteMedicine: (medicineId: string) => void;
}

export default function InventoryManager({ medicines, onRestock, onDeleteMedicine }: InventoryManagerProps) {
  const [restockQty, setRestockQty] = useState<{ [id: string]: number }>({});

  const handleAddStock = (medicineId: string, defaultStartQty: number) => {
    const qty = restockQty[medicineId] || defaultStartQty;
    onRestock(medicineId, qty);
    playChimeAlert("success");
    setRestockQty(prev => ({ ...prev, [medicineId]: defaultStartQty })); // reset
  };

  const handleQtyChange = (medicineId: string, val: number) => {
    setRestockQty(prev => ({ ...prev, [medicineId]: val }));
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-600" />
            Inventory & Restock Plan
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Predicts when supplies run low based on daily intake schedules, calculating runout boundaries.
          </p>
        </div>
      </div>

      {medicines.length === 0 ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-2xl">
          <Pill className="w-10 h-10 text-slate-350 mb-2" />
          <p className="text-sm font-bold text-slate-500">No trackable medications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicines.map((med) => {
            const ratio = med.totalQuantityToStart > 0 ? (med.currentStock / med.totalQuantityToStart) : 0;
            const percentAvailable = Math.round(ratio * 100);
            
            // Check depletion trigger category - Using Emerald / Rose theme guidelines
            let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 border";
            let barColor = "bg-emerald-500";
            let warningText = "";

            if (med.currentStock <= 0) {
              badgeColor = "bg-rose-50 text-rose-700 border-rose-100 border";
              barColor = "bg-rose-500 animate-pulse";
              warningText = "🚨 RUN OUT! Restock immediately.";
            } else if (med.currentStock <= med.lowStockThreshold) {
              badgeColor = "bg-rose-50 text-rose-700 border-rose-150 border";
              barColor = "bg-rose-500";
              warningText = `⚠️ Low stock: Less than threshold remaining (${med.currentStock} left).`;
            }

            // Estimate exhaustion projection days
            const dosesPerDay = med.specificTimes.length || 1;
            const daysLeft = Math.floor(med.currentStock / dosesPerDay);
            
            const depletionDate = new Date();
            depletionDate.setDate(depletionDate.getDate() + daysLeft);
            const depletionFmt = depletionDate.toLocaleDateString([], { month: "short", day: "numeric" });

            return (
              <div key={med.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:shadow-xs transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                        <Pill className="w-4 h-4 text-indigo-600 shrink-0" />
                        {med.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{med.dosage} • {med.frequency}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeColor}`}>
                      {med.currentStock} / {med.totalQuantityToStart} left
                    </span>
                  </div>

                  {/* Stock Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Inventory supply</span>
                      <span className={med.currentStock <= med.lowStockThreshold ? "text-rose-500" : "text-emerald-500"}>
                        {med.currentStock <= med.lowStockThreshold ? `${daysLeft} Days Left` : `${percentAvailable}%`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className={`${barColor} h-full rounded-full`} style={{ width: `${Math.min(100, Math.max(0, percentAvailable))}%` }} />
                    </div>
                  </div>

                  {/* Warning message if low stock */}
                  {warningText && (
                    <p className="text-[10px] font-bold text-rose-700 mt-2 flex items-center gap-1 bg-rose-50/40 p-1.5 rounded-lg border border-rose-100/50">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      {warningText}
                    </p>
                  )}

                  {/* Projected depletion date card */}
                  {med.currentStock > 0 ? (
                    <div className="mt-3 bg-white border border-slate-100 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Runout:
                      </span>
                      {daysLeft === 0 ? (
                        <span className="font-bold text-rose-600">Runs out today!</span>
                      ) : (
                        <span><b className="font-bold text-indigo-750">{daysLeft} days</b> ({depletionFmt})</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 bg-rose-50/20 border border-rose-100 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono text-rose-650">
                      <span className="font-bold">DEPLETED</span>
                      <span>Restock required</span>
                    </div>
                  )}
                </div>

                {/* Replenish Control Panel */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-20 shrink-0 shadow-xs">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={restockQty[med.id] || ""}
                      onChange={(e) => handleQtyChange(med.id, Number(e.target.value) || 1)}
                      className="text-xs font-bold text-center w-full focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => handleAddStock(med.id, med.totalQuantityToStart)}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Replenish
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove trackable medicine info for "${med.name}"?`)) onDeleteMedicine(med.id);
                    }}
                    className="px-2 py-1.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-500 rounded-lg text-xs font-bold text-slate-400 transition cursor-pointer"
                    title="Remove medicine"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
