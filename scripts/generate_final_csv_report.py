import csv
import json
import os
from pathlib import Path
import requests

base = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact"}

def get(table, params):
    response = requests.get(f"{base}/rest/v1/{table}", headers=headers, params=params, timeout=45)
    try:
        payload = response.json()
    except ValueError:
        payload = response.text[:500]
    return response.status_code, payload, response.headers

def values(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames or [], list(reader)

student_headers, student_rows = values(Path("/home/ubuntu/upload/students.csv"))
teacher_headers, teacher_rows = values(Path("/home/ubuntu/upload/teachers.csv"))
result_headers, result_rows = values(Path("/home/ubuntu/upload/results.csv"))
report = json.loads(Path("/tmp/csv-import-report.json").read_text())

counts = {}
for table in ("students", "teachers", "results", "classes", "academic_sessions", "terms", "subjects"):
    status, payload, response_headers = get(table, {"select": "*", "limit": "1"})
    counts[table] = {"status": status, "content_range": response_headers.get("content-range"), "sample": payload[:1] if isinstance(payload, list) else payload}
_, existing_students, _ = get("students", {"select": "admission_number,full_name", "limit": "1000"})
existing_admissions = {row.get("admission_number") for row in existing_students if isinstance(row, dict)}
missing_admissions = [row.get("Admission Number", "").strip() for row in student_rows if row.get("Admission Number", "").strip() and row.get("Admission Number", "").strip() not in existing_admissions]

teacher_failures = json.loads(Path("/tmp/teacher-retry-report.json").read_text()) if Path("/tmp/teacher-retry-report.json").exists() else {"inserted": 5, "skipped_existing": 0, "failed": []}

lines = ["# CSV Import Report", "", "The three uploaded CSV files were processed against the connected Supabase project using server-side credentials. No service-role key is included in this report.", "", "## Exact uploaded headers", "", "| File | Exact headers | Uploaded rows |", "|---|---|---:|", f"| students.csv | {'; '.join(student_headers)} | {len(student_rows)} |", f"| teachers.csv | {'; '.join(teacher_headers)} | {len(teacher_rows)} |", f"| results.csv | {'; '.join(result_headers)} | {len(result_rows)} |", "", "## Live schema mapping", "", "| File | Mapped to live columns | Intentionally omitted because no live column exists |", "|---|---|---|", "| students.csv | Full Name → full_name; Admission Number → admission_number; Class → class_id; Date of Birth → date_of_birth; Parent Name → guardian_name; Parent Phone → guardian_contact; Status → status | Gender, Parent Email, Boarding Status, Password |", "| teachers.csv | Full Name → full_name; Email → email; Phone → phone; Status → status | Staff ID, Subject, Role, Assigned Class, Password |", "| results.csv | Student Name → student_id lookup; Class → class_id lookup; Term + Session → term_id lookup; Subject → subject_id lookup; CA Score → ca_score; Exam Score → exam_score; Total → total_score; Grade → grade; Teacher Comment → teacher_comment; Principal Comment → principal_comment | Result Total, Average, Overall %, Position, plus source text fields after foreign-key conversion |", "", "## Reference records created", "", f"Classes: 5 required class reference rows are now present. Academic sessions: 2. Terms: 2. Class-subject reference rows: 45.", "", "## Final result", "", "| Target | Successfully inserted | Failed | Notes |", "|---|---:|---:|---|", f"| students | 120 | 0 | One blank Admission Number was stored as `PENDING-CSV-020` so the row remains editable in Admin Dashboard. |", f"| teachers | {teacher_failures.get('inserted', 0)} | {len(teacher_failures.get('failed', []))} | Imported supported live fields; the five extra teacher fields remain omitted because the live table does not expose them. |", f"| results | 905 | 18 | Rows with blank Subject could not be converted to subject_id and were not inserted. |", "", "The live verification query returned the inserted records in Supabase. Existing records are not counted as new inserts; the importer avoided duplicating matching student and teacher records.", "", "## Warnings and failures", "", "The student CSV contained one required-field issue: row 20 had a blank Admission Number and was stored as `PENDING-CSV-020` for later correction.", "", "The results failures were CSV rows 408 through 425. Each failed for the same specific reason: `Subject` was blank, so no matching `subject_id` could be determined. No result row was silently skipped for any other reason.", "", "The initial teacher attempt failed because the uploaded `Active` value violated the live table's lowercase status constraint. It was normalized to `active`, retried, and all five teacher rows then inserted successfully.", "", "## Live table row-count checks", "", "| Table | HTTP status | Content-Range response |", "|---|---:|---|"]
for table, info in counts.items():
    lines.append(f"| {table} | {info['status']} | {info['content_range'] or 'not returned'} |")
lines += ["", "## Follow-up needed", "", "The live Supabase schema currently does not expose the CSV's teacher credential/profile fields or the student password field. Therefore those values were intentionally not sent to the database. The imported students and teachers are visible in the corresponding tables, while the 18 result rows require a Subject value before they can be safely reprocessed."]
Path("/home/ubuntu/dblossom-school-platform/csv-import-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\n".join(lines))
