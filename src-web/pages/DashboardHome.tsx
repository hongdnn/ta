import { DashboardPanels } from "../components/DashboardPanels";

export default function DashboardHome() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly insights from student interactions with the AI assistant
        </p>
      </div>
      <DashboardPanels />
    </div>
  );
}
