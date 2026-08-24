import csv
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any

import requests

BASE = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

FILES = {
    "students": Path("/home/ubuntu/upload/students.csv"),
    "teachers": Path("/home/ubuntu/upload/teachers.csv"),
    "results": Path("/home/ubuntu/upload/results.csv"),
}

def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))

def api(method: str, table: str, *, params: dict[str, str] | None = None, body: Any = None) -> tuple[int, Any]:
    response = requests.request(method, f"{BASE}/rest/v1/{table}", headers=HEADERS, params=params, json=body, timeout=45)
    try:
        payload = response.json()
    except ValueError:
        payload = response.text[:500]
    return response.status_code, payload

def first(table: str, params: dict[str, str]) -> dict[str, Any] | None:
    status, payload = api("GET", table, params={**params, "limit": "1"})
    if status != 200 or not payload:
        return None
    return payload[0]

def create_reference(table: str, payload: dict[str, Any], lookup: dict[str, str]) -> dict[str, Any]:
    existing = first(table, lookup)
    if existing:
        return existing
    status, response = api("POST", table, body=payload)
    if status not in (200, 201) or not response:
        raise RuntimeError(f"{table} creation failed ({status}): {response}")
    return response[0]

def normalized_status(value: str) -> str:
    normalized = value.strip().casefold()
    return "inactive" if normalized == "inactive" else "active"

def number(value: str, field: str) -> float | int:
    try:
        parsed = float(value.strip())
        return int(parsed) if parsed.is_integer() else parsed
    except ValueError as exc:
        raise ValueError(f"{field} is not numeric: {value!r}") from exc

def main() -> None:
    students_csv = read_csv(FILES["students"])
    teachers_csv = read_csv(FILES["teachers"])
    results_csv = read_csv(FILES["results"])
    report: dict[str, Any] = {
        "headers": {name: list(read_csv(path)[0]) if read_csv(path) else [] for name, path in FILES.items()},
        "reference_created": {"classes": [], "academic_sessions": [], "terms": [], "subjects": []},
        "omitted_columns": {
            "students": ["gender", "parent_email", "boarding_status", "password"],
            "teachers": ["staff_id", "subject", "role", "assigned_class", "password"],
            "results": ["student_name", "class_name", "session", "subject_name", "result_total", "average", "overall_percentage", "position"],
        },
        "inserted": {"students": 0, "teachers": 0, "results": 0},
        "failed": {"students": [], "teachers": [], "results": []},
        "warnings": [],
    }

    class_names = sorted({row["Class"].strip() for row in students_csv + results_csv if row.get("Class", "").strip()})
    classes: dict[str, dict[str, Any]] = {}
    for name in class_names:
        item = create_reference("classes", {"name": name, "is_active": True}, {"name": f"eq.{name}"})
        classes[name.casefold()] = item
        if item.get("id") is not None and not first("classes", {"name": f"eq.{name}"}):
            report["reference_created"]["classes"].append(item)

    session_names = sorted({row["Session"].strip() for row in results_csv if row.get("Session", "").strip()})
    sessions: dict[str, dict[str, Any]] = {}
    for name in session_names:
        item = create_reference("academic_sessions", {"name": name, "is_active": False}, {"name": f"eq.{name}"})
        sessions[name.casefold()] = item
        if item.get("is_active") is False:
            report["reference_created"]["academic_sessions"].append(item)

    terms: dict[tuple[str, str], dict[str, Any]] = {}
    for row in results_csv:
        session_name, term_name = row.get("Session", "").strip(), row.get("Term", "").strip()
        if not session_name or not term_name:
            continue
        session = sessions[session_name.casefold()]
        key = (str(session["id"]), term_name.casefold())
        if key not in terms:
            item = create_reference("terms", {"session_id": session["id"], "name": term_name, "is_active": False}, {"session_id": f"eq.{session['id']}", "name": f"eq.{term_name}"})
            terms[key] = item
            report["reference_created"]["terms"].append(item)

    subjects: dict[tuple[str, str], dict[str, Any]] = {}
    for row in results_csv:
        class_name, subject_name = row.get("Class", "").strip(), row.get("Subject", "").strip()
        if not class_name or not subject_name:
            continue
        class_row = classes.get(class_name.casefold())
        if not class_row:
            continue
        key = (str(class_row["id"]), subject_name.casefold())
        if key not in subjects:
            item = create_reference("subjects", {"name": subject_name, "class_id": class_row["id"]}, {"class_id": f"eq.{class_row['id']}", "name": f"eq.{subject_name}"})
            subjects[key] = item
            report["reference_created"]["subjects"].append(item)

    student_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for index, row in enumerate(students_csv, 1):
        admission = row.get("Admission Number", "").strip()
        if not admission:
            admission = f"PENDING-CSV-{index:03d}"
            report["warnings"].append({"table": "students", "row": index, "message": f"Blank Admission Number replaced with {admission}; edit it in Admin Dashboard."})
        full_name = row.get("Full Name", "").strip()
        class_row = classes.get(row.get("Class", "").strip().casefold())
        if not full_name:
            report["failed"]["students"].append({"row": index, "reason": "Full Name is required"})
            continue
        payload = {
            "admission_number": admission,
            "full_name": full_name,
            "class_id": class_row.get("id") if class_row else None,
            "date_of_birth": row.get("Date of Birth", "").strip() or None,
            "guardian_name": row.get("Parent Name", "").strip() or None,
            "guardian_contact": row.get("Parent Phone", "").strip() or None,
            "status": normalized_status(row.get("Status", "")),
        }
        existing = first("students", {"admission_number": f"eq.{admission}"})
        if existing:
            student_by_key[(full_name.casefold(), row.get("Class", "").strip().casefold())] = existing
            continue
        status, response = api("POST", "students", body=payload)
        if status in (200, 201) and response:
            report["inserted"]["students"] += 1
            student_by_key[(full_name.casefold(), row.get("Class", "").strip().casefold())] = response[0]
        else:
            report["failed"]["students"].append({"row": index, "reason": response})

    for index, row in enumerate(teachers_csv, 1):
        payload = {"full_name": row.get("Full Name", "").strip(), "email": row.get("Email", "").strip() or None, "phone": row.get("Phone", "").strip() or None, "status": normalized_status(row.get("Status", ""))}
        if len(payload["full_name"]) < 2:
            report["failed"]["teachers"].append({"row": index, "reason": "Full Name is required"})
            continue
        existing = first("teachers", {"full_name": f"eq.{payload['full_name']}", "email": f"eq.{payload['email']}"}) if payload["email"] else first("teachers", {"full_name": f"eq.{payload['full_name']}"})
        if existing:
            continue
        status, response = api("POST", "teachers", body=payload)
        if status in (200, 201) and response:
            report["inserted"]["teachers"] += 1
        else:
            report["failed"]["teachers"].append({"row": index, "reason": response})

    for index, row in enumerate(results_csv, 1):
        student_name, class_name, subject_name = row.get("Student Name", "").strip(), row.get("Class", "").strip(), row.get("Subject", "").strip()
        student = student_by_key.get((student_name.casefold(), class_name.casefold()))
        class_row = classes.get(class_name.casefold())
        subject = subjects.get((str(class_row["id"]), subject_name.casefold())) if class_row and subject_name else None
        session = sessions.get(row.get("Session", "").strip().casefold())
        term = terms.get((str(session["id"]), row.get("Term", "").strip().casefold())) if session else None
        try:
            if not student:
                raise ValueError("matching student was not found after student import")
            if not subject:
                raise ValueError("matching subject was not found; Subject is blank or not mapped")
            if not term:
                raise ValueError("matching term/session was not found")
            total = number(row.get("Total", ""), "Total")
            payload = {
                "student_id": student["id"], "subject_id": subject["id"], "term_id": term["id"],
                "ca_score": number(row.get("CA Score", ""), "CA Score"), "exam_score": number(row.get("Exam Score", ""), "Exam Score"),
                "total_score": total, "grade": row.get("Grade", "").strip() or None,
                "teacher_comment": row.get("Teacher Comment", "").strip() or None, "principal_comment": row.get("Principal Comment", "").strip() or None,
            }
        except (KeyError, ValueError) as exc:
            report["failed"]["results"].append({"row": index, "reason": str(exc)})
            continue
        status, response = api("POST", "results", body=payload)
        if status in (200, 201):
            report["inserted"]["results"] += 1
        else:
            report["failed"]["results"].append({"row": index, "reason": response})

    report["reference_counts"] = {key: len(value) for key, value in report["reference_created"].items()}
    report["failure_counts"] = {key: len(value) for key, value in report["failed"].items()}
    print(json.dumps(report, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
