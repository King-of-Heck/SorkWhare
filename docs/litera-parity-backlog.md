# Litera / Workshare Parity — Work Backlog

Living checklist of items to close the gap toward Litera / Workshare Compare.
Every item traces to a gap found by the parity torture battery — see
`litera-fidelity-report.md` for evidence and `litera-gap-ledger.md` for the
researched Litera behavior behind each id.

Ordered for this product's situation (the on-screen + PDF redline is the
deliverable; `.docx` export was previously deprioritized), not Workshare's
generic feature ranking. Effort: S / M / L. Check items off as they ship; note
the release that closed each.

## Tier 1 — High parity-per-effort (do first)

- [x] **1. Formatting-only change detection** (gap R1) — *Effort M · Value high* — **SHIPPED in v1.3.2**
  Workshare's headline "catch any formatting changes." Today, identical text
  with different bold/font/size shows as no change.
  - Build: on `equal` paragraphs, compare run formatting (extend the `boldRuns`
    capture to italic/underline/font/size); when it differs, emit a new
    **"formatting"** category. `summary` already has category buckets to slot
    it into.

- [x] **2. Vertical change bars in the margin** — *Effort S (screen) / M (PDF) · Value high* — **SHIPPED in v1.4.0**
  Not a rubric row, but the visual signature of Workshare/Litera — a change
  line in the left margin beside every changed line. Very recognizable.
  - Build: left-border marker on changed rows (screen CSS); a margin stroke in
    `generateRedlinePdf`.
  - Shipped: single near-black revision bar in the left margin on both surfaces
    (screen `.para::before` repositioned into the `#paper` gutter; PDF per-page
    interval merge + stroke in `generateRedlinePdf`). Formatting-only bars follow
    the Formatting toggle. Uncounted; category still shown by badges + colored text.

- [x] **3. Dense-rewrite phrase grouping** (gap C4) — *Effort S–M · Value medium* — **SHIPPED in v1.4.1**
  A full-sentence rewrite fragments when it shares an interior word ("of").
  Workshare groups it into one struck phrase + one inserted phrase.
  - Build: extend `_coalesce` to merge del/ins runs separated by a short shared
    token, not only whitespace gaps. Guard the B3 over-collapse trap — the
    battery already has a test for it.
  - Shipped: `_coalesce` treats a LONE short connective word (of/and/the/… — a
    16-word `CONN` set) as a "transparent" equal segment (folds into both phrases,
    separates mode-runs), so a symmetric dense rewrite bridged by one connective
    reaches the existing `>=2/>=2` collapse trigger. Multi-word shared runs stay hard
    anchors (never swallowed); one-sided edits don't group; B3/C3 unaffected. NB: the
    grouping only applies to paragraph pairs that pair (`simUpper>0.5`); a near-total
    rewrite below that gate renders as separate delete+insert paragraphs.

- [x] **4. Configurable rendering sets** (gap R6) — *Effort S–M · Value medium* — **SHIPPED in v1.5.0**
  Categorization exists; Workshare lets users set colors/styles per change type.
  - Build: a small settings panel writing the existing CSS variables
    (insertion/deletion/move/formatting colors).
  - Shipped: a "Rendering set" picker with three curated sets — SorkWhare
    (default), Litera Classic (pure blue double-underlined insertions, pure red
    strikethrough deletions, no background wash), and High contrast
    (colour-vision-safe colours, a distinct decoration per category). One
    `RENDER_SETS` table drives BOTH surfaces: `renderSetVars` writes the screen's
    CSS custom properties, `hexToPdfRgb` feeds `pdfStyle`. The choice persists in
    localStorage. The margin change bar stays single near-black in every set.

## Tier 2 — Bigger coverage gains

- [~] **5. Footnotes / headers / footers / comments comparison** (gap R2) — *Effort L · Value high for legal docs* — **FOOTNOTES + ENDNOTES SHIPPED in v1.6.0; HEADERS + FOOTERS SHIPPED in v1.7.0; comments remain**
  The reader only reads `word/document.xml`, so footnote and header/footer
  edits are invisible — a real hole for contracts.
  - Build: also read `footnotes.xml`, `endnotes.xml`, `header*.xml`,
    `footer*.xml`, `comments.xml`; diff and present each as its own section.
  - **v1.6.0 (R2 part 1):** `footnotes.xml`/`endnotes.xml` now read, diffed via the
    existing engine (notes = a second paragraph stream), COUNTED into the total + nav.
    Screen: an end-of-document Footnotes band + Endnotes section with numbered reference
    superscripts. PDF: footnotes float to the bottom of their reference's page; endnotes
    as an end section; both with margin change bars. Note-free docs stay byte-identical.
  - **v1.7.0 (R2 part 2):** `header*.xml`/`footer*.xml` now read via
    `<w:headerReference>`/`<w:footerReference>` in the last `<w:sectPr>`, resolved
    through `word/_rels/document.xml.rels`, diffed via the same second-paragraph-stream
    pattern, COUNTED into the total + nav. Screen: labeled end-of-document Header/Footer
    sections with margin change bars. PDF: rendered as an end section, after the
    endnotes. Default/first/even variants are distinguished and compared separately.
    hf-free docs stay byte-identical to v1.6.0.
  - **Remaining (R2 part 3):** `comments.xml` — a future release.

- [ ] **6. Split/merge as a distinct category** (gap C6) — *Effort M · Value medium*
  A split paragraph shows as change+insert with no linkage; Workshare flags
  splits/merges distinctly.

- [ ] **7. List renumbering surfaced** (gap R3) — *Effort M · Value medium*
  Inserting a list item is caught, but following items silently renumber.
  Compute effective list numbers and show the shift.

- [ ] **8. Move-detection sensitivity** (limitation C5) — *Effort M · Value medium · Risk: false positives*
  Moves only register when displaced across ≥3 unchanged paragraphs. Loosening
  this catches shorter relocations but needs guarding against noise.

## Tier 3 — Large Workshare features (previously deprioritized)

- [ ] **9. Accept/reject individual changes** (gap R5) — *Effort M*
  On-screen toggles that update the redline. Limited value on its own; natural
  pair with #10.

- [ ] **10. `.docx` tracked-changes export** (gap R4) — *Effort L · Value highest nominal*
  Write a Word doc with real `w:ins`/`w:del`. Workshare's most-cited feature,
  **but DOCX export was previously dropped** in favor of PDF fidelity — only
  worth revisiting if that calculus changed. A stored-entry ZIP writer already
  exists in `tests/makedocx.mjs` as a starting point. Pairs with #9.

## Ongoing

- [ ] **Layout / render fidelity** (gap R7) — incremental improvements to the
  PDF renderer; already the thread of the v1.2.0 work.

- [ ] **Paginated page-sheet view on screen** — *Effort L · Value medium* —
  Today the on-screen redline is ONE continuous `#paper` column with dotted
  `.pgbreak-auto` dividers (no real pages). Re-lay-out the screen into discrete
  page "sheets" (Word print-layout style) so the screen has real page bottoms.
  Unlocks **per-page on-screen footnote bands** for free (v1.6.0 shipped a single
  end-of-document footnote band on screen precisely because the screen has no
  page bottoms to pin to; footnotes ARE page-bottom in the PDF). Touches
  pagination, change bars, and screen/print/PDF parity — its own release. Raised
  by Sandy 2026-08-16 during the R2 (footnotes/endnotes) design.

---

**Feasibility:** all items fit the single-file / offline / no-library
constraint — client-side OOXML parsing throughout. **Recommended first move:**
#1 + #2 together move perceived parity most for the least work.

**Rerun the battery** after any of these lands to measure whether it moved the
needle: `node --test tests/torture.test.mjs` (detection) + regenerate and
re-view the rubric fixtures (`node tests/gentorture.mjs`).
