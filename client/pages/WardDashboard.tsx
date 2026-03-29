import { useState, useEffect, useCallback } from "react";
import {
  Bed, Activity, AlertTriangle, CheckCircle2, Clock, Users,
  Sparkles, ChevronRight, LayoutDashboard, ClipboardList,
  Droplets, LogOut, Bell, Search, Zap, TrendingUp, RefreshCw,
  UserCheck, ShieldCheck, FlaskConical, CreditCard, ArrowRight,
  Timer, Wifi, BarChart3, Star, Filter, Play, Pause,
  AlertCircle, Info, XCircle, ChevronDown, Plus, Eye,
  BrainCircuit, Layers, CalendarClock, ArrowUpRight,
} from "lucide-react";

// ─── MOCK DATA ─────────────────────────────────────────────
const WARDS = ["General Ward A", "General Ward B", "ICU", "Pediatric"];
const CURRENT_WARD = "General Ward A";

const BED_STATUS = {
  occupied: { label: "Occupied", color: "#60a5fa", bg: "rgba(96,165,250,0.15)", dot: "#3b82f6" },
  available: { label: "Available", color: "#34d399", bg: "rgba(52,211,153,0.15)", dot: "#10b981" },
  cleaning: { label: "Cleaning", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", dot: "#f59e0b" },
  reserved: { label: "Reserved", color: "#a78bfa", bg: "rgba(167,139,250,0.15)", dot: "#8b5cf6" },
  discharge_ready: { label: "Discharge Ready", color: "#c084fc", bg: "rgba(192,132,252,0.15)", dot: "#a855f7" },
  critical: { label: "Critical", color: "#f87171", bg: "rgba(248,113,113,0.15)", dot: "#ef4444" },
  blocked: { label: "Blocked", color: "#fb923c", bg: "rgba(251,146,60,0.15)", dot: "#f97316" },
};

const initialBeds = [
  { id: "GWA-01", status: "occupied", patient: "Ramesh Kulkarni", age: 64, gender: "M", diagnosis: "Acute MI", severity: "critical", admittedOn: "27 Mar", estDischarge: "31 Mar", notes: "Awaiting cardiology review", aiStatus: "verified", confidence: 0.94, source: "YOLOv8", lastUpdated: Date.now() - 120000 },
  { id: "GWA-02", status: "discharge_ready", patient: "Sunita Mehta", age: 52, gender: "F", diagnosis: "Post-appendectomy", severity: "stable", admittedOn: "25 Mar", estDischarge: "29 Mar", notes: "Billing pending", aiStatus: "verified", confidence: 0.88, source: "YOLOv8", lastUpdated: Date.now() - 300000 },
  { id: "GWA-03", status: "cleaning", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Cleaning started 14 min ago", aiStatus: "verified", confidence: 0.91, source: "YOLOv8", lastUpdated: Date.now() - 840000 },
  { id: "GWA-04", status: "occupied", patient: "Priya Sharma", age: 38, gender: "F", diagnosis: "Typhoid Fever", severity: "moderate", admittedOn: "28 Mar", estDischarge: "02 Apr", notes: "Antibiotics ongoing", aiStatus: "verified", confidence: 0.82, source: "YOLOv8", lastUpdated: Date.now() - 180000 },
  { id: "GWA-05", status: "available", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Ready for admission", aiStatus: "pending", confidence: null, source: "Rule-Based", lastUpdated: Date.now() - 3600000 },
  { id: "GWA-06", status: "occupied", patient: "Arjun Nair", age: 45, gender: "M", diagnosis: "Diabetic Ketoacidosis", severity: "critical", admittedOn: "29 Mar", estDischarge: "01 Apr", notes: "IV drip active", aiStatus: "verified", confidence: 0.97, source: "YOLOv8", lastUpdated: Date.now() - 60000 },
  { id: "GWA-07", status: "discharge_ready", patient: "Kavita Joshi", age: 29, gender: "F", diagnosis: "Viral Pneumonia", severity: "stable", admittedOn: "24 Mar", estDischarge: "29 Mar", notes: "Doctor approved, billing clear", aiStatus: "verified", confidence: 0.86, source: "YOLOv8", lastUpdated: Date.now() - 420000 },
  { id: "GWA-08", status: "reserved", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Reserved for transfer from ICU", aiStatus: "pending", confidence: null, source: "Rule-Based", lastUpdated: Date.now() - 7200000 },
  { id: "GWA-09", status: "occupied", patient: "Vikram Iyer", age: 71, gender: "M", diagnosis: "COPD Exacerbation", severity: "moderate", admittedOn: "27 Mar", estDischarge: "31 Mar", notes: "Nebulization Q4H", aiStatus: "verified", confidence: 0.79, source: "YOLOv8", lastUpdated: Date.now() - 600000 },
  { id: "GWA-10", status: "cleaning", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Overdue — 32 min elapsed", aiStatus: "verified", confidence: 0.93, source: "YOLOv8", lastUpdated: Date.now() - 1920000 },
  { id: "GWA-11", status: "available", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Just sanitized", aiStatus: "pending", confidence: null, source: "Rule-Based", lastUpdated: Date.now() - 5400000 },
  { id: "GWA-12", status: "occupied", patient: "Deepa Reddy", age: 33, gender: "F", diagnosis: "Dengue Fever", severity: "moderate", admittedOn: "28 Mar", estDischarge: "01 Apr", notes: "Platelet monitoring", aiStatus: "verified", confidence: 0.85, source: "YOLOv8", lastUpdated: Date.now() - 240000 },
  { id: "GWA-13", status: "occupied", patient: "Mohan Das", age: 58, gender: "M", diagnosis: "Liver Cirrhosis", severity: "critical", admittedOn: "26 Mar", estDischarge: "05 Apr", notes: "Hepatologist review scheduled", aiStatus: "verified", confidence: 0.90, source: "YOLOv8", lastUpdated: Date.now() - 360000 },
  { id: "GWA-14", status: "blocked", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Equipment malfunction reported", aiStatus: "pending", confidence: null, source: "Rule-Based", lastUpdated: Date.now() - 2700000 },
  { id: "GWA-15", status: "occupied", patient: "Anita Pillai", age: 47, gender: "F", diagnosis: "Hypertensive Crisis", severity: "moderate", admittedOn: "29 Mar", estDischarge: "30 Mar", notes: "BP stabilizing", aiStatus: "verified", confidence: 0.76, source: "YOLOv8", lastUpdated: Date.now() - 480000 },
  { id: "GWA-16", status: "available", patient: null, age: null, gender: null, diagnosis: null, severity: null, admittedOn: null, estDischarge: null, notes: "Ready for admission", aiStatus: "pending", confidence: null, source: "Rule-Based", lastUpdated: Date.now() - 9000000 },
];

const cleaningRooms = [
  { bedId: "GWA-03", staff: "Raju M.", phase: "Sanitized", progress: 85, elapsed: 14, overdue: false, inspectionPending: true },
  { bedId: "GWA-10", staff: "Seema K.", phase: "Cleaning In Progress", progress: 45, elapsed: 32, overdue: true, inspectionPending: false },
  { bedId: "GWA-11", staff: "Thomas V.", phase: "Ready for Next Patient", progress: 100, elapsed: 55, overdue: false, inspectionPending: false },
];

const dischargePatients = [
  { name: "Sunita Mehta", bed: "GWA-02", doctorApproved: true, billingClear: false, testsComplete: true, readiness: 70, estTime: "2:00 PM", category: "delayed", reason: "Discharge delayed due to pending billing clearance" },
  { name: "Kavita Joshi", bed: "GWA-07", doctorApproved: true, billingClear: true, testsComplete: true, readiness: 98, estTime: "12:30 PM", category: "within_2h", reason: "Patient fully ready — awaiting final sign-off" },
  { name: "Anita Pillai", bed: "GWA-15", doctorApproved: false, billingClear: true, testsComplete: true, readiness: 55, estTime: "5:00 PM", category: "today", reason: "Awaiting final doctor round approval" },
  { name: "Vikram Iyer", bed: "GWA-09", doctorApproved: false, billingClear: false, testsComplete: false, readiness: 20, estTime: "Tomorrow", category: "blocked", reason: "Tests pending, billing not initiated, doctor approval required" },
];

const workflowBeds = [
  { bed: "GWA-02", patient: "Sunita Mehta", currentStep: 1, steps: ["Occupied", "Discharge Initiated", "Patient Out", "Cleaning", "Sanitized", "Bed Ready"] },
  { bed: "GWA-07", patient: "Kavita Joshi", currentStep: 2, steps: ["Occupied", "Discharge Initiated", "Patient Out", "Cleaning", "Sanitized", "Bed Ready"] },
  { bed: "GWA-03", patient: null, currentStep: 3, steps: ["Occupied", "Discharge Initiated", "Patient Out", "Cleaning", "Sanitized", "Bed Ready"] },
  { bed: "GWA-11", patient: null, currentStep: 5, steps: ["Occupied", "Discharge Initiated", "Patient Out", "Cleaning", "Sanitized", "Bed Ready"] },
];

const tasks = [
  { id: 1, name: "Clean Bed GWA-10", staff: "Seema K.", deadline: "Overdue 12 min", urgency: "critical", status: "in_progress", category: "cleaning" },
  { id: 2, name: "Sanitize Room GWA-03", staff: "Raju M.", deadline: "15 min remaining", urgency: "high", status: "in_progress", category: "sanitize" },
  { id: 3, name: "Prepare Admission Kit GWA-05", staff: "Thomas V.", deadline: "30 min", urgency: "medium", status: "pending", category: "admission" },
  { id: 4, name: "Inspect Bed GWA-11", staff: "Neha S.", deadline: "5 min remaining", urgency: "high", status: "pending", category: "inspect" },
  { id: 5, name: "Shift Equipment GWA-14", staff: "Unassigned", deadline: "ASAP", urgency: "critical", status: "pending", category: "equipment" },
  { id: 6, name: "Mark Bed Ready GWA-11", staff: "Thomas V.", deadline: "After inspection", urgency: "medium", status: "pending", category: "ready" },
  { id: 7, name: "Sanitize Room GWA-10", staff: "Seema K.", deadline: "After cleaning", urgency: "high", status: "pending", category: "sanitize" },
  { id: 8, name: "Clean Bed GWA-02", staff: "Raju M.", deadline: "Pending discharge", urgency: "low", status: "pending", category: "cleaning" },
  { id: 9, name: "Prepare Admission Kit GWA-16", staff: "Thomas V.", deadline: "Done", urgency: "low", status: "completed", category: "admission" },
  { id: 10, name: "Inspect Bed GWA-05", staff: "Neha S.", deadline: "Done", urgency: "low", status: "completed", category: "inspect" },
];

const alerts = [
  { id: 1, title: "Bed Cleaning Overdue", desc: "GWA-10 has been under cleaning for 32 minutes. Threshold exceeded.", severity: "critical", time: "8 min ago", ack: false },
  { id: 2, title: "High Occupancy Warning", desc: "Ward occupancy at 81%. Nearing capacity threshold of 90%.", severity: "warning", time: "22 min ago", ack: false },
  { id: 3, title: "Equipment Malfunction", desc: "GWA-14 flagged for equipment issue. Bed blocked pending resolution.", severity: "critical", time: "45 min ago", ack: false },
  { id: 4, title: "Multiple Discharges Pending", desc: "2 discharge-ready patients. Beds not yet prepped for incoming admissions.", severity: "warning", time: "1 hr ago", ack: true },
  { id: 5, title: "Reserved Bed Delay", desc: "GWA-08 reserved for ICU transfer. Transfer delayed by 90 min.", severity: "info", time: "2 hr ago", ack: true },
  { id: 6, title: "Housekeeping Backlog", desc: "2 beds in cleaning queue. Turnaround time exceeding SLA.", severity: "warning", time: "2 hr ago", ack: false },
];

const staffList = [
  { name: "Meera Nair", role: "Ward Coordinator", status: "on_duty", assignment: "Overseeing Ward A Operations", workload: 75, shift: "Morning (7AM–3PM)" },
  { name: "Raju Malhotra", role: "Housekeeping", status: "on_duty", assignment: "Cleaning GWA-03", workload: 90, shift: "Morning (7AM–3PM)" },
  { name: "Seema Kulkarni", role: "Housekeeping", status: "on_duty", assignment: "Cleaning GWA-10 (overdue)", workload: 95, shift: "Morning (7AM–3PM)" },
  { name: "Thomas Varghese", role: "Support Attendant", status: "on_duty", assignment: "Inspection & Admission Prep", workload: 60, shift: "Morning (7AM–3PM)" },
  { name: "Neha Sharma", role: "Ward Cleaner", status: "on_duty", assignment: "Inspection GWA-11", workload: 50, shift: "Morning (7AM–3PM)" },
  { name: "Arun Patil", role: "Support Attendant", status: "break", assignment: "On break — returns 1:15 PM", workload: 40, shift: "Morning (7AM–3PM)" },
  { name: "Divya Singh", role: "Ward Coordinator", status: "off_duty", assignment: "Next shift: 3 PM", workload: 0, shift: "Evening (3PM–11PM)" },
];

const aiInsights = [
  { icon: "🎯", text: "Prioritize GWA-10 cleaning to unblock admission queue — 32 min overdue." },
  { icon: "⚡", text: "2 discharge-ready patients (GWA-02, GWA-07) can free beds within the next hour." },
  { icon: "📈", text: "Ward occupancy projected to cross 90% if 2 new admissions arrive without discharges." },
  { icon: "🧹", text: "Assign additional housekeeping to reduce bed turnaround from current ~42 min average." },
  { icon: "🔒", text: "GWA-14 blockage may cascade — consider reallocating reserved admission to GWA-16." },
];

// ─── HELPERS ────────────────────────────────────────────────
const glass = "backdrop-blur-md bg-white/60 border border-white/50 shadow-lg";
const glassCard = `${glass} rounded-2xl`;

const SeverityBadge = ({ sev }) => {
  const map = {
    critical: "bg-red-100 text-red-600 border border-red-200",
    stable: "bg-emerald-100 text-emerald-600 border border-emerald-200",
    moderate: "bg-amber-100 text-amber-700 border border-amber-200",
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[sev] || "bg-gray-100 text-gray-500"}`}>{sev}</span>;
};

const StatusDot = ({ status }) => (
  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: BED_STATUS[status]?.dot || "#9ca3af" }} />
);

// ─── SIDEBAR ────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "overview", icon: LayoutDashboard, label: "Overview" },
  { key: "bedboard", icon: Bed, label: "Bed Board" },
  { key: "cleaning", icon: Droplets, label: "Cleaning" },
  { key: "discharges", icon: ArrowRight, label: "Discharges" },
  { key: "tasks", icon: ClipboardList, label: "Tasks" },
  { key: "alerts", icon: Bell, label: "Alerts" },
  { key: "staff", icon: Users, label: "Staff" },
  { key: "simulation", icon: BrainCircuit, label: "Simulation" },
];

function Sidebar({ active, setActive, alertCount }) {
  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col" style={{
      background: "linear-gradient(160deg,#e8f4ff 0%,#f0eeff 60%,#fde8ff 100%)",
      borderRight: "1px solid rgba(255,255,255,0.6)"
    }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-800">WardWatch</div>
            <div className="text-[10px] text-slate-500">Ward Staff Portal</div>
          </div>
        </div>
        <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center gap-1.5">
          <Wifi size={10} className="text-blue-500" />
          <span className="text-[10px] text-blue-600 font-medium">{CURRENT_WARD}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const isActive = active === key;
          return (
            <button key={key} onClick={() => setActive(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${isActive ? "text-white shadow-md" : "text-slate-600 hover:bg-white/60"}`}
              style={isActive ? { background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" } : {}}>
              <Icon size={16} />
              {label}
              {key === "alerts" && alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/40">
        <div className={`${glassCard} p-3 flex items-center gap-2.5`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">MN</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">Meera Nair</div>
            <div className="text-[10px] text-slate-500">Ward Coordinator</div>
          </div>
          <LogOut size={13} className="text-slate-400 hover:text-red-400 cursor-pointer transition-colors" />
        </div>
      </div>
    </aside>
  );
}

// ─── HEADER ─────────────────────────────────────────────────
function Header({ tab }) {
  const titles = {
    overview: "Ward Overview", bedboard: "Bed Occupancy Board",
    cleaning: "Cleaning Tracker", discharges: "Discharge Predictions",
    tasks: "Housekeeping Tasks", alerts: "Alert Center",
    staff: "Staff Assignment", simulation: "Ward Simulation",
  };
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return (
    <header className={`h-14 px-6 flex items-center justify-between shrink-0 border-b border-white/40`}
      style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(12px)" }}>
      <div>
        <h1 className="font-bold text-slate-800 text-base">{titles[tab]}</h1>
        <p className="text-[10px] text-slate-500">General Ward A · {now} · Shift: Morning</p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`${glassCard} flex items-center gap-2 px-3 py-1.5`}>
          <Search size={12} className="text-slate-400" />
          <input placeholder="Search beds, patients..." className="text-xs bg-transparent outline-none text-slate-700 w-36 placeholder:text-slate-400" />
        </div>
        <div className={`${glassCard} p-1.5 relative cursor-pointer`}>
          <Bell size={15} className="text-slate-600" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">4</span>
        </div>
      </div>
    </header>
  );
}

// ─── OVERVIEW ───────────────────────────────────────────────
function Overview({ beds, alerts }) {
  const total = beds.length;
  const occupied = beds.filter(b => b.status === "occupied" || b.status === "critical").length;
  const available = beds.filter(b => b.status === "available").length;
  const cleaning = beds.filter(b => b.status === "cleaning").length;
  const dischargeReady = beds.filter(b => b.status === "discharge_ready").length;
  const cleanScore = 78;
  const staffOnDuty = 5;

  const stats = [
    { label: "Total Beds", value: total, icon: Bed, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    { label: "Occupied", value: occupied, icon: Users, color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
    { label: "Available", value: available, icon: CheckCircle2, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    { label: "Cleaning", value: cleaning, icon: Droplets, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    { label: "Discharge Ready", value: dischargeReady, icon: ArrowRight, color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    { label: "Cleanliness Score", value: `${cleanScore}%`, icon: ShieldCheck, color: "#14b8a6", bg: "rgba(20,184,166,0.12)" },
    { label: "Staff On Duty", value: staffOnDuty, icon: UserCheck, color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-7 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${glassCard} p-4 flex flex-col items-center text-center gap-2`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
              <s.icon size={17} style={{ color: s.color }} />
            </div>
            <div className="text-xl font-bold text-slate-800">{s.value}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className={`${glassCard} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-slate-700 text-sm">Ward Capacity Overview</div>
          <span className="text-xs text-slate-500">{Math.round((occupied / total) * 100)}% occupied</span>
        </div>
        <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
          {[
            { count: occupied, color: "#60a5fa", label: "Occupied" },
            { count: dischargeReady, color: "#c084fc", label: "Discharge Ready" },
            { count: cleaning, color: "#fbbf24", label: "Cleaning" },
            { count: beds.filter(b => b.status === "reserved").length, color: "#a78bfa", label: "Reserved" },
            { count: beds.filter(b => b.status === "blocked").length, color: "#f87171", label: "Blocked" },
            { count: available, color: "#34d399", label: "Available" },
          ].map((seg, i) => seg.count > 0 && (
            <div key={i} className="h-full transition-all duration-700 rounded-sm"
              style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }} title={`${seg.label}: ${seg.count}`} />
          ))}
        </div>
        <div className="flex gap-4 mt-2.5 flex-wrap">
          {["Occupied", "Discharge Ready", "Cleaning", "Reserved", "Blocked", "Available"].map((l, i) => {
            const colors = ["#60a5fa", "#c084fc", "#fbbf24", "#a78bfa", "#f87171", "#34d399"];
            return <div key={l} className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
              {l}
            </div>;
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* AI Insights */}
        <div className={`${glassCard} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">AI Operational Insights</span>
          </div>
          <div className="space-y-2.5">
            {aiInsights.map((ins, i) => (
              <div key={i} className="flex gap-2.5 text-xs text-slate-700 bg-white/50 rounded-xl p-2.5 border border-white/60">
                <span>{ins.icon}</span>
                <span className="leading-relaxed">{ins.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className={`${glassCard} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center">
              <AlertTriangle size={13} className="text-white" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">Active Alerts</span>
            <span className="ml-auto bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.filter(a => !a.ack).length} unack</span>
          </div>
          <div className="space-y-2">
            {alerts.filter(a => !a.ack).map(alert => (
              <div key={alert.id} className={`rounded-xl p-3 border text-xs ${alert.severity === "critical" ? "bg-red-50/80 border-red-200" : alert.severity === "warning" ? "bg-amber-50/80 border-amber-200" : "bg-blue-50/80 border-blue-100"}`}>
                <div className="font-semibold text-slate-800">{alert.title}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{alert.desc}</div>
                <div className="text-[10px] text-slate-400 mt-1">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BED BOARD ──────────────────────────────────────────────
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + " min ago";
  return Math.floor(seconds / 3600) + " hr ago";
}

function BedBoard({ beds }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const filters = ["all", "occupied", "available", "cleaning", "discharge_ready", "reserved", "blocked", "critical"];
  const shown = filter === "all" ? beds : beds.filter(b => b.status === filter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className={`${glassCard} p-3 flex flex-wrap gap-2`}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-all ${filter === f ? "text-white shadow" : "text-slate-600 bg-white/60 hover:bg-white"}`}
            style={filter === f ? { background: BED_STATUS[f]?.dot || "linear-gradient(135deg,#3b82f6,#8b5cf6)" } : {}}>
            {f === "all" ? `All (${beds.length})` : `${BED_STATUS[f]?.label} (${beds.filter(b => b.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Bed grid */}
      <div className="grid grid-cols-4 gap-3">
        {shown.map(bed => {
          const st = BED_STATUS[bed.status];
          const isSelected = selected === bed.id;
          return (
            <div key={bed.id} onClick={() => setSelected(isSelected ? null : bed.id)}
              className={`${glassCard} p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${isSelected ? "ring-2 ring-blue-400" : ""}`}
              style={{ borderLeft: `3px solid ${st.dot}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{bed.id}</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              {bed.patient ? (
                <>
                  <div className="text-sm font-semibold text-slate-800 truncate">{bed.patient}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{bed.age}y · {bed.gender} · {bed.diagnosis}</div>
                  <div className="flex items-center justify-between mt-2">
                    <SeverityBadge sev={bed.severity} />
                    {bed.estDischarge && <span className="text-[9px] text-slate-400">→ {bed.estDischarge}</span>}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">{bed.notes}</div>
              )}
              {bed.aiStatus === "verified" ? (
                <div className="text-[10px] text-slate-500 mt-2">
                  🤖 AI Verified · {(bed.confidence * 100).toFixed(0)}% · {bed.source} <br />
                  ⏱ {formatTimeAgo(bed.lastUpdated)}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 mt-2">
                  ⚙️ Rule-Based Estimate (No CCTV)
                </div>
              )}
              {isSelected && bed.patient && (
                <div className="mt-3 pt-3 border-t border-white/60 text-[10px] text-slate-600 space-y-1">
                  <div>📅 Admitted: {bed.admittedOn}</div>
                  <div>📋 {bed.notes}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CLEANING ────────────────────────────────────────────────

// Extended room data with AI + staff accountability fields
const cleaningRoomsExtended = [
  {
    bedId: "GWA-03", staff: "Raju M.", phase: "Sanitized", progress: 85, elapsed: 14,
    overdue: false, inspectionPending: true, aiDetected: true, aiConfidence: 0.91,
    hasCCTV: true, aiLabel: "Messy → Cleaning", cleanedState: false,
    lastUpdated: Date.now() - 840000, ward: "General Ward A",
  },
  {
    bedId: "GWA-10", staff: "Seema K.", phase: "Cleaning In Progress", progress: 45, elapsed: 32,
    overdue: true, inspectionPending: false, aiDetected: true, aiConfidence: 0.93,
    hasCCTV: true, aiLabel: "Messy — Action Required", cleanedState: false,
    lastUpdated: Date.now() - 1920000, ward: "General Ward A",
  },
  {
    bedId: "GWA-11", staff: "Thomas V.", phase: "Ready for Next Patient", progress: 100, elapsed: 55,
    overdue: false, inspectionPending: false, aiDetected: false, aiConfidence: null,
    hasCCTV: false, aiLabel: null, cleanedState: true,
    lastUpdated: Date.now() - 5400000, ward: "General Ward A",
  },
];

const wardCleanliness = [
  { ward: "General Ward A", score: 78, color: "#f59e0b" },
  { ward: "ICU", score: 92, color: "#10b981" },
  { ward: "General Ward B", score: 85, color: "#3b82f6" },
  { ward: "Pediatrics", score: 88, color: "#8b5cf6" },
];

function formatCleaningTime(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return Math.floor(secs / 60) + " min ago";
  return Math.floor(secs / 3600) + " hr ago";
}

function Cleaning({ rooms }) {
  const [tick, setTick] = useState(0);
  const [roomStates, setRoomStates] = useState(
    cleaningRoomsExtended.reduce((acc, r) => ({ ...acc, [r.bedId]: r.cleanedState }), {})
  );
  const [alerts, setAlerts] = useState(
    cleaningRoomsExtended
      .filter(r => r.overdue)
      .map(r => ({ id: r.bedId, msg: `🚨 Room ${r.bedId} is messy — cleaning required immediately`, dismissed: false }))
  );

  // Tick every 30s for live feel
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Auto-dismiss alerts after 6 seconds
  useEffect(() => {
    const timers = alerts
      .filter(a => !a.dismissed)
      .map(a =>
        setTimeout(() => {
          setAlerts(prev => prev.map(al => al.id === a.id ? { ...al, dismissed: true } : al));
        }, 6000)
      );
    return () => timers.forEach(clearTimeout);
  }, []);

  const dismissAlert = (id) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));

  const markCleaned = (bedId) =>
    setRoomStates(prev => ({ ...prev, [bedId]: true }));

  const phaseColors = {
    "Not Started": "#9ca3af",
    "Cleaning In Progress": "#f59e0b",
    "Sanitized": "#3b82f6",
    "Inspection Pending": "#a855f7",
    "Ready for Next Patient": "#10b981",
  };

  const wardScore = 78;
  const activeAlerts = alerts.filter(a => !a.dismissed);

  return (
    <div className="space-y-4">

      {/* ── Floating Alert Popups ── */}
      {activeAlerts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 space-y-2" style={{ maxWidth: 340 }}>
          {activeAlerts.map(alert => (
            <div key={alert.id}
              className="flex items-start gap-3 p-4 rounded-2xl shadow-2xl border border-red-200 text-sm text-red-800 font-medium"
              style={{ background: "rgba(255,237,237,0.97)", backdropFilter: "blur(12px)", animation: "slideIn 0.3s ease" }}>
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span className="flex-1 leading-snug">{alert.msg}</span>
              <button onClick={() => dismissAlert(alert.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                <XCircle size={15} />
              </button>
            </div>
          ))}
          <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(-8px);} to {opacity:1; transform:translateY(0);}}`}</style>
        </div>
      )}

      {/* ── Ward-Wise Cleanliness Panel ── */}
      <div className={`${glassCard} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={15} className="text-blue-500" />
          <span className="font-semibold text-slate-700 text-sm">Ward-Wise Cleanliness Overview</span>
          <span className="ml-auto text-[10px] text-slate-400">AI-powered · Last scan: 2 min ago</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {wardCleanliness.map(w => (
            <div key={w.ward} className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-600 font-medium">{w.ward}</span>
                <span className="font-bold" style={{ color: w.color }}>{w.score}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/60 border border-white/40 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${w.score}%`, background: `linear-gradient(90deg,${w.color}88,${w.color})` }} />
              </div>
              <div className="text-[9px] text-slate-400">
                {w.score >= 90 ? "✅ Excellent" : w.score >= 80 ? "🟡 Good" : "⚠️ Needs Attention"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Score card + AI Insights ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score card (existing, preserved) */}
        <div className={`${glassCard} p-5 flex items-center gap-5`}>
          <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#10b981)" }}>
            <span className="text-white text-2xl font-bold">{wardScore}</span>
            <span className="text-white/80 text-[9px]">Score</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 mb-1 text-sm">Ward Cleanliness Score</div>
            <div className="w-full h-2.5 rounded-full bg-white/60 border border-white/40 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${wardScore}%`, background: "linear-gradient(90deg,#0ea5e9,#10b981)" }} />
            </div>
            <div className="flex gap-3 mt-2.5 flex-wrap">
              {[{ l: "Overdue", v: 1, c: "#ef4444" }, { l: "In Progress", v: 2, c: "#f59e0b" }, { l: "Pending", v: 1, c: "#a855f7" }, { l: "Ready", v: 1, c: "#10b981" }].map(s => (
                <div key={s.l} className="text-[10px]">
                  <span className="font-bold" style={{ color: s.c }}>{s.v}</span>{" "}
                  <span className="text-slate-500">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights panel */}
        <div className={`${glassCard} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}>
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">AI Cleanliness Insights</span>
          </div>
          <div className="space-y-2">
            {[
              { icon: "🚨", text: "1 room overdue — GWA-10 flagged by YOLO model", color: "bg-red-50/80 border-red-100" },
              { icon: "⏱", text: "Avg cleaning time: 42 min · SLA threshold: 30 min", color: "bg-amber-50/80 border-amber-100" },
              { icon: "🔍", text: "Bottleneck detected in General Ward A", color: "bg-amber-50/80 border-amber-100" },
              { icon: "✅", text: "GWA-11 cleared by AI — ready for next patient", color: "bg-emerald-50/80 border-emerald-100" },
              { icon: "📷", text: "2/3 rooms monitored via live CCTV feed", color: "bg-blue-50/80 border-blue-100" },
            ].map((ins, i) => (
              <div key={i} className={`flex gap-2 text-[10px] text-slate-700 rounded-xl px-3 py-2 border ${ins.color}`}>
                <span>{ins.icon}</span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Room cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {cleaningRoomsExtended.map(r => {
          const col = phaseColors[r.phase] || "#9ca3af";
          const isCleaned = roomStates[r.bedId];
          const isMessy = r.overdue && !isCleaned;

          // Border color by state
          const borderStyle = isMessy
            ? "ring-2 ring-red-400"
            : r.progress === 100
            ? "ring-2 ring-emerald-300"
            : r.phase === "Cleaning In Progress"
            ? "ring-2 ring-amber-300"
            : "";

          return (
            <div key={r.bedId} className={`${glassCard} p-5 transition-all duration-300 ${borderStyle}`}>

              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800">{r.bedId}</span>
                <div className="flex items-center gap-1.5">
                  {r.overdue && !isCleaned && (
                    <span className="text-[9px] bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      OVERDUE
                    </span>
                  )}
                  {isCleaned && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      ✓ CLEANED
                    </span>
                  )}
                </div>
              </div>

              {/* AI Detection badge */}
              {r.hasCCTV ? (
                <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-xl border"
                  style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.25)" }}>
                  <BrainCircuit size={11} className="text-purple-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-purple-700">
                    🤖 AI Detected · {(r.aiConfidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-xl border"
                  style={{ background: "rgba(148,163,184,0.1)", borderColor: "rgba(148,163,184,0.3)" }}>
                  <span className="text-[10px] text-slate-500">⚙️ Manual Mode (No CCTV)</span>
                </div>
              )}

              {/* Phase */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                <span className="text-xs font-medium" style={{ color: col }}>{r.phase}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/60 border border-white/40 overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${isCleaned ? 100 : r.progress}%`, background: `linear-gradient(90deg, ${col}88, ${col})` }} />
              </div>

              {/* Stats */}
              <div className="text-[10px] text-slate-500 space-y-1 mb-3">
                <div className="flex justify-between">
                  <span>⏱ Elapsed</span>
                  <span className={`font-semibold ${r.overdue && !isCleaned ? "text-red-500" : "text-slate-700"}`}>
                    {r.elapsed} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>🔍 Inspection</span>
                  <span className={r.inspectionPending ? "text-purple-600 font-medium" : "text-emerald-600 font-medium"}>
                    {r.inspectionPending ? "Pending" : "Done"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>✅ Progress</span>
                  <span className="font-semibold text-slate-700">{isCleaned ? 100 : r.progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span>🕐 Last Updated</span>
                  <span className="text-slate-500">{formatCleaningTime(r.lastUpdated)}</span>
                </div>
              </div>

              {/* Staff accountability tag */}
              <div className={`rounded-xl px-3 py-2 mb-3 border text-[10px] ${r.overdue && !isCleaned ? "bg-red-50/80 border-red-200" : "bg-white/50 border-white/60"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    👩‍🔧 Assigned to: <span className="font-semibold text-slate-800">{r.staff}</span>
                  </span>
                  <span className={`font-semibold ${r.overdue && !isCleaned ? "text-red-600" : r.progress === 100 || isCleaned ? "text-emerald-600" : "text-amber-600"}`}>
                    {r.overdue && !isCleaned ? "⚠️ Action Required" : isCleaned || r.progress === 100 ? "Done" : "In Progress"}
                  </span>
                </div>
              </div>

              {/* Task lock / Mark as Cleaned button */}
              {!isCleaned && r.overdue ? (
                <div className="space-y-2">
                  <div className="text-[10px] text-red-600 bg-red-50/80 border border-red-200 rounded-xl px-3 py-2 font-medium">
                    ⚠️ Cannot proceed — cleaning pending
                  </div>
                  <button
                    onClick={() => markCleaned(r.bedId)}
                    className="w-full text-xs font-semibold py-2 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
                    Mark as Cleaned
                  </button>
                </div>
              ) : isCleaned ? (
                <div className="text-[10px] text-emerald-600 bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 font-medium text-center">
                  ✅ Room cleared — ready for next patient
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ── Phase pipeline legend ── */}
      <div className={`${glassCard} p-4`}>
        <div className="text-xs font-semibold text-slate-600 mb-3">Cleaning Phase Pipeline</div>
        <div className="flex items-center gap-2">
          {["Not Started", "Cleaning In Progress", "Sanitized", "Inspection Pending", "Ready for Next Patient"].map((ph, i, arr) => (
            <div key={ph} className="flex items-center gap-2 flex-1">
              <div className="flex-1 text-center px-2 py-1.5 rounded-lg text-[10px] font-medium"
                style={{ background: phaseColors[ph] + "22", color: phaseColors[ph], border: `1px solid ${phaseColors[ph]}44` }}>
                {ph}
              </div>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function getBedStatus(bed) {
  const formData = new FormData();
  formData.append("bedNumber", bed.id);

  if (bed.hasCCTV) {
    formData.append("hasCCTV", "true");
    formData.append("image", bed.image);
  } else {
    formData.append("hasCCTV", "false");
  }

  const res = await fetch("http://localhost:5000/smart-bed-status", {
    method: "POST",
    body: formData
  });

  return await res.json();
}

// ─── DISCHARGES ─────────────────────────────────────────────
function Discharges({ patients }) {
  const catConfig = {
    within_2h: { label: "Within 2 hrs", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    today: { label: "Likely Today", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    delayed: { label: "Delayed", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    blocked: { label: "Blocked", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };

  const CheckItem = ({ done, label }) => (
    <div className="flex items-center gap-1.5 text-[10px]">
      {done ? <CheckCircle2 size={11} className="text-emerald-500" /> : <XCircle size={11} className="text-red-400" />}
      <span className={done ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(catConfig).map(([key, cfg]) => {
          const count = patients.filter(p => p.category === key).length;
          return (
            <div key={key} className={`${glassCard} p-4 text-center`} style={{ borderTop: `3px solid ${cfg.color}` }}>
              <div className="text-2xl font-bold" style={{ color: cfg.color }}>{count}</div>
              <div className="text-[10px] text-slate-500 mt-1">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Patient cards */}
      <div className="grid grid-cols-2 gap-4">
        {patients.map(p => {
          const cat = catConfig[p.category];
          return (
            <div key={p.bed} className={`${glassCard} p-5`} style={{ borderLeft: `4px solid ${cat.color}` }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-500">{p.bed}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                </div>
              </div>

              {/* Readiness bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Readiness</span><span className="font-bold text-slate-700">{p.readiness}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/60 border border-white/40 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.readiness}%`, background: `linear-gradient(90deg, ${cat.color}88, ${cat.color})` }} />
                </div>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-3 gap-1 mb-3">
                <CheckItem done={p.doctorApproved} label="Doctor Approval" />
                <CheckItem done={p.billingClear} label="Billing Clear" />
                <CheckItem done={p.testsComplete} label="Tests Done" />
              </div>

              {/* Reason */}
              <div className="bg-white/50 rounded-xl p-2.5 border border-white/60 text-[10px] text-slate-600">
                💡 {p.reason}
              </div>

              <div className="flex justify-between mt-3 text-[10px]">
                <span className="text-slate-500">Est. Discharge</span>
                <span className="font-semibold text-slate-700">{p.estTime}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Turnaround workflow */}
      <div className={`${glassCard} p-5`}>
        <div className="font-semibold text-slate-700 mb-4 text-sm flex items-center gap-2">
          <Layers size={15} className="text-blue-500" />
          Bed Turnaround Workflow
        </div>
        <div className="space-y-4">
          {workflowBeds.map(wb => (
            <div key={wb.bed}>
              <div className="text-xs text-slate-600 mb-2 font-medium">{wb.bed}{wb.patient ? ` · ${wb.patient}` : ""}</div>
              <div className="flex items-center gap-1">
                {wb.steps.map((step, i) => {
                  const done = i < wb.currentStep;
                  const active = i === wb.currentStep;
                  return (
                    <div key={step} className="flex items-center gap-1 flex-1">
                      <div className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[9px] font-medium transition-all ${done ? "text-white" : active ? "ring-2 ring-blue-400 text-blue-700 bg-blue-50" : "text-slate-400 bg-white/40"}`}
                        style={done ? { background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" } : {}}>
                        {step}
                      </div>
                      {i < wb.steps.length - 1 && <ArrowRight size={9} className={done ? "text-blue-400" : "text-slate-300"} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TASKS ───────────────────────────────────────────────────
function Tasks({ tasks: taskList }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const urgencyColors = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#9ca3af" };
  const statusColors = {
    pending: { bg: "bg-slate-100", text: "text-slate-600", label: "Pending" },
    in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
    completed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Completed" },
    delayed: { bg: "bg-red-100", text: "text-red-700", label: "Delayed" },
  };
  const shown = filterStatus === "all" ? taskList : taskList.filter(t => t.status === filterStatus);

  return (
    <div className="space-y-4">
      <div className={`${glassCard} p-3 flex gap-2`}>
        {["all", "pending", "in_progress", "completed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-all ${filterStatus === s ? "bg-blue-500 text-white shadow" : "bg-white/60 text-slate-600 hover:bg-white"}`}>
            {s === "all" ? "All Tasks" : statusColors[s]?.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Filter size={12} />
          {shown.length} tasks
        </div>
      </div>

      <div className="space-y-2.5">
        {shown.map(task => {
          const st = statusColors[task.status];
          return (
            <div key={task.id} className={`${glassCard} p-4 flex items-center gap-4`}>
              <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: urgencyColors[task.urgency] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{task.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase" style={{ color: urgencyColors[task.urgency], borderColor: urgencyColors[task.urgency] + "55", background: urgencyColors[task.urgency] + "11" }}>
                    {task.urgency}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-3">
                  <span>👤 {task.staff}</span>
                  <span>⏱ {task.deadline}</span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ALERTS ─────────────────────────────────────────────────
function AlertCenter({ alerts, setAlerts }) {
  const sevCfg = {
    critical: { bg: "bg-red-50/90", border: "border-red-200", icon: XCircle, iconColor: "text-red-500", badge: "bg-red-100 text-red-600" },
    warning: { bg: "bg-amber-50/90", border: "border-amber-200", icon: AlertTriangle, iconColor: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
    info: { bg: "bg-blue-50/90", border: "border-blue-200", icon: Info, iconColor: "text-blue-500", badge: "bg-blue-100 text-blue-700" },
  };

  const ack = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, ack: true } : a));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Critical", count: alerts.filter(a => a.severity === "critical").length, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
          { label: "Warnings", count: alerts.filter(a => a.severity === "warning").length, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "Info", count: alerts.filter(a => a.severity === "info").length, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
        ].map(s => (
          <div key={s.label} className={`${glassCard} p-4 text-center`}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[10px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-2.5">
        {alerts.map(alert => {
          const cfg = sevCfg[alert.severity];
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className={`${glassCard} ${cfg.bg} ${cfg.border} p-4 flex items-start gap-3 ${alert.ack ? "opacity-60" : ""}`}>
              <Icon size={18} className={`${cfg.iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{alert.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${cfg.badge}`}>{alert.severity}</span>
                  {alert.ack && <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Acknowledged</span>}
                </div>
                <div className="text-xs text-slate-600">{alert.desc}</div>
                <div className="text-[10px] text-slate-400 mt-1">{alert.time}</div>
              </div>
              {!alert.ack && (
                <button onClick={() => ack(alert.id)} className="text-[10px] bg-white/80 hover:bg-white border border-white/60 text-slate-600 px-2.5 py-1 rounded-lg transition-all font-medium shrink-0">
                  Acknowledge
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STAFF ───────────────────────────────────────────────────
function Staff() {
  const statusCfg = {
    on_duty: { color: "#10b981", label: "On Duty" },
    break: { color: "#f59e0b", label: "On Break" },
    off_duty: { color: "#9ca3af", label: "Off Duty" },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[{ l: "On Duty", v: 5, c: "#10b981" }, { l: "On Break", v: 1, c: "#f59e0b" }, { l: "Off Duty", v: 1, c: "#9ca3af" }].map(s => (
          <div key={s.l} className={`${glassCard} p-4 text-center`}>
            <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[10px] text-slate-500">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {staffList.map(s => {
          const st = statusCfg[s.status];
          return (
            <div key={s.name} className={`${glassCard} p-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{s.name}</div>
                  <div className="text-[10px] text-slate-500">{s.role}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                  <span className="text-[10px]" style={{ color: st.color }}>{st.label}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 bg-white/50 rounded-lg p-2 mb-2">📋 {s.assignment}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                <span>Workload</span>
                <span className="font-semibold text-slate-700">{s.workload}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/60 border border-white/40 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.workload}%`, background: s.workload > 80 ? "#ef4444" : s.workload > 60 ? "#f59e0b" : "#10b981" }} />
              </div>
              <div className="text-[9px] text-slate-400 mt-1.5">🕐 {s.shift}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SIMULATION ─────────────────────────────────────────────
function Simulation({ beds }) {
  const [scenario, setScenario] = useState({ newPatients: 0, discharges: 0, cleanersDown: 0 });
  const occupied = beds.filter(b => b.status === "occupied" || b.status === "discharge_ready").length;
  const available = beds.filter(b => b.status === "available").length;
  const cleaning = beds.filter(b => b.status === "cleaning").length;
  const total = beds.length;

  const sim = {
    newOccupied: Math.min(total, occupied + scenario.newPatients - scenario.discharges),
    newAvailable: Math.max(0, available - scenario.newPatients + scenario.discharges),
    newCleaning: cleaning + (scenario.discharges * 1),
    cleaningLoad: Math.round(cleaning + scenario.discharges + (scenario.cleanersDown * 1.5)),
    delayRisk: scenario.cleanersDown > 0 ? "High" : scenario.newPatients > available ? "Critical" : scenario.newPatients > 0 ? "Medium" : "Low",
  };

  const riskColors = { Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };

  return (
    <div className="space-y-4">
      <div className={`${glassCard} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit size={16} className="text-purple-500" />
          <span className="font-semibold text-slate-700">Ward Micro-Simulation</span>
          <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full ml-auto">What-If Analysis</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "newPatients", label: "New Patients Arriving", icon: "🏥", max: 5 },
            { key: "discharges", label: "Discharges in Next Hour", icon: "🚪", max: 5 },
            { key: "cleanersDown", label: "Cleaners Unavailable", icon: "🧹", max: 3 },
          ].map(ctrl => (
            <div key={ctrl.key} className="bg-white/50 rounded-xl p-4 border border-white/60">
              <div className="text-lg mb-2">{ctrl.icon}</div>
              <div className="text-xs text-slate-600 mb-3 font-medium">{ctrl.label}</div>
              <div className="flex items-center gap-3">
                <button onClick={() => setScenario(s => ({ ...s, [ctrl.key]: Math.max(0, s[ctrl.key] - 1) }))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-sm">−</button>
                <span className="text-xl font-bold text-slate-800 w-6 text-center">{scenario[ctrl.key]}</span>
                <button onClick={() => setScenario(s => ({ ...s, [ctrl.key]: Math.min(ctrl.max, s[ctrl.key] + 1) }))}
                  className="w-7 h-7 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 text-sm">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div className={`${glassCard} p-5`}>
        <div className="font-semibold text-slate-700 mb-4 text-sm">Projected Impact</div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Projected Occupancy", value: `${sim.newOccupied}/${total}`, pct: Math.round((sim.newOccupied / total) * 100), color: "#3b82f6" },
            { label: "Available Beds", value: sim.newAvailable, pct: Math.round((sim.newAvailable / total) * 100), color: "#10b981" },
            { label: "Cleaning Load", value: `${sim.cleaningLoad} beds`, pct: Math.min(100, sim.cleaningLoad * 10), color: "#f59e0b" },
            { label: "Delay Risk", value: sim.delayRisk, pct: null, color: riskColors[sim.delayRisk] },
          ].map(imp => (
            <div key={imp.label} className="bg-white/50 rounded-xl p-4 border border-white/60 text-center">
              <div className="text-lg font-bold" style={{ color: imp.color }}>{imp.value}</div>
              {imp.pct !== null && (
                <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 mb-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${imp.pct}%`, background: imp.color }} />
                </div>
              )}
              <div className="text-[10px] text-slate-500 mt-1">{imp.label}</div>
            </div>
          ))}
        </div>

        {/* Narrative */}
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100 text-xs text-slate-700 space-y-1.5">
          {scenario.newPatients > sim.newAvailable && (
            <div className="flex gap-2"><span>🚨</span><span>Insufficient beds for {scenario.newPatients} incoming patients. Bed crunch imminent.</span></div>
          )}
          {scenario.discharges > 0 && (
            <div className="flex gap-2"><span>✅</span><span>{scenario.discharges} discharge(s) will free up beds, but cleaning pipeline must activate immediately.</span></div>
          )}
          {scenario.cleanersDown > 0 && (
            <div className="flex gap-2"><span>⚠️</span><span>With {scenario.cleanersDown} cleaner(s) unavailable, avg bed turnaround time increases by ~{scenario.cleanersDown * 18} min.</span></div>
          )}
          {scenario.newPatients === 0 && scenario.discharges === 0 && scenario.cleanersDown === 0 && (
            <div className="flex gap-2"><span>ℹ️</span><span>Adjust the controls above to simulate ward scenarios and see projected impact.</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function WardStaffDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [beds] = useState(initialBeds);
  const [alertList, setAlertList] = useState(alerts);
  const unackedCount = alertList.filter(a => !a.ack).length;

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{
      background: "linear-gradient(135deg,#dbeafe 0%,#ede9fe 50%,#fce7f3 100%)",
      fontFamily: "'DM Sans', 'Inter', sans-serif",
    }}>
      <Sidebar active={activeTab} setActive={setActiveTab} alertCount={unackedCount} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header tab={activeTab} />

        <main className="flex-1 overflow-y-auto p-5">
          {activeTab === "overview" && <Overview beds={beds} alerts={alertList} />}
          {activeTab === "bedboard" && <BedBoard beds={beds} />}
          {activeTab === "cleaning" && <Cleaning rooms={cleaningRooms} />}
          {activeTab === "discharges" && <Discharges patients={dischargePatients} />}
          {activeTab === "tasks" && <Tasks tasks={tasks} />}
          {activeTab === "alerts" && <AlertCenter alerts={alertList} setAlerts={setAlertList} />}
          {activeTab === "staff" && <Staff />}
          {activeTab === "simulation" && <Simulation beds={beds} />}
        </main>
      </div>
    </div>
  );
}