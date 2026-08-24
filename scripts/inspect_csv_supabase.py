import csv
import json
import os
from pathlib import Path

import requests

FILES = {
    "students": Path("/home/ubuntu/upload/students.csv"),
    "teachers": Path("/home/ubuntu/upload/teachers.csv"),
    "results": Path("/home/ubuntu/upload/results.csv"),
}

base_url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
summary = {"files": {}, "metadata_status": None, "definitions": [], "tables": {}, "probe_status": {}, "probe_samples": {}}

for table, path in FILES.items():
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        summary["files"][table] = {
            "path": str(path),
            "headers": reader.fieldnames,
            "row_count": len(rows),
            "nonempty_counts": {name: sum(1 for row in rows if (row.get(name) or "").strip()) for name in reader.fieldnames or []},
        }

metadata = requests.get(f"{base_url}/rest/v1/", headers=headers, timeout=30)
summary["metadata_status"] = metadata.status_code
if metadata.ok:
    body = metadata.json()
    definitions = body.get("definitions", {})
    summary["definitions"] = sorted(definitions)
    for table, definition in definitions.items():
        properties = definition.get("properties", {})
        summary["tables"][table] = {
            "columns": list(properties),
            "required": definition.get("required", []),
            "definitions": properties,
        }

for table in ("classes", "profiles", "teachers", "students", "subjects", "terms", "results", "portal_credentials"):
    response = requests.get(f"{base_url}/rest/v1/{table}?select=*&limit=2", headers=headers, timeout=30)
    summary["probe_status"][table] = response.status_code
    if response.ok:
        summary["probe_samples"][table] = response.json()
    else:
        summary["probe_samples"][table] = response.text[:300]

print(json.dumps(summary, indent=2, ensure_ascii=False))
