// AdminDashboard.tsx — WardWatch v2 | Upgraded System
// ─────────────────────────────────────────────────────
// UI layout, CSS classes, and animations are UNCHANGED.
// New in v2:
//   • Admission Queue + Discharge Queue with timestamps
//   • Intelligent condition-based simulation (no pure randomness)
//   • Manual control buttons for demo
//   • Enhanced AI Insight Engine (multi-factor explanations)
//   • Enhanced Recommendation Engine (actionable, queue-aware)
//   • Improved Activity Log with categories
//   • Fully integrated AI Copilot (queue-aware)

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bell,
  AlertTriangle,
  Home,
  Users,
  LogOut,
  Search,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader,
  ChevronRight,
  ChevronDown,
  Calendar,
  Stethoscope,
  Heart,
  PlayCircle,
  UserPlus,
  UserMinus,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Animation Variants (unchanged) ───────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type RiskLevel     = "low" | "medium" | "high" | "critical";
type AlertSeverity = "low" | "medium" | "high" | "critical";
type AlertType     = "occupancy" | "cleaning" | "discharge" | "system" | "queue";
type BedStatus     = "occupied" | "available" | "cleaning";
type PatientStatus = "stable" | "critical" | "improving" | "monitoring" | "pre-discharge";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F";
  disease: string;
  admissionDate: string;       // "YYYY-MM-DD"
  predictedDischarge: string;  // "YYYY-MM-DD"
  status: PatientStatus;
  notes: string;
  daysAdmitted: number;
  daysRemaining: number;
}

interface Bed {
  bedNumber: string;
  status: BedStatus;
  patient: Patient | null;
}

interface Ward {
  id: string;
  name: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  cleaning: number;
  occupancy: number;
  riskLevel: RiskLevel;
  cleaningStartTime: number | null;
  lastAdmissionTime: number | null;
  beds: Bed[];
}

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  resolved: boolean;
  timestamp: number;
}

interface LogEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: number;
}

interface ChartPoint {
  time: string;
  occupancy: number;
}

// ─── NEW: Queue entry types ────────────────────────────────────────────────────
interface QueuedPatient {
  patient: Patient;
  wardId: string;
  wardName: string;
  queuedAt: number;
  priority: "urgent" | "normal";
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
}

interface DischargeQueueEntry {
  patient: Patient;
  wardId: string;
  wardName: string;
  bedNumber: string;
  queuedAt: number;

  testsPending: boolean;
  billingPending: boolean;
  approvalPending: boolean;
}

// ─── NEW: What-If Simulation Result ───────────────────────────────────────────
interface WhatIfResult {
  scenario: string;
  predictedOccupancy: number;
  status: "safe" | "warning" | "critical";
  availableBedsAfter: number;
  dischargesNeeded: number;
  bedsFromCleaning: number;
  explanation: string;
}

// ─── Static Data Pools ────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Aarav","Priya","Rohan","Sneha","Vikram","Ananya","Arjun","Kavya",
  "Ishaan","Divya","Kiran","Pooja","Ravi","Meera","Siddharth","Nisha",
  "Rahul","Sunita","Aditya","Lakshmi","Manish","Rekha","Suresh","Geeta",
  "Deepak","Shweta","Nikhil","Radha","Vivek","Anjali",
];

const LAST_NAMES = [
  "Sharma","Verma","Patel","Gupta","Singh","Kumar","Mehta","Joshi",
  "Rao","Nair","Iyer","Reddy","Shah","Malhotra","Chopra","Bose",
  "Das","Mishra","Tiwari","Pillai",
];

const DISEASES_BY_WARD: Record<string, string[]> = {
  "General Ward A": [
    "Viral Fever","Typhoid","Pneumonia","UTI","Gastroenteritis",
    "Dengue","Malaria","Anaemia","Hypertension","Diabetes Complications",
  ],
  "ICU": [
    "Acute MI","Septic Shock","Respiratory Failure","Multi-organ Failure",
    "Severe TBI","Post-operative Care","Severe Pneumonia","Cardiogenic Shock",
  ],
  "Pediatrics": [
    "Neonatal Jaundice","Bronchiolitis","Kawasaki Disease","Febrile Seizures",
    "Rotavirus Infection","RSV","Tonsillitis","Chickenpox",
  ],
  "Maternity": [
    "Ante-natal Monitoring","Gestational Diabetes","Pre-eclampsia",
    "Post-partum Care","C-section Recovery","Placenta Previa",
  ],
  "Orthopaedics": [
    "Hip Replacement","Knee Arthroplasty","Spinal Fracture","Femur Fracture",
    "Tibial Fracture","Shoulder Dislocation","ACL Repair","Scoliosis",
  ],
  "Cardiology": [
    "Unstable Angina","Heart Failure","Atrial Fibrillation","Arrhythmia",
    "Hypertensive Crisis","Aortic Stenosis","STEMI Recovery","Pericarditis",
  ],
};

const PATIENT_STATUSES: PatientStatus[] = [
  "stable","critical","improving","monitoring","pre-discharge",
];

const STATUS_NOTES: Record<PatientStatus, string[]> = {
  stable:          ["Vitals normal, comfortable.","Responding well to medication.","Steady overnight."],
  critical:        ["Requires continuous monitoring.","IV antibiotics ongoing.","ICU-level support."],
  improving:       ["Fever subsiding, appetite returning.","Pain reducing with treatment.","O₂ levels improving."],
  monitoring:      ["Under observation post-procedure.","Awaiting lab results.","Scheduled for review."],
  "pre-discharge": ["Cleared by physician.","Discharge papers in process.","Completing final dosage."],
};

// ─── Pure Helpers ─────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a realistic patient object for a named ward. */
function generatePatient(wardName: string): Patient {
  const today        = new Date();
  const daysAdmitted = Math.floor(Math.random() * 12) + 1;
  const stayLength   = daysAdmitted + Math.floor(Math.random() * 8) + 1;
  const admissionDate = addDays(today, -daysAdmitted);
  const predictedDischarge = addDays(today, stayLength - daysAdmitted);
  const daysRemaining = Math.max(0, daysBetween(today.toISOString().slice(0, 10), predictedDischarge));
  const diseases = DISEASES_BY_WARD[wardName] ?? DISEASES_BY_WARD["General Ward A"];
  const status   = pick(PATIENT_STATUSES);
  return {
    id: uid(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    age: Math.floor(Math.random() * 60) + 10,
    gender: Math.random() > 0.5 ? "M" : "F",
    disease: pick(diseases),
    admissionDate,
    predictedDischarge,
    status,
    notes: pick(STATUS_NOTES[status]),
    daysAdmitted,
    daysRemaining,
  };
}

function buildBeds(wardName: string, total: number, occupied: number, cleaning: number): Bed[] {
  const prefix = wardName.split(" ").map((w) => w[0]).join("").toUpperCase();
  return Array.from({ length: total }, (_, i) => {
    const bedNumber = `${prefix}-${String(i + 1).padStart(2, "0")}`;
    if (i < occupied)
      return { bedNumber, status: "occupied" as BedStatus, patient: generatePatient(wardName) };
    if (i < occupied + cleaning)
      return { bedNumber, status: "cleaning" as BedStatus, patient: null };
    return { bedNumber, status: "available" as BedStatus, patient: null };
  });
}

function recalcWardFromBeds(w: Ward): Ward {
  const occupiedBeds  = w.beds.filter((b) => b.status === "occupied").length;
  const cleaningBeds  = w.beds.filter((b) => b.status === "cleaning").length;
  const availableBeds = w.beds.filter((b) => b.status === "available").length;
  const occupancy     = Math.round((occupiedBeds / w.totalBeds) * 100);
  let riskLevel: RiskLevel = "low";
  if (occupancy >= 95) riskLevel = "critical";
  else if (occupancy >= 85) riskLevel = "high";
  else if (occupancy >= 70) riskLevel = "medium";
  return { ...w, occupiedBeds, availableBeds, cleaning: cleaningBeds, occupancy, riskLevel };
}

// ─── Initial Wards ────────────────────────────────────────────────────────────
function buildInitialWards(): Ward[] {
  const specs = [
    { id: "w1", name: "General Ward A", total: 30, occupied: 22, cleaning: 2 },
    { id: "w2", name: "ICU",            total: 12, occupied: 11, cleaning: 1 },
    { id: "w3", name: "Pediatrics",     total: 20, occupied: 10, cleaning: 1 },
    { id: "w4", name: "Maternity",      total: 16, occupied: 13, cleaning: 1 },
    { id: "w5", name: "Orthopaedics",   total: 18, occupied:  8, cleaning: 1 },
    { id: "w6", name: "Cardiology",     total: 14, occupied: 12, cleaning: 1 },
  ];
  return specs.map((s) => {
    const beds = buildBeds(s.name, s.total, s.occupied, s.cleaning);
    const ward: Ward = {
      id: s.id, name: s.name, totalBeds: s.total,
      occupiedBeds: s.occupied, availableBeds: s.total - s.occupied - s.cleaning,
      cleaning: s.cleaning, occupancy: 0, riskLevel: "low",
      cleaningStartTime:
        s.id === "w2" ? Date.now() - 35 * 60 * 1000 :
        s.id === "w6" ? Date.now() - 50 * 60 * 1000 : null,
      lastAdmissionTime: null,
      beds,
    };
    return recalcWardFromBeds(ward);
  });
}

// ─── AI Helpers ───────────────────────────────────────────────────────────────

/** Predict future occupancy based on time-of-day bias. */
function computePredictions(pct: number) {
  const bias = new Date().getHours() >= 8 && new Date().getHours() <= 18 ? 1.5 : 0.5;
  return {
    oneHour:    Math.min(99, Math.round(pct + bias * 1)),
    fourHours:  Math.min(99, Math.round(pct + bias * 3)),
    eightHours: Math.min(99, Math.round(pct + bias * 5)),
  };
}

/**
 * ENHANCED AI Insight Engine (v2)
 * Combines: occupancy %, cleaning backlogs, discharge queue, admission queue,
 * pre-discharge patients — into a multi-factor, human-readable explanation.
 */
function generateAIInsight(
  wards: Ward[],
  occ: number,
  admissionQueue: QueuedPatient[],
  dischargeQueue: DischargeQueueEntry[]
): string {
  const critical    = wards.filter((w) => w.riskLevel === "critical").map((w) => w.name);
  const high        = wards.filter((w) => w.riskLevel === "high").map((w) => w.name);
  const cleaningAll = wards.reduce((s, w) => s + w.cleaning, 0);
  const preDischarge = wards.reduce(
    (n, w) => n + w.beds.filter((b) => b.patient?.status === "pre-discharge").length, 0
  );
  const aqLen = admissionQueue.length;
  const dqLen = dischargeQueue.length;

  // Build factor list for explanation
  const factors: string[] = [];
  if (cleaningAll > 0) factors.push(`${cleaningAll} bed${cleaningAll > 1 ? "s" : ""} under cleaning`);
  if (preDischarge > 0) factors.push(`${preDischarge} patient${preDischarge > 1 ? "s" : ""} pending discharge`);
  if (dqLen > 0)        factors.push(`${dqLen} in the discharge queue`);
  if (aqLen > 0)        factors.push(`${aqLen} patient${aqLen > 1 ? "s" : ""} waiting for admission`);

  const factorStr = factors.length > 0 ? ` — caused by ${factors.join(", ")}` : "";

  if (critical.length > 0)
    return `⚠️ Critical pressure in ${critical.join(", ")} at ${occ}% overall occupancy${factorStr}. Activate surge protocol immediately.`;
  if (high.length > 0)
    return `📈 High occupancy in ${high.join(", ")} (${occ}% overall)${factorStr}. Initiate discharge planning and expedite cleaning.`;
  if (aqLen >= 5)
    return `🏥 Admission pressure detected: ${aqLen} patients queued for beds. ${factorStr || "Clear discharge queue to free capacity."}`;
  if (dqLen >= 3)
    return `🔄 ${dqLen} patients are discharge-ready but awaiting processing${factorStr}. Processing discharges will immediately free ${dqLen} bed${dqLen > 1 ? "s" : ""}.`;
  if (occ < 50)
    return `✅ Operating efficiently at ${occ}%. All wards within safe thresholds. ${aqLen > 0 ? `${aqLen} patient(s) in admission queue — capacity available.` : ""}`;
  return `📊 Moderate occupancy at ${occ}%${factorStr || ""}. Stable — monitor cleaning queues and discharge timelines.`;
}

/**
 * ENHANCED Recommendation Engine (v2)
 * Actionable, queue-aware, prioritized.
 */
function generateRecommendations(
  wards: Ward[],
  alerts: Alert[],
  admissionQueue: QueuedPatient[],
  dischargeQueue: DischargeQueueEntry[]
): string[] {
  const recs: string[] = [];
  const longClean = wards.filter((w) => w.cleaningStartTime && Date.now() - w.cleaningStartTime > 45 * 60 * 1000);
  const highOcc   = wards.filter((w) => w.occupancy >= 85);
  const noAvail   = wards.filter((w) => w.availableBeds === 0);
  const preDischargeCount = wards.reduce(
    (n, w) => n + w.beds.filter((b) => b.patient?.status === "pre-discharge").length, 0
  );
  const totalCleaning = wards.reduce((s, w) => s + w.cleaning, 0);

  // Queue-based recommendations (highest priority)
  if (dischargeQueue.length > 0)
    recs.push(`🔄 Process discharge queue now — ${dischargeQueue.length} patient${dischargeQueue.length > 1 ? "s" : ""} ready to leave, freeing ${dischargeQueue.length} bed${dischargeQueue.length > 1 ? "s" : ""} immediately.`);
  if (admissionQueue.length > 0 && noAvail.length === 0)
    recs.push(`🏥 ${admissionQueue.length} patient${admissionQueue.length > 1 ? "s" : ""} in admission queue — beds available, admit from queue now.`);
  if (admissionQueue.length > 5)
    recs.push(`⚠️ Admission queue pressure critical (${admissionQueue.length} waiting) — delay new non-urgent admissions temporarily.`);

  // Cleaning-based
  if (longClean.length > 0)
    recs.push(`🧹 Expedite cleaning in ${longClean.map((w) => w.name).join(", ")} — beds overdue (>45 min). Deploy housekeeping immediately.`);
  if (totalCleaning >= 4)
    recs.push(`🧹 Prioritize finishing cleaning of ${totalCleaning} beds — each cleaned bed can absorb queued admissions.`);

  // Occupancy-based
  if (highOcc.length > 0)
    recs.push(`📋 Initiate morning discharge reviews in ${highOcc.map((w) => w.name).join(", ")} to reduce high occupancy.`);
  if (noAvail.length > 0)
    recs.push(`🚨 ${noAvail.map((w) => w.name).join(", ")} have zero available beds — consider inter-ward transfers or surge protocol.`);

  // Pre-discharge patients
  if (preDischargeCount > 0)
    recs.push(`📝 ${preDischargeCount} patient${preDischargeCount > 1 ? "s" : ""} marked pre-discharge — finalise paperwork to release beds without delay.`);

  // Critical alert active
  if (alerts.filter((a) => !a.resolved && a.severity === "critical").length > 0)
    recs.push("🆘 Activate hospital surge protocol for critical wards immediately.");

  if (recs.length === 0)
    recs.push("✅ All wards operating within safe limits. Maintain standard protocols.");

  return recs.slice(0, 6);
}

/**
 * WHAT-IF SIMULATOR
 * Predicts system state if N new patients arrive.
 * Uses current beds, cleaning backlog, and discharge queue to compute realism.
 */
function simulatePatients(
  n: number,
  wards: Ward[],
  dischargeQueue: DischargeQueueEntry[]
): WhatIfResult {
  const totalBeds       = wards.reduce((s, w) => s + w.totalBeds, 0);
  const currentOccupied = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const currentAvail    = wards.reduce((s, w) => s + w.availableBeds, 0);
  const cleaningBeds    = wards.reduce((s, w) => s + w.cleaning, 0);

  // Beds that become available from cleaning backlog (assume 50% can be done quickly)
  const bedsFromCleaning = Math.floor(cleaningBeds * 0.5);
  // Beds freed by processing discharge queue
  const bedsFromDischarge = dischargeQueue.length;
  // Total capacity after optimisation
  const effectiveAvailable = currentAvail + bedsFromCleaning + bedsFromDischarge;
  // Net beds needed
  const remainingDemand = Math.max(0, n - effectiveAvailable);
  const newOccupied     = Math.min(totalBeds, currentOccupied + n);
  const predictedOccupancy = Math.round((newOccupied / totalBeds) * 100);
  const availableBedsAfter  = Math.max(0, totalBeds - newOccupied);
  const dischargesNeeded    = Math.max(0, remainingDemand);

  let status: WhatIfResult["status"] = "safe";
  if (predictedOccupancy >= 95) status = "critical";
  else if (predictedOccupancy >= 85) status = "warning";

  const parts: string[] = [];
  parts.push(`If ${n} patient${n !== 1 ? "s" : ""} arrive${n === 1 ? "s" : ""} now:`);
  parts.push(`${currentAvail} beds are immediately available.`);
  if (bedsFromCleaning > 0)
    parts.push(`${bedsFromCleaning} more can be freed by finishing cleaning.`);
  if (bedsFromDischarge > 0)
    parts.push(`${bedsFromDischarge} bed${bedsFromDischarge > 1 ? "s" : ""} available after processing discharge queue.`);
  if (dischargesNeeded > 0)
    parts.push(`Still ${dischargesNeeded} short — ${dischargesNeeded} emergency discharge${dischargesNeeded > 1 ? "s" : ""} needed.`);
  else
    parts.push(`System can absorb all ${n} patients with current/optimised capacity.`);

  return {
    scenario: `+${n} patients arriving`,
    predictedOccupancy,
    status,
    availableBedsAfter,
    dischargesNeeded,
    bedsFromCleaning,
    explanation: parts.join(" "),
  };
}

/**
 * INTELLIGENT COPILOT RESPONSE (v2)
 * Queue-aware, explains causes, uses simulatePatients for what-if queries.
 */
function getCopilotResponse(
  input: string,
  wards: Ward[],
  alerts: Alert[],
  admissionQueue: QueuedPatient[],
  dischargeQueue: DischargeQueueEntry[]
): string {
  const q      = input.toLowerCase();
  const total  = wards.reduce((s, w) => s + w.totalBeds, 0);
  const occ    = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const avail  = wards.reduce((s, w) => s + w.availableBeds, 0);
  const clean  = wards.reduce((s, w) => s + w.cleaning, 0);
  const occPct = Math.round((occ / total) * 100);
  const crit   = wards.filter((w) => w.riskLevel === "critical");
  const active = alerts.filter((a) => !a.resolved);
  const preD   = wards.reduce((n, w) => n + w.beds.filter((b) => b.patient?.status === "pre-discharge").length, 0);

  // What-if query: "what if 10 patients arrive"
  const whatIfMatch = q.match(/what\s+if\s+(\d+)/);
  if (whatIfMatch) {
    const n   = parseInt(whatIfMatch[1], 10);
    const sim = simulatePatients(n, wards, dischargeQueue);
    return `🔬 What-If: ${sim.explanation} Predicted occupancy: ${sim.predictedOccupancy}%. Status: ${sim.status.toUpperCase()}.`;
  }

  if (q.includes("queue") || q.includes("waiting"))
    return `📋 Admission queue: ${admissionQueue.length} patient${admissionQueue.length !== 1 ? "s" : ""} waiting. Discharge queue: ${dischargeQueue.length} patient${dischargeQueue.length !== 1 ? "s" : ""} ready to leave. Processing discharges would free ${dischargeQueue.length} bed${dischargeQueue.length !== 1 ? "s" : ""} immediately.`;

  if (q.includes("admission queue"))
    return `🏥 ${admissionQueue.length} patient${admissionQueue.length !== 1 ? "s" : ""} are in the admission queue. ${avail > 0 ? `${avail} beds available — use "Admit from Queue" to process.` : "No beds available — process discharges first."}`;

  if (q.includes("discharge queue"))
    return `🔄 ${dischargeQueue.length} patient${dischargeQueue.length !== 1 ? "s" : ""} in the discharge queue. Process them to free beds${dischargeQueue.length > 0 ? `: ${dischargeQueue.map((d) => d.patient.name).join(", ")}.` : "."}`;

  if (q.includes("occupancy") || q.includes("capacity"))
    return `Overall occupancy is ${occPct}% (${occ}/${total} beds). Cleaning: ${clean} beds. Discharge queue: ${dischargeQueue.length}. ${crit.length > 0 ? `Critical: ${crit.map((w) => w.name).join(", ")}.` : "All manageable."}`;

  if (q.includes("available") || q.includes("free bed"))
    return `${avail} available beds across all wards. ${dischargeQueue.length} more will open when discharge queue is processed. ${avail < 10 ? "Critically low — urgent action needed." : "Capacity manageable."}`;

  if (q.includes("clean"))
    return `${clean} bed${clean !== 1 ? "s" : ""} in cleaning. ${clean > 5 ? "Backlog is large — deploy additional housekeeping." : "Queue under control."}`;

  if (q.includes("alert") || q.includes("warning"))
    return `${active.length} active alert${active.length !== 1 ? "s" : ""}, ${active.filter((a) => a.severity === "critical").length} critical.`;

  if (q.includes("discharge") || q.includes("ready"))
    return `${preD} patient${preD !== 1 ? "s" : ""} are marked pre-discharge. ${dischargeQueue.length} are already in the discharge queue awaiting processing.`;

  if (q.includes("icu")) {
    const icu = wards.find((w) => w.name === "ICU");
    return icu ? `ICU: ${icu.occupiedBeds}/${icu.totalBeds} beds occupied (${icu.occupancy}%). ${icu.riskLevel === "critical" ? "⚠️ Critical — immediate review needed." : "Status manageable."}` : "ICU data unavailable.";
  }

  if (q.includes("recommend") || q.includes("suggest"))
    return generateRecommendations(wards, alerts, admissionQueue, dischargeQueue)[0] ?? "No immediate actions required.";

  if (q.includes("simulate") || q.includes("scenario")) {
    const sim = simulatePatients(10, wards, dischargeQueue);
    return `🔬 Default scenario (+10 patients): ${sim.explanation} Status: ${sim.status.toUpperCase()}.`;
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey"))
    return "Hello! I'm your WardWatch AI Copilot v2. Ask about occupancy, queues, discharge status, alerts, or try 'what if 10 patients arrive'.";

  return "Try asking: occupancy, available beds, admission queue, discharge queue, alerts, recommendations, or 'what if N patients arrive'.";
}

// ─── Status Config ─────────────────────────────────────────────────────────────
const PATIENT_STATUS_CONFIG: Record<PatientStatus, {
  color: string; bg: string; dot: string; label: string;
}> = {
  stable:          { color: "text-green-700",  bg: "bg-green-50  border-green-200",  dot: "bg-green-500",  label: "Stable" },
  critical:        { color: "text-red-700",    bg: "bg-red-50    border-red-200",    dot: "bg-red-500",    label: "Critical" },
  improving:       { color: "text-teal-700",   bg: "bg-teal-50   border-teal-200",   dot: "bg-teal-500",   label: "Improving" },
  monitoring:      { color: "text-blue-700",   bg: "bg-blue-50   border-blue-200",   dot: "bg-blue-500",   label: "Monitoring" },
  "pre-discharge": { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", dot: "bg-purple-500", label: "Pre-Discharge" },
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low:      "bg-green-100 text-green-700",
  medium:   "bg-amber-100 text-amber-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  low:      "bg-blue-50 text-blue-700 border-blue-200",
  medium:   "bg-amber-50 text-amber-700 border-amber-200",
  high:     "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT CARD — collapsible row showing one bed's patient info
// ═══════════════════════════════════════════════════════════════════════════════
function PatientCard({ bed }: { bed: Bed }) {
  const [expanded, setExpanded] = useState(false);

  if (bed.status === "available") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-200">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-green-700">Bed {bed.bedNumber}</p>
          <p className="text-xs text-green-600">Available — Ready for admission</p>
        </div>
      </div>
    );
  }

  if (bed.status === "cleaning") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Loader className="w-4 h-4 text-amber-600 animate-spin" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700">Bed {bed.bedNumber}</p>
          <p className="text-xs text-amber-600">Cleaning in progress…</p>
        </div>
      </div>
    );
  }

  const p   = bed.patient!;
  const cfg = PATIENT_STATUS_CONFIG[p.status];
  const overdue = p.daysRemaining === 0;

  return (
    <motion.div layout className={`rounded-2xl border ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:brightness-95 smooth-transition"
      >
        <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center flex-shrink-0 text-sm border border-white/60">
          {p.gender === "M" ? "👨" : "👩"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold truncate">{p.name}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{p.age}y · {p.gender}</span>
          </div>
          <p className="text-xs opacity-70 truncate">{p.disease}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="text-xs opacity-40 font-mono">{bed.bedNumber}</span>
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-2 border-t border-white/40">
              <div className="bg-white/60 rounded-xl p-2">
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Admitted
                </p>
                <p className="text-xs font-semibold">{formatDate(p.admissionDate)}</p>
                <p className="text-xs text-gray-400">{p.daysAdmitted} day{p.daysAdmitted !== 1 ? "s" : ""} ago</p>
              </div>
              <div className={`rounded-xl p-2 ${overdue ? "bg-red-100" : "bg-white/60"}`}>
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" /> Est. Discharge
                </p>
                <p className={`text-xs font-semibold ${overdue ? "text-red-600" : ""}`}>
                  {formatDate(p.predictedDischarge)}
                </p>
                <p className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                  {overdue ? "⚠️ Overdue" : `${p.daysRemaining} day${p.daysRemaining !== 1 ? "s" : ""} remaining`}
                </p>
              </div>
              <div className="bg-white/60 rounded-xl p-2">
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Diagnosis
                </p>
                <p className="text-xs font-semibold">{p.disease}</p>
              </div>
              <div className="bg-white/60 rounded-xl p-2">
                <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Status
                </p>
                <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
              </div>
              <div className="col-span-2 bg-white/60 rounded-xl p-2">
                <p className="text-xs text-gray-500 mb-0.5">Clinical Notes</p>
                <p className="text-xs text-gray-700">{p.notes}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARD DETAIL PANEL — full bed manifest + enhanced manual controls
// ═══════════════════════════════════════════════════════════════════════════════
function WardDetailPanel({
  ward,
  onAdmit,
  onDischarge,
  onStartCleaning,
  onFinishCleaning,
  onAddToAdmissionQueue,
  onMoveToDischargeQueue,
}: {
  ward: Ward;
  onAdmit: () => void;
  onDischarge: () => void;
  onStartCleaning: () => void;
  onFinishCleaning: () => void;
  onAddToAdmissionQueue: () => void;
  onMoveToDischargeQueue: () => void;
}) {
  const [bedFilter,     setBedFilter]     = useState<BedStatus | "all">("all");
  const [patientSearch, setPatientSearch] = useState("");

  const filtered = ward.beds.filter((b) => {
    if (bedFilter !== "all" && b.status !== bedFilter) return false;
    if (patientSearch) {
      const q = patientSearch.toLowerCase();
      return (
        b.bedNumber.toLowerCase().includes(q) ||
        (b.patient?.name.toLowerCase().includes(q) ?? false) ||
        (b.patient?.disease.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const preDischCount = ward.beds.filter((b) => b.patient?.status === "pre-discharge").length;
  const critCount     = ward.beds.filter((b) => b.patient?.status === "critical").length;
  const overdueCount  = ward.beds.filter((b) => b.patient && b.patient.daysRemaining === 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold">{ward.name}</h3>
          <p className="text-sm text-gray-500">{ward.occupiedBeds} / {ward.totalBeds} beds occupied</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${RISK_COLORS[ward.riskLevel]}`}>
          {ward.riskLevel}
        </span>
      </div>

      {/* Occupancy bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-3 rounded-full transition-all duration-700"
          style={{ width: `${ward.occupancy}%` }} />
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-5 gap-2 text-center">
        {[
          { label: "Occupied",      value: ward.occupiedBeds,  bg: "bg-blue-50",   text: "text-blue-600" },
          { label: "Available",     value: ward.availableBeds, bg: "bg-green-50",  text: "text-green-600" },
          { label: "Cleaning",      value: ward.cleaning,      bg: "bg-amber-50",  text: "text-amber-600" },
          { label: "Pre-Discharge", value: preDischCount,      bg: "bg-purple-50", text: "text-purple-600" },
          { label: "Critical",      value: critCount,          bg: "bg-red-50",    text: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-2`}>
            <p className={`text-lg font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {overdueCount} patient{overdueCount !== 1 ? "s" : ""} past predicted discharge date — review immediately.
          </p>
        </div>
      )}

      {/* ── Action Buttons (v2: expanded with queue controls) ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Direct Actions</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onAdmit} disabled={ward.availableBeds === 0}
            className="flex-1 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
            + Admit Patient
          </button>
          <button onClick={onDischarge} disabled={ward.occupiedBeds === 0}
            className="flex-1 px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-medium hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
            Discharge Patient
          </button>
          <button onClick={onStartCleaning} disabled={ward.availableBeds === 0}
            className="flex-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
            Start Cleaning
          </button>
          <button onClick={onFinishCleaning} disabled={ward.cleaning === 0}
            className="flex-1 px-3 py-2 rounded-xl bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
            Finish Cleaning ✓
          </button>
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">Queue Controls</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onAddToAdmissionQueue}
            className="flex-1 px-3 py-2 rounded-xl bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 smooth-transition">
            + Add to Admission Queue
          </button>
          <button onClick={onMoveToDischargeQueue} disabled={preDischCount === 0 && ward.occupiedBeds === 0}
            className="flex-1 px-3 py-2 rounded-xl bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
            → Move to Discharge Queue
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "occupied", "available", "cleaning"] as const).map((f) => (
          <button key={f} onClick={() => setBedFilter(f)}
            className={`px-3 py-1 rounded-xl text-xs font-medium smooth-transition capitalize ${
              bedFilter === f ? "bg-blue-500 text-white" : "bg-white/50 text-gray-600 hover:bg-white/70"
            }`}>
            {f === "all" ? `All (${ward.totalBeds})` : f}
          </button>
        ))}
        <div className="flex items-center gap-1 bg-white/50 rounded-xl px-3 py-1 border border-gray-200 flex-1 min-w-[160px]">
          <Search className="w-3 h-3 text-gray-400" />
          <input type="text" placeholder="Patient name / disease / bed…"
            value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
            className="bg-transparent outline-none text-xs w-full" />
        </div>
      </div>

      {/* Bed list */}
      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No beds match the filter.</p>
        )}
        {filtered.map((bed) => (
          <PatientCard key={bed.bedNumber} bed={bed} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHAT-IF SIMULATOR PANEL — full interactive panel for the simulator tab
// ═══════════════════════════════════════════════════════════════════════════════
function WhatIfPanel({
  wards,
  dischargeQueue,
}: {
  wards: Ward[];
  dischargeQueue: DischargeQueueEntry[];
}) {
  const [n, setN] = useState(10);
  const result = simulatePatients(n, wards, dischargeQueue);

  const statusColor =
    result.status === "critical" ? "border-red-400 bg-red-50" :
    result.status === "warning"  ? "border-amber-400 bg-amber-50" :
                                    "border-green-400 bg-green-50";
  const statusText =
    result.status === "critical" ? "text-red-700" :
    result.status === "warning"  ? "text-amber-700" :
                                    "text-green-700";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass rounded-3xl p-8 border border-white/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-purple-100">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold">What-If Simulator</h3>
            <p className="text-sm text-gray-500">Predict system behaviour under different admission loads</p>
          </div>
        </div>

        {/* Slider control */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-semibold text-gray-700">
            Number of patients arriving: <span className="text-blue-600 text-lg">{n}</span>
          </label>
          <input
            type="range" min={1} max={50} value={n} onChange={(e) => setN(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[5, 10, 15, 20, 30].map((preset) => (
            <button key={preset} onClick={() => setN(preset)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold smooth-transition ${
                n === preset ? "bg-blue-500 text-white" : "bg-white/50 text-gray-600 hover:bg-white/80"
              }`}>
              +{preset} patients
            </button>
          ))}
        </div>

        {/* Result card */}
        <div className={`rounded-3xl border-2 p-6 ${statusColor}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-lg font-bold ${statusText}`}>Scenario: {result.scenario}</h4>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusText} bg-white/60`}>
              {result.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Predicted Occupancy", value: `${result.predictedOccupancy}%`, color: statusText },
              { label: "Beds Available After", value: result.availableBedsAfter, color: "text-gray-700" },
              { label: "Beds from Cleaning",   value: result.bedsFromCleaning,   color: "text-amber-700" },
              { label: "Emergency Discharges", value: result.dischargesNeeded,   color: "text-red-700" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/70 rounded-2xl p-3 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Occupancy bar */}
          <div className="mb-3">
            <div className="w-full bg-white/50 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-700 ${
                  result.status === "critical" ? "bg-red-500" :
                  result.status === "warning"  ? "bg-amber-500" : "bg-green-500"
                }`}
                style={{ width: `${result.predictedOccupancy}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span><span>Safe &lt;85%</span><span>Warning &lt;95%</span><span>100%</span>
            </div>
          </div>

          <p className={`text-sm font-medium ${statusText}`}>{result.explanation}</p>
        </div>

        {/* Per-ward breakdown */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Ward Status</h4>
          <div className="space-y-2">
            {wards.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold">{w.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[w.riskLevel]}`}>
                      {w.occupancy}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-1.5 rounded-full"
                      style={{ width: `${w.occupancy}%` }} />
                  </div>
                </div>
                <div className="text-xs text-right">
                  <p className="text-green-600 font-semibold">{w.availableBeds} free</p>
                  <p className="text-amber-600">{w.cleaning} cleaning</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab,      setActiveTab]      = useState("overview");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);

  // ── Core State ─────────────────────────────────────────────────────────────
  const [wards,  setWards]  = useState<Ward[]>(() => buildInitialWards());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs,   setLogs]   = useState<LogEntry[]>([]);
  const [report, setReport] = useState<any>(null);

  // 👨‍⚕️ Staff Management
const [staff, setStaff] = useState([
  { id: uid(), name: "Dr. Sharma", role: "Doctor", ward: "ICU", shift: "Morning", status: "Active", patients: 5 },
  { id: uid(), name: "Dr. Mehta", role: "Doctor", ward: "Cardiology", shift: "Morning", status: "Busy", patients: 7 },
  { id: uid(), name: "Dr. Iyer", role: "Doctor", ward: "Orthopaedics", shift: "Evening", status: "Active", patients: 4 },
  { id: uid(), name: "Dr. Khan", role: "Doctor", ward: "General Ward A", shift: "Night", status: "Busy", patients: 6 },

  { id: uid(), name: "Nurse Priya", role: "Nurse", ward: "General Ward A", shift: "Evening", status: "Busy", patients: 8 },
  { id: uid(), name: "Nurse Kavita", role: "Nurse", ward: "ICU", shift: "Morning", status: "Active", patients: 3 },
  { id: uid(), name: "Nurse Anjali", role: "Nurse", ward: "Pediatrics", shift: "Night", status: "Busy", patients: 7 },
  { id: uid(), name: "Nurse Riya", role: "Nurse", ward: "Maternity", shift: "Morning", status: "Active", patients: 4 },

  { id: uid(), name: "Ward Boy Ramesh", role: "Support", ward: "ICU", shift: "Morning", status: "Active", patients: 0 },
  { id: uid(), name: "Ward Boy Suresh", role: "Support", ward: "Orthopaedics", shift: "Evening", status: "Inactive", patients: 0 },
]);

  // ── NEW: Queue State ───────────────────────────────────────────────────────
  const [admissionQueue,  setAdmissionQueue]  = useState<QueuedPatient[]>([]);
  const [dischargeQueue,  setDischargeQueue]  = useState<DischargeQueueEntry[]>([]);

  const [chartData, setChartData] = useState<ChartPoint[]>(() => {
    const now = Date.now();
    return Array.from({ length: 12 }, (_, i) => ({
      time: formatTime(now - (11 - i) * 5 * 60 * 1000),
      occupancy: 60 + Math.round(Math.random() * 20),
    }));
  });

  const [copilotInput,    setCopilotInput]    = useState("");
  const [copilotMessages, setCopilotMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! I'm WardWatch AI Copilot v2. Ask about occupancy, queues, discharge status, or try: 'what if 10 patients arrive'." },
  ]);

  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertGenRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep live refs to avoid stale closures in intervals
  const wardsRef         = useRef(wards);
  const admQueueRef      = useRef(admissionQueue);
  const dischQueueRef    = useRef(dischargeQueue);
  useEffect(() => { wardsRef.current = wards; },         [wards]);
  useEffect(() => { admQueueRef.current = admissionQueue; }, [admissionQueue]);
  useEffect(() => { dischQueueRef.current = dischargeQueue; }, [dischargeQueue]);

  if (!user) { navigate("/login"); return null; }
  const handleLogout = () => { logout(); navigate("/"); };

  // ── Derived Stats ──────────────────────────────────────────────────────────
  const totalBeds     = wards.reduce((s, w) => s + w.totalBeds, 0);
  const occupiedBeds  = wards.reduce((s, w) => s + w.occupiedBeds, 0);
  const availableBeds = wards.reduce((s, w) => s + w.availableBeds, 0);
  const cleaningBeds  = wards.reduce((s, w) => s + w.cleaning, 0);
  const overallOcc    = Math.round((occupiedBeds / totalBeds) * 100);

  const predictions     = computePredictions(overallOcc);
  const aiInsight       = generateAIInsight(wards, overallOcc, admissionQueue, dischargeQueue);
  const recommendations = generateRecommendations(wards, alerts, admissionQueue, dischargeQueue);

  const pieData = [
    { name: "Occupied",  value: occupiedBeds,  color: "#3B82F6" },
    { name: "Available", value: availableBeds, color: "#10B981" },
    { name: "Cleaning",  value: cleaningBeds,  color: "#F59E0B" },
  ];

  // ── Log & Alert helpers ────────────────────────────────────────────────────
  const addLog = (action: string, detail: string) =>
    setLogs((prev) => [{ id: uid(), action, detail, timestamp: Date.now() }, ...prev.slice(0, 199)]);

  const addAlert = (type: AlertType, title: string, message: string, severity: AlertSeverity) => {
    setAlerts((prev) => {
      if (prev.some((a) => !a.resolved && a.title === title)) return prev;
      return [{ id: uid(), type, title, message, severity, resolved: false, timestamp: Date.now() }, ...prev];
    });
    addLog("ALERT", `${severity.toUpperCase()}: ${title}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — Direct Ward Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /** Directly admit a new patient to an available bed in a ward. */
  const admitPatient = (wardId?: string) => {
    setWards((prev) => {
      const idx = wardId
        ? prev.findIndex((w) => w.id === wardId && w.availableBeds > 0)
        : prev.findIndex((w) => w.availableBeds > 0);
      if (idx === -1) return prev;
      const ward   = prev[idx];
      const bedIdx = ward.beds.findIndex((b) => b.status === "available");
      if (bedIdx === -1) return prev;
      const newPatient  = generatePatient(ward.name);
      const updatedBeds = ward.beds.map((b, i) =>
        i === bedIdx ? { ...b, status: "occupied" as BedStatus, patient: newPatient } : b
      );
      const updated = recalcWardFromBeds({ ...ward, beds: updatedBeds, lastAdmissionTime: Date.now() });
      addLog("ADMISSION", `✅ ${newPatient.name} admitted to ${ward.name} (Bed ${ward.beds[bedIdx].bedNumber}) — direct admission`);
      return prev.map((w, i) => (i === idx ? updated : w));
    });
  };

  /**
   * Discharge a patient directly (prefer pre-discharge patients).
   * After discharge, bed goes to "available" immediately (no cleaning step).
   */
  const dischargePatient = (wardId?: string) => {
    setWards((prev) => {
      const idx = wardId
        ? prev.findIndex((w) => w.id === wardId && w.occupiedBeds > 0)
        : prev.findIndex((w) => w.occupiedBeds > 0 && w.occupancy >= 70);
      if (idx === -1) return prev;
      const ward = prev[idx];
      const bedIdx =
        ward.beds.findIndex((b) => b.status === "occupied" && b.patient?.status === "pre-discharge") !== -1
          ? ward.beds.findIndex((b) => b.status === "occupied" && b.patient?.status === "pre-discharge")
          : ward.beds.findIndex((b) => b.status === "occupied");
      if (bedIdx === -1) return prev;
      const name = ward.beds[bedIdx].patient?.name ?? "Patient";
      const updatedBeds = ward.beds.map((b, i) =>
        i === bedIdx ? { ...b, status: "available" as BedStatus, patient: null } : b
      );
      const updated = recalcWardFromBeds({ ...ward, beds: updatedBeds });
      addLog("DISCHARGE", `🚪 ${name} discharged from ${ward.name} (Bed ${ward.beds[bedIdx].bedNumber})`);
      return prev.map((w, i) => (i === idx ? updated : w));
    });
  };

  const startCleaning = (wardId?: string) => {
    setWards((prev) => {
      const idx = wardId
        ? prev.findIndex((w) => w.id === wardId && w.availableBeds > 0)
        : prev.findIndex((w) => w.availableBeds > 0);
      if (idx === -1) return prev;
      const ward   = prev[idx];
      const bedIdx = ward.beds.findIndex((b) => b.status === "available");
      if (bedIdx === -1) return prev;
      const updatedBeds = ward.beds.map((b, i) =>
        i === bedIdx ? { ...b, status: "cleaning" as BedStatus, patient: null } : b
      );
      const updated = recalcWardFromBeds({ ...ward, beds: updatedBeds, cleaningStartTime: Date.now() });
      addLog("CLEANING", `🧹 Cleaning started in ${ward.name} (Bed ${ward.beds[bedIdx].bedNumber})`);
      return prev.map((w, i) => (i === idx ? updated : w));
    });
  };

  const finishCleaning = (wardId?: string) => {
    setWards((prev) => {
      const idx = wardId
        ? prev.findIndex((w) => w.id === wardId && w.cleaning > 0)
        : prev.findIndex((w) => w.cleaning > 0);
      if (idx === -1) return prev;
      const ward   = prev[idx];
      const bedIdx = ward.beds.findIndex((b) => b.status === "cleaning");
      if (bedIdx === -1) return prev;
      const updatedBeds = ward.beds.map((b, i) =>
        i === bedIdx ? { ...b, status: "available" as BedStatus } : b
      );
      const updated = recalcWardFromBeds({ ...ward, beds: updatedBeds, cleaningStartTime: null });
      addLog("CLEANING", `✅ Bed ${ward.beds[bedIdx].bedNumber} in ${ward.name} cleaned — now available`);
      setAlerts((a) =>
        a.map((al) => al.type === "cleaning" && al.title.includes(ward.name) ? { ...al, resolved: true } : al)
      );
      return prev.map((w, i) => (i === idx ? updated : w));
    });
  };

  const generateReport = () => {
  const reportData = {
    timestamp: new Date().toLocaleString(),

    totalBeds,
    occupiedBeds,
    availableBeds,
    cleaningBeds,

    admissionQueue: admissionQueue.length,
    dischargeQueue: dischargeQueue.length,

    alerts: alerts.filter((a) => !a.resolved).length,

    criticalWards: wards
      .filter((w) => w.riskLevel === "critical")
      .map((w) => w.name),

    staffOnDuty: staff.length,
  };

  setReport(reportData);
};

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEUE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a new patient to the admission queue for a ward.
   * Used when no beds are immediately available.
   * Priority: "urgent" if ward is near capacity, else "normal".
   */
  const addToAdmissionQueue = (wardId?: string) => {
  const targetWard =
    wardId
      ? wards.find((w) => w.id === wardId)
      : wards.find((w) => w.occupancy >= 85) ?? wards[0];

  if (!targetWard) return;

  const patient = generatePatient(targetWard.name);

  const symptomsPool = [
    "Fever", "Cough", "Chest Pain", "Breathing Difficulty",
    "Fatigue", "Vomiting", "Headache", "Dizziness"
  ];

  const severityLevels = ["mild", "moderate", "severe"] as const;
  const severity = severityLevels[Math.floor(Math.random() * 3)];

  const priority =
    severity === "severe" || targetWard.occupancy >= 85
      ? "urgent"
      : "normal";

  const entry: QueuedPatient = {
    patient,
    wardId: targetWard.id,
    wardName: targetWard.name,
    queuedAt: Date.now(),
    priority,

    // NEW DATA
    symptoms: Array.from({ length: 2 }, () =>
      symptomsPool[Math.floor(Math.random() * symptomsPool.length)]
    ),
    severity,
  };

  setAdmissionQueue((prev) => [...prev, entry]);

  addLog(
    "QUEUE",
    `🏥 ${patient.name} added to admission queue (${severity.toUpperCase()})`
  );
};
  /**
   * Admit the next patient from the admission queue into a ward with an available bed.
   * Prioritises urgent queue entries first.
   */
  const admitFromQueue = (wardId?: string) => {
    if (admissionQueue.length === 0) return;
    setWards((prev) => {
      // Find ward with available bed
      const wardIdx = wardId
        ? prev.findIndex((w) => w.id === wardId && w.availableBeds > 0)
        : prev.findIndex((w) => w.availableBeds > 0);
      if (wardIdx === -1) {
        addLog("QUEUE", "⚠️ Cannot admit from queue — no available beds in any ward.");
        return prev;
      }
      const ward   = prev[wardIdx];
      const bedIdx = ward.beds.findIndex((b) => b.status === "available");
      if (bedIdx === -1) return prev;

      // Pick next patient from queue: urgent first
      const urgentIdx = admissionQueue.findIndex((q) => q.priority === "urgent");
      const qIdx      = urgentIdx !== -1 ? urgentIdx : 0;
      const entry     = admissionQueue[qIdx];

      const updatedBeds = ward.beds.map((b, i) =>
        i === bedIdx ? { ...b, status: "occupied" as BedStatus, patient: entry.patient } : b
      );
      const updated = recalcWardFromBeds({ ...ward, beds: updatedBeds, lastAdmissionTime: Date.now() });

      setAdmissionQueue((q) => q.filter((_, i) => i !== qIdx));
      addLog(
        "ADMISSION",
        `✅ ${entry.patient.name} admitted from queue → ${ward.name} (Bed ${ward.beds[bedIdx].bedNumber}). Wait time: ${Math.round((Date.now() - entry.queuedAt) / 60000)}m`
      );
      return prev.map((w, i) => (i === wardIdx ? updated : w));
    });
  };

  /**
   * Move a patient from an occupied bed to the discharge queue.
   * Prefers pre-discharge patients. Bed is NOT freed until processDischarge().
   */
  const moveToDischargeQueue = (wardId?: string) => {
    setWards((prev) => {
      const idx = wardId
        ? prev.findIndex((w) => w.id === wardId && w.occupiedBeds > 0)
        : prev.findIndex((w) => w.occupiedBeds > 0);
      if (idx === -1) return prev;
      const ward = prev[idx];
      // Prefer pre-discharge patient
      const bedIdx =
        ward.beds.findIndex((b) => b.status === "occupied" && b.patient?.status === "pre-discharge") !== -1
          ? ward.beds.findIndex((b) => b.status === "occupied" && b.patient?.status === "pre-discharge")
          : ward.beds.findIndex((b) => b.status === "occupied");
      if (bedIdx === -1) return prev;
      const bed     = ward.beds[bedIdx];
      const patient = bed.patient!;

      const entry: DischargeQueueEntry = {
        patient,
        wardId: ward.id,
        wardName: ward.name,
        bedNumber: bed.bedNumber,
        queuedAt: Date.now(),

        // 🔥 CHECKLIST LOGIC
        testsPending: Math.random() > 0.5,
        billingPending: Math.random() > 0.5,
        approvalPending: Math.random() > 0.5,
      };
      setDischargeQueue((dq) => [...dq, entry]);
      addLog("QUEUE", `🔄 ${patient.name} moved to discharge queue from ${ward.name} (Bed ${bed.bedNumber})`);
      // Ward state unchanged — bed still "occupied" until processed
      return prev;
    });
  };

  /**
   * Process the discharge queue: actually discharge the next patient,
   * free the bed, and optionally admit from admission queue.
   */
  const processDischarge = () => {
    if (dischargeQueue.length === 0) return;
    const entry = dischargeQueue[0];
    setDischargeQueue((prev) => prev.slice(1));

    setWards((prev) => {
      const wardIdx = prev.findIndex((w) => w.id === entry.wardId);
      if (wardIdx === -1) return prev;
      const ward   = prev[wardIdx];
      const bedIdx = ward.beds.findIndex((b) => b.bedNumber === entry.bedNumber && b.status === "occupied");
      if (bedIdx === -1) {
        addLog("DISCHARGE", `⚠️ Bed ${entry.bedNumber} in ${entry.wardName} already freed — skipping.`);
        return prev;
      }
      const updatedBeds = ward.beds.map((b, i) =>
        i === bedIdx ? { ...b, status: "available" as BedStatus, patient: null } : b
      );
      const updated = recalcWardFromBeds({ ...ward, beds: updatedBeds });
      addLog(
        "DISCHARGE",
        `🚪 ${entry.patient.name} discharged from ${entry.wardName} (Bed ${entry.bedNumber}). Queue processed in ${Math.round((Date.now() - entry.queuedAt) / 60000)}m`
      );
      return prev.map((w, i) => (i === wardIdx ? updated : w));
    });
  };

  // ─── Alert generation ──────────────────────────────────────────────────────
  const generateAlerts = (currentWards: Ward[]) => {
    currentWards.forEach((ward) => {
      if (ward.occupancy >= 90)
        addAlert("occupancy", `Critical Occupancy: ${ward.name}`,
          `${ward.name} is at ${ward.occupancy}% (${ward.occupiedBeds}/${ward.totalBeds} beds).`,
          ward.occupancy >= 95 ? "critical" : "high");
      else if (ward.occupancy >= 80)
        addAlert("occupancy", `High Occupancy: ${ward.name}`,
          `${ward.name} reached ${ward.occupancy}%. Monitor closely.`, "medium");
      if (ward.cleaningStartTime && Date.now() - ward.cleaningStartTime > 45 * 60 * 1000)
        addAlert("cleaning", `Cleaning Delay: ${ward.name}`,
          `A bed in ${ward.name} has been cleaning >45 min.`, "medium");
      if (ward.availableBeds === 0 && ward.cleaning === 0)
        addAlert("discharge", `No Available Beds: ${ward.name}`,
          `${ward.name} has no available beds — consider emergency discharge review.`, "high");
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INTELLIGENT SIMULATION ENGINE (v2)
  //
  // Logic replaces Math.random() dice rolls with condition-based decisions:
  //   1. Occupancy > 90%  → prioritise discharge/queue processing
  //   2. Beds available   → admit from queue if patients waiting, else direct admit
  //   3. Cleaning backlog → finish cleaning to unlock beds
  //   4. Normal state     → balanced: admit / discharge / cleaning cycle
  // ═══════════════════════════════════════════════════════════════════════════
  const runSimulationStep = () => {
    const currentWards = wardsRef.current;
    const currentAQ    = admQueueRef.current;
    const currentDQ    = dischQueueRef.current;

    const totalOcc  = currentWards.reduce((s, w) => s + w.occupiedBeds, 0);
    const totalBeds = currentWards.reduce((s, w) => s + w.totalBeds, 0);
    const totalAvail  = currentWards.reduce((s, w) => s + w.availableBeds, 0);
    const totalClean  = currentWards.reduce((s, w) => s + w.cleaning, 0);
    const occPct    = Math.round((totalOcc / totalBeds) * 100);

    // ── Rule 1: Critical occupancy (>90%) → force discharge ──
    if (occPct >= 90) {
      if (currentDQ.length > 0) {
        processDischarge(); // Process discharge queue first
      } else {
        dischargePatient(); // Direct discharge
      }
      return;
    }

    // ── Rule 2: Admission queue has patients + beds available → admit from queue ──
    if (currentAQ.length > 0 && totalAvail > 0) {
      admitFromQueue();
      return;
    }

    // ── Rule 3: Large cleaning backlog → finish cleaning to unlock beds ──
    if (totalClean >= 3 && totalAvail < 5) {
      finishCleaning();
      return;
    }

    // ── Rule 4: Discharge queue pending → process it ──
    if (currentDQ.length >= 2) {
      processDischarge();
      return;
    }

    // ── Rule 5: Low occupancy (<60%) → admit new patients ──
    if (occPct < 60 && totalAvail > 0) {
      admitPatient();
      return;
    }

    // ── Rule 6: Moderate state — balanced cycle ──
    // Rotate through: admit → start cleaning → finish cleaning → add queue entry
    const tick = Math.floor(Date.now() / 8000) % 4;
    if (tick === 0 && totalAvail > 0)      admitPatient();
    else if (tick === 1 && totalAvail > 0) startCleaning();
    else if (tick === 2 && totalClean > 0) finishCleaning();
    else                                   addToAdmissionQueue(); // Build a queue naturally
  };

  // ── Intervals ──────────────────────────────────────────────────────────────
  useEffect(() => {
    simulationRef.current = setInterval(runSimulationStep, 8000);

    alertGenRef.current = setInterval(() => {
      setWards((current) => { generateAlerts(current); return current; });
    }, 15000);

    chartRef.current = setInterval(() => {
      setChartData((prev) => [
        ...prev.slice(-11),
        { time: formatTime(Date.now()), occupancy: overallOcc },
      ]);
    }, 30000);

    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
      if (alertGenRef.current)   clearInterval(alertGenRef.current);
      if (chartRef.current)      clearInterval(chartRef.current);
    };
  }, []);

  useEffect(() => { generateAlerts(wards); }, [wards]);

  // ── Copilot ────────────────────────────────────────────────────────────────
  const handleCopilotSend = () => {
    if (!copilotInput.trim()) return;
    const userMsg = copilotInput.trim();
    const aiReply = getCopilotResponse(userMsg, wards, alerts, admissionQueue, dischargeQueue);
    setCopilotMessages((prev) => [...prev, { role: "user", text: userMsg }, { role: "ai", text: aiReply }]);
    setCopilotInput("");
    addLog("COPILOT", `💬 Query: "${userMsg}"`);
  };

  const filteredWards = wards.filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedWard  = wards.find((w) => w.id === selectedWardId) ?? null;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">

      {/* ── Sidebar ── */}
      <motion.div initial={{ x: -300 }} animate={{ x: 0 }}
        className="fixed left-0 top-0 w-64 h-screen glass border-r border-white/40 z-40 overflow-y-auto">
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              WardWatch
            </span>
          </div>
          <p className="text-xs text-gray-600">Admin Control Tower</p>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { id: "overview",  label: "Dashboard",         icon: Home },
            { id: "wards",     label: "Wards",             icon: Building },
            { id: "admissions", label: "Admissions Queue",  icon: UserPlus },
            { id: "discharges", label: "Discharges Queue",  icon: UserMinus },
            { id: "staff",     label: "Staff Management",  icon: Users },
            { id: "simulator", label: "What-If Simulator", icon: TrendingUp },
            { id: "reports",   label: "Reports",           icon: FileText },
            { id: "activity",  label: "Activity Logs",     icon: Clock },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.button key={item.id} whileHover={{ x: 5 }} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl smooth-transition ${
                  activeTab === item.id ? "bg-blue-500 text-white" : "hover:bg-white/20 text-gray-700"
                }`}>
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-xs text-gray-600 capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 smooth-transition text-sm font-medium">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </motion.div>

      {/* ── Main ── */}
      <div className="ml-64 min-h-screen">

        {/* Top Bar */}
        <motion.div initial={{ y: -100 }} animate={{ y: 0 }}
          className="sticky top-0 z-30 glass border-b border-white/40 backdrop-blur-md">
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              {activeTab === "overview"  && "Dashboard"}
              {activeTab === "wards"     && "Wards Management"}
              {activeTab === "admissions" && "Admissions"}
              {activeTab === "discharges" && "Discharges"}
              {activeTab === "wards"     && "Wards Management"}
              {activeTab === "staff"     && "Staff Management"}
              {activeTab === "simulator" && "What-If Simulator"}
              {activeTab === "reports"   && "Reports"}
              {activeTab === "activity"  && "Activity Logs"}
            </h1>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/50 rounded-2xl px-4 py-2 border border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search wards, patients…"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-sm w-64" />
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                className="relative p-3 rounded-2xl hover:bg-white/30 smooth-transition">
                <Bell className="w-6 h-6" />
                {alerts.filter((a) => !a.resolved).length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB                                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

              {/* KPI Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { label: "Total Beds", value: totalBeds,     subtext: "All wards",              icon: Activity,    color: "blue" },
                  { label: "Occupied",   value: occupiedBeds,  subtext: `${overallOcc}% capacity`, icon: Users,       color: "teal" },
                  { label: "Available",  value: availableBeds, subtext: "Ready for admission",     icon: CheckCircle2, color: "green" },
                  { label: "Cleaning",   value: cleaningBeds,  subtext: "In progress",            icon: Loader,      color: "amber" },
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <motion.div key={idx} variants={itemVariants} whileHover={{ y: -5 }}
                      className="glass rounded-3xl p-6 border border-white/40 hover:border-white/60 smooth-transition group">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl bg-${kpi.color}-100 group-hover:scale-110 smooth-transition`}>
                          <Icon className={`w-6 h-6 text-${kpi.color}-600`} />
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">{kpi.label}</p>
                      <p className="text-3xl font-bold mb-2">{kpi.value}</p>
                      <p className="text-xs text-gray-500">{kpi.subtext}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* ── NEW: Queue KPI Cards ── */}
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div variants={itemVariants} className="glass rounded-3xl p-5 border border-indigo-200 bg-indigo-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-100">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-indigo-800">Admission Queue</h3>
                    </div>
                    <span className="text-3xl font-bold text-indigo-600">{admissionQueue.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addToAdmissionQueue()}
                      className="flex-1 px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-medium hover:bg-indigo-600 smooth-transition">
                      + Add Patient
                    </button>
                    <button onClick={() => admitFromQueue()} disabled={admissionQueue.length === 0 || availableBeds === 0}
                      className="flex-1 px-3 py-1.5 bg-indigo-700 text-white rounded-xl text-xs font-medium hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
                      Admit Next →
                    </button>
                  </div>
                  {admissionQueue.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
                      {admissionQueue.slice(0, 4).map((q) => (
                        <div key={q.patient.id} className="flex items-center justify-between text-xs bg-white/60 rounded-lg px-2 py-1">
                          <span className="font-medium text-indigo-800 truncate">{q.patient.name}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${q.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                              {q.priority}
                            </span>
                            <span className="text-gray-400">{q.wardName.split(" ")[0]}</span>
                          </div>
                        </div>
                      ))}
                      {admissionQueue.length > 4 && (
                        <p className="text-xs text-indigo-400 text-center">+{admissionQueue.length - 4} more</p>
                      )}
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="glass rounded-3xl p-5 border border-purple-200 bg-purple-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-100">
                        <UserMinus className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-purple-800">Discharge Queue</h3>
                    </div>
                    <span className="text-3xl font-bold text-purple-600">{dischargeQueue.length}</span>
                  </div>
                  <p className="text-xs text-purple-600 mb-3">
                    {dischargeQueue.length === 0 ? "No patients awaiting discharge" :
                      `Processing will free ${dischargeQueue.length} bed${dischargeQueue.length > 1 ? "s" : ""} immediately`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => moveToDischargeQueue()}
                      className="flex-1 px-3 py-1.5 bg-purple-500 text-white rounded-xl text-xs font-medium hover:bg-purple-600 smooth-transition">
                      → Move Patient
                    </button>
                    <button onClick={processDischarge} disabled={dischargeQueue.length === 0}
                      className="flex-1 px-3 py-1.5 bg-purple-700 text-white rounded-xl text-xs font-medium hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
                      Process Next ✓
                    </button>
                  </div>
                  {dischargeQueue.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
                      {dischargeQueue.slice(0, 4).map((d) => (
                        <div key={d.patient.id} className="flex items-center justify-between text-xs bg-white/60 rounded-lg px-2 py-1">
                          <span className="font-medium text-purple-800 truncate">{d.patient.name}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-gray-500">{d.wardName.split(" ")[0]}</span>
                            <span className="text-gray-400">· {d.bedNumber}</span>
                          </div>
                        </div>
                      ))}
                      {dischargeQueue.length > 4 && (
                        <p className="text-xs text-purple-400 text-center">+{dischargeQueue.length - 4} more</p>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2 glass rounded-3xl p-6 border border-white/40">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold">Occupancy Trends</h3>
                    <div className="flex gap-2 mt-4 text-sm">
                      {[{ label: "1 Hour", time: "1h" }, { label: "4 Hours", time: "4h" }, { label: "8 Hours", time: "8h" }].map((item) => (
                        <button key={item.time} className="px-4 py-2 rounded-xl hover:bg-white/30 smooth-transition font-medium">
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Area type="monotone" dataKey="occupancy" stroke="#3B82F6" fillOpacity={1} fill="url(#colorOccupancy)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div variants={itemVariants} className="glass rounded-3xl p-6 border border-white/40">
                  <h3 className="text-xl font-semibold mb-6">Bed Status</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2 text-sm">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600">{item.name}:</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Predictions */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { time: "1 Hour",   value: predictions.oneHour },
                  { time: "4 Hours",  value: predictions.fourHours },
                  { time: "8 Hours",  value: predictions.eightHours },
                ].map((pred, idx) => (
                  <motion.div key={idx} variants={itemVariants} className="glass rounded-3xl p-6 border border-white/40">
                    <p className="text-gray-600 text-sm mb-2">Predicted Occupancy in {pred.time}</p>
                    <p className="text-4xl font-bold text-blue-600 mb-2">{pred.value}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full"
                        style={{ width: `${pred.value}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* AI Insight (v2 — multi-factor) */}
              <motion.div variants={itemVariants} className="glass rounded-3xl p-8 border border-blue-200 bg-blue-50/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-blue-200">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">AI Insight <span className="text-xs font-normal text-blue-400 ml-1">v2 · multi-factor</span></h3>
                    <p className="text-gray-700 leading-relaxed">{aiInsight}</p>
                  </div>
                </div>
              </motion.div>

              {/* Recommendations & Alerts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants} className="glass rounded-3xl p-6 border border-white/40">
                  <h3 className="text-xl font-semibold mb-4">Recommendations <span className="text-xs font-normal text-gray-400">queue-aware</span></h3>
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 hover:bg-white/70 smooth-transition">
                        <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700 text-sm">{rec}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass rounded-3xl p-6 border border-white/40">
                  <h3 className="text-xl font-semibold mb-4">
                    Active Alerts <span className="text-sm font-normal text-gray-500">({alerts.filter((a) => !a.resolved).length})</span>
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {alerts.filter((a) => !a.resolved).length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-8">No active alerts — system healthy ✅</p>
                    )}
                    {alerts.filter((a) => !a.resolved).map((alert, idx) => (
                      <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                        className={`p-4 rounded-2xl border-2 ${SEVERITY_COLORS[alert.severity]}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="font-semibold">{alert.title}</p>
                          </div>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/10">
                            {alert.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm opacity-90">{alert.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-60">{formatTime(alert.timestamp)}</p>
                          <button
                            onClick={() => setAlerts((a) => a.map((al) => al.id === alert.id ? { ...al, resolved: true } : al))}
                            className="text-xs opacity-60 hover:opacity-100 underline smooth-transition">
                            Resolve
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Ward Overview Cards */}
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-2xl font-bold">Ward Overview</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(searchQuery ? filteredWards : wards).map((ward) => (
                    <motion.div key={ward.id} whileHover={{ y: -5 }}
                      onClick={() => { setActiveTab("wards"); setSelectedWardId(ward.id); }}
                      className="glass rounded-3xl p-6 border border-white/40 hover:border-blue-300 smooth-transition group cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-600">{ward.name}</p>
                          <p className="text-2xl font-bold">{ward.occupiedBeds}</p>
                          <p className="text-xs text-gray-500">of {ward.totalBeds} beds</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${RISK_COLORS[ward.riskLevel]}`}>
                          {ward.riskLevel}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${ward.occupancy}%` }} />
                      </div>
                      <p className="text-sm text-gray-600">{ward.occupancy}% Occupancy</p>
                      <p className="text-xs text-blue-500 mt-1 flex items-center gap-1 font-medium">
                        View patients <ChevronRight className="w-3 h-3" />
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* AI Copilot */}
              <motion.div variants={itemVariants} className="glass rounded-3xl p-6 border border-white/40">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold">AI Copilot</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Online · Queue-Aware</span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                  {copilotMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        msg.role === "user" ? "bg-blue-500 text-white rounded-br-md" : "bg-white/70 text-gray-700 rounded-bl-md border border-gray-200"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCopilotSend()}
                    placeholder="Ask about occupancy, queues, 'what if 10 patients arrive'…"
                    className="flex-1 bg-white/50 border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none focus:border-blue-300" />
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopilotSend}
                    className="px-4 py-2 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 smooth-transition">
                    Send
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* WARDS TAB — per-bed patient detail with enhanced controls     */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "wards" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {selectedWard ? (
                <div className="space-y-4">
                  <button onClick={() => setSelectedWardId(null)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium smooth-transition">
                    ← Back to all wards
                  </button>
                  <div className="glass rounded-3xl p-6 border border-white/40">
                    <WardDetailPanel
                      ward={selectedWard}
                      onAdmit={()                  => admitPatient(selectedWard.id)}
                      onDischarge={()              => dischargePatient(selectedWard.id)}
                      onStartCleaning={()          => startCleaning(selectedWard.id)}
                      onFinishCleaning={()         => finishCleaning(selectedWard.id)}
                      onAddToAdmissionQueue={()    => addToAdmissionQueue(selectedWard.id)}
                      onMoveToDischargeQueue={()   => moveToDischargeQueue(selectedWard.id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Click a ward to see per-bed patient details and controls.</p>
                  <div className="grid md:grid-cols-2 gap-6">
                    {wards.map((ward) => {
                      const preDisch = ward.beds.filter((b) => b.patient?.status === "pre-discharge").length;
                      const crit     = ward.beds.filter((b) => b.patient?.status === "critical").length;
                      return (
                        <motion.div key={ward.id} whileHover={{ y: -3 }}
                          onClick={() => setSelectedWardId(ward.id)}
                          className="glass rounded-3xl p-6 border border-white/40 hover:border-blue-300 cursor-pointer smooth-transition group">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold group-hover:text-blue-600 smooth-transition">{ward.name}</h3>
                              <p className="text-sm text-gray-500">{ward.occupiedBeds} / {ward.totalBeds} beds occupied</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${RISK_COLORS[ward.riskLevel]}`}>
                              {ward.riskLevel}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                            <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-3 rounded-full transition-all duration-700"
                              style={{ width: `${ward.occupancy}%` }} />
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-center mb-4">
                            {[
                              { label: "Occupied",  value: ward.occupiedBeds,  bg: "bg-blue-50",   text: "text-blue-600" },
                              { label: "Available", value: ward.availableBeds, bg: "bg-green-50",  text: "text-green-600" },
                              { label: "Cleaning",  value: ward.cleaning,      bg: "bg-amber-50",  text: "text-amber-600" },
                              { label: "Pre-Disch", value: preDisch,           bg: "bg-purple-50", text: "text-purple-600" },
                              { label: "Critical",  value: crit,               bg: "bg-red-50",    text: "text-red-600" },
                            ].map((s) => (
                              <div key={s.label} className={`${s.bg} rounded-xl p-2`}>
                                <p className={`text-base font-bold ${s.text}`}>{s.value}</p>
                                <p className="text-xs text-gray-400">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-blue-500 flex items-center gap-1 font-medium">
                            View all {ward.totalBeds} beds & patients <ChevronRight className="w-3 h-3" />
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "admissions" && (
            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Admission Queue</h2>

              {admissionQueue.length === 0 ? (
                <p>No patients waiting</p>
              ) : (
                admissionQueue.map((q) => (
                  <div key={q.patient.id} className="p-4 bg-white rounded-xl shadow">
                    <p className="font-semibold">{q.patient.name}</p>
                    <p className="text-sm">{q.patient.disease}</p>
                    <p className="text-sm">Symptoms: {q.symptoms.join(", ")}</p>
                    <p className="text-sm">Severity: {q.severity}</p>
                    <p className="text-sm">Priority: {q.priority}</p>
                  </div>
                ))
              )}

              <button
                onClick={() => admitFromQueue()}
                className="bg-green-500 text-white px-4 py-2 rounded-xl"
              >
                Admit Next Patient
              </button>
            </div>
          )}

          {activeTab === "discharges" && (
            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Discharge Queue</h2>

              {dischargeQueue.length === 0 ? (
                <p>No patients ready for discharge</p>
              ) : (
                dischargeQueue.map((d) => {
                  const ready =
                    !d.testsPending &&
                    !d.billingPending &&
                    !d.approvalPending;

                  return (
                    <div key={d.patient.id} className="p-4 bg-white rounded-xl shadow">
                      <p className="font-semibold">{d.patient.name}</p>
                      <p className="text-sm">
                        {d.wardName} • Bed {d.bedNumber}
                      </p>

                      <p>🧪 Tests: {d.testsPending ? "Pending" : "Done"}</p>
                      <p>💳 Billing: {d.billingPending ? "Pending" : "Cleared"}</p>
                      <p>👨‍⚕️ Approval: {d.approvalPending ? "Pending" : "Approved"}</p>

                      <button
                        disabled={!ready}
                        onClick={() => processDischarge()}
                        className={`mt-2 px-3 py-1 rounded text-white ${
                          ready ? "bg-green-500" : "bg-gray-400"
                        }`}
                      >
                        Process Discharge
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* WHAT-IF SIMULATOR TAB (v2 — full panel)                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "simulator" && (
            <WhatIfPanel wards={wards} dischargeQueue={dischargeQueue} />
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ACTIVITY LOG TAB — structured, categorised, readable          */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === "activity" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="glass rounded-3xl p-6 border border-white/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">
                    Activity Log <span className="text-sm font-normal text-gray-500">({logs.length} entries)</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Admission
                    <span className="w-2 h-2 rounded-full bg-green-500 ml-1" /> Discharge
                    <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" /> Cleaning
                    <span className="w-2 h-2 rounded-full bg-indigo-500 ml-1" /> Queue
                    <span className="w-2 h-2 rounded-full bg-red-500 ml-1" /> Alert
                  </div>
                </div>
                {logs.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">No activity yet — simulation starting…</p>
                )}
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {logs.map((log) => {
                    const actionColors: Record<string, string> = {
                      ADMISSION: "bg-blue-100 text-blue-700",
                      DISCHARGE: "bg-green-100 text-green-700",
                      CLEANING:  "bg-amber-100 text-amber-700",
                      ALERT:     "bg-red-100 text-red-700",
                      COPILOT:   "bg-purple-100 text-purple-700",
                      QUEUE:     "bg-indigo-100 text-indigo-700",
                    };
                    return (
                      <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 hover:bg-white/70 smooth-transition">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold flex-shrink-0 mt-0.5 ${actionColors[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {log.action}
                        </span>
                        <p className="text-sm text-gray-700 flex-1">{log.detail}</p>
                        <p className="text-xs text-gray-400 flex-shrink-0">{formatTime(log.timestamp)}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Staff / Reports — coming soon */}
          {activeTab === "staff" && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* HEADER */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Staff Management</h2>

                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600">
                    + Add Staff
                  </button>
                  <button className="px-4 py-2 bg-white/50 border rounded-xl text-sm">
                    Reassign
                  </button>
                </div>
              </div>

              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass p-4 rounded-2xl">
                  <p className="text-sm text-gray-500">Total Staff</p>
                  <p className="text-2xl font-bold">{staff.length}</p>
                </div>

                <div className="glass p-4 rounded-2xl">
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {staff.filter(s => s.status === "Active").length}
                  </p>
                </div>

                <div className="glass p-4 rounded-2xl">
                  <p className="text-sm text-gray-500">Overloaded</p>
                  <p className="text-2xl font-bold text-red-600">
                    {staff.filter(s => s.patients > 6).length}
                  </p>
                </div>
              </div>

              {/* STAFF GRID */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {staff.map((s) => {
                  const overloaded = s.patients > 6;

                  return (
                    <motion.div
                      key={s.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.03 }}
                      className="glass p-5 rounded-3xl border border-white/40 shadow-md hover:shadow-xl transition"
                    >
                      {/* HEADER */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{s.name}</h3>
                          <p className="text-sm text-gray-500">{s.role}</p>
                        </div>

                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            s.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      {/* DETAILS */}
                      <div className="mt-4 space-y-1 text-sm">
                        <p>🏥 Ward: <span className="font-medium">{s.ward}</span></p>
                        <p>🕒 Shift: <span className="font-medium">{s.shift}</span></p>
                        <p>👥 Patients: <span className="font-medium">{s.patients}</span></p>
                      </div>

                      {/* WORKLOAD BAR */}
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 h-2 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              overloaded ? "bg-red-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(s.patients * 12, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* ALERT */}
                      {overloaded && (
                        <p className="text-red-500 text-xs mt-3 font-medium">
                          ⚠ Staff overloaded — reassign patients
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "reports" && (
            <div className="p-6 space-y-6">

              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Shift Report</h2>

                <button
                  onClick={() => generateReport()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl"
                >
                  Generate Report
                </button>
              </div>

              {!report ? (
                <p className="text-gray-500">No report generated</p>
              ) : (

                <div id="print-report" className="bg-white shadow-xl rounded-2xl p-8 max-w-3xl mx-auto">

                  {/* HEADER */}
                  <div className="text-center border-b pb-4 mb-6">
                    <h1 className="text-3xl font-bold">WardWatch</h1>
                    <p className="text-sm text-gray-500">
                      Hospital Shift Summary Report
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Generated: {report.timestamp}
                    </p>
                  </div>

                  {/* BED STATUS */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Bed Status</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Total Beds: {report.totalBeds}</p>
                      <p>Occupied Beds: {report.occupiedBeds}</p>
                      <p>Available Beds: {report.availableBeds}</p>
                      <p>Cleaning Beds: {report.cleaningBeds}</p>
                    </div>
                  </div>

                  {/* QUEUES */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Patient Flow</h2>
                    <div className="text-sm space-y-1">
                      <p>Admissions Waiting: {report.admissionQueue}</p>
                      <p>Discharges Pending: {report.dischargeQueue}</p>
                    </div>
                  </div>

                  {/* ALERTS */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Alerts</h2>
                    <p className="text-sm">
                      Active Alerts: {report.alerts}
                    </p>
                  </div>

                  {/* CRITICAL WARDS */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Critical Wards</h2>
                    {report.criticalWards.length === 0 ? (
                      <p className="text-sm">None</p>
                    ) : (
                      report.criticalWards.map((w: string) => (
                        <p key={w} className="text-sm text-red-600">⚠ {w}</p>
                      ))
                    )}
                  </div>

                  {/* STAFF */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Staff Status</h2>
                    <p className="text-sm">
                      Staff On Duty: {report.staffOnDuty}
                    </p>
                  </div>

                  {/* FOOTER */}
                  <div className="border-t pt-4 text-center text-xs text-gray-400">
                    WardWatch AI Hospital System • Confidential Report
                  </div>

                </div>
              )}

              {/* PRINT BUTTON */}
              {report && (
                <div className="text-center">
                  <button
                    onClick={() => window.print()}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl"
                  >
                    Print Report
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Inline Icons (unchanged) ─────────────────────────────────────────────────
function Building(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12v16H6z M10 4v16 M14 4v16 M6 10h12 M6 14h12" />
    </svg>
  );
}

function FileText(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M10 9h4 M10 13h4 M10 17h4" />
    </svg>
  );
}