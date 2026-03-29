from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import json
from database import get_connection
from init_db import init_db
from ultralytics import YOLO
import cv2
import numpy as np
import time
#from tensorflow.keras.models import load_model
#clean_model = load_model("model/cleaning_model.h5")

app = Flask(__name__)
model = YOLO("model/yolov8n-cls.pt")
last_seen = {}
THRESHOLD = 15
CORS(app)

init_db()

DOCTOR_WARD_MAP = {
    "Dr. Khan": "General Ward A",
    "Dr. Sharma": "ICU",
    "Dr. Mehta": "Cardiology",
    "Dr. Iyer": "Orthopaedics",
    "Dr. Riya": "Maternity",
    "Dr. Anjali": "Pediatrics",
}

NURSE_WARD_MAP = {
    "Nurse Deepa": "ICU",
    "Nurse Prashant": "Cardiology",
    "Nurse Lalitha": "General Ward A",
    "Nurse Firoz": "Orthopaedics",
    "Nurse Rekha": "Maternity",
}

def normalize_patient_row(pr):
    return {
        "id": pr["id"],
        "name": pr["name"],
        "age": pr["age"],
        "gender": pr["gender"],
        "disease": pr["disease"],
        "severity": pr["severity"],
        "status": pr["status"],
        "wardId": pr["ward_id"],
        "wardName": pr["ward_name"],
        "bedNumber": pr["bed_number"],
        "symptoms": json.loads(pr["symptoms"]) if pr["symptoms"] else [],
        "history": json.loads(pr["history"]) if pr["history"] else [],
        "vitals": {
            "heartRate": pr["heart_rate"],
            "oxygen": pr["oxygen"],
            "bp": pr["bp"],
        },
    }

def predict_bed(frame):
    results = model(frame)

    probs = results[0].probs.data.cpu().numpy()
    class_id = probs.argmax()
    confidence = float(probs[class_id])

    label = results[0].names[class_id]

    if label.lower() in ["occupied", "occupied_bed"]:
        return "occupied", confidence
    else:
        return "available", confidence
    

def rule_based_status(bed, cur):
    # Case 1: Occupied
    if bed["patient_id"]:
        
        # Check discharge delay
        cur.execute("""
            SELECT * FROM discharge_queue
            WHERE patient_id = ?
        """, (bed["patient_id"],))
        
        dq = cur.fetchone()

        if dq:
            return "occupied_delayed"

        return "occupied"

    # Case 2: Cleaning (you can enhance later)
    # (For now we simulate using random or timestamp)
    
    return "available"

#def predict_clean(frame):
    img = cv2.resize(frame, (224, 224))
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    #pred = clean_model.predict(img)[0][0]

    if pred > 0.5:
        return "messy", float(pred)
    else:
        return "clean", float(1 - pred)
    
cleaning_alerts = {}


def fetch_wards():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM wards")
    ward_rows = [dict(r) for r in cur.fetchall()]
    result = []

    for ward in ward_rows:
        cur.execute("SELECT * FROM beds WHERE ward_id = ?", (ward["id"],))
        beds = [dict(r) for r in cur.fetchall()]

        final_beds = []
        occupied_beds = 0
        available_beds = 0
        cleaning_beds = 0

        for bed in beds:
            patient = None
            if bed["patient_id"]:
                cur.execute("SELECT * FROM patients WHERE id = ?", (bed["patient_id"],))
                row = cur.fetchone()
                if row:
                    patient = normalize_patient_row(dict(row))

            status = rule_based_status(bed, cur)

            if status == "occupied":
                occupied_beds += 1
            else:
                available_beds += 1

            final_beds.append({
                "bedNumber": bed["bed_number"],
                "status": status,
                "patient": patient,
            })

        total_beds = len(beds)
        occupancy = round((occupied_beds / total_beds) * 100) if total_beds else 0

        if occupancy >= 95:
            risk_level = "critical"
        elif occupancy >= 85:
            risk_level = "high"
        elif occupancy >= 60:
            risk_level = "medium"
        else:
            risk_level = "low"

        result.append({
            "id": ward["id"],
            "name": ward["name"],
            "totalBeds": total_beds,
            "occupiedBeds": occupied_beds,
            "availableBeds": available_beds,
            "cleaning": cleaning_beds,
            "occupancy": occupancy,
            "riskLevel": risk_level,
            "cleaningStartTime": None,
            "lastAdmissionTime": None,
            "beds": final_beds,
        })

    conn.close()
    return result

@app.route("/")
def home():
    return jsonify({"message": "WardWatch Flask backend running"})


@app.route("/bed-status/<bed_number>", methods=["GET"])
def get_bed_status(bed_number):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM beds WHERE bed_number = ?
    """, (bed_number,))

    bed = cur.fetchone()

    if not bed:
        return jsonify({"error": "Bed not found"}), 404

    status = rule_based_status(dict(bed), cur)

    conn.close()

    return jsonify({
        "bedNumber": bed_number,
        "status": status,
        "source": "rule-based"
    })

@app.route("/smart-bed-status", methods=["POST"])
def smart_status():

    has_cctv = request.form.get("hasCCTV") == "true"
    bed_number = request.form.get("bedNumber")

    if has_cctv:
        file = request.files["image"]

        img = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(img, cv2.IMREAD_COLOR)

        status, confidence = predict_bed(frame)

        return jsonify({
            "bedNumber": bed_number,
            "status": status,
            "confidence": confidence,
            "source": "AI"
        })

    else:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM beds WHERE bed_number = ?", (bed_number,))
        bed = cur.fetchone()

        status = rule_based_status(dict(bed), cur)

        conn.close()

        return jsonify({
            "bedNumber": bed_number,
            "status": status,
            "source": "rule-based"
        })


@app.route("/patients", methods=["POST"])
def add_patient():
    data = request.json or {}
    patient_id = str(uuid.uuid4())

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO patients (
            id, name, age, gender, disease, severity, status,
            symptoms, history, ward_id, ward_name, bed_number,
            heart_rate, oxygen, bp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_id,
        data.get("name", ""),
        int(data.get("age", 0)),
        data.get("gender", "M"),
        data.get("disease", ""),
        data.get("severity", "moderate"),
        "waiting",
        json.dumps(data.get("symptoms", [])),
        json.dumps(data.get("history", [])),
        None,
        None,
        None,
        data.get("vitals", {}).get("heartRate", 90),
        data.get("vitals", {}).get("oxygen", 98),
        data.get("vitals", {}).get("bp", "120/80"),
    ))

    cur.execute(
        "INSERT INTO admission_queue (patient_id) VALUES (?)",
        (patient_id,)
    )

    conn.commit()

    cur.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    patient = normalize_patient_row(dict(cur.fetchone()))

    conn.close()
    return jsonify({"message": "Patient added", "patient": patient}), 201


@app.route("/admissions", methods=["GET"])
def get_admissions():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT p.*
        FROM admission_queue aq
        JOIN patients p ON aq.patient_id = p.id
        ORDER BY
            CASE p.severity
                WHEN 'severe' THEN 1
                WHEN 'moderate' THEN 2
                WHEN 'mild' THEN 3
                ELSE 4
            END,
            aq.created_at ASC
    """)

    rows = [normalize_patient_row(dict(r)) for r in cur.fetchall()]
    conn.close()
    return jsonify(rows)

def recommend_ward_for_patient(patient):
    disease = (patient.get("disease") or "").lower()
    severity = (patient.get("severity") or "").lower()
    gender = (patient.get("gender") or "").upper()
    age = int(patient.get("age") or 0)

    # ICU conditions
    icu_keywords = [
        "heart attack", "cardiac arrest", "stroke", "sepsis",
        "respiratory failure", "severe pneumonia", "critical trauma",
        "ventilator", "shock", "icu", "unstable"
    ]

    # Cardiology conditions
    cardio_keywords = [
        "chest pain", "arrhythmia", "palpitation", "cardiac",
        "heart failure", "hypertension emergency", "angina", "myocardial"
    ]

    # Maternity conditions
    maternity_keywords = [
        "pregnancy", "pregnant", "labour", "labor", "delivery",
        "postpartum", "antenatal", "c-section", "maternity"
    ]

    # Pediatrics conditions
    pediatric_keywords = [
        "pediatric", "paediatric", "child", "infant", "newborn",
        "neonate", "baby"
    ]

    # Orthopaedics conditions
    ortho_keywords = [
        "fracture", "bone", "orthopedic", "orthopaedic",
        "dislocation", "ligament", "spine injury", "joint injury", "trauma"
    ]

    # Highest priority: severity based ICU override
    if severity == "severe":
        for word in icu_keywords + cardio_keywords:
            if word in disease:
                return ["w2", "w6", "w1"]   # ICU, Cardiology, General
        return ["w2", "w1"]  # ICU first for severe unknown cases

    # Disease keyword routing
    if any(word in disease for word in maternity_keywords):
        if gender == "F":
            return ["w4", "w1"]  # Maternity, fallback General

    if any(word in disease for word in pediatric_keywords) or age <= 14:
        return ["w3", "w1"]  # Pediatrics, fallback General

    if any(word in disease for word in ortho_keywords):
        return ["w5", "w1"]  # Orthopaedics, fallback General

    if any(word in disease for word in cardio_keywords):
        return ["w6", "w2", "w1"]  # Cardiology, ICU, General

    if any(word in disease for word in icu_keywords):
        return ["w2", "w6", "w1"]  # ICU, Cardiology, General

    return ["w1", "w2"]  # Default fallback

def find_best_available_bed(cur, preferred_ward_ids):
    for ward_id in preferred_ward_ids:
        cur.execute("""
            SELECT * FROM beds
            WHERE ward_id = ? AND patient_id IS NULL
            LIMIT 1
        """, (ward_id,))
        bed = cur.fetchone()
        if bed:
            return bed

    return None

@app.route("/allocate", methods=["POST"])
def allocate_patient():
    data = request.json or {}
    patient_id = data.get("patientId")
    requested_ward_id = data.get("wardId")  # optional manual override

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    patient_row = cur.fetchone()

    if not patient_row:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    patient = dict(patient_row)

    # If frontend explicitly requests a ward, try that first.
    if requested_ward_id:
        preferred_wards = [requested_ward_id]
    else:
        preferred_wards = recommend_ward_for_patient(patient)

    bed = find_best_available_bed(cur, preferred_wards)

    # Fallback to recommendation list if requested ward is full
    if not bed and requested_ward_id:
        fallback_wards = recommend_ward_for_patient(patient)
        if requested_ward_id not in fallback_wards:
            fallback_wards = [requested_ward_id] + fallback_wards
        bed = find_best_available_bed(cur, fallback_wards)

    if not bed:
        conn.close()
        return jsonify({"error": "No suitable bed available"}), 400

    cur.execute("SELECT name FROM wards WHERE id = ?", (bed["ward_id"],))
    ward = cur.fetchone()

    if not ward:
        conn.close()
        return jsonify({"error": "Ward not found"}), 404

    cur.execute(
        "UPDATE beds SET patient_id = ? WHERE id = ?",
        (patient_id, bed["id"])
    )

    cur.execute(
        "DELETE FROM admission_queue WHERE patient_id = ?",
        (patient_id,)
    )

    cur.execute("""
        UPDATE patients
        SET status = ?, ward_id = ?, ward_name = ?, bed_number = ?
        WHERE id = ?
    """, (
        "admitted",
        bed["ward_id"],
        ward["name"],
        bed["bed_number"],
        patient_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "message": "Patient allocated",
        "wardId": bed["ward_id"],
        "wardName": ward["name"],
        "bedNumber": bed["bed_number"]
    })

@app.route("/wards", methods=["GET"])
def get_wards():
    return jsonify(fetch_wards())


@app.route("/patients/<patient_id>/vitals", methods=["PUT"])
def update_vitals(patient_id):
    data = request.json or {}

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE patients
        SET heart_rate = ?, oxygen = ?, bp = ?
        WHERE id = ?
    """, (
        data.get("heartRate", 90),
        data.get("oxygen", 98),
        data.get("bp", "120/80"),
        patient_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Vitals updated"})

#@app.route("/detect-cleaning", methods=["POST"])
#def detect_cleaning():
    file = request.files["image"]
    bed_number = request.form.get("bedNumber")

    img = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(img, cv2.IMREAD_COLOR)

    #status, confidence = predict_clean(frame)

    if status == "messy":
        cleaning_alerts[bed_number] = {
            "status": "pending",
            "confidence": confidence
        }

        # 🔥 ADD ALERT INTO DATABASE
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO alerts (id, source, message, severity)
            VALUES (?, ?, ?, ?)
        """, (
            str(uuid.uuid4()),
            "cleaning",
            f"Room {bed_number} is messy — cleaning required",
            "critical"
        ))

        conn.commit()
        conn.close()

    return jsonify({
        "bedNumber": bed_number,
        "cleanliness": status,
        "confidence": confidence
    })

@app.route("/resolve-cleaning", methods=["POST"])
def resolve_cleaning():
    bed_number = request.json.get("bedNumber")

    if bed_number in cleaning_alerts:
        del cleaning_alerts[bed_number]

    return jsonify({"message": "Cleaning completed"})

@app.route("/cleaning-alerts", methods=["GET"])
def get_cleaning_alerts():
    return jsonify(cleaning_alerts)

@app.route("/doctor-dashboard", methods=["GET"])
def get_doctor_dashboard():
    doctor_name = request.args.get("doctorName")

    if not doctor_name:
        return jsonify({"error": "doctorName is required"}), 400

    ward_name = DOCTOR_WARD_MAP.get(doctor_name)
    if not ward_name:
        return jsonify({"error": "Doctor not mapped to a ward"}), 404

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM patients
        WHERE ward_name = ?
        ORDER BY
            CASE status
                WHEN 'critical' THEN 1
                WHEN 'monitoring' THEN 2
                WHEN 'stable' THEN 3
                WHEN 'pre-discharge' THEN 4
                ELSE 5
            END,
            name ASC
    """, (ward_name,))
    patients = [normalize_patient_row(dict(r)) for r in cur.fetchall()]

    cur.execute("SELECT id FROM wards WHERE name = ?", (ward_name,))
    ward_row = cur.fetchone()

    cur.execute("""
        SELECT COUNT(*) AS count
        FROM beds b
        JOIN wards w ON b.ward_id = w.id
        WHERE w.name = ? AND b.patient_id IS NOT NULL
    """, (ward_name,))
    occupied = cur.fetchone()["count"]

    cur.execute("""
        SELECT COUNT(*) AS count
        FROM beds b
        JOIN wards w ON b.ward_id = w.id
        WHERE w.name = ? AND b.patient_id IS NULL
    """, (ward_name,))
    available = cur.fetchone()["count"]

    conn.close()

    return jsonify({
        "doctorName": doctor_name,
        "wardId": ward_row["id"] if ward_row else None,
        "wardName": ward_name,
        "patients": patients,
        "occupiedBeds": occupied,
        "availableBeds": available,
        "totalPatients": len(patients),
    })

@app.route("/alerts", methods=["POST"])
def add_alert():
    data = request.json or {}

    conn = get_connection()
    cur = conn.cursor()

    alert_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO alerts (id, source, patient_id, message, severity)
        VALUES (?, ?, ?, ?, ?)
    """, (
        alert_id,
        data.get("source", "system"),
        data.get("patientId"),
        data.get("message", ""),
        data.get("severity", "medium")
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Alert added"}), 201


@app.route("/alerts", methods=["GET"])
def get_alerts():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM alerts ORDER BY created_at DESC")

    rows = []
    for r in cur.fetchall():
        row = dict(r)
        rows.append({
            "id": row["id"],
            "type": "system" if row["source"] not in ["occupancy", "cleaning", "discharge", "queue", "system"] else row["source"],
            "title": (row["source"] or "system").title() + " Alert",
            "message": row["message"],
            "severity": row["severity"],
            "resolved": False,
            "timestamp": row["created_at"],
        })

    conn.close()
    return jsonify(rows)

@app.route("/detect-bed", methods=["POST"])
def detect_bed():
    file = request.files["image"]
    bed_number = request.form.get("bedNumber")

    img = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(img, cv2.IMREAD_COLOR)

    status, confidence = predict_bed(frame)

    conn = get_connection()
    cur = conn.cursor()

    # UPDATE BED STATUS IN DB
    if status == "available":
        cur.execute(
            "UPDATE beds SET patient_id = NULL WHERE bed_number = ?",
            (bed_number,)
        )

    conn.commit()
    conn.close()

    return jsonify({
        "bedNumber": bed_number,
        "status": status,
        "confidence": confidence
    })


@app.route("/discharge", methods=["POST"])
def approve_discharge():
    data = request.json or {}
    patient_id = data.get("patientId")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT OR IGNORE INTO discharge_queue (patient_id) VALUES (?)",
        (patient_id,)
    )

    cur.execute("""
        UPDATE patients
        SET status = ?
        WHERE id = ?
    """, ("pre-discharge", patient_id))

    alert_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO alerts (id, source, patient_id, message, severity)
        VALUES (?, ?, ?, ?, ?)
    """, (
        alert_id,
        "doctor",
        patient_id,
        "Patient approved for discharge and moved to discharge queue",
        "medium"
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Patient approved for discharge"})

@app.route("/discharge", methods=["GET"])
def get_discharge_queue():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT p.*
        FROM discharge_queue dq
        JOIN patients p ON dq.patient_id = p.id
        ORDER BY dq.created_at ASC
    """)

    rows = [normalize_patient_row(dict(r)) for r in cur.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route("/discharge/finalize", methods=["POST"])
def finalize_discharge():
    data = request.json or {}
    patient_id = data.get("patientId")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE beds SET patient_id = NULL WHERE patient_id = ?",
        (patient_id,)
    )

    cur.execute("""
        UPDATE patients
        SET status = ?, ward_id = NULL, ward_name = NULL, bed_number = NULL
        WHERE id = ?
    """, ("discharged", patient_id))

    cur.execute(
        "DELETE FROM discharge_queue WHERE patient_id = ?",
        (patient_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "Discharge finalized"})

@app.route("/patients/<patient_id>/extend-stay", methods=["POST"])
def extend_stay(patient_id):
    data = request.json or {}
    notes = data.get("notes", "Stay extended by attending doctor")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    patient = cur.fetchone()

    if not patient:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    current_history = json.loads(patient["history"]) if patient["history"] else []
    current_history.append(notes)

    cur.execute("""
        UPDATE patients
        SET history = ?, status = ?
        WHERE id = ?
    """, (
        json.dumps(current_history),
        "monitoring",
        patient_id
    ))

    alert_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO alerts (id, source, patient_id, message, severity)
        VALUES (?, ?, ?, ?, ?)
    """, (
        alert_id,
        "doctor",
        patient_id,
        "Patient stay extended by doctor",
        "medium"
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "Stay extended successfully"})

@app.route("/nurse-dashboard", methods=["GET"])
def get_nurse_dashboard():
    nurse_name = request.args.get("nurseName")

    if not nurse_name:
        return jsonify({"error": "nurseName is required"}), 400

    ward_name = NURSE_WARD_MAP.get(nurse_name)
    if not ward_name:
        return jsonify({"error": "Nurse not mapped to a ward"}), 404

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM patients
        WHERE ward_name = ?
        ORDER BY
            CASE status
                WHEN 'critical' THEN 1
                WHEN 'monitoring' THEN 2
                WHEN 'stable' THEN 3
                WHEN 'pre-discharge' THEN 4
                ELSE 5
            END,
            name ASC
    """, (ward_name,))
    patients = [normalize_patient_row(dict(r)) for r in cur.fetchall()]

    cur.execute("SELECT id FROM wards WHERE name = ?", (ward_name,))
    ward_row = cur.fetchone()

    cur.execute("""
        SELECT COUNT(*) AS count
        FROM beds b
        JOIN wards w ON b.ward_id = w.id
        WHERE w.name = ? AND b.patient_id IS NOT NULL
    """, (ward_name,))
    occupied = cur.fetchone()["count"]

    cur.execute("""
        SELECT COUNT(*) AS count
        FROM beds b
        JOIN wards w ON b.ward_id = w.id
        WHERE w.name = ? AND b.patient_id IS NULL
    """, (ward_name,))
    available = cur.fetchone()["count"]

    conn.close()

    return jsonify({
        "nurseName": nurse_name,
        "wardId": ward_row["id"] if ward_row else None,
        "wardName": ward_name,
        "patients": patients,
        "occupiedBeds": occupied,
        "availableBeds": available,
    })

if __name__ == "__main__":
    print("Flask backend starting on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
