import csv
import json
import os
from pathlib import Path
import requests

base = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=representation"}

def request(method, path, **kwargs):
    response = requests.request(method, f"{base}/rest/v1/{path}", headers=headers, timeout=45, **kwargs)
    try:
        payload = response.json()
    except ValueError:
        payload = response.text[:500]
    return response.status_code, payload

rows = list(csv.DictReader(Path("/home/ubuntu/upload/teachers.csv").open(newline="", encoding="utf-8-sig")))
report = {"inserted": 0, "skipped_existing": 0, "failed": []}
for number, row in enumerate(rows, 1):
    full_name = row.get("Full Name", "").strip()
    params = {"full_name": f"eq.{full_name}"}
    status, existing = request("GET", "teachers", params={**params, "limit": "1"})
    if status == 200 and existing:
        report["skipped_existing"] += 1
        continue
    payload = {"full_name": full_name, "email": row.get("Email", "").strip() or None, "phone": row.get("Phone", "").strip() or None, "status": "inactive" if row.get("Status", "").strip().casefold() == "inactive" else "active"}
    status, response = request("POST", "teachers", json=payload)
    if status in (200, 201):
        report["inserted"] += 1
    else:
        report["failed"].append({"row": number, "name": full_name, "reason": response})
print(json.dumps(report, indent=2, ensure_ascii=False))
