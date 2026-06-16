import React, { useState } from "react";
import { Check, X, AlertTriangle, Clock, Pill, CalendarCheck } from "lucide-react";
import { Medicine, IntakeLog } from "../types";
import { playChimeAlert } from "../utils/audio";

interface TimelineScheduleProps {
  medicines: Medicine[];
  intakeLogs: IntakeLog[];
  onMarkIntake: (medicineId: string, scheduledTime: string, status: "taken" | "skipped") => void;
}

export default function TimelineSchedule({ medicines, intakeLogs, onMarkIntake }: TimelineScheduleProps) {
  const [filter, setFilter] = useState<"all" | "taken" | "pending">("pending");

  // Compile all scheduled events for today
  const activeMeds = medicines.filter(m => m.isActive);
  
  const events = activeMeds.flatMap(med => {
    return med.specificTimes.map(time => {
      // Find if this event has already been logged today
      const todayStr = new Date().toISOString().split("T")[0];
      const log = intakeLogs.find(l => 
        l.medicineId === med.id && 
        l.scheduledTime === time && 
        l.takenAt.startsWith(todayStr)
      );

      return {
        id: `${med.id}-${time}`,
        medicine: med,
        time,
        status: log ? log.status : "pending",
        logTime: log ? new Date(log.takenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null
      };
    });
  });

  // Sort events chronologically by time
  const sortedEvents = events.sort((a, b) => a.time.localeCompare(b.time));

  // Apply filters
  const filteredEvents = sortedEvents.filter(evt => {
    if (filter === "taken") return evt.status === "taken" || evt.status === "skipped";
    if (filter === "pending") return evt.status === "pending";
    return true; // "all"
  });

  // Simple stats calculation
  const totalSlots = events.length;
  const takenSlots = events.filter(e => e.status === "taken").length;
  const skippedSlots = events.filter(e => e.status === "skipped").length;
  const adherenceRate = totalSlots > 0 ? Math.round((takenSlots / (totalSlots - skippedSlots || totalSlots)) * 100) : 100;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="text-indigo-600 text-base">●</span>
            Today's Adherence Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Check off medications taken at their specified hour to maintain precise dosage compliance patterns.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-250">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === "pending" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pending ({events.filter(e => e.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("taken")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === "taken" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Logged ({events.filter(e => e.status !== "pending").length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Today
          </button>
        </div>
      </div>

      {/* Adherence Overview Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Adherence</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{adherenceRate}%</p>
          <p className="text-[9px] font-bold text-indigo-400 mt-1 uppercase">compliance rating</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taken</span>
          <p className="text-2xl font-black text-slate-700 mt-1">{takenSlots} / {totalSlots}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">dosage slots consumed</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining</span>
          <p className="text-2xl font-black text-slate-600 mt-1">{events.filter(e => e.status === "pending").length}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">pending doses left</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skipped</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{skippedSlots}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">voluntarily bypassed</p>
        </div>
      </div>

      {/* Timeline Event Listing */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-2xl">
          <CalendarCheck className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-500">No scheduled events found.</p>
          {filter === "pending" && activeMeds.length > 0 && (
            <p className="text-xs text-slate-400 mt-1 font-medium">Congratulations! All your medication slots are logged for today.</p>
          )}
          {activeMeds.length === 0 && (
            <p className="text-xs text-slate-400 mt-1 font-medium">Please scan or add a medicine to construct a custom schedule.</p>
          )}
        </div>
      ) : (
        <div className="relative border-l border-slate-150 ml-4 pl-6 space-y-4">
          {filteredEvents.map((evt) => {
            const med = evt.medicine;
            const isLowStock = med.currentStock <= med.lowStockThreshold;
            const isOutSecured = med.currentStock <= 0;

            return (
              <div key={evt.id} className="relative group">
                {/* Timeline Dot Indicator */}
                <span className={`absolute -left-10 top-2.5 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-colors ${
                  evt.status === "taken" 
                    ? "bg-emerald-500 border-emerald-100 text-white"
                    : evt.status === "skipped"
                    ? "bg-rose-500 border-rose-100 text-white"
                    : "bg-white border-slate-200"
                }`}>
                  {evt.status === "taken" && <Check className="w-3 h-3 stroke-[3]" />}
                  {evt.status === "skipped" && <X className="w-3 h-3 stroke-[3]" />}
                </span>

                <div className={`p-4 rounded-2xl border transition ${
                  evt.status === "taken"
                    ? "bg-indigo-50/50 border-indigo-100 text-indigo-900"
                    : evt.status === "skipped"
                    ? "bg-slate-50 border-slate-200 opacity-60 text-slate-500"
                    : "bg-white hover:bg-slate-50/50 border-slate-250 hover:border-slate-350"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1 font-mono px-2.5 py-1 rounded-lg border shadow-xs ${
                          evt.status === "taken"
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {evt.time}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
                          {med.category}
                        </span>
                        {isOutSecured && (
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-rose-600 px-2 py-0.5 rounded-full">
                            ⚠️ Out of Stock
                          </span>
                        )}
                        {!isOutSecured && isLowStock && (
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                            ⚠️ Low Stock ({med.currentStock} left)
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 pt-1">
                        <Pill className="w-4 h-4 text-indigo-600" />
                        {med.name}
                        <span className="text-xs font-normal text-slate-500">({med.dosage})</span>
                      </h3>

                      <p className="text-xs text-slate-500">{med.frequency} • {med.instructions}</p>

                      {evt.status === "taken" && (
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">
                          TAKEN • Confirmed at {evt.logTime || "specified scheduled hour"}
                        </p>
                      )}
                      {evt.status === "skipped" && (
                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wide">
                          SKIPPED • Intake bypassed
                        </p>
                      )}
                    </div>

                    {/* Action Controls */}
                    {evt.status === "pending" && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => onMarkIntake(med.id, evt.time, "taken")}
                          disabled={isOutSecured}
                          className={`px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-1 transition select-none cursor-pointer ${
                            isOutSecured ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> LOG NOW
                        </button>
                        <button
                          onClick={() => onMarkIntake(med.id, evt.time, "skipped")}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 transition select-none cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Skip
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
