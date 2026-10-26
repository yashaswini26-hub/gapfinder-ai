import React from "react";
import { TopicStatus, ConfidenceLevel, TaskStatus } from "@/types";

export function TopicStatusBadge({ status }: { status: TopicStatus }) {
  switch (status) {
    case "weak":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
          Weak Gap (&lt;50%)
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          Medium (50–79%)
        </span>
      );
    case "strong":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          Strong (≥80%)
        </span>
      );
    case "insufficient_data":
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
          Needs Assessment
        </span>
      );
  }
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const styles = {
    low: "bg-slate-100 text-slate-600 border-slate-200",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    high: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styles[confidence] || styles.low}`}>
      Confidence: {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ Completed
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
          Skipped
        </span>
      );
    case "pending":
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          ● Pending
        </span>
      );
  }
}
