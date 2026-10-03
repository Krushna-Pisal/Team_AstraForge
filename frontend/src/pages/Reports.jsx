import { PageTitle, EmptyState } from "../components/ui/Workflow";
export default function Reports() {
  return (
    <div className="page-stack">
      <PageTitle
        title="Reports."
        description="A place for reviewed assessment documents."
      />
      <EmptyState
        title="Report generation is planned"
        description="PDF reports and term sheets are outside the foundation release. You can review real assessment results in session history."
        to="/history"
        action="View assessment history"
      />
    </div>
  );
}
