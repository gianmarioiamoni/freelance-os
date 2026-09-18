// src/features/settings/WorkspaceSettingsView.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import type { WorkspaceSettingsPageData } from "@/features/settings/load-settings";
import type { WorkspaceMemberRole } from "@/domain/persistence-types";
import type { JSX } from "react";

type WorkspaceSettingsViewProps = {
  data: WorkspaceSettingsPageData;
};

function formatMemberRole(role: WorkspaceMemberRole): string {
  return role === "OWNER" ? "Owner" : "Member";
}

function SettingsDefinitionList({
  items,
}: {
  items: ReadonlyArray<{ term: string; description: string }>;
}): JSX.Element {
  return (
    <dl className="grid gap-4">
      {items.map((item) => (
        <div key={item.term} className="grid gap-1">
          <dt className="text-sm font-medium">{item.term}</dt>
          <dd className="text-sm text-muted-foreground">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WorkspaceSettingsView({
  data,
}: WorkspaceSettingsViewProps): JSX.Element {
  return (
    <section className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Account and workspace information for this workspace."
      />
      <PageContent>
        <div className="grid gap-8">
          <section className="grid gap-3" aria-labelledby="settings-account-heading">
            <h2 id="settings-account-heading" className="text-base font-medium">
              Account
            </h2>
            <SettingsDefinitionList
              items={[
                { term: "Name", description: data.accountName },
                { term: "Email", description: data.accountEmail },
              ]}
            />
          </section>

          <section
            className="grid gap-3"
            aria-labelledby="settings-workspace-heading"
          >
            <h2 id="settings-workspace-heading" className="text-base font-medium">
              Workspace
            </h2>
            <SettingsDefinitionList
              items={[
                { term: "Name", description: data.workspaceName },
                { term: "Role", description: formatMemberRole(data.role) },
                { term: "Timezone", description: data.timezone },
                { term: "Currency", description: data.currency },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              Timezone is used for reporting periods and cannot be changed after
              the workspace is created.
            </p>
          </section>

          <section className="grid gap-3" aria-labelledby="settings-alerts-heading">
            <h2 id="settings-alerts-heading" className="text-base font-medium">
              Alerts
            </h2>
            <SettingsDefinitionList
              items={[
                {
                  term: "Contract warning threshold",
                  description: `${data.contractWarningPercent}%`,
                },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              This threshold is set when the workspace is created and cannot be
              edited in this version.
            </p>
          </section>
        </div>
      </PageContent>
    </section>
  );
}
