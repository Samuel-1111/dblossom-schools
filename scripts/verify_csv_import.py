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

out = {}
for table in ("students", "teachers", "results", "classes", "academic_sessions", "terms", "subjects"):
    status, payload, response_headers = get(table, {"select": "*", "limit": "1"})
    out[table] = {"status": status, "count": response_headers.get("content-range"), "sample": payload[:1] if isinstance(payload, list) else payload}
status, payload, _ = get("students", {"select": "id,admission_number,full_name", "admission_number": "like.PENDING-CSV-*", "limit": "20"})
out["placeholder_students"] = {"status": status, "rows": payload}
report = json.loads(Path("/tmp/csv-import-report.json").read_text())
out["import_report"] = {"inserted": report["inserted"], "failure_counts": report["failure_counts"], "warnings": report["warnings"], "failed": report["failed"]}
print(json.dumps(out, indent=2, ensure_ascii=False))
