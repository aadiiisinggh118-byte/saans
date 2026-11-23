import AssistantApp from "../../components/AssistantApp.jsx";
import { PageHeading } from "../../components/ui.jsx";

export const metadata = {
  title: "Your air, your day | Saans",
  description: "Live air quality for your city, turned into a plan for your household.",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-page px-5 py-10">
      <PageHeading title="Your air, your day">
        Check the live air quality for your city, tell us who you are planning for, and get a day
        plan, indoor air steps and greener choices that fit.
      </PageHeading>
      <AssistantApp />
    </div>
  );
}
