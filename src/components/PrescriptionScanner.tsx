import React, { useState, useRef } from "react";
import { UploadCloud, Camera, Check, Sparkles, Loader2, RefreshCw, X, ShieldAlert } from "lucide-react";
import { Medicine } from "../types";
import { playChimeAlert } from "../utils/audio";
import { motion, AnimatePresence } from "motion/react";

interface PrescriptionScannerProps {
  onMedicinesExtracted: (medicines: Medicine[], clinicalDisclaimer: string) => void;
}

const PARSING_STEPS = [
  "Detecting camera exposure & resolution...",
  "Running optical OCR alignment...",
  "Translating handwritten medical terminology...",
  "Mapping intake frequency to chronologic times...",
  "Designing custom inventory limits & timelines..."
];

export default function PrescriptionScanner({ onMedicinesExtracted }: PrescriptionScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, or WEBP).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Live Webcam functions
  const startCamera = async () => {
    try {
      setError(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access front/back camera. Please upload an image instead.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSelectedImage(dataUrl);
        stopCamera();
      }
    }
  };

  // Submit image to Express backend for Gemini analysis
  const submitPrescription = async () => {
    if (!selectedImage) return;

    setIsParsing(true);
    setParsingStep(0);
    setError(null);

    // Simulate animated stepper updates
    let step = 0;
    stepIntervalRef.current = setInterval(() => {
      if (step < PARSING_STEPS.length - 1) {
        step += 1;
        setParsingStep(step);
      }
    }, 2800);

    try {
      const response = await fetch("/api/extract-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: selectedImage,
          mimeType: "image/jpeg"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || "Failed to process image.");
      }

      const data = await response.json();
      
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      
      // Map extracted prescription to local state with clean IDs and init stock
      if (data.medicines && Array.isArray(data.medicines)) {
        const mappedMedicines: Medicine[] = data.medicines.map((m: any, index: number) => ({
          id: `med-${Date.now()}-${index}`,
          name: m.name || "Unknown Medicine",
          dosage: m.dosage || "1 Unit",
          frequency: m.frequency || "Once daily",
          specificTimes: Array.isArray(m.specificTimes) && m.specificTimes.length > 0 ? m.specificTimes : ["09:00"],
          durationDays: Number(m.durationDays) || 10,
          totalQuantityToStart: Number(m.totalQuantityToStart) || 30,
          currentStock: Number(m.totalQuantityToStart) || 30,
          lowStockThreshold: Math.max(3, Math.ceil((Number(m.totalQuantityToStart) || 30) * 0.2)),
          instructions: m.instructions || "Eat after food",
          category: m.category || "General",
          createdAt: new Date().toISOString(),
          isActive: true,
          prescriptionImage: selectedImage
        }));

        playChimeAlert("success");
        onMedicinesExtracted(mappedMedicines, data.clinicalDisclaimer || "Please double-check generated frequencies with your prescribing practitioner.");
        setSelectedImage(null);
      } else {
        throw new Error("No medicines could be identified. Ensure handwriting or print is visible.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Internal server error connecting to prescription analyzer.");
      playChimeAlert("warning");
    } finally {
      setIsParsing(false);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl shadow-md border border-slate-850 p-6 relative overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block mb-1">Smart Clinic Sync</span>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            Extract Prescription
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload doctor's prescription sheets or take a live camera screenshot to map calendar timers instantly.
          </p>
        </div>
      </div>

      {isParsing ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="mb-6"
          >
            <RefreshCw className="w-12 h-12 text-indigo-400" />
          </motion.div>
          <h3 className="text-lg font-bold text-white animate-pulse">Running Clinical AI Extraction</h3>
          
          <div className="w-full max-w-sm mt-6 bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div 
              className="bg-indigo-500 h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((parsingStep + 1) / PARSING_STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={parsingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs text-slate-400 mt-3 font-mono"
            >
              Step {parsingStep + 1} of {PARSING_STEPS.length}: {PARSING_STEPS[parsingStep]}
            </motion.p>
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-950/50 border border-red-900 rounded-xl flex items-start gap-2 text-red-400 text-sm"
            >
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  onClick={captureFrame}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-sm shadow flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Snapshot
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold text-sm shadow flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : selectedImage ? (
            <div className="relative rounded-2xl border border-slate-880 overflow-hidden bg-slate-950 p-3">
              <img
                src={selectedImage}
                alt="Prescription preview"
                className="max-h-64 mx-auto object-contain rounded-lg"
              />
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={submitPrescription}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-950 flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Extract Medication Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  Re-upload
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                dragActive
                  ? "border-indigo-500 bg-indigo-950/40"
                  : "border-slate-800 hover:border-indigo-500 bg-slate-850/50 hover:bg-slate-850"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-sm font-bold text-slate-200">
                Drag & drop prescription paper or{" "}
                <span className="text-indigo-400 underline">browse computer</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP high-resolution scans</p>
              
              <div className="flex items-center gap-2 my-4 w-full justify-center">
                <span className="h-[1px] w-8 bg-slate-800"></span>
                <span className="text-xs text-slate-600 uppercase tracking-widest font-mono">or</span>
                <span className="h-[1px] w-8 bg-slate-800"></span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startCamera();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-indigo-400" /> Use Webcam / Document Camera
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Hidden canvas for video captures */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
