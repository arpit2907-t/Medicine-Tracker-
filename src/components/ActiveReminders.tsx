import React, { useEffect, useState, useRef } from "react";
import { Clock, Bell, BellOff, Check, X, ShieldAlert, Volume2, Sparkles } from "lucide-react";
import { Medicine, ActiveNotification, ReminderConfig } from "../types";
import { playChimeAlert } from "../utils/audio";

interface ActiveRemindersProps {
  medicines: Medicine[];
  onMarkIntake: (medicineId: string, scheduledTime: string, status: "taken" | "skipped") => void;
}

export default function ActiveReminders({ medicines, onMarkIntake }: ActiveRemindersProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [config, setConfig] = useState<ReminderConfig>(() => {
    const saved = localStorage.getItem("meditrack_rem_config");
    return saved ? JSON.parse(saved) : { enableSound: true, enableBrowserNotifications: true, restockAlertPercent: 20 };
  });

  const [activeAlerts, setActiveAlerts] = useState<ActiveNotification[]>([]);
  const lastCheckedMinute = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const saveConfig = (newCfg: ReminderConfig) => {
    setConfig(newCfg);
    localStorage.setItem("meditrack_rem_config", JSON.stringify(newCfg));
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
      playChimeAlert("success");
    }
  };

  // Clock ticks every 5 seconds to match times precisely
  useEffect(() => {
    const activeMeds = medicines.filter(m => m.isActive);

    const checkSchedules = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;

      // Prevent duplicate triggers for the same exact minute
      if (currentTime === lastCheckedMinute.current) return;
      lastCheckedMinute.current = currentTime;

      activeMeds.forEach((med) => {
        // Find if any specific injection of times matches the check interval
        if (med.specificTimes.includes(currentTime)) {
          // Trigger alert!
          const alertId = `${med.id}-${currentTime}-${Date.now()}`;
          
          const newAlert: ActiveNotification = {
            id: alertId,
            medicine: med,
            time: currentTime,
            playedSound: false
          };

          setActiveAlerts(prev => {
            // Prevent exact duplicates
            if (prev.some(a => a.medicine.id === med.id && a.time === currentTime)) return prev;
            return [...prev, newAlert];
          });

          // Play Audio chime
          if (config.enableSound) {
            playChimeAlert("gentle");
          }

          // Trigger native Web Browser Notification
          if (config.enableBrowserNotifications && Notification.permission === "granted") {
            try {
              new Notification(`MediTrack - Intake Reminder`, {
                body: `It's time to take your ${med.dosage} of ${med.name}. Instructions: ${med.instructions}`,
                icon: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=128&q=80",
                requireInteraction: true
              });
            } catch (err) {
              console.warn("Unable to trigger desktop notification in sandbox iframe:", err);
            }
          }
        }
      });
    };

    const interval = setInterval(checkSchedules, 5000);
    // run initial check
    checkSchedules();

    return () => clearInterval(interval);
  }, [medicines, config]);

  const handleDismissAlert = (alertId: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleTakeAndDismiss = (alert: ActiveNotification) => {
    onMarkIntake(alert.medicine.id, alert.time, "taken");
    handleDismissAlert(alert.id);
  };

  return (
    <div className="space-y-4">
      {/* Real-time active alerts banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-amber-500 text-white rounded-2xl p-5 shadow-lg border border-amber-400 flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce"
            >
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-white/20 p-3 rounded-xl shrink-0">
                  <Bell className="w-6 h-6 text-white animate-swing" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-md">
                    ⏰ DUE NOW: {alert.time}
                  </span>
                  <h3 className="text-lg font-bold mt-1">
                    Take your dosage: {alert.medicine.name}
                  </h3>
                  <p className="text-sm text-amber-50 opacity-90 mt-0.5">
                    {alert.medicine.dosage} • {alert.medicine.instructions}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto">
                <button
                  onClick={() => handleTakeAndDismiss(alert)}
                  className="flex-1 md:flex-initial px-5 py-2.5 bg-white text-amber-600 font-bold text-sm rounded-xl shadow-sm hover:bg-amber-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-600 stroke-[3]" /> Log Intake
                </button>
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Module */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-indigo-600" /> Reminder Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Set up real-time audio notifications and push alerts for your scheduled drugs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sounds Toggle */}
          <button
            onClick={() => saveConfig({ ...config, enableSound: !config.enableSound })}
            className={`p-2 px-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
              config.enableSound
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-600" /> Sound Chimes
          </button>

          {/* Native Browser Push Alerts Toggle */}
          {permission === "granted" ? (
            <span className="p-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Native Push: Active
            </span>
          ) : (
            <button
              onClick={requestNotificationPermission}
              className="p-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-100 transition cursor-pointer"
            >
              <Bell className="w-4 h-4" /> Enable Native Alerts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
