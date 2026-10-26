import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import {
  Stethoscope,
  BookOpen,
  CalendarCheck,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 md:py-28 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Powered Syllabus Diagnosis & Revision Engine</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight md:leading-none mb-6">
          Find Your Learning Gaps. <br className="hidden sm:inline" />
          <span className="text-indigo-600">Fix Them Before Exam Day.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Students often revise familiar topics repeatedly while remaining unaware of blind spots.
          GapFinder AI indexes your syllabus and lecture notes to systematically diagnose weak topics,
          cite exact source pages, and generate a day-by-day revision schedule.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <span>Start Diagnosing</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Explore Preloaded Demo</span>
          </Link>
        </div>

        {/* Value Proposition Highlights */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-slate-200 pt-8">
          <div>
            <div className="text-xl font-bold text-slate-900">100% Grounded</div>
            <div className="text-xs text-slate-500 mt-0.5">Questions generated strictly from your syllabus & notes</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">Page Citations</div>
            <div className="text-xs text-slate-500 mt-0.5">Every explanation links to document pages and sections</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">Deterministic</div>
            <div className="text-xs text-slate-500 mt-0.5">Transparent mastery scores and confidence heuristics</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">Adaptive Plan</div>
            <div className="text-xs text-slate-500 mt-0.5">Paces study tasks based on exam date and daily minutes</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white border-y border-slate-200 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How GapFinder AI Works
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Four structured steps to turn unstructured study materials into measurable mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">Upload Materials</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add your PDF notes, lecture slides, and syllabus. We extract text, preserve page boundaries, and chunk content.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">Map Topics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The AI structures your syllabus into hierarchical units with importance ratings and estimated study times.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">Take Diagnostic</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Answer grounded MCQs and short conceptual questions. Distractors test subtle points from your own material.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">Get Gap Report & Plan</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect weak topics with citations, and follow an adaptive daily revision schedule leading up to exam day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Designed for Trustworthy Learning Diagnosis
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Not just another generic chatbot. A comprehensive diagnostic revision system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Evidence-Based Gap Report</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Topics are classified into Weak (&lt;50%), Medium (50–79%), and Strong (≥80%) with explicit confidence scores
              derived from saved quiz attempts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">RAG Citations & Source Proof</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every question and explanation includes clickable citations: document name, page number, and section.
              No fabricated references.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Adaptive Revision Timetable</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dynamically prioritizes tasks by weakness, syllabus importance, and exam proximity, fitting into your daily
              study minute budget.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Walkthrough Preview Card */}
      <section id="demo-preview" className="py-16 bg-slate-900 text-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-indigo-300 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Judge & Evaluator Ready</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Explore the Preloaded College Demo
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-8">
            Test the entire end-to-end workflow immediately with our authentic CS 301 (Introduction to Data Science)
            sample material, diagnostic quiz attempt, gap diagnosis, and revision plan.
          </p>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 text-left max-w-2xl mx-auto text-xs space-y-3 font-mono">
            <div className="text-slate-400"># Sample Subject Included:</div>
            <div className="text-indigo-300 font-semibold">Introduction to Data Science & Machine Learning (CS 301)</div>
            <div className="text-slate-300">
              • 8 Curated Syllabus Topics across 4 Modules<br />
              • Real Extracted Notes Excerpts with Section & Page Citations<br />
              • Completed Sample Diagnostic Quiz & Persisted Mastery Results<br />
              • Prioritized Daily Revision Tasks scheduled before exam day
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all"
            >
              <span>Launch Demo Experience</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-slate-800">GapFinder AI — Production College Project</div>
          <div>Built with Next.js, TypeScript, Supabase pgvector, and Gemini AI</div>
        </div>
      </footer>
    </div>
  );
}
