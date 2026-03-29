const BASE_URL = "http://127.0.0.1:5000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getWards: () => request("/wards"),
  getAdmissions: () => request("/admissions"),
  getDischargeQueue: () => request("/discharge"),
  getAlerts: () => request("/alerts"),

  getDoctorDashboard: (doctorName: string) =>
    request(`/doctor-dashboard?doctorName=${encodeURIComponent(doctorName)}`),

  approveDischarge: (patientId: string) =>
    request("/discharge", {
      method: "POST",
      body: JSON.stringify({ patientId }),
    }),

  addPatient: (patient: any) =>
    request("/patients", {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  allocatePatient: (patientId: string, wardId?: string) =>
    request("/allocate", {
      method: "POST",
      body: JSON.stringify(wardId ? { patientId, wardId } : { patientId }),
    }),

  updateVitals: (patientId: string, vitals: any) =>
    request(`/patients/${patientId}/vitals`, {
      method: "PUT",
      body: JSON.stringify(vitals),
    }),

  sendAlert: (alert: {
    source: string;
    patientId?: string;
    message: string;
    severity: string;
  }) =>
    request("/alerts", {
      method: "POST",
      body: JSON.stringify(alert),
    }),

  extendStay: (patientId: string, notes?: string) =>
    request(`/patients/${patientId}/extend-stay`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  sendEmergencyAlert: (patientId: string, message?: string) =>
    request("/alerts", {
      method: "POST",
      body: JSON.stringify({
        source: "doctor",
        patientId,
        message: message || "Emergency alert triggered by doctor",
        severity: "critical",
      }),
    }),

  finalizeDischarge: (patientId: string) =>
    request("/discharge/finalize", {
      method: "POST",
      body: JSON.stringify({ patientId }),
    }),

  getNurseDashboard: (nurseName: string) =>
    request(`/nurse-dashboard?nurseName=${encodeURIComponent(nurseName)}`),
};