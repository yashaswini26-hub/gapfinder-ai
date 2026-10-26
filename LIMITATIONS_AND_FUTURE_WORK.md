# GapFinder AI — Limitations & Future Work

## 1. Current System Limitations

### 1.1 Document Extraction & OCR
- **Scanned Hand-Written Notes**: GapFinder AI uses `pdf-parse` for fast, lightweight server-side text extraction. It does not currently run optical character recognition (OCR) on flattened raster scans or handwritten notebook photos. Scanned PDFs receive an explicit status message requesting machine-readable text rather than failing silently.
- **Complex Multi-Column Tables & Math Formulae**: Multi-column slide layouts and LaTeX equations rendered into vector graphics may lose structural flow during standard text extraction.

### 1.2 Evaluation & Heuristics
- **Subjective Short-Answer Grading**: While objective MCQs and True/False questions are graded with deterministic exact matching, short descriptive answers rely on Gemini rubric evaluation. Although scores are bounded by Zod validation, nuanced academic grading remains an automated estimate.
- **Mastery & Confidence Heuristics**: The threshold boundaries (<50% Weak, 50–79.99% Medium, $\ge 80$% Strong) and confidence rules (<3 Qs Low, 3–5 Qs Medium, $\ge 6$ Qs High) are practical pedagogical heuristics. They provide an actionable starting framework but do not constitute standardized psychometric validations (such as Item Response Theory).
- **Sparse Assessment Evidence**: If a student only attempts two questions in a large unit, the diagnostic engine conservatively flags the topic as "Low Confidence" rather than over-estimating mastery.

### 1.3 Retrieval Boundaries
- **Cross-Topic Synthesis**: Retrieval is optimized for single-topic precision. Questions requiring cross-synthesis across multiple distinct textbooks or semesters may need expanded Top-K budgets.
- **Token Budget & Rate Limits**: Gemini API quotas and rate limits may affect high-frequency bulk document ingestion during concurrent student exam seasons.

---

## 2. Future Work & Roadmap

### Phase 1: Enhanced Document Intelligence
- **Tesseract / Cloud Vision OCR Integration**: Add asynchronous background OCR workers for handwritten notes and diagram-heavy PDFs.
- **LaTeX MathJax Rendering**: Support rich mathematical formula display and LaTeX answer evaluation for engineering and physics courses.

### Phase 2: Advanced Psychometrics
- **Item Response Theory (IRT)**: Upgrade the diagnostic scoring engine to 2-parameter or 3-parameter IRT models, dynamically calibrating question discrimination and difficulty parameters based on multi-student attempt distributions.
- **Spaced Repetition Scheduler**: Integrate SuperMemo SM-2 or Anki-style spaced review intervals with browser web notifications or calendar sync (iCal / Google Calendar).

### Phase 3: Teacher & Institution Analytics
- **Cohort Mastery Heatmaps**: Allow course instructors to upload course syllabi and view anonymized class-wide gap reports to identify concepts requiring lecture review before midterms.
- **LMS Integration**: Canvas, Blackboard, and Moodle LTI 1.3 integration for syncing assignment deadlines and gradebook imports.
