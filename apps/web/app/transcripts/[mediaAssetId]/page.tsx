import { Panel } from "@/components/ui/panel";

export default function TranscriptPlaceholderPage() {
  return (
    <Panel>
      <h1 className="font-serif text-3xl font-semibold">Transcript Workbench</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Transcript upload, speaker labeling, and interrogation-signal review are Phase 2 work.
      </p>
    </Panel>
  );
}

