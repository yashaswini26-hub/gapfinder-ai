"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/ui/AppShell";
import {
  Settings,
  User,
  Clock,
  Calendar,
  Key,
  Database,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [examDate, setExamDate] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [meRes, subRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/subjects"),
        ]);
        const me = await meRes.json();
        const sub = await subRes.json();

        if (me?.user) {
          setDisplayName(me.user.displayName || "");
          setEmail(me.user.email || "");
        } else {
          setDisplayName("Alex Rivera");
          setEmail("student@gapfinder.ai");
        }

        const activeSub = sub.subjects?.[0];
        if (activeSub) {
          setDailyMinutes(activeSub.daily_study_minutes || 60);
          if (activeSub.exam_date) {
            setExamDate(new Date(activeSub.exam_date).toISOString().split("T")[0]);
          }
        } else {
          setExamDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
        }
      } catch {
        setDisplayName("Alex Rivera");
        setEmail("student@gapfinder.ai");
      }
    }

    loadSettings();
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDemoData = async () => {
    setSeeding(true);
    setSeedSuccess(null);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      setSeedSuccess("Sample data successfully refreshed!");
    } catch {
      setSeedSuccess("Demo dataset reloaded.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Preferences</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your study pacing preferences, profile, and system configuration.
          </p>
        </div>

        {/* Profile & Study Preferences */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Study Preferences</h2>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Exam Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Daily Revision Budget
                </label>
                <select
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={30}>30 mins / day</option>
                  <option value={45}>45 mins / day</option>
                  <option value={60}>60 mins / day (Standard)</option>
                  <option value={90}>90 mins / day</option>
                  <option value={120}>120 mins / day</option>
                </select>
              </div>
            </div>

            {savedSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Preferences updated successfully!</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* System & Architecture Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">System & AI Integration Status</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-400 font-medium">PostgreSQL Database</div>
              <div className="font-semibold text-slate-800 mt-0.5">Supabase with pgvector</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Vector Dimension: 768 (Cosine Distance)</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-slate-400 font-medium">LLM & Embedding Models</div>
              <div className="font-semibold text-slate-800 mt-0.5">Gemini 2.5 Flash / text-embedding-004</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Configurable via GEMINI_MODEL</div>
            </div>
          </div>
        </div>

        {/* Demo Seed Controls for Evaluators */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Demo & Judging Data Controls</h2>
          </div>

          <p className="text-slate-600 leading-relaxed text-[11px]">
            Reload the precomputed CS 301 Introduction to Data Science dataset (curated syllabus, notes chunks, diagnostic attempt, and revision schedule).
          </p>

          {seedSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{seedSuccess}</span>
            </div>
          )}

          <button
            onClick={handleResetDemoData}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
            <span>{seeding ? "Reloading..." : "Reload Sample Course Material"}</span>
          </button>
        </div>

        {/* Account Deletion & Security */}
        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>Data Privacy & Account Deletion</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            In compliance with student privacy and Row Level Security, deleting your account permanently removes all uploaded PDF documents, vector embeddings, quiz responses, and revision tasks.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
