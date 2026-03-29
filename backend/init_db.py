from database import get_connection
import json
import uuid
import random


FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh",
    "Anaya", "Diya", "Aisha", "Meera", "Sana", "Kabir", "Rohan"
]

LAST_NAMES = [
    "Sharma", "Patel", "Verma", "Nair", "Iyer", "Mehta",
    "Singh", "Rao", "Khan", "Joshi"
]

DISEASES = [
    ("Severe Pneumonia", "severe", "w2"),
    ("Heart Attack", "severe", "w6"),
    ("Cardiac Monitoring", "moderate", "w6"),
    ("Chest Pain", "moderate", "w6"),
    ("Pregnancy - Labour", "moderate", "w4"),
    ("Postpartum Care", "mild", "w4"),
    ("Pediatric Fever", "mild", "w3"),
    ("Newborn Observation", "mild", "w3"),
    ("Fracture", "moderate", "w5"),
    ("Spine Injury", "severe", "w5"),
    ("General Fever", "mild", "w1"),
    ("Viral Infection", "mild", "w1"),
]

SYMPTOMS = {
    "Severe Pneumonia": ["breathlessness", "fever"],
    "Heart Attack": ["chest pain", "sweating"],
    "Cardiac Monitoring": ["palpitations"],
    "Chest Pain": ["pain"],
    "Pregnancy - Labour": ["contractions"],
    "Postpartum Care": ["recovery"],
    "Pediatric Fever": ["fever"],
    "Newborn Observation": ["monitoring"],
    "Fracture": ["pain", "swelling"],
    "Spine Injury": ["trauma"],
    "General Fever": ["fever"],
    "Viral Infection": ["weakness"],
}


def random_patient():
    disease, severity, ward_id = random.choice(DISEASES)
    return {
        "id": str(uuid.uuid4()),
        "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "age": random.randint(5, 80),
        "gender": random.choice(["M", "F"]),
        "disease": disease,
        "severity": severity,
        "ward_id": ward_id,
        "symptoms": json.dumps(SYMPTOMS[disease]),
    }


def seed_patients(cur):
    # 1) ADMITTED PATIENTS
    for _ in range(30):
        p = random_patient()

        cur.execute("""
            INSERT INTO patients (
                id, name, age, gender, disease, severity, status,
                symptoms, history, ward_id, ward_name, bed_number,
                heart_rate, oxygen, bp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"],
            p["name"],
            p["age"],
            p["gender"],
            p["disease"],
            p["severity"],
            "admitted",
            p["symptoms"],
            json.dumps([]),
            p["ward_id"],
            None,
            None,
            random.randint(70, 130),
            random.randint(85, 100),
            "120/80"
        ))

        cur.execute("""
            SELECT * FROM beds
            WHERE ward_id = ? AND patient_id IS NULL
            LIMIT 1
        """, (p["ward_id"],))
        bed = cur.fetchone()

        if bed:
            cur.execute(
                "UPDATE beds SET patient_id = ? WHERE id = ?",
                (p["id"], bed["id"])
            )
            cur.execute("""
                UPDATE patients
                SET ward_name = (SELECT name FROM wards WHERE id = ?),
                    bed_number = ?
                WHERE id = ?
            """, (p["ward_id"], bed["bed_number"], p["id"]))

    # 2) ADMISSION QUEUE
    for _ in range(15):
        p = random_patient()

        cur.execute("""
            INSERT INTO patients (
                id, name, age, gender, disease, severity, status,
                symptoms, history, ward_id, ward_name, bed_number,
                heart_rate, oxygen, bp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"],
            p["name"],
            p["age"],
            p["gender"],
            p["disease"],
            p["severity"],
            "waiting",
            p["symptoms"],
            json.dumps([]),
            None,
            None,
            None,
            random.randint(70, 130),
            random.randint(85, 100),
            "120/80"
        ))

        cur.execute(
            "INSERT INTO admission_queue (patient_id) VALUES (?)",
            (p["id"],)
        )

    # 3) DISCHARGE QUEUE
    cur.execute("""
        SELECT id FROM patients
        WHERE ward_id IS NOT NULL
        LIMIT 5
    """)
    patients = cur.fetchall()

    for row in patients:
        cur.execute("""
            INSERT OR IGNORE INTO discharge_queue (patient_id)
            VALUES (?)
        """, (row["id"],))

        cur.execute("""
            UPDATE patients
            SET status = 'pre-discharge'
            WHERE id = ?
        """, (row["id"],))
def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS wards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS beds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ward_id TEXT NOT NULL,
        bed_number TEXT NOT NULL,
        patient_id TEXT,
        FOREIGN KEY (ward_id) REFERENCES wards(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        disease TEXT,
        severity TEXT,
        status TEXT,
        symptoms TEXT,
        history TEXT,
        ward_id TEXT,
        ward_name TEXT,
        bed_number TEXT,
        heart_rate INTEGER,
        oxygen INTEGER,
        bp TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS admission_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS discharge_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        source TEXT,
        patient_id TEXT,
        message TEXT,
        severity TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("SELECT COUNT(*) as count FROM wards")
    count = cur.fetchone()["count"]

    if count == 0:
        wards = [
            ("w1", "General Ward A"),
            ("w2", "ICU"),
            ("w3", "Pediatrics"),
            ("w4", "Maternity"),
            ("w5", "Orthopaedics"),
            ("w6", "Cardiology"),
        ]
        cur.executemany("INSERT INTO wards (id, name) VALUES (?, ?)", wards)

        for i in range(1, 31):
            cur.execute(
                "INSERT INTO beds (ward_id, bed_number, patient_id) VALUES (?, ?, ?)",
                ("w1", f"GWA-{i:02d}", None)
            )
        for i in range(1, 13):
            cur.execute(
                "INSERT INTO beds (ward_id, bed_number, patient_id) VALUES (?, ?, ?)",
                ("w2", f"ICU-{i:02d}", None)
            )
        for i in range(1, 21):
            cur.execute(
                "INSERT INTO beds (ward_id, bed_number, patient_id) VALUES (?, ?, ?)",
                ("w3", f"PED-{i:02d}", None)
            )
        for i in range(1, 17):
            cur.execute(
                "INSERT INTO beds (ward_id, bed_number, patient_id) VALUES (?, ?, ?)",
                ("w4", f"MAT-{i:02d}", None)
            )
        for i in range(1, 19):
            cur.execute(
                "INSERT INTO beds (ward_id, bed_number, patient_id) VALUES (?, ?, ?)",
                ("w5", f"ORT-{i:02d}", None)
            )
        for i in range(1, 15):
            cur.execute(
                "INSERT INTO beds (ward_id, bed_number, patient_id) VALUES (?, ?, ?)",
                ("w6", f"CAR-{i:02d}", None)
            )

    # reset dynamic data every time so reseeding works
    cur.execute("DELETE FROM admission_queue")
    cur.execute("DELETE FROM discharge_queue")
    cur.execute("DELETE FROM alerts")
    cur.execute("DELETE FROM patients")
    cur.execute("UPDATE beds SET patient_id = NULL")

    seed_patients(cur)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded.")