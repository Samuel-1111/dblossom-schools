import json
import requests

base = "http://127.0.0.1:3000"
session = requests.Session()
login = session.post(f"{base}/api/admin-login", json={"identifier": "DivineBlossom", "password": "DBMS"}, timeout=30)
result = {"login_status": login.status_code, "login": login.json()}
for table in ("students", "teachers"):
    response = session.get(f"{base}/api/admin/records", params={"table": table}, timeout=30)
    payload = response.json()
    result[f"{table}_get_status"] = response.status_code
    result[f"{table}_count"] = len(payload.get("data", []))
    row = payload.get("data", [])[0]
    if table == "students":
        edit_payload = {"admission_number": row["admission_number"], "full_name": row["full_name"], "class_id": row.get("class_id"), "guardian_name": row.get("guardian_name"), "guardian_contact": row.get("guardian_contact"), "status": row.get("status")}
    else:
        edit_payload = {"full_name": row["full_name"], "email": row.get("email"), "phone": row.get("phone"), "status": row.get("status")}
    edited = session.patch(f"{base}/api/admin/records", params={"table": table, "id": row["id"]}, json=edit_payload, timeout=30)
    result[f"{table}_patch_status"] = edited.status_code
    result[f"{table}_patch_ok"] = edited.ok
    reopened = session.get(f"{base}/api/admin/records", params={"table": table}, timeout=30)
    result[f"{table}_reopen_status"] = reopened.status_code
    result[f"{table}_reopen_count"] = len(reopened.json().get("data", []))
print(json.dumps(result, indent=2))
