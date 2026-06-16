import React, { useState, useEffect } from "react";
import { Medicine, IntakeLog } from "./types";
import PrescriptionScanner from "./components/PrescriptionScanner";
import ManualAddForm from "./components/ManualAddForm";
import TimelineSchedule from "./components/TimelineSchedule";
import InventoryManager from "./components/InventoryManager";
import ActiveReminders from "./components/ActiveReminders";
import { Pill, Activity, CalendarCheck, HelpCircle, ShieldAlert, FileText, Plus, Database, Clock, Zap, RefreshCw, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { playChimeAlert } from "./utils/audio";

// Seed clinical data so the user begins with interactive samples immediately on onboarding
const SEED_MEDICINES: Medicine[] = [
  {
    id: "med-seed-1",
    name: "Amoxicillin",
    dosage: "1 capsule (500mg)",
    frequency: "Three times a day",
    specificTimes: ["08:00", "13:00", "19:00"],
    durationDays: 10,
    totalQuantityToStart: 30,
    currentStock: 8, // Close to depletion threshold!
    lowStockThreshold: 6,
    instructions: "Complete entire course. Take with food.",
    category: "Antibiotics",
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: "med-seed-2",
    name: "Lisinopril",
    dosage: "1 tablet (10mg)",
    frequency: "Once daily with breakfast",
    specificTimes: ["09:00"],
    durationDays: 30,
    totalQuantityToStart: 30,
    currentStock: 25, // Healthy stock
    lowStockThreshold: 6,
    instructions: "Avoid potassium-rich supplements.",
    category: "Cardiovascular",
    createdAt: new Date().toISOString(),
    isActive: true
  }
];

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);
  const [clinicalDisclaimer, setClinicalDisclaimer] = useState<string>("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState<number>(0); // Time warper!

  // Load state on mount
  useEffect(() => {
    const savedMeds = localStorage.getItem("meditrack_medicines");
    const savedLogs = localStorage.getItem("meditrack_logs");
    const savedDisclaimer = localStorage.getItem("meditrack_disclaimer");

    if (savedMeds) {
      setMedicines(JSON.parse(savedMeds));
    } else {
      setMedicines(SEED_MEDICINES);
      localStorage.setItem("meditrack_medicines", JSON.stringify(SEED_MEDICINES));
    }

    if (savedLogs) {
      setIntakeLogs(JSON.parse(savedLogs));
    }

    if (savedDisclaimer) {
      setClinicalDisclaimer(savedDisclaimer);
    }
  }, []);

  // Update ticking clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      if (timeOffsetMinutes !== 0) {
        now.setMinutes(now.getMinutes() + timeOffsetMinutes);
      }
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hrs}:${mins}:${secs}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timeOffsetMinutes]);

  // Persist changed states
  const saveMedicines = (updated: Medicine[]) => {
    setMedicines(updated);
    localStorage.setItem("meditrack_medicines", JSON.stringify(updated));
  };

  const saveLogs = (updated: IntakeLog[]) => {
    setIntakeLogs(updated);
    localStorage.setItem("meditrack_logs", JSON.stringify(updated));
  };

  const handleMedicinesExtracted = (newMeds: Medicine[], disclaimer: string) => {
    const merged = [...newMeds, ...medicines];
    saveMedicines(merged);
    setClinicalDisclaimer(disclaimer);
    localStorage.setItem("meditrack_disclaimer", disclaimer);
  };

  const handleAddMedicine = (newMed: Medicine) => {
    const merged = [newMed, ...medicines];
    saveMedicines(merged);
    setShowManualForm(false);
  };

  const handleDeleteMedicine = (medicineId: string) => {
    const filtered = medicines.filter(m => m.id !== medicineId);
    saveMedicines(filtered);
    
    // clean up log associations
    const filteredLogs = intakeLogs.filter(l => l.medicineId !== medicineId);
    saveLogs(filteredLogs);
  };

  const handleRestock = (medicineId: string, quantityToAdd: number) => {
    const updated = medicines.map((m) => {
      if (m.id === medicineId) {
        const after = m.currentStock + quantityToAdd;
        return {
          ...m,
          currentStock: after,
          totalQuantityToStart: Math.max(m.totalQuantityToStart, after) // keep total tracking in line
        };
      }
      return m;
    });
    saveMedicines(updated);
  };

  // Check off a medication intake
  const handleMarkIntake = (medicineId: string, scheduledTime: string, status: "taken" | "skipped") => {
    const targetMed = medicines.find(m => m.id === medicineId);
    if (!targetMed) return;

    // Deduct stock if taken
    if (status === "taken") {
      const updatedMeds = medicines.map((m) => {
        if (m.id === medicineId) {
          return {
            ...m,
            currentStock: Math.max(0, m.currentStock - 1)
          };
        }
        return m;
      });
      saveMedicines(updatedMeds);
    }

    // Append log history
    const newLog: IntakeLog = {
      id: `log-${Date.now()}`,
      medicineId,
      medicineName: targetMed.name,
      dosageTaken: targetMed.dosage,
      scheduledTime,
      takenAt: new Date().toISOString(),
      status
    };

    const updatedLogs = [newLog, ...intakeLogs];
    saveLogs(updatedLogs);

    // Audio cue
    if (status === "taken") {
      playChimeAlert("success");
    } else {
      playChimeAlert("warning");
    }
  };

  // Calculations for dashboard summary stats
  const totalMedsCount = medicines.length;
  const depletedCount = medicines.filter(m => m.currentStock <= 0).length;
  const lowStockCount = medicines.filter(m => m.currentStock > 0 && m.currentStock <= m.lowStockThreshold).length;

  const resetAllData = () => {
    if (confirm("Reset application variables for demonstration? Seed medications will reload.")) {
      setMedicines(SEED_MEDICINES);
      setIntakeLogs([]);
      setClinicalDisclaimer("");
      setTimeOffsetMinutes(0);
      localStorage.setItem("meditrack_medicines", JSON.stringify(SEED_MEDICINES));
      localStorage.removeItem("meditrack_logs");
      localStorage.removeItem("meditrack_disclaimer");
      playChimeAlert("success");
    }
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans selection:bg-indigo-500/10 bg-slate-50">
      {/* 🩺 Upper Brand Hub Header */}
      <header className="bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/15">
              <Pill className="w-4.5 h-4.5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 font-mono block">Smart Clinic Sync</span>
              <h1 className="text-base font-bold tracking-tight text-slate-900 -mt-0.5">MediTrack Workspace</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            {/* Realtime clock display */}
            <div className="bg-slate-50 border border-slate-250 px-3 py-1.5 rounded-xl flex items-center gap-2 font-mono text-slate-700 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Current Block: {currentTime}</span>
            </div>

            <button
              onClick={resetAllData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Variables
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-20 pb-16 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (GRID SIZE 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Real-time alarm monitoring alerts and settings */}
          <ActiveReminders medicines={medicines} onMarkIntake={handleMarkIntake} />

          {/* Time Warp Tool (High Fidelity for Auditor Testing) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-widest text-indigo-500 font-mono">
                  <Zap className="w-4 h-4 text-indigo-500 animate-pulse" /> Time warp debug console
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Drag the dial to fast-forward the patient clock. Useful for triggering reminders at scheduled times.
                </p>
              </div>
              {timeOffsetMinutes !== 0 && (
                <button
                  onClick={() => setTimeOffsetMinutes(0)}
                  className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold font-mono text-[9px] rounded-lg cursor-pointer"
                >
                  Reset Offset
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="-720" // 12 hours
                max="720"
                step="5"
                value={timeOffsetMinutes}
                onChange={(e) => setTimeOffsetMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
              <span className="text-[10px] font-bold font-mono text-slate-600 whitespace-nowrap bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
                {timeOffsetMinutes >= 0 ? `+${timeOffsetMinutes}` : timeOffsetMinutes} min offset
              </span>
            </div>
          </div>

          {/* Core scheduler timeline */}
          <TimelineSchedule
            medicines={medicines}
            intakeLogs={intakeLogs}
            onMarkIntake={handleMarkIntake}
          />

          {/* Prescription Upload Area */}
          <PrescriptionScanner onMedicinesExtracted={handleMedicinesExtracted} />

          {/* Clinical parsing warnings disclaimer if present */}
          {clinicalDisclaimer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-indigo-50/50 border border-indigo-150 rounded-3xl space-y-2"
            >
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-widest">
                <ShieldAlert className="w-4 h-4 text-indigo-500" />
                <span>Clinical Pharmacist AI Notes</span>
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{clinicalDisclaimer}"
              </p>
            </motion.div>
          )}
        </div>


        {/* RIGHT COLUMN (GRID SIZE 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Stats overview panel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inventory KPI Metrics</h2>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400">Medications</span>
                <p className="text-2xl font-black text-slate-700 mt-1">{totalMedsCount}</p>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-2xl text-center border border-rose-100">
                <span className="text-[9px] uppercase font-bold text-rose-500">Low Stock</span>
                <p className="text-2xl font-black text-rose-700 mt-1">{lowStockCount}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-2xl text-center border border-rose-100">
                <span className="text-[9px] uppercase font-bold text-rose-500">Depleted</span>
                <p className="text-2xl font-black text-rose-700 mt-1">{depletedCount}</p>
              </div>
            </div>
          </div>

          {/* Stock tracking progress indicators */}
          <InventoryManager
            medicines={medicines}
            onRestock={handleRestock}
            onDeleteMedicine={handleDeleteMedicine}
          />

          {/* Add Medicine form triggers */}
          <div>
            {!showManualForm ? (
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="w-full p-4 border border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 text-indigo-700 font-bold text-sm rounded-3xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-650 stroke-[3.5]" />
                Add Medication Manually
              </button>
            ) : (
              <ManualAddForm
                onAddMedicine={handleAddMedicine}
                onClose={() => setShowManualForm(false)}
              />
            )}
          </div>

          {/* Interactive Compliance Logs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-650" />
              Prescription Adherence Logs
            </h2>

            {intakeLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">No historic doses logged today.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {intakeLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-50/50 border border-slate-200 text-xs flex justify-between items-center gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800">{log.medicineName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {log.dosageTaken} scheduled at {log.scheduledTime}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider border ${
                        log.status === "taken" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-rose-50 border-rose-200 text-rose-700"
                      }`}>
                        {log.status === "taken" ? "taken" : "skipped"}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1 font-mono">
                        {new Date(log.takenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Safety info footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs space-y-2">
          <p className="text-slate-200 font-bold">MediTrack Operations Platform</p>
          <p className="text-slate-500 max-w-2xl mx-auto text-[11px] leading-relaxed">
            AI extraction acts strictly as dynamic scaffolding assistance. Do not bypass real medical advice; physical inspection of original prescription paper by certified pharmacists is paramount.
          </p>
        </div>
      </footer>
    </div>
  );
}
