import React from "react";
import { TopicStatus } from "@/types";

interface MasteryMeterProps {
  score: number | null;
  status?: TopicStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function MasteryMeter({
  score,
  status,
  size = "md",
  showLabel = true,
}: MasteryMeterProps) {
  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  if (score === null) {
    return (
      <div className="w-full">
        {showLabel && (
          <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
            <span>Assessed Mastery</span>
            <span className="italic">Not Assessed</span>
          </div>
        )}
        <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses[size]}`}>
          <div className="w-0 h-full bg-slate-300 rounded-full" />
        </div>
      </div>
    );
  }

  const boundedScore = Math.min(100, Math.max(0, score));

  // Determine bar color
  let barColor = "bg-slate-400";
  if (status === "weak" || boundedScore < 50) {
    barColor = "bg-rose-500";
  } else if (status === "medium" || boundedScore < 80) {
    barColor = "bg-amber-500";
  } else if (status === "strong" || boundedScore >= 80) {
    barColor = "bg-emerald-500";
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-700">
          <span>Assessed Mastery</span>
          <span className="font-semibold">{boundedScore}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${boundedScore}%` }}
        />
      </div>
    </div>
  );
}
