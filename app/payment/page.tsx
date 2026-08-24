import { PublicSubmissions } from "../public-submissions/PublicSubmissions";
import { PublicSectionPage } from "../public-section/PublicSectionPage";

export default function PaymentPage() {
  return <PublicSectionPage eyebrow="Payment Information" title="Keep your payment record clear" intro="Notify the school after making a payment so the administration can match your details and confirm the record. Please send proof through the school WhatsApp channel after submitting this form."><PublicSubmissions section="payment" /></PublicSectionPage>;
}
