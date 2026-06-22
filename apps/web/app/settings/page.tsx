"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

export default function SettingsPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const integrations = settings.data?.integrations;
  const ai = settings.data?.ai;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-4xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Live connectors activate only when credentials are present.</p>
      </div>
      <Panel>
        <h2 className="font-serif text-2xl font-semibold">Source connectors</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {integrations
            ? Object.entries(integrations).map(([name, status]) => (
                <div key={name} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium capitalize">{name}</div>
                    <Badge tone={status.enabled ? "good" : "neutral"}>{status.enabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{status.reason}</p>
                </div>
              ))
            : null}
        </div>
      </Panel>
      <Panel>
        <h2 className="font-serif text-2xl font-semibold">AI assistance</h2>
        {ai ? (
          <div className="mt-4 rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">Source-packet extraction</div>
              <Badge tone={ai.enabled ? "good" : "neutral"}>{ai.enabled ? "Enabled" : "Disabled"}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{ai.reason}</p>
          </div>
        ) : null}
      </Panel>
      <Panel>
        <h2 className="font-serif text-2xl font-semibold">Guardrails</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Badge tone="good">No automatic video downloads</Badge>
          <Badge tone="good">No automatic request submission</Badge>
          <Badge tone="good">No unsupported claim publishing</Badge>
        </div>
      </Panel>
    </div>
  );
}
