// DoctorDashboard.tsx — WardWatch v2 | Doctor View
// ──────────────────────────────────────────────────────────────────────────────
// Full layout: Sidebar + Top Header + Main Content + Footer
// Perfectly matches AdminDashboard design system (glass, tailwind, motion, icons)
// Features: AI Risk Scoring, Vitals Monitoring, AI Recommendations,
//           Auto Alert System, Actions Panel, Patient Timeline, Ward Overview

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import {
  Activity,
  Heart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Stethoscope,
  Zap,
  User,
  BedDouble,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Bell,
  Wind,
  Gauge,
  CalendarClock,
  LogOut,
  FileText,
  Search,
  Users,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";

// ─── Animation Variants (matches AdminDashboard exactly) ──────────────────────
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
type Severity  = "mild" | "moderate" | "severe";
type RiskLevel = "stable" | "moderate" | "critical";
type DoctorTab = "overview" | "patients" | "wards" | "alerts" | "reports";

interface Vitals {
  heartRate: number;
  oxygen: number;
  bp: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F";
  disease: string;
  severity: Severity;
  vitals: Vitals;
  admissionTime: string;
  status: string;
  notes?: string;
  daysAdmitted?: number;
}

interface Bed {
  bedNumber: string;
  status: "occupied" | "available" | "cleaning";
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
  riskLevel: string;
  beds: Bed[];
}

interface EnrichedPatient extends Patient {
  wardName: string;
  bedNumber: string;
  riskScore: number;
  riskLevel: RiskLevel;
}

interface TimelineEntry {
  time: string;
  event: string;
  type: "admission" | "change" | "alert" | "status";
}

interface SleepAssessmentResult {
  patientId: string;
  bed: string;
  currentStage: string;
  confidence: number;
  sleepEfficiency: number;
  n3Percent: number;
  remPercent: number;
  dischargeRecommendation: "approve" | "monitor" | "extend-stay";
  reason: string;
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface DoctorDashboardProps {
  doctorName?: string;
}

// ─── Reusable Card ─────────────────────────────────────────────────────────────
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`glass p-6 rounded-3xl border border-white/40 ${className}`}>
    {children}
  </div>
);

// ─── Risk Score Engine ─────────────────────────────────────────────────────────
function computeRisk(patient: Patient): { score: number; level: RiskLevel } {
  let score = 0;
  if (patient.vitals.oxygen < 92)     score += 2;
  if (patient.vitals.heartRate > 110) score += 2;
  if (patient.severity === "severe")  score += 2;
  const level: RiskLevel =
    score >= 4 ? "critical" : score >= 2 ? "moderate" : "stable";
  return { score, level };
}

// ─── AI Recommendation ────────────────────────────────────────────────────────
function getAIRecommendation(patient: EnrichedPatient): string {
  if (patient.riskLevel === "critical") {
    const reasons: string[] = [];
    if (patient.vitals.oxygen < 92)     reasons.push("critically low SpO₂");
    if (patient.vitals.heartRate > 110) reasons.push("tachycardia");
    if (patient.severity === "severe")  reasons.push("severe underlying condition");
    return `🚨 Immediate ICU attention required. Patient presents with ${reasons.join(", ")}. Escalate to on-call specialist and initiate emergency care protocol now.`;
  }
  if (patient.riskLevel === "moderate") {
    return `⚠️ Monitor closely. Vitals are borderline — reassess within 2 hours. Review current medication plan and adjust if no improvement is observed.`;
  }
  return `✅ Stable — condition is within safe parameters. Consider discharge planning if improvement holds for 24 hours. Continue current care plan.`;
}

// ─── Timeline Generator ───────────────────────────────────────────────────────
function generateTimeline(patient: EnrichedPatient): TimelineEntry[] {
  const admitTime = new Date(patient.admissionTime);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  const entries: TimelineEntry[] = [
    { time: fmt(admitTime), event: `Admitted to ${patient.wardName} — Bed ${patient.bedNumber}`, type: "admission" },
    { time: fmt(new Date(admitTime.getTime() + 30 * 60000)), event: "Initial vitals recorded by nursing staff", type: "change" },
    { time: fmt(new Date(admitTime.getTime() + 3 * 3600000)), event: `Diagnosis confirmed: ${patient.disease}`, type: "status" },
  ];

  if (patient.riskLevel !== "stable") {
    entries.push({
      time: fmt(new Date(admitTime.getTime() + 5 * 3600000)),
      event: "Elevated risk flagged — care plan updated by duty doctor",
      type: "alert",
    });
  }

  entries.push({
    time: fmt(new Date()),
    event: `Current status: ${patient.riskLevel.toUpperCase()} — under active monitoring`,
    type: "status",
  });

  return entries;
}

// ─── Risk Badge ────────────────────────────────────────────────────────────────
const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const cfg = {
    critical: "bg-red-100 text-red-700 border border-red-200",
    moderate: "bg-amber-100 text-amber-700 border border-amber-200",
    stable:   "bg-green-100 text-green-700 border border-green-200",
  }[level];
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
};

// ─── Vital Card ────────────────────────────────────────────────────────────────
const VitalCard = ({
  icon,
  label,
  value,
  unit,
  abnormal,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  abnormal?: boolean;
}) => (
  <div
    className={`rounded-2xl p-4 border flex flex-col gap-1 transition-all ${
      abnormal ? "bg-red-50 border-red-200" : "bg-white/30 border-white/40"
    }`}
  >
    <div className={`flex items-center gap-1.5 ${abnormal ? "text-red-500" : "text-gray-500"}`}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
      {abnormal && <AlertCircle className="w-3 h-3 ml-auto" />}
    </div>
    <p className={`text-2xl font-bold ${abnormal ? "text-red-600" : "text-gray-800"}`}>
      {value}
      <span className="text-sm font-normal ml-1 text-gray-400">{unit}</span>
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DoctorDashboard({
  doctorName = "Dr. Khan",
}: DoctorDashboardProps) {


const [activeWards, setActiveWards] = useState<Ward[]>([]);
const [loading, setLoading] = useState(true);
const [backendWardName, setBackendWardName] = useState("");
const [backendOccupiedBeds, setBackendOccupiedBeds] = useState(0);
const [backendAvailableBeds, setBackendAvailableBeds] = useState(0);
const [sleepAssessment, setSleepAssessment] = useState<SleepAssessmentResult | null>(null);
const [sleepLoading, setSleepLoading] = useState(false);
const [hasRunAssessment, setHasRunAssessment] = useState(false); // 🔥 important

      // ── Enrich all patients ────────────────────────────────────────────────────
  const allPatients: EnrichedPatient[] = activeWards
    .flatMap((ward) =>
      ward.beds
        .filter((bed) => bed.patient !== null)
        .map((bed) => {
          const { score, level } = computeRisk(bed.patient!);
          return {
            ...bed.patient!,
            wardName:  ward.name,
            bedNumber: bed.bedNumber,
            riskScore: score,
            riskLevel: level,
          };
        })
    )
    .sort((a, b) => b.riskScore - a.riskScore);

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState<DoctorTab>("patients");
  const [selectedPatient, setSelectedPatient] = useState<EnrichedPatient | null>(allPatients[0] ?? null);
  const [extendedStay,    setExtendedStay]    = useState<Set<string>>(new Set());
  const activePatients = allPatients;
  const [searchQuery,     setSearchQuery]     = useState("");
  const [activeFilter,    setActiveFilter]    = useState<RiskLevel | "all">("all");
  const [showAlertBell,   setShowAlertBell]   = useState(false);
  const [currentTime,     setCurrentTime]     = useState(new Date());

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
  const interval = setInterval(() => {
    setSelectedPatient((prev) => {
      if (!prev) return prev;

      const fluctuate = (val: number, range: number) =>
        Math.max(0, val + (Math.random() * range - range / 2));

      const [sys, dia] = prev.vitals.bp.split("/").map(Number);

      return {
        ...prev,
        vitals: {
          heartRate: Math.round(fluctuate(prev.vitals.heartRate, 5)),
          oxygen: Math.round(fluctuate(prev.vitals.oxygen, 2)),
          bp: `${Math.round(fluctuate(sys, 4))}/${Math.round(fluctuate(dia, 3))}`,
        },
      };
    });
  }, 2000);

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  setSleepAssessment(null);
  setHasRunAssessment(false);
}, [selectedPatient?.id]);


const generateMockSleepAssessment = (patient: EnrichedPatient): SleepAssessmentResult => {
  const disease = patient.disease.toLowerCase();
  const status = patient.status;

  if (status === "critical") {
    return {
      patientId: patient.id,
      bed: patient.bedNumber,
      currentStage: "N1",
      confidence: 0.91,
      sleepEfficiency: 58,
      n3Percent: 9,
      remPercent: 11,
      dischargeRecommendation: "extend-stay",
      reason: "Sleep recovery markers are poor. Low sleep efficiency and reduced restorative sleep suggest continued inpatient monitoring.",
    };
  }

  if (status === "monitoring" || disease.includes("cardiac") || disease.includes("pneumonia")) {
    return {
      patientId: patient.id,
      bed: patient.bedNumber,
      currentStage: "N2",
      confidence: 0.87,
      sleepEfficiency: 76,
      n3Percent: 18,
      remPercent: 21,
      dischargeRecommendation: "monitor",
      reason: "Sleep profile is moderately stable, but recovery markers are not yet strong enough for confident discharge.",
    };
  }

  return {
    patientId: patient.id,
    bed: patient.bedNumber,
    currentStage: "REM",
    confidence: 0.93,
    sleepEfficiency: 88,
    n3Percent: 22,
    remPercent: 24,
    dischargeRecommendation: "approve",
    reason: "Sleep efficiency and restorative sleep proportions are strong, supporting discharge review.",
  };
};


const mapBackendPatient = (p: any): Patient => ({
  id: p.id,
  name: p.name,
  age: p.age ?? 0,
  gender: p.gender === "F" ? "F" : "M",
  disease: p.disease ?? "Unknown",
  severity:
    p.severity === "mild"
      ? "mild"
      : p.severity === "severe"
      ? "severe"
      : "moderate",
  vitals: {
    heartRate: p.vitals?.heartRate ?? 90,
    oxygen: p.vitals?.oxygen ?? 98,
    bp: p.vitals?.bp ?? "120/80",
  },
  admissionTime: p.admissionTime ?? new Date().toISOString(),
  status: p.status ?? "monitoring",
  notes: p.notes ?? "",
  daysAdmitted: p.daysAdmitted ?? 0,
});

const handleRunSleepAssessment = async (patient: EnrichedPatient) => {
  try {
    setSleepLoading(true);
    setHasRunAssessment(true); // 👈 mark that button was clicked

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const result = generateMockSleepAssessment(patient);
    setSleepAssessment(result);

  } catch (err) {
    console.error("Failed to run sleep assessment", err);
  } finally {
    setSleepLoading(false);
  }
};

const refreshDoctorDashboard = async () => {
  try {
    setLoading(true);
    const data = await api.getDoctorDashboard(doctorName);

    const ward: Ward = {
      id: data.wardId || "doctor-ward",
      name: data.wardName,
      totalBeds: (data.occupiedBeds || 0) + (data.availableBeds || 0),
      occupiedBeds: data.occupiedBeds || 0,
      availableBeds: data.availableBeds || 0,
      cleaning: 0,
      occupancy:
        (data.occupiedBeds || 0) + (data.availableBeds || 0) > 0
          ? Math.round(
              ((data.occupiedBeds || 0) /
                ((data.occupiedBeds || 0) + (data.availableBeds || 0))) * 100
            )
          : 0,
      riskLevel: "medium",
      beds: (data.patients || []).map((p: any, idx: number) => ({
        bedNumber: p.bedNumber || `BED-${idx + 1}`,
        status: "occupied",
        patient: mapBackendPatient(p),
      })),
    };

    setBackendWardName(data.wardName || "");
    setBackendOccupiedBeds(data.occupiedBeds || 0);
    setBackendAvailableBeds(data.availableBeds || 0);
    setActiveWards([ward]);
  } catch (err) {
    console.error("Failed to load doctor dashboard", err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (!selectedPatient && allPatients.length > 0) {
    setSelectedPatient(allPatients[0]);
  }
}, [allPatients, selectedPatient]);

useEffect(() => {
  refreshDoctorDashboard();
  const id = setInterval(refreshDoctorDashboard, 3000);
  return () => clearInterval(id);
}, [doctorName]);

const ECGWave = ({
  heartRate,
  oxygen,
  riskLevel,
}: {
  heartRate: number;
  oxygen: number;
  riskLevel: string;
}) => {
  const [points, setPoints] = useState<number[]>(Array(120).fill(50));
  const phaseRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      phaseRef.current += heartRate / 600;

      const p = generateClinicalECG(
        phaseRef.current,
        heartRate,
        oxygen,
        riskLevel
      );

      setPoints((prev) => [...prev.slice(1), p]);
    }, 40);

    return () => clearInterval(interval);
  }, [heartRate, oxygen, riskLevel]);

  // ⚠️ Flatline condition
  if (riskLevel === "critical" && oxygen < 85) {
    return (
      <svg width="100%" height="80" viewBox="0 0 300 80">
        <line x1="0" y1="40" x2="300" y2="40" stroke="red" strokeWidth="2" />
        <text x="120" y="30" fill="red" fontSize="10">
          NO SIGNAL
        </text>
      </svg>
    );
  }

  return (
    <svg width="100%" height="80" viewBox="0 0 300 80">
      <polyline
        fill="none"
        stroke={riskLevel === "critical" ? "red" : "lime"}
        strokeWidth="2"
        style={{
          filter: `drop-shadow(0 0 6px ${
            riskLevel === "critical" ? "red" : "lime"
          })`,
        }}
        points={points.map((p, i) => `${i * 2.5},${p}`).join(" ")}
      />
    </svg>
  );
};

function generateClinicalECG(
  phase: number,
  hr: number,
  oxygen: number,
  risk: string
): number {
  let base = 40;

  const cycle = phase % 1;

  let signal = 0;

  // 🫀 P wave
  if (cycle < 0.1) {
    signal = Math.sin(cycle * Math.PI * 10) * 4;
  }

  // ⚡ QRS complex (sharp spike)
  else if (cycle < 0.15) {
    signal = -5;
  } else if (cycle < 0.17) {
    signal = 25;
  } else if (cycle < 0.2) {
    signal = -10;
  }

  // 🌊 T wave
  else if (cycle < 0.35) {
    signal = Math.sin((cycle - 0.2) * Math.PI * 5) * 6;
  }

  // ⚠️ Tachycardia → compressed waves
  if (hr > 110) {
    signal *= 1.2;
  }

  // 🧊 Bradycardia → slow weak waves
  if (hr < 60) {
    signal *= 0.6;
  }

  // 🌬 Low oxygen → noisy unstable ECG
  if (oxygen < 92) {
    signal += (Math.random() - 0.5) * 6;
  }

  // 🚨 Critical → chaotic rhythm
  if (risk === "critical" && oxygen < 90) {
    signal += (Math.random() - 0.5) * 10;
  }

  return base - signal;
}

function generateECGPoint(hr: number): number {
  const t = Date.now() / 100;

  // Normalize heart rate
  const speed = hr / 60;

  // Base waveform
  let signal = Math.sin(t * speed) * 5;

  // Add QRS spike (heartbeat)
  if (Math.random() < speed * 0.05) {
    signal += 25; // sharp spike
  }

  // Add small noise
  signal += (Math.random() - 0.5) * 2;

  return signal;
}

const navigate = useNavigate();

const handleLogout = () => {
  // optional: clear session
  localStorage.clear();

  // redirect to landing page
  navigate("/");
};

  // ── Derived ────────────────────────────────────────────────────────────────
  const criticalCount  = activePatients.filter((p) => p.riskLevel === "critical").length;
  const moderateCount  = activePatients.filter((p) => p.riskLevel === "moderate").length;
  const stableCount    = activePatients.filter((p) => p.riskLevel === "stable").length;

  const filteredPatients = activePatients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name.toLowerCase().includes(q) ||
       p.disease.toLowerCase().includes(q) ||
       p.wardName.toLowerCase().includes(q)) &&
      (activeFilter === "all" || p.riskLevel === activeFilter)
    );
  });

  const selected = selectedPatient ?? filteredPatients[0] ?? null;
  const aiSuggestion = selected ? getAIRecommendation(selected) : null;
  const timeline     = selected ? generateTimeline(selected) : [];

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApproveDischarge = async (patient: EnrichedPatient) => {
  try {
    await api.approveDischarge(patient.id);
    await refreshDoctorDashboard();
  } catch (err) {
    console.error("Failed to approve discharge", err);
  }
};

  const handleExtendStay = async (patient: EnrichedPatient) => {
  try {
    await api.extendStay(patient.id, `Stay extended for ${patient.name} by ${doctorName}`);
    setExtendedStay((prev) => new Set([...prev, patient.id]));
    await refreshDoctorDashboard();
  } catch (err) {
    console.error("Failed to extend stay", err);
  }
};

  const handleEmergencyAlert = async (patient: EnrichedPatient) => {
  try {
    await api.sendEmergencyAlert(
      patient.id,
      `Emergency triggered for ${patient.name} in ${patient.wardName}`
    );
    setShowAlertBell(true);
    setTimeout(() => setShowAlertBell(false), 3000);
    await refreshDoctorDashboard();
  } catch (err) {
    console.error("Failed to send emergency alert", err);
  }
};

  // ── Sidebar nav ────────────────────────────────────────────────────────────
  const navItems: { id: DoctorTab; label: string; icon: React.ElementType }[] = [
    { id: "overview",  label: "Overview",      icon: LayoutDashboard },
    { id: "patients",  label: "My Patients",   icon: Stethoscope },
    { id: "wards",     label: "Ward Overview", icon: BedDouble },
    { id: "alerts",    label: "Alerts",        icon: ShieldAlert },
    { id: "reports",   label: "Reports",       icon: FileText },
  ];

  const TAB_TITLES: Record<DoctorTab, string> = {
    overview: "Overview",
    patients: "My Patients",
    wards:    "Ward Overview",
    alerts:   "Alerts",
    reports:  "Clinical Reports",
  };

  if (loading && activeWards.length === 0) {
  return <div className="min-h-screen flex items-center justify-center">Loading Doctor Dashboard...</div>;
}
  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">

      {/* ════════════════════════════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="fixed left-0 top-0 w-64 h-screen glass border-r border-white/40 z-40 flex flex-col overflow-hidden"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/20 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              WardWatch
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Doctor Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 5 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium ${
                  isActive
                    ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                    : "hover:bg-white/40 text-gray-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.id === "alerts" && criticalCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                    {criticalCount}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-white/30 border border-white/40 shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Today's Summary</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-red-50 py-2">
              <p className="text-sm font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-red-400">Critical</p>
            </div>
            <div className="rounded-xl bg-amber-50 py-2">
              <p className="text-sm font-bold text-amber-600">{moderateCount}</p>
              <p className="text-xs text-amber-400">Moderate</p>
            </div>
            <div className="rounded-xl bg-green-50 py-2">
              <p className="text-sm font-bold text-green-600">{stableCount}</p>
              <p className="text-xs text-green-400">Stable</p>
            </div>
          </div>
        </div>

        {/* Profile + Logout */}
        <div className="p-4 border-t border-white/20 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {doctorName.replace("Dr. ", "").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{doctorName}</p>
              <p className="text-xs text-gray-500">Attending Physician</p>
            </div>
          </div>
          <button onClick={handleLogout}
  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-sm font-medium">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN AREA
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="ml-64 min-h-screen flex flex-col">

        {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          className="sticky top-0 z-30 glass border-b border-white/40 backdrop-blur-md"
        >
          {/* Main header row */}
          <div className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{TAB_TITLES[activeTab]}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                WardWatch · Doctor Portal ·{" "}
                {currentTime.toLocaleDateString("en-IN", {
                  weekday: "long", day: "2-digit", month: "long",
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Live clock */}
              <div className="hidden lg:flex items-center gap-2 glass px-4 py-2 rounded-2xl border border-white/40 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-blue-400" />
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit", minute: "2-digit", second: "2-digit",
                })}
              </div>

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-white/50 rounded-2xl px-4 py-2 border border-gray-200">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-sm w-44"
                />
              </div>

              {/* Alert Bell */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("alerts")}
                className="relative p-2.5 rounded-2xl hover:bg-white/30 transition-all"
              >
                <Bell className={`w-5 h-5 ${showAlertBell ? "text-red-500" : "text-gray-600"}`} />
                {criticalCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </motion.button>

              {/* Doctor chip */}
              <div className="flex items-center gap-2 glass px-3 py-2 rounded-2xl border border-white/40">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {doctorName.replace("Dr. ", "").charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden lg:block">{doctorName}</span>
              </div>
            </div>
          </div>

          {/* Sub-nav breadcrumb strip */}
          <div className="px-6 pb-3 flex items-center gap-1.5">
            {navItems.map((item, i) => (
              <span key={item.id} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`text-xs px-3 py-1 rounded-lg transition-all ${
                    activeTab === item.id
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "text-gray-400 hover:text-gray-600 hover:bg-white/40"
                  }`}
                >
                  {item.label}
                </button>
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── PAGE CONTENT ──────────────────────────────────────────────────── */}
        <div className="flex-1 p-6 space-y-6">
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <motion.div key="overview" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: "Critical Patients", value: criticalCount, icon: AlertTriangle, color: "red",   sub: "Requires immediate care",  filter: "critical" as const },
                    { label: "Moderate",           value: moderateCount, icon: Activity,      color: "amber", sub: "Under active monitoring",  filter: "moderate" as const },
                    { label: "Stable",             value: stableCount,   icon: CheckCircle2,  color: "green", sub: "Discharge eligible",       filter: "stable"   as const },
                  ].map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                      <motion.div
                        key={i}
                        variants={itemVariants}
                        whileHover={{ y: -4 }}
                        onClick={() => { setActiveFilter(kpi.filter); setActiveTab("patients"); }}
                        className="glass rounded-3xl p-6 border border-white/40 hover:border-white/60 transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-2xl bg-${kpi.color}-100 group-hover:scale-110 transition-all`}>
                            <Icon className={`w-6 h-6 text-${kpi.color}-600`} />
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 mt-1" />
                        </div>
                        <p className="text-gray-500 text-sm mb-1">{kpi.label}</p>
                        <p className="text-4xl font-bold mb-1">{kpi.value}</p>
                        <p className="text-xs text-gray-400">{kpi.sub}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* AI Insight banner */}
                <motion.div variants={itemVariants} className="glass rounded-3xl p-6 border border-blue-200 bg-blue-50/50">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-blue-200 shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">AI Clinical Overview</p>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        {criticalCount > 0
                          ? `⚠️ ${criticalCount} critical patient${criticalCount > 1 ? "s" : ""} require immediate intervention. Prioritise ICU escalation and alert on-call specialists.`
                          : moderateCount > 0
                          ? `📋 ${moderateCount} patient${moderateCount > 1 ? "s" : ""} under moderate risk. Schedule reassessment within 2 hours and review medication plans.`
                          : `✅ All ${stableCount} patients are stable. Consider discharge planning for patients improving over 24 hours.`}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Ward load */}
                <motion.div variants={itemVariants}>
                  <Card>
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
                      <BedDouble className="w-4 h-4 text-blue-500" />
                      Ward Patient Load
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {activeWards.map((ward) => {
                        const wPatients = activePatients.filter((p) => p.wardName === ward.name);
                        const wCrit     = wPatients.filter((p) => p.riskLevel === "critical").length;
                        return (
                          <button
                            key={ward.id}
                            onClick={() => setActiveTab("wards")}
                            className={`text-left rounded-2xl p-3 border transition-all hover:scale-[1.02] ${
                              wCrit > 0 ? "bg-red-50/60 border-red-100" : "bg-white/30 border-white/40"
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-700 truncate">{ward.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{wPatients.length} patients</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              {wCrit > 0 && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                  {wCrit} critical
                                </span>
                              )}
                              <div className="flex gap-1 ml-auto">
                                {wPatients.slice(0, 6).map((p) => (
                                  <span key={p.id} className={`w-2 h-2 rounded-full ${
                                    p.riskLevel === "critical" ? "bg-red-500"
                                    : p.riskLevel === "moderate" ? "bg-amber-400"
                                    : "bg-green-400"
                                  }`} />
                                ))}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>

                {/* Critical patient quick list */}
                {criticalCount > 0 && (
                  <motion.div variants={itemVariants}>
                    <Card className="border-red-200 bg-red-50/30">
                      <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4" />
                        Patients Requiring Immediate Attention
                      </h3>
                      <div className="space-y-2">
                        {activePatients
                          .filter((p) => p.riskLevel === "critical")
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => { setSelectedPatient(p); setActiveTab("patients"); }}
                              className="w-full flex items-center gap-3 bg-white/60 rounded-2xl p-3 hover:bg-white/80 transition-all text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm shrink-0">
                                {p.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.wardName} · {p.bedNumber} · {p.disease}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <RiskBadge level="critical" />
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </button>
                          ))}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── PATIENTS (3-panel) ─────────────────────────────────────────── */}
            {activeTab === "patients" && (
              <motion.div key="patients" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

                {/* Filter bar */}
                <motion.div variants={itemVariants} className="flex items-center gap-3">
                  <div className="flex gap-1.5 glass p-1 rounded-xl border border-white/40">
                    {(["all", "critical", "moderate", "stable"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeFilter === f
                            ? f === "critical" ? "bg-red-500 text-white"
                              : f === "moderate" ? "bg-amber-500 text-white"
                              : f === "stable"   ? "bg-green-500 text-white"
                              : "bg-blue-500 text-white"
                            : "text-gray-500 hover:bg-white/40"
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f !== "all" && (
                          <span className="ml-1 opacity-70">
                            ({f === "critical" ? criticalCount : f === "moderate" ? moderateCount : stableCount})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">{filteredPatients.length} patients shown</span>
                </motion.div>

                {/* 3-panel grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-3 gap-6 items-start">

                  {/* LEFT: Patient List */}
                  <Card className="p-0 overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-white/30">
                      <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" /> Patient List
                      </h3>
                    </div>
                    <div className="divide-y divide-white/20 max-h-[620px] overflow-y-auto">
                      <AnimatePresence>
                        {filteredPatients.length === 0 && (
                          <div className="p-8 text-center text-sm text-gray-400">No patients match filter</div>
                        )}
                        {filteredPatients.map((patient) => (
                          <motion.button
                            key={patient.id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            onClick={() => setSelectedPatient(patient)}
                            className={`w-full text-left px-5 py-3.5 hover:bg-white/30 transition-all ${
                              selected?.id === patient.id ? "bg-blue-50/60 border-l-4 border-blue-400" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-800 truncate">{patient.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{patient.wardName} · {patient.bedNumber}</p>
                                <p className="text-xs text-gray-400 truncate">{patient.disease}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <RiskBadge level={patient.riskLevel} />
                                {extendedStay.has(patient.id) && (
                                  <span className="text-xs text-blue-500">📅 Extended</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 w-full bg-gray-100 h-1 rounded-full">
                              <div
                                className={`h-1 rounded-full ${
                                  patient.riskLevel === "critical" ? "bg-red-500"
                                  : patient.riskLevel === "moderate" ? "bg-amber-400"
                                  : "bg-green-400"
                                }`}
                                style={{ width: `${Math.min(patient.riskScore * 20, 100)}%` }}
                              />
                            </div>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                  </Card>

                  {/* CENTER: Details + Timeline */}
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {selected ? (
                        <motion.div
                          key={selected.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-4"
                        >
                          <Card>
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                                selected.riskLevel === "critical" ? "bg-red-100 text-red-600"
                                : selected.riskLevel === "moderate" ? "bg-amber-100 text-amber-600"
                                : "bg-green-100 text-green-600"
                              }`}>
                                {selected.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-xl font-bold text-gray-800">{selected.name}</h3>
                                  <RiskBadge level={selected.riskLevel} />
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {selected.gender === "M" ? "Male" : "Female"} · {selected.age} yrs · ID: {selected.id}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2.5">
                              {[
                                { label: "Diagnosis",  value: selected.disease },
                                { label: "Severity",   value: selected.severity, colored: true },
                                { label: "Ward · Bed", value: `${selected.wardName} · ${selected.bedNumber}` },
                                {
                                  label: "Admitted",
                                  value: new Date(selected.admissionTime).toLocaleDateString("en-IN", {
                                    day: "2-digit", month: "short", year: "numeric",
                                  }),
                                },
                              ].map((item) => (
                                <div key={item.label} className="bg-white/40 rounded-2xl p-3">
                                  <p className="text-xs text-gray-500">{item.label}</p>
                                  <p className={`font-semibold text-sm mt-0.5 capitalize ${
                                    item.colored
                                      ? selected.severity === "severe" ? "text-red-600"
                                        : selected.severity === "moderate" ? "text-amber-600"
                                        : "text-green-600"
                                      : "text-gray-800"
                                  }`}>
                                    {item.value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {selected.notes && (
                              <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                                <p className="text-xs text-blue-600 font-medium">📋 Clinical Notes</p>
                                <p className="text-sm text-gray-700 mt-1">{selected.notes}</p>
                              </div>
                            )}
                          </Card>

                          {/* Timeline */}
                          <Card>
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-4">
                              <CalendarClock className="w-4 h-4 text-blue-500" />
                              Patient Timeline
                            </h4>
                            <div className="relative pl-4">
                              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-200" />
                              <div className="space-y-4">
                                {timeline.map((entry, i) => (
                                  <div key={i} className="flex gap-3 relative">
                                    <div className={`shrink-0 w-3.5 h-3.5 rounded-full border-2 mt-0.5 z-10 ${
                                      entry.type === "alert"      ? "border-red-400 bg-red-100"
                                      : entry.type === "status"   ? "border-green-400 bg-green-100"
                                      : entry.type === "admission"? "border-blue-400 bg-blue-100"
                                      : "border-gray-300 bg-white"
                                    }`} />
                                    <div>
                                      <p className="text-xs text-gray-400">{entry.time}</p>
                                      <p className="text-sm text-gray-700 mt-0.5">{entry.event}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ) : (
                        <Card className="flex items-center justify-center h-64">
                          <p className="text-gray-400 text-sm">Select a patient to view details</p>
                        </Card>
                      )}
                    </AnimatePresence>
                  </div>


                  {/* RIGHT: Vitals + AI + Actions */}
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {selected ? (
                        <motion.div
                          key={selected.id + "-right"}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-4"
                        >
                          {/* Vitals */}
                          <Card>
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-4">
                              <Activity className="w-4 h-4 text-red-500" />
                              Live Vitals
                              <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live
                              </span>
                            </h4>
                            <div className="space-y-2.5">
                              <VitalCard icon={<Heart className="w-3.5 h-3.5" />} label="Heart Rate"    value={selected.vitals.heartRate} unit="bpm" abnormal={selected.vitals.heartRate > 110} />
                              <VitalCard icon={<Wind  className="w-3.5 h-3.5" />} label="SpO₂ (Oxygen)" value={`${selected.vitals.oxygen}%`} unit="" abnormal={selected.vitals.oxygen < 92} />
                              <VitalCard icon={<Gauge className="w-3.5 h-3.5" />} label="Blood Pressure" value={selected.vitals.bp} unit="mmHg" />
                            </div>
                            <div className="bg-black rounded-xl p-2 mt-3">
                              <ECGWave
                                heartRate={selected.vitals.heartRate}
                                oxygen={selected.vitals.oxygen}
                                riskLevel={selected.riskLevel}
                              />                            
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/30">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs text-gray-500 font-medium">AI Risk Score</span>
                                <span className={`text-xs font-bold ${
                                  selected.riskLevel === "critical" ? "text-red-600"
                                  : selected.riskLevel === "moderate" ? "text-amber-600"
                                  : "text-green-600"
                                }`}>{selected.riskScore} / 6</span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full">
                                <motion.div
                                  className={`h-2 rounded-full ${
                                    selected.riskLevel === "critical" ? "bg-red-500"
                                    : selected.riskLevel === "moderate" ? "bg-amber-400"
                                    : "bg-green-400"
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(selected.riskScore / 6) * 100}%` }}
                                  transition={{ duration: 0.6 }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-gray-300 mt-1">
                                <span>Stable</span><span>Moderate</span><span>Critical</span>
                              </div>
                            </div>
                          </Card>

                          {hasRunAssessment && sleepAssessment && (
  <div className="mt-4 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-800">
            Sleep Recovery Assessment
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            AI-assisted discharge readiness summary
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${
            sleepAssessment.dischargeRecommendation === "approve"
              ? "bg-green-100 text-green-700"
              : sleepAssessment.dischargeRecommendation === "monitor"
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {sleepAssessment.dischargeRecommendation === "approve"
            ? "Ready for Review"
            : sleepAssessment.dischargeRecommendation === "monitor"
            ? "Monitor Further"
            : "Extend Stay"}
        </span>
      </div>
    </div>

    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Patient</p>
          <p className="mt-2 text-sm font-semibold text-slate-800 break-all">
            {sleepAssessment.patientId}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Bed</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {sleepAssessment.bed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Current Stage</p>
          <p className="mt-2 text-lg font-bold text-indigo-700">
            {sleepAssessment.currentStage}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Confidence</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {(sleepAssessment.confidence * 100).toFixed(0)}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Sleep Efficiency</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {sleepAssessment.sleepEfficiency}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">N3 %</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {sleepAssessment.n3Percent}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">REM %</p>
          <p className="mt-2 text-lg font-bold text-slate-800">
            {sleepAssessment.remPercent}%
          </p>
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border p-4 ${
          sleepAssessment.dischargeRecommendation === "approve"
            ? "border-green-200 bg-green-50"
            : sleepAssessment.dischargeRecommendation === "monitor"
            ? "border-amber-200 bg-amber-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <p className="text-sm font-semibold text-slate-800">
          Recommendation:{" "}
          <span className="capitalize">
            {sleepAssessment.dischargeRecommendation.replace("-", " ")}
          </span>
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {sleepAssessment.reason}
        </p>
      </div>
    </div>
  </div>
)}

                          {/* AI Suggestion */}
                          <Card className={`border ${
                            selected.riskLevel === "critical" ? "border-red-200 bg-red-50/40"
                            : selected.riskLevel === "moderate" ? "border-amber-200 bg-amber-50/40"
                            : "border-green-200 bg-green-50/40"
                          }`}>
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-3">
                              <Sparkles className={`w-4 h-4 ${
                                selected.riskLevel === "critical" ? "text-red-500"
                                : selected.riskLevel === "moderate" ? "text-amber-500"
                                : "text-green-500"
                              }`} />
                              💡 AI Suggestion
                            </h4>
                            <p className="text-sm text-gray-700 leading-relaxed">{aiSuggestion}</p>
                          </Card>

                          {/* Actions */}
                          <Card>
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-4">
                              <Zap className="w-4 h-4 text-blue-500" /> Quick Actions
                            </h4>
                            <div className="space-y-2.5">
                              <button
                                onClick={() => selected && handleRunSleepAssessment(selected)}
                                disabled={!selected || sleepLoading}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {sleepLoading ? "Analyzing..." : "Run Sleep Assessment"}
                              </button>
                              <button
                                onClick={() => selected && handleApproveDischarge(selected)}
                                disabled={!selected || selected.status === "pre-discharge"}
                                className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                  !selected || selected.status === "pre-discharge"
                                    ? "bg-purple-100 text-purple-600 cursor-not-allowed"
                                    : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                              >
                                {selected?.status === "pre-discharge" ? "Approved" : "Approve Discharge"}
                              </button>

                              <button
                                onClick={() => selected && handleExtendStay(selected)}
                                disabled={!selected}
                                className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                              >
                                Extend Stay
                              </button>

                              <button
                                onClick={() => selected && handleEmergencyAlert(selected)}
                                disabled={!selected}
                                className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                Emergency Alert
                              </button>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/30 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                selected.riskLevel === "critical" ? "bg-red-500 animate-pulse"
                                : selected.riskLevel === "moderate" ? "bg-amber-400 animate-pulse"
                                : "bg-green-400"
                              }`} />
                              <span className="text-xs text-gray-500">
                                {selected.riskLevel === "critical" ? "Requires immediate intervention"
                                  : selected.riskLevel === "moderate" ? "Under active monitoring"
                                  : "Patient condition stable"}
                              </span>
                            </div>
                          </Card>
                        </motion.div>
                      ) : (
                        <Card className="flex items-center justify-center h-64">
                          <p className="text-gray-400 text-sm">Select a patient to view vitals</p>
                        </Card>
                      )}
                    </AnimatePresence>
                  </div>

                </motion.div>
              </motion.div>
            )}

            {/* ── WARDS ─────────────────────────────────────────────────────── */}
            {activeTab === "wards" && (
              <motion.div key="wards" variants={containerVariants} initial="hidden" animate="visible">
                <div className="grid grid-cols-3 gap-6">
                  {activeWards.map((ward) => {
                    const wPatients = activePatients.filter((p) => p.wardName === ward.name);
                    const wCrit     = wPatients.filter((p) => p.riskLevel === "critical").length;
                    const wMod      = wPatients.filter((p) => p.riskLevel === "moderate").length;
                    const wStab     = wPatients.filter((p) => p.riskLevel === "stable").length;
                    return (
                      <motion.div key={ward.id} variants={itemVariants} whileHover={{ y: -4 }}>
                        <Card className={wCrit > 0 ? "border-red-200" : ""}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-gray-800">{ward.name}</h3>
                              <p className="text-sm text-gray-500 mt-0.5">{ward.occupiedBeds}/{ward.totalBeds} beds occupied</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                              ward.riskLevel === "critical" ? "bg-red-100 text-red-700"
                              : ward.riskLevel === "high"   ? "bg-orange-100 text-orange-700"
                              : ward.riskLevel === "medium" ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                            }`}>{ward.riskLevel}</span>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                            <div className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all" style={{ width: `${ward.occupancy}%` }} />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center mb-3">
                            {[
                              { label: "Critical", value: wCrit, color: "red"   },
                              { label: "Moderate", value: wMod,  color: "amber" },
                              { label: "Stable",   value: wStab, color: "green" },
                            ].map((s) => (
                              <div key={s.label} className={`bg-${s.color}-50 rounded-xl py-1.5`}>
                                <p className={`text-sm font-bold text-${s.color}-600`}>{s.value}</p>
                                <p className={`text-xs text-${s.color}-400`}>{s.label}</p>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {wPatients.map((p) => (
                              <button
                                key={p.id}
                                title={`${p.name} — ${p.riskLevel}`}
                                onClick={() => { setSelectedPatient(p); setActiveTab("patients"); }}
                                className={`w-3 h-3 rounded-full border-2 transition-transform hover:scale-150 ${
                                  p.riskLevel === "critical" ? "bg-red-500 border-red-300"
                                  : p.riskLevel === "moderate" ? "bg-amber-400 border-amber-200"
                                  : "bg-green-400 border-green-200"
                                }`}
                              />
                            ))}
                          </div>

                          {wCrit > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {wCrit} patient{wCrit > 1 ? "s" : ""} require immediate attention
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── ALERTS ────────────────────────────────────────────────────── */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <Card>
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      Active Clinical Alerts
                    </h3>
                    <div className="space-y-3">
                      {activePatients.filter((p) => p.riskLevel !== "stable").map((p) => (
                        <div key={p.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${
                          p.riskLevel === "critical" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                        }`}>
                          <div className={`p-2 rounded-xl shrink-0 ${p.riskLevel === "critical" ? "bg-red-100" : "bg-amber-100"}`}>
                            <AlertTriangle className={`w-4 h-4 ${p.riskLevel === "critical" ? "text-red-600" : "text-amber-600"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-800">{p.name}</p>
                              <RiskBadge level={p.riskLevel} />
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{p.wardName} · {p.bedNumber} · {p.disease}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {p.vitals.oxygen < 92 && `SpO₂ ${p.vitals.oxygen}% (critical low) `}
                              {p.vitals.heartRate > 110 && `HR ${p.vitals.heartRate} bpm (tachycardia) `}
                              {p.severity === "severe" && "Severe underlying condition"}
                            </p>
                          </div>
                          <button
                            onClick={() => { setSelectedPatient(p); setActiveTab("patients"); }}
                            className="px-3 py-1.5 bg-white rounded-xl text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all shrink-0"
                          >
                            View →
                          </button>
                        </div>
                      ))}
                      {activePatients.filter((p) => p.riskLevel !== "stable").length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                          No active alerts — all patients stable
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* ── REPORTS ───────────────────────────────────────────────────── */}
            {activeTab === "reports" && (
              <motion.div key="reports" variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={itemVariants}>
                  <div className="bg-white shadow-xl rounded-3xl p-8 max-w-2xl mx-auto">
                    <div className="text-center border-b pb-5 mb-6">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Activity className="w-7 h-7 text-blue-500" />
                        <h1 className="text-2xl font-bold">WardWatch</h1>
                      </div>
                      <p className="text-sm text-gray-500">Doctor Clinical Summary Report</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Generated: {new Date().toLocaleString("en-IN")} · {doctorName}
                      </p>
                    </div>
                    <div className="space-y-5 text-sm">
                      <div>
                        <h2 className="text-base font-semibold mb-3">Patient Overview</h2>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Total Active", value: activePatients.length, color: "blue"  },
                            { label: "Critical",     value: criticalCount,         color: "red"   },
                            { label: "Stable",       value: stableCount,           color: "green" },
                          ].map((s) => (
                            <div key={s.label} className={`bg-${s.color}-50 rounded-2xl p-3 text-center`}>
                              <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
                              <p className="text-xs text-gray-500">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-base font-semibold mb-2">Critical Patients</h2>
                        {activePatients.filter((p) => p.riskLevel === "critical").length === 0
                          ? <p className="text-gray-400">None — all patients stable</p>
                          : activePatients.filter((p) => p.riskLevel === "critical").map((p) => (
                            <p key={p.id} className="text-red-600 mb-1">⚠ {p.name} — {p.wardName} ({p.disease})</p>
                          ))}
                      </div>
                      <div>
                        <h2 className="text-base font-semibold mb-2">Wards Covered</h2>
                        <p className="text-gray-600">{activeWards.map((w) => w.name).join(", ")}</p>
                      </div>
                      <div className="border-t pt-4 text-center text-xs text-gray-400">
                        WardWatch AI Hospital System · Confidential Clinical Report
                      </div>
                    </div>
                  </div>
                </motion.div>
                <div className="text-center">
                  <button
                    onClick={() => window.print()}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all font-medium"
                  >
                    Print Report
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════════════════ */}
        <footer className="glass border-t border-white/40 backdrop-blur-md mt-auto">
          <div className="px-6 py-4 flex items-center justify-between gap-4">

            {/* Left: brand */}
            <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
              <Activity className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="font-semibold text-gray-600">WardWatch</span>
              <span className="text-gray-300">·</span>
              <span className="hidden md:block">Doctor Portal v2</span>
              <span className="text-gray-300 hidden md:block">·</span>
              <span className="hidden lg:block">AI-Assisted Clinical Decisions</span>
            </div>

            {/* Center: status chips */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                System Online
              </div>
              {criticalCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {criticalCount} Critical Alert{criticalCount > 1 ? "s" : ""}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <Sparkles className="w-3 h-3" />
                AI Active
              </div>
            </div>

            {/* Right: counters + clock */}
            <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {activePatients.length} Patients
              </span>
              <span className="text-gray-300">·</span>
              <span>{activeWards.length} Wards</span>
              <span className="text-gray-300">·</span>
              <span className="font-medium text-gray-500">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

          </div>
        </footer>

      </div>{/* /main */}
    </div>
  );
}