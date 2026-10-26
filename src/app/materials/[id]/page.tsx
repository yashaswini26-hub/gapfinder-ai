"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import {
  FileText,
  ArrowLeft,
  Trash2,
  BookOpen,
  Hash,
  Clock,
  Layers,
} from "lucide-react";
import { DocumentChunk, DocumentRecord } from "@/types";

function DocumentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoc() {
      try {
        const res = await fetch(`/api/documents/${id}`);
        const data = await res.json();
        setDocument(data.document);
        setChunks(data.chunks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadDoc();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this document and all its indexed chunks?")) return;
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      router.push("/materials");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          href="/materials"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Materials</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {document?.filename || "Document Details"}
              </h1>
              <p className="text-xs text-slate-500">
                {chunks.length} Chunks Indexed • {document?.page_count ? `${document.page_count} Pages` : "Text Content"} • Status: {document?.status || "processed"}
              </p>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Document</span>
          </button>
        </div>
      </div>

      {/* Extracted Chunks List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Indexed RAG Text Chunks ({chunks.length})</span>
        </div>

        {chunks.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            No text chunks recorded for this document.
          </div>
        ) : (
          chunks.map((chunk, idx) => (
            <div
              key={chunk.id || idx}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Chunk #{chunk.chunk_index + 1}
                  </span>
                  {chunk.section_title && (
                    <span className="font-semibold text-slate-800">
                      {chunk.section_title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  {chunk.page_number && <span>Page {chunk.page_number}</span>}
                  <span>~{chunk.token_count || 150} tokens</span>
                </div>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                {chunk.content}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading document details...</div>}>
      <DocumentDetailContent />
    </Suspense>
  );
}
