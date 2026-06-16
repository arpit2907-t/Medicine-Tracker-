import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, X } from "lucide-react";
import { Medicine } from "../types";
import { playChimeAlert } from "../utils/audio";

interface ManualAddFormProps {
  onAddMedicine: (medicine: Medicine) => void;
  onClose?: () => void;
}

const COMMON_CATEGORIES = [
  "Antibiotics",
  "Analgesic (Pain Relief)",
  "Digestive & Gastro",
  "Antihistamine (Allergies)",
  "Cardiovascular",
  "Vitamins & Supplements",
  "Diabetes Control",
  "Respiratory / Inhalers",
  "Other"
];

export default function ManualAddForm({ onAddMedicine, onClose }: ManualAddFormProps) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("1 tablet");
  const [frequency, setFrequency] = useState("Once daily");
  const [durationDays, setDurationDays] = useState(10);
  const [totalQuantityToStart, setTotalQuantityToStart] = useState(20);
  const [instructions, setInstructions] = useState("Take after food");
  const [category, setCategory] = useState("Antibiotics");
  const [specificTimes, setSpecificTimes] = useState<string[]>(["09:00"]);

  const handleAddTimeField = () => {
    // default next time slot
    let nextTime = "13:00";
    if (specificTimes.length === 1) nextTime = "21:00";
    else if (specificTimes.length === 2) nextTime = "08:00";
    setSpecificTimes([...specificTimes, nextTime]);
  };

  const handleRemoveTimeField = (index: number) => {
    if (specificTimes.length <= 1) return; // at least one is needed
    setSpecificTimes(specificTimes.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...specificTimes];
    updated[index] = val;
    setSpecificTimes(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMed: Medicine = {
      id: `med-manual-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      specificTimes: [...specificTimes].sort(), // sort chronologically
      durationDays: Number(durationDays) || 7,
      totalQuantityToStart: Number(totalQuantityToStart) || 20,
      currentStock: Number(totalQuantityToStart) || 20,
      lowStockThreshold: Math.max(2, Math.ceil((Number(totalQuantityToStart) || 20) * 0.2)),
      instructions: instructions.trim(),
      category,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    onAddMedicine(newMed);
    playChimeAlert("success");
    
    // Reset properties
    setName("");
    setDosage("1 tablet");
    setFrequency("Once daily");
    setDurationDays(10);
    setTotalQuantityToStart(20);
    setInstructions("Take after food");
    setSpecificTimes(["09:00"]);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">Add Medication Manually</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Medicine Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amoxicillin, Ibuprofen"
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Dosage size
          </label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g. 1 Tablet, 5ml, 2 Puffs"
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Schedule Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50 cursor-pointer"
          >
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Frequency Interval Description
          </label>
          <input
            type="text"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g. Twice daily, Empty stomach"
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Duration (Days)
          </label>
          <input
            type="number"
            min="1"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value) || 1)}
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Starting Stock Qty (total pills/volumes)
          </label>
          <input
            type="number"
            min="1"
            value={totalQuantityToStart}
            onChange={(e) => setTotalQuantityToStart(Number(e.target.value) || 1)}
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Instructions & Warnings
          </label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Take with food, Avoid milk, Sleep warning..."
            className="w-full text-sm border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 bg-slate-50/50"
          />
        </div>

        <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Medication Schedule Times (24h clock)
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            {specificTimes.map((time, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
                <input
                  type="time"
                  value={time}
                  required
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                  className="text-xs font-bold focus:outline-none"
                />
                {specificTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTimeField(idx)}
                    className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg hover:text-rose-700 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddTimeField}
              className="px-3 py-1.5 bg-white border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-650 hover:text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Slot
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 flex justify-end gap-2">
        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" /> Save Medication
        </button>
      </div>
    </form>
  );
}
