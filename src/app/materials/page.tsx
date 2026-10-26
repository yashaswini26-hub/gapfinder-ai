"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/ui/AppShell";
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
} from "lucide-react";
import { DocumentRecord } from "@/types";

export default function MaterialsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fetchDocsAndSubjects = async () => {
    try {
      const [docRes, subRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/subjects"),
      ]);
      const [docData, subData] = await Promise.all([
        docRes.json(),
        subRes.json(),
      ]);
      setDocuments(docData.documents || []);
      setSubjects(subData.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocsAndSubjects();
  }, []);

  const activeSubject = subjects.length > 0 ? subjects[0] : null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", file);
    if (activeSubject?.id) {
      formData.append("subjectId", activeSubject.id);
    }

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        setUploadError(result.error || "Upload and text extraction failed.");
      } else {
        setUploadSuccess(`Successfully extracted & indexed ${result.chunksCount || "multiple"} chunks from "${file.name}".`);
        fetchDocsAndSubjects();
      }
    } catch {
      setUploadError("Network error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document and its indexed chunks?")) return;

    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Materials</h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload syllabus, textbook chapters, lecture notes, or past papers in PDF or TXT format.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
        <label className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block text-center">
          <input
            type="file"
            accept=".pdf,.txt"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 mb-3 text-indigo-600">
            {uploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {uploading ? "Extracting text, chunking & generating embeddings..." : "Click to upload PDF or TXT notes"}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Max 20MB per document • Scanned/image PDFs require searchable text
          </p>
        </label>

        {uploadError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* Document Library Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Indexed Document Library ({documents.length})</h2>
          </div>
          <button
            onClick={fetchDocsAndSubjects}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No course materials uploaded yet. Upload a syllabus or textbook PDF above to begin.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-xs sm:text-sm">{doc.filename}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {Math.round(doc.file_size / 1024)} KB • {doc.page_count ? `${doc.page_count} pages` : "Text file"} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    {doc.processing_error && (
                      <div className="text-[11px] text-rose-600 mt-1 font-medium">
                        Error: {doc.processing_error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      doc.status === "processed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : doc.status === "failed"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {doc.status === "processed" ? "✓ Indexed & Embedded" : doc.status}
                  </span>

                  <Link
                    href={`/materials/${doc.id}`}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Inspect chunks & citations"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
