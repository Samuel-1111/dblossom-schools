import csv
import json
from pathlib import Path

files = {
    "students": Path("/home/ubuntu/upload/students.csv"),
    "teachers": Path("/home/ubuntu/upload/teachers.csv"),
    "results": Path("/home/ubuntu/upload/results.csv"),
}
for table, path in files.items():
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        report = {
            "table": table,
            "headers": reader.fieldnames,
            "rows": len(rows),
            "distinct": {},
        }
        for field in ("Class", "Subject", "Term", "Session", "Role", "Status"):
            if field in reader.fieldnames:
                report["distinct"][field] = sorted({(row.get(field) or "").strip() for row in rows if (row.get(field) or "").strip()})
        report["blank_rows_by_field"] = {field: sum(1 for row in rows if not (row.get(field) or "").strip()) for field in reader.fieldnames or []}
        print(json.dumps(report, ensure_ascii=False))
