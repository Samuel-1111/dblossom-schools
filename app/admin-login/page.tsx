import { PortalLogin } from "../portal-login/PortalLogin";

export default function AdminLoginPage() {
  return <PortalLogin role="admin" title="Administrator Portal" hint="Sign in to manage students, teachers, classes, announcements, and school records." identifierLabel="Username" identifierPlaceholder="DivineBlossom" />;
}
