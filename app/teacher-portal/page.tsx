import { PortalLogin } from "../portal-login/PortalLogin";

export default function TeacherPortalPage() {
  return <PortalLogin role="teacher" title="Teacher Portal" hint="Sign in to manage your assigned classes, results, and teacher comments." identifierLabel="Staff ID or email" identifierPlaceholder="Enter your staff ID or email" />;
}
