"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import type { NormalizedCandidate } from "@interrogation/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

function accessTone(accessPath: string) {
  if (accessPath === "online_full" || accessPath === "online_partial" || accessPath === "court_archive") return "good";
  if (accessPath.includes("request") || accessPath === "recap_or_pacer") return "warn";
  if (accessPath === "sealed_or_restricted") return "danger";
  return "neutral";
}

function actionTone(action: string) {
  if (action === "watch_now") return "good";
  if (action === "reject") return "danger";
  if (action === "draft_records_request") return "warn";
  return "info";
}

function scoreStatusLabel(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source" ? "Source supported" : "Metadata only";
}

function scoreStatusTone(status: NormalizedCandidate["scoreStatus"]) {
  return status === "verified_source" ? "good" : "warn";
}

function queryIntentLabel(intent: NormalizedCandidate["queryIntent"]) {
  if (!intent) return "Seed fixture";
  return intent.replaceAll("_", " ");
}

export function CandidateTable({ candidates }: { candidates: NormalizedCandidate[] }) {
  const [filter, setFilter] = useState("");
  const columns = useMemo<ColumnDef<NormalizedCandidate>[]>(
    () => [
      {
        accessorKey: "score.overallPriorityScore",
        header: "Score",
        cell: ({ row }) => <span className="font-mono text-lg font-semibold">{row.original.score.overallPriorityScore}</span>
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="flex min-w-[280px] flex-col gap-1">
            <Link href={`/cases/${row.original.caseId}`} className="font-medium hover:underline">
              {row.original.title}
            </Link>
            <span className="text-sm text-muted-foreground">{row.original.caseTitle}</span>
          </div>
        )
      },
      {
        accessorKey: "sourceName",
        header: "Source",
        cell: ({ row }) => (
          <div className="flex min-w-[180px] flex-col gap-1">
            <span>{row.original.sourceName}</span>
            <span className="text-xs text-muted-foreground">{queryIntentLabel(row.original.queryIntent)}</span>
          </div>
        )
      },
      {
        accessorKey: "footageTypes",
        header: "Footage",
        cell: ({ row }) => <span className="text-sm">{row.original.footageTypes.join(", ")}</span>
      },
      {
        accessorKey: "accessPath",
        header: "Access",
        cell: ({ row }) => <Badge tone={accessTone(row.original.accessPath)}>{row.original.accessPath.replaceAll("_", " ")}</Badge>
      },
      {
        accessorKey: "sourcingConfidence",
        header: "Confidence",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge tone={row.original.sourcingConfidence === "high" ? "good" : "neutral"}>{row.original.sourcingConfidence}</Badge>
            <Badge tone={scoreStatusTone(row.original.scoreStatus)} className="h-6">
              {scoreStatusLabel(row.original.scoreStatus)}
            </Badge>
          </div>
        )
      },
      {
        accessorKey: "ethicalRisk",
        header: "Risk",
        cell: ({ row }) => <Badge tone={row.original.ethicalRisk === "low" ? "good" : "warn"}>{row.original.ethicalRisk}</Badge>
      },
      {
        accessorKey: "recommendedNextAction",
        header: "Next",
        cell: ({ row }) => <Badge tone={actionTone(row.original.recommendedNextAction)}>{row.original.recommendedNextAction.replaceAll("_", " ")}</Badge>
      }
    ],
    []
  );

  const table = useReactTable({
    data: candidates,
    columns,
    state: {
      globalFilter: filter
    },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter candidates"
          className="h-10 w-full max-w-sm rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <Button variant="outline" size="sm" onClick={() => table.resetSorting()}>
          Reset sort
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="h-11 px-3 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border align-top hover:bg-[#F8F6EF]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
