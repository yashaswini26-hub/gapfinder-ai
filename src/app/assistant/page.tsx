"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { CitationPills } from "@/components/ui/CitationDrawer";
import {
  BotMessageSquare,
  Send,
  User,
  Sparkles,
  BookOpen,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { SourceReference, Topic } from "@/types";
import { Suspense } from "react";

interface ChatEntry {
  id: string;
  sender: "user" | "assistant";
  content: string;
  citations: SourceReference[];
  timestamp: string;
}

function TopicAssistantContent() {
  const searchParams = useSearchParams();
  const initialTopicId = searchParams.get("topicId") || "";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);

  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "Why does L1 Lasso regression set weights to exactly zero, but L2 Ridge does not?",
    "When should I maximize Recall instead of Precision?",
    "How does data leakage happen during cross-validation feature scaling?",
    "What are the geometric limitations of K-Means clustering?",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initAssistant() {
      try {
        const [meRes, subRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/subjects"),
        ]);
        const [meData, subData] = await Promise.all([
          meRes.json(),
          subRes.json(),
        ]);

        const user = meData.user;
        const userSubs = subData.subjects || [];
        setSubjects(userSubs);
        const activeSub = userSubs.length > 0 ? userSubs[0] : null;

        if (activeSub) {
          const topRes = await fetch(`/api/topics?subjectId=${activeSub.id}`);
          const topData = await topRes.json();
          setTopics(topData.topics || []);
        } else {
          const topRes = await fetch("/api/topics");
          const topData = await topRes.json();
          setTopics(topData.topics || []);
        }

        const displayName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Student");
        setMessages([
          {
            id: "initial-1",
            sender: "assistant",
            content: `Hello ${displayName}! I am your GapFinder Academic Assistant.\n\nI answer your revision questions strictly using your uploaded syllabus, textbook excerpts, and lecture notes. Every factual claim is paired with exact document and page citations.\n\nWhat concept or diagnostic topic would you like to explore today?`,
            citations: user?.isDemoUser
              ? [
                  {
                    document_id: "doc-002",
                    document_name: "Professor_Lecture_Notes_Modules_1_to_3.pdf",
                    chunk_id: "chunk-101",
                    page_number: 8,
                    section_title: "2.1 Bias-Variance Tradeoff and Regularization",
                    quote_snippet: "Primary reference notes indexed for CS 301 Data Science.",
                  },
                ]
              : [],
            timestamp: "Just now",
          },
        ]);
      } catch (err) {
        console.error(err);
      }
    }

    initAssistant();
  }, []);

  const activeSubject = subjects.length > 0 ? subjects[0] : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userEntry: ChatEntry = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userEntry]);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: activeSubject?.id || "00000000-0000-0000-0000-000000000002",
          topicId: selectedTopicId || null,
          message: text,
        }),
      });

      const data = await res.json();

      const assistantEntry: ChatEntry = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: data.reply || "Could not retrieve response from course notes.",
        citations: data.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantEntry]);
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "assistant",
          content: "Sorry, I encountered an error communicating with the assistant service.",
          citations: [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Header with Topic Context Selector */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BotMessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                Explain-This-Topic Assistant
              </h1>
              <p className="text-[11px] text-slate-500">
                {activeSubject ? `Grounded strictly in your uploaded ${activeSubject.name} course materials` : "Grounded strictly in your uploaded course material excerpts"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-500 font-medium">Focus Topic:</label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Uploaded Material</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 overflow-y-auto space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  GF
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-xs ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 border border-slate-200 text-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-xs">
                  {msg.content}
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Cited Material Excerpts:
                    </div>
                    <CitationPills citations={msg.citations} />
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 text-right ${
                    msg.sender === "user" ? "text-indigo-200" : "text-slate-400"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-xs justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-500 text-xs">
                Searching verified notes & synthesizing grounded answer...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Questions */}
        <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-semibold shrink-0">Suggestions:</span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-600 text-[11px] whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question about your uploaded notes or diagnostic results..."
            className="flex-1 px-3 py-2 text-xs focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}

export default function TopicAssistantPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading topic assistant...</div>}>
      <TopicAssistantContent />
    </Suspense>
  );
}
