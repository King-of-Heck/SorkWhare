# SorkWhare vs Litera/Workshare — Fidelity Report

Produced by the parity torture battery. Ground truth: `litera-gap-ledger.md`
(no live Litera access; confidence H/M/L). Automated results:
`node --test tests/torture.test.mjs`. Rubric: engine-harness probe of the
`tests/fixtures/torture-*.docx` pairs plus an on-screen confirmation in the
served app.

Run date: 2026-08-14
Product under test: SorkWhare 1.3.1.html
Method note: detection rows (C1–C8) are asserted automatically; rubric rows
(R1–R7) were evidenced by driving the fixtures through the product's own
pipeline (`docxToParagraphs` → `compare`) and, for R6, confirmed rendering the
same result on screen in the served app (summary tiles 3/1/1/1, distinct
deletion/insertion/move rows, no console errors). Feature-surface rows
(R2/R4/R5/R7) were confirmed against the product source.

## Scorecard

Auto verdict: Pass / Partial / Fail. Rubric verdict: Match / Partial / Absent.

| Category | Kind | Verdict | Confidence | Notes |
|----------|------|---------|-----------|-------|
| C1 substitutions | auto | Pass | M | Intra-paragraph substitutions surface as one changed row with clean del/ins pairs; `summary.total=1`. Matches Litera's inline substitution intent. |
| C2 whitespace/entities | auto | Pass | — | Correctness invariants: whitespace runs collapse to one space at extraction; `&amp;` decodes to a single `&`. (Whitespace-collapse is load-bearing; an "ignore whitespace" mode is structurally impossible.) |
| C3 number/date/money | auto | Pass | M | Money, dates, percentages and units replace as whole tokens (no mid-number split). Matches Litera number-aware redlining. |
| C4 phrase coalescing | auto | Pass* | M | *DIVERGE: a dense clause rewrite that shares an interior word ("of") renders as **two** del + **two** ins phrases, not one contiguous del+ins. `_coalesce` only merges runs separated by whitespace-only gaps. Litera would more likely show one grouped phrase. The clean B3 bold case does not over-collapse (correct). |
| C5 move detection | auto | Pass | M | A paragraph relocated across ≥3 equal paragraphs registers as a move (`moves=1`); a lone adjacent swap is correctly not a move. **Limitation:** a move must be displaced across ≥3 equal paragraphs to fire; shorter relocations are absorbed by the paragraph LCS as equal. |
| C6 split/merged paras | auto | Partial | M | A split paragraph is detected as a change (`total=2`) but renders as a `changed` row (trailing clause struck) + a separate `inserted` row, with **no split-linkage indicator**. Litera flags splits/merges as a distinct category. |
| C7 tables | auto | Pass | M | Ragged tblGrid-less table collapses to one table-wide column count; a changed cell diffs inline; an added row renders inside the same table. Matches Litera within-table cell diffing. |
| C8 change counting | auto | Pass | — | `summary.total` equals the unique numbered-change count (nav "of N"); per-side insertion/deletion tiles legitimately sum to more. |
| R1 formatting-only changes | rubric | Match | M | **Closed in v1.3.2.** Bold/italic/underline/font/size changes on unchanged text are now detected and marked (violet dotted underline + hover tooltip on screen, underlined + inline note in PDF), surfaced as an uncounted "Formatting changes: N" with a show/hide toggle (also controls PDF). Browser-verified on torture-R1: 1 formatting change detected, Total unchanged (0), toggle neutralizes the mark, no console errors. Known v1.3.2 limitations (all deferred follow-ups): a document-default font/size change floods per-paragraph; in the PDF the change is marked and annotated inline for main text but italic/underline/font/size are described rather than re-rendered as glyphs (bold is re-rendered), and the inline note is omitted inside table cells (mark + on-screen tooltip still apply). |
| R2 footnotes/headers/comments | rubric | Absent | M | The reader fetches only `word/document.xml` (SorkWhare 1.3.1.html:460); footnotes, endnotes, headers, footers and comments are never read, so differences in them are invisible. Litera compares headers/footers as rendered content. |
| R3 list/numbering changes | rubric | Partial | M | An inserted list item is caught as an `inserted` row, but the auto-renumbering of the following items is not surfaced — they remain `equal` because list numbers are Word-generated, not part of the compared text. A `numbering` summary bucket exists but reads 0 here. |
| R4 redline .docx output | rubric | Absent | H | Output is PDF-only (`btnPdf` → `generateRedlinePdf`, Blob `application/pdf`) plus browser print. There is no export to a Word document with real tracked changes — a headline Litera/Workshare capability. |
| R5 accept/reject | rubric | Absent | M | No per-change accept/reject. The tool *reads* incoming tracked changes and warns it "compared as if all changes were accepted" (SorkWhare 1.3.1.html:701), but the redline itself is a read-only view. |
| R6 change categorization | rubric | Full (curated sets) | H | Insertions/deletions/moves are categorized distinctly with summary tiles and styled `moved-src`/`moved` spans (confirmed on screen: 3 total / 1 ins / 1 del / 1 move). **Closed in v1.5.0:** a "Rendering set" picker ships three curated sets — SorkWhare (default), Litera Classic, High contrast — each setting colour + decoration per category, applied to the on-screen redline **and** the exported PDF and persisted between sessions. Remaining delta vs Litera: the sets are curated, not user-authorable or shareable. |
| R7 page/layout fidelity | rubric | Partial | M | SorkWhare renders its own multi-page PDF with real document-font fidelity (v1.2.0, base-14 Times fallback), but it is an external renderer approximating Word, not a native Word add-in like Litera Compare for Word. |

## Parity posture

SorkWhare is **strong on core detection**: substitutions, number/date/money
tokens, tables, move detection, and change counting all behave sensibly and
match Litera's redline intent. It **diverges on redline polish** — dense-rewrite
phrase grouping (C4) and split-paragraph linkage (C6) — where Litera produces a
cleaner or more explicitly categorized result. Formatting-only change detection
(R1) was **added in v1.3.2**. It remains **absent on the feature surface** that
makes Litera a full compare product: footnote/header/comment comparison (R2), a
real `.docx` tracked-changes export (R4), and per-change accept/reject (R5).
Change categorization (R6) gained configurable rendering sets in **v1.5.0**.

The single biggest lever toward "as close as possible to Litera," given this
tool's on-screen/PDF redline is already good, is **`.docx` tracked-changes
output (R4)** — it is the most-cited Litera/Workshare capability and the one a
Word-equipped reviewer most expects. Formatting-only detection (R1) is the next.

## Confirmed gaps (confidence H)

- **R4 — no `.docx` tracked-changes export.** Litera/Workshare export the
  redline as a Word Track-Changes document; SorkWhare outputs PDF only.
- **R6 — CLOSED in v1.5.0** (three curated rendering sets — SorkWhare, Litera
  Classic, High contrast — set colour + decoration per category on screen and in
  the PDF, persisted between sessions). Residual delta: the sets are curated
  rather than user-authorable, so a house convention outside the three shipped
  cannot be expressed without editing the file.

## Suspected gaps (confidence M/L — need Litera confirmation)

- **R1 — CLOSED in v1.3.2** (formatting-only changes now detected & marked;
  document-default flood remains a follow-up).
- **R2 — footnotes/endnotes/headers/footers/comments not compared** (reader reads
  only `document.xml`; Litera's exact comment-comparison behaviour is unconfirmed).
- **R3 — list auto-renumbering not surfaced** as a change.
- **R5 — no per-change accept/reject.**
- **R7 — layout fidelity approximated, not native-Word.**
- **C4 — dense rewrites split around shared interior words** rather than grouping.
- **C5 — moves shorter than a 3-equal-paragraph displacement are not detected.**
- **C6 — split/merge is not flagged as a distinct category.**

## Headline fidelity (secondary, caveated — indicative only)

Treating the two axes separately, weighted toward detection per the project's goal:

- **Detection (C1–C8):** all 8 categories functional; 6 clean matches, 2
  divergences of polish (C4, C6) and 1 boundary limitation (C5). ≈ **85–90%**.
- **Feature surface (R1–R7):** 1 full match (R6, curated sets), 2 partial
  (R3/R7), 4 absent
  (R1/R2/R4/R5). ≈ **30%**.
- **Combined, weighted to detection:** roughly **65–70%**.

This number is a rough orientation, not a measurement: it rests on researched
Litera behaviour (no live tool), and the axes are not equally weighted or equally
certain. Read the scorecard and posture above, not the percentage.

## Rerun

Automated: `node --test tests/torture.test.mjs` (part of the full suite,
`node --test tests/*.test.mjs`). Rubric: `node tests/gentorture.mjs` to
regenerate fixtures, then re-probe/re-view when rendering or feature surface may
have changed.
