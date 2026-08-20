import { PortalLogin } from "../portal-login/PortalLogin";

export default function TeacherPortalPage() {
  return <PortalLogin role="teacher" title="Teacher Portal" hint="Sign in to manage your assigned classes, attendance, and grades." identifierLabel="Staff ID" identifierPlaceholder="Enter your staff ID" />;
}
