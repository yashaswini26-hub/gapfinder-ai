"use client";

import React, { useState } from "react";
import { SourceReference } from "@/types";
import { BookOpen, X, FileText } from "lucide-react";

interface CitationDrawerProps {
  citations: SourceReference[];
}

export function CitationPills({ citations }: CitationDrawerProps) {
  const [selectedCitation, setSelectedCitation] = useState<SourceReference | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {citations.map((cite, idx) => (
          <button
            key={`${cite.chunk_id}-${idx}`}
            onClick={() => setSelectedCitation(cite)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors"
            title="Click to view verified source citation"
          >
            <BookOpen className="w-3 h-3 text-indigo-500" />
            <span>
              {cite.document_name.length > 22
                ? cite.document_name.slice(0, 20) + "..."
                : cite.document_name}
              {cite.page_number ? ` (p. ${cite.page_number})` : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Modal / Dialog */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedCitation(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Verified Source Citation</h3>
                <p className="text-xs text-slate-500">Grounded evidence from student course material</p>
              </div>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-slate-500 font-medium">Document</div>
                <div className="text-slate-800 font-semibold mt-0.5">{selectedCitation.document_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-medium">Page Number</div>
                  <div className="text-slate-800 font-semibold mt-0.5">
                    {selectedCitation.page_number ? `Page ${selectedCitation.page_number}` : "Not specified"}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-500 font-medium">Section Title</div>
                  <div className="text-slate-800 font-semibold mt-0.5 truncate">
                    {selectedCitation.section_title || "General Section"}
                  </div>
                </div>
              </div>

              {selectedCitation.quote_snippet && (
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                  <div className="text-indigo-900 font-medium mb-1">Grounded Excerpt</div>
                  <div className="text-slate-700 italic leading-relaxed">
                    &ldquo;{selectedCitation.quote_snippet}&rdquo;
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Close Citation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
