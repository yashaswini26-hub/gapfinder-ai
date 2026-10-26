"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import { TopicStatusBadge } from "@/components/ui/StatusBadge";
import {
  ListTree,
  Sparkles,
  Plus,
  Stethoscope,
  Star,
  Clock,
  BookOpen,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Topic } from "@/types";

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newUnit, setNewUnit] = useState("Unit 1: Foundations");
  const [newImportance, setNewImportance] = useState(3);
  const [newMinutes, setNewMinutes] = useState(45);

  const fetchTopicsAndSubjects = async () => {
    try {
      const subRes = await fetch("/api/subjects");
      const subData = await subRes.json();
      const userSubs = subData.subjects || [];
      setSubjects(userSubs);

      const activeSub = userSubs.length > 0 ? userSubs[0] : null;
      if (activeSub) {
        const res = await fetch(`/api/topics?subjectId=${activeSub.id}`);
        const data = await res.json();
        setTopics(data.topics || []);
      } else {
        const res = await fetch("/api/topics");
        const data = await res.json();
        setTopics(data.topics || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicsAndSubjects();
  }, []);

  const activeSubject = subjects.length > 0 ? subjects[0] : null;

  const handleExtract = async () => {
    if (!activeSubject?.id) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract",
          subjectId: activeSubject.id,
        }),
      });
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject?.id) return;
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: activeSubject.id,
          name: newTopicName,
          syllabus_unit: newUnit,
          importance: newImportance,
          estimated_study_minutes: newMinutes,
        }),
      });
      const data = await res.json();
      if (data.topic) {
        setTopics([...topics, data.topic]);
        setShowAddModal(false);
        setNewTopicName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group topics by unit
  const groupedUnits: Record<string, Topic[]> = {};
  for (const t of topics) {
    const unit = t.syllabus_unit || "General Topics";
    if (!groupedUnits[unit]) groupedUnits[unit] = [];
    groupedUnits[unit].push(t);
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Syllabus Topic Map</h1>
          <p className="text-xs text-slate-500 mt-1">
            Hierarchical breakdown of syllabus units, importance weighting, and diagnostic status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors disabled:opacity-50"
          >
            {extracting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>{extracting ? "Extracting..." : "Auto-Extract from Materials"}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Topic</span>
          </button>
        </div>
      </div>

      {/* Units & Topics List */}
      <div className="space-y-6">
        {Object.entries(groupedUnits).map(([unitName, unitTopics]) => (
          <div key={unitName} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {unitName}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {unitTopics.length} topic{unitTopics.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {unitTopics.map((topic) => {
                const mastery = (topic as any).mastery || (topic as any).topic_mastery?.[0];
                return (
                  <div
                    key={topic.id}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {topic.name}
                        </span>
                        <TopicStatusBadge status={mastery?.status || "insufficient_data"} />
                      </div>
                      {topic.description && (
                        <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
                          {topic.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-medium text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          Priority: {topic.importance}/5
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Est. Study: {topic.estimated_study_minutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link
                        href={`/diagnostic?topicId=${topic.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                      >
                        <Stethoscope className="w-3 h-3 text-indigo-600" />
                        <span>Diagnose</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Manual Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Add Syllabus Topic</h3>
            <form onSubmit={handleAddTopic} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  required
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="e.g. Regularization Techniques"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Syllabus Unit</label>
                <input
                  type="text"
                  required
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="e.g. Unit 2: Supervised Learning"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Importance (1–5)</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={1}>1 (Low)</option>
                    <option value={2}>2 (Minor)</option>
                    <option value={3}>3 (Standard)</option>
                    <option value={4}>4 (High)</option>
                    <option value={5}>5 (Critical)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
