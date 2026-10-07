import { PortalLogin } from "../portal-login/PortalLogin";

export default function ParentPortalPage() {
  return <PortalLogin role="parent" title="Parent Portal" hint="View your children, fees, results, announcements, assignments, and school messages." identifierLabel="Email or Phone" identifierPlaceholder="Enter your parent email or phone" />;
}
