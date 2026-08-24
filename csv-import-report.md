# CSV Import Report

The three uploaded CSV files were processed against the connected Supabase project using server-side credentials. No service-role key is included in this report.

## Exact uploaded headers

| File | Exact headers | Uploaded rows |
|---|---|---:|
| students.csv | Full Name; Admission Number; Class; Gender; Date of Birth; Parent Name; Parent Phone; Parent Email; Boarding Status; Password; Status | 122 |
| teachers.csv | Full Name; Staff ID; Email; Phone; Subject; Role; Assigned Class; Password; Status | 5 |
| results.csv | Student Name; Class; Term; Session; Subject; CA Score; Exam Score; Total; Grade; Result Total; Average; Overall %; Position; Teacher Comment; Principal Comment | 923 |

## Live schema mapping

| File | Mapped to live columns | Intentionally omitted because no live column exists |
|---|---|---|
| students.csv | Full Name → full_name; Admission Number → admission_number; Class → class_id; Date of Birth → date_of_birth; Parent Name → guardian_name; Parent Phone → guardian_contact; Status → status | Gender, Parent Email, Boarding Status, Password |
| teachers.csv | Full Name → full_name; Email → email; Phone → phone; Status → status | Staff ID, Subject, Role, Assigned Class, Password |
| results.csv | Student Name → student_id lookup; Class → class_id lookup; Term + Session → term_id lookup; Subject → subject_id lookup; CA Score → ca_score; Exam Score → exam_score; Total → total_score; Grade → grade; Teacher Comment → teacher_comment; Principal Comment → principal_comment | Result Total, Average, Overall %, Position, plus source text fields after foreign-key conversion |

## Reference records created

Classes: 5 required class reference rows are now present. Academic sessions: 2. Terms: 2. Class-subject reference rows: 45.

## Final result

| Target | Successfully inserted | Failed | Notes |
|---|---:|---:|---|
| students | 120 | 0 | One blank Admission Number was stored as `PENDING-CSV-020` so the row remains editable in Admin Dashboard. |
| teachers | 5 | 0 | Imported supported live fields; the five extra teacher fields remain omitted because the live table does not expose them. |
| results | 905 | 18 | Rows with blank Subject could not be converted to subject_id and were not inserted. |

The live verification query returned the inserted records in Supabase. Existing records are not counted as new inserts; the importer avoided duplicating matching student and teacher records.

## Warnings and failures

The student CSV contained one required-field issue: row 20 had a blank Admission Number and was stored as `PENDING-CSV-020` for later correction.

The results failures were CSV rows 408 through 425. Each failed for the same specific reason: `Subject` was blank, so no matching `subject_id` could be determined. No result row was silently skipped for any other reason.

The initial teacher attempt failed because the uploaded `Active` value violated the live table's lowercase status constraint. It was normalized to `active`, retried, and all five teacher rows then inserted successfully.

## Live table row-count checks

| Table | HTTP status | Content-Range response |
|---|---:|---|
| students | 206 | 0-0/120 |
| teachers | 206 | 0-0/5 |
| results | 206 | 0-0/905 |
| classes | 206 | 0-0/5 |
| academic_sessions | 206 | 0-0/2 |
| terms | 206 | 0-0/2 |
| subjects | 206 | 0-0/45 |

## Follow-up needed

The live Supabase schema currently does not expose the CSV's teacher credential/profile fields or the student password field. Therefore those values were intentionally not sent to the database. The imported students and teachers are visible in the corresponding tables, while the 18 result rows require a Subject value before they can be safely reprocessed.
