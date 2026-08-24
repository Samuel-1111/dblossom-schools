import { PublicSubmissions } from "../public-submissions/PublicSubmissions";
import { PublicSectionPage } from "../public-section/PublicSectionPage";

export default function ComplaintPage() {
  return <PublicSectionPage eyebrow="Contact and Complaint" title="We are ready to listen" intro="Send a question, concern, or suggestion to the school administration. Your submission is routed into the protected Admin Complaints module for review."><PublicSubmissions section="complaint" /></PublicSectionPage>;
}
