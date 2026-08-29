# Feature Specification: Garment Cutting / Fabric Lot Management (DP Creation MVP)

**Feature Branch**: `001-garment-cutting-management`

**Created**: 2026-08-29

**Status**: Draft

**Product name**: **DP Creation** — Garment Cutting Management (early inputs used the working name
"Vastra"; the product name is DP Creation).

**Input**: User description: "DP Creation — Garment Cutting Management System. Build a specialized web application for the garment manufacturing industry, focused initially on Garment Cutting / Fabric Lot Management. Turn an existing paper-based cutting form into a smart digital production system (not an online form). Primary user is a factory operator with limited computer experience who must work fast on mobile, tablet, or desktop. Prioritize Simplicity + Speed + Error Prevention + Practical Factory Workflow." A companion UI/UX design specification was also provided.

**Design reference**: [`design/ux-spec.md`](./design/ux-spec.md) is the UX/design source of
truth for this feature (application shell, dashboard hierarchy, wizard/step design, size-matrix
and mismatch presentation, review and save-confirmation screens, empty/loading/error states,
mobile navigation, design-system components, and microcopy). User-facing behaviors from that
document are also captured as functional requirements below.

## Overview

Garment factories currently record each incoming fabric lot on a paper cutting form: lot
identification, fabric details, size-wise quantities, bale/roll meter readings, and
cutting/pattern information. The paper process gives operators no calculation help and no way to
catch inconsistent numbers before they reach the cutting floor, where mistakes waste fabric and
time.

This feature delivers a focused digital system for the **cutting / fabric-lot stage only**. It
reproduces the *meaning* of the existing workflow and factory vocabulary while adding guided data
entry, automatic production calculations, and continuous validation that makes an incorrect lot
record hard to create. It is explicitly **not** a full garment ERP; the data model and navigation
must leave room for later modules without building them now.

## Clarifications

### Session 2026-08-29

- Q: Is PCS an independently entered planned figure reconciled against the size-quantity total, or
  the system-computed sum of the size quantities? → A: Operator-entered planned figure; the
  size-quantity total is reconciled against it and any mismatch is shown prominently but does
  **not** block saving (advisory warning).
- Q: What is the default Average Consumption formula, and when is a result "unusually high/low"? →
  A: Default = Total Fabric Meters ÷ PCS. Warn (non-blocking) when the result falls outside
  0.25×–2× of a configurable expected value (default 1.0 m/pc). Formula, expected value, and band
  are editable in Settings.
- Q: How close must total bale/roll meters be to Lot MTR before the mismatch stops being flagged?
  → A: Exact match — any nonzero difference between total bale meters and Lot MTR is flagged (no
  tolerance band in this release).
- Q: Which lot status transitions are allowed in the MVP? → A: Forward Draft→Ready→Cutting→
  Completed, plus Cutting→Ready and Completed→Cutting reversals, each behind an explicit
  confirmation. All other transitions are blocked. Any user may perform an allowed transition
  until roles are enforced.
- Q: What does PANA mean for this factory and how should the "invalid PANA" check behave? → A:
  For the MVP, PANA is a free numeric field validated only as "must be a positive number"; its
  exact meaning (layers vs panels vs plies) and any upper bound are deferred (see OQ-7).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a fabric lot through a guided workflow (Priority: P1)

An operator receives a new fabric lot and needs to record it. From the main screen they choose
**New Lot** and move through a short, numbered sequence of screens — Lot Details, Fabric Details,
Sizes, Bale / Roll, Cutting, Review — each screen doing one clear job. As they enter data the
system totals size quantities and bale meters, derives average consumption, and flags any
inconsistency (duplicate lot number, missing supplier or dates, cutting date before program date,
size-total vs PCS mismatch, bale-meter vs lot-MTR mismatch, negative or non-numeric values). The
Review screen summarizes the lot and states plainly whether anything is wrong. The operator saves
and the lot is stored with status **Ready**.

**Why this priority**: This is the core of the product. Without fast, guided, validated lot
creation there is no reason for the factory to adopt the tool. Every other story builds on the
lot records this one produces.

**Independent Test**: Open the app, create one lot end to end with lot number, supplier, dates,
fabric details, 19 size quantities, six bale entries, and cutting fields; confirm live totals and
at least one deliberate inconsistency being surfaced before save; confirm the saved lot appears
with its computed metrics and status.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the operator selects New Lot, **Then** a numbered
   multi-step workflow starts on Step 1 with the current step, remaining steps, and required
   fields clearly indicated.
2. **Given** the operator is on the Lot Details step, **When** they request an auto-generated lot
   number, **Then** the system proposes the next `LOT-<n>` based on existing lot numbers and lets
   the operator edit it.
3. **Given** a lot number that already exists (case-insensitively), **When** the operator tries to
   continue or save, **Then** the system blocks it and shows "Duplicate Lot No. Please use a
   different lot number."
4. **Given** a program date and an earlier cutting date, **When** the operator continues, **Then**
   the system blocks it and shows "Cutting Date cannot be before Program Date."
5. **Given** size quantities that sum to 521 and a PCS value of 557, **When** the operator reaches
   the Sizes or Review step, **Then** the system shows "Size quantities total 521 pcs, but PCS is
   entered as 557." prominently, without the operator taking any extra action.
6. **Given** a Lot MTR of 512 and bale entries summing to 518, **When** the operator is on the
   Bale / Roll or Review step, **Then** the system shows the mismatch with Lot quantity, Bale
   total, and the signed difference (+6 MTR).
7. **Given** all required fields are present and no blocking inconsistency remains, **When** the
   operator reaches Review, **Then** the system shows an "Everything looks good" confirmation and
   a single Save Lot action.
8. **Given** a completed Review, **When** the operator saves, **Then** the lot persists as
   normalized records (lot, size rows, bale rows, cutting record) and the operator is taken to
   that lot's detail view with status Ready.

---

### User Story 2 - View a lot's full details and act on it (Priority: P1)

After a lot is saved (or selected from the list) the operator or supervisor opens its detail
page. The page shows the lot number as a heading, the current status as a label with an icon, and
the key production metrics (MTR, PCS, PANA, AVG) made visually prominent. Below that, clearly
separated sections present Lot Information, Fabric Information, Size Breakdown, Bale / Roll
Details, Cutting Information, and Notes. From this page the user can Edit, Start Cutting, Print,
Download PDF, Duplicate Lot, or Mark Completed.

**Why this priority**: A lot record has no value if it cannot be read back clearly and acted on.
This is the everyday reference screen for both the operator and the supervisor.

**Independent Test**: Open a saved lot; confirm all six sections render with the entered data, the
four headline metrics are prominent, the status is shown as label + icon, and each action
(Edit, Start Cutting, Print, Download PDF, Duplicate, Mark Completed) is present and triggers the
expected result.

**Acceptance Scenarios**:

1. **Given** a saved lot, **When** its detail page opens, **Then** the lot number, status
   (label + icon), and MTR / PCS / PANA / AVG are displayed prominently above the section list.
2. **Given** a lot detail page, **When** the user selects Start Cutting, **Then** the lot status
   changes to Cutting and the change is reflected immediately on the page and in the list.
3. **Given** a lot detail page, **When** the user selects Mark Completed, **Then** the status
   changes to Completed and the lot is excluded from "active" counts.
4. **Given** a lot detail page, **When** the user selects Duplicate Lot, **Then** a new draft
   workflow opens pre-filled from this lot with the lot number, dates, and quantities left for the
   operator to change.
5. **Given** a lot detail page, **When** the user selects Edit, **Then** the guided workflow
   reopens on the lot's existing data and re-runs all calculations and validation on save.

---

### User Story 3 - Find, filter, and track lots (Priority: P1)

A supervisor needs to see the state of production. The **Lots** screen shows a table with Lot No.,
Short No., Fabric Supplier, MTR, PCS, Cutting Date, Status, Created By, and an Action column. They
can search by lot number, short number, supplier, or bale number, and apply simple filters
(Today, This Week, This Month, Pending, Cutting, Completed). Columns can be sorted. Status is
always shown as a label plus icon so it is readable at a glance.

**Why this priority**: Once more than a handful of lots exist, creation and detail views are not
enough — the factory needs to locate a lot and understand overall status quickly. This is part of
the minimum useful product.

**Independent Test**: With several lots in different statuses, search by a bale number and confirm
the correct lot is found; apply each filter and confirm the result set; sort by Cutting Date and
confirm ordering; confirm every row shows status as label + icon.

**Acceptance Scenarios**:

1. **Given** multiple lots exist, **When** the user types part of a bale number into search,
   **Then** only lots containing a matching bale are listed.
2. **Given** the Lots screen, **When** the user selects the "Cutting" filter, **Then** only lots
   with status Cutting are shown.
3. **Given** the Lots screen, **When** the user sorts by Cutting Date, **Then** rows reorder by
   that date and the active sort is indicated.
4. **Given** any lot row, **When** the user selects its Action, **Then** they can open the lot
   detail and the PDF for that lot.

---

### User Story 4 - Cutting operations dashboard (Priority: P2)

A supervisor opens the **Dashboard** to understand the day. It shows summary figures — Total
Active Lots, Today's Cutting, Pending Cutting, Completed Lots, Total Fabric Used, Total Pieces —
and a "Today's Cutting" table (Lot No., Style / Short No., Fabric, Pieces, Meter, Status, Action).
It highlights lots waiting for cutting, fabric mismatches, lots with missing information, today's
production, and high fabric consumption. It intentionally avoids deeper analytics.

**Why this priority**: High operational value for supervisors, but the factory can still run the
cutting workflow using stories 1–3 without it, so it is P2.

**Independent Test**: With lots scheduled for today and some with known mismatches, open the
Dashboard and confirm each summary figure matches the underlying lots, the Today's Cutting table
lists the right lots, and the mismatch / missing-info highlights point to the correct lots.

**Acceptance Scenarios**:

1. **Given** lots in various statuses, **When** the Dashboard opens, **Then** each summary figure
   equals the count/sum derived from current lot data.
2. **Given** a lot whose bale meters do not match its Lot MTR, **When** the Dashboard opens,
   **Then** that lot appears in the fabric-mismatch highlight.
3. **Given** lots with a cutting date of today, **When** the Dashboard opens, **Then** they appear
   in the Today's Cutting table with a working Action to open each lot.

---

### User Story 5 - Professional printable / PDF lot record (Priority: P2)

The factory still keeps physical records. From a lot the user produces a clean A4 document that a
worker familiar with the paper form recognizes but that is clearer and more professional. It
includes, where available: company logo, lot number, date, fabric information, size breakdown,
bale information, cutting information, operator, a barcode/QR code, and a signature area. It is a
redesigned document, not a photocopy of the paper form.

**Why this priority**: Needed for real factory operations and hand-offs, but not required to
prove the digital workflow works, so P2.

**Independent Test**: Generate the PDF for a fully populated lot; confirm it is A4, contains every
listed section with the lot's real data, includes a scannable code encoding the lot identifier,
and is legible when printed in black and white.

**Acceptance Scenarios**:

1. **Given** a fully populated lot, **When** the user selects Download PDF, **Then** an A4
   document is produced containing lot identification, fabric info, size breakdown, bale details,
   cutting info, and operator.
2. **Given** the generated document, **When** it is printed without color, **Then** all text and
   the status remain readable (status not conveyed by color alone).
3. **Given** a lot with a pattern image, **When** the PDF is generated, **Then** the cutting
   section references the pattern (image or a clear placeholder if omitted for print).

---

### User Story 6 - Fast repeat entry (duplicate / create from previous, drafts, recent suppliers) (Priority: P2)

Factory work is repetitive. The operator can start a new lot from a previous one, copying the
fabric, sizes, bale structure, and cutting fields while being required to review lot-specific
values (lot number, date, quantities, cutting date). In-progress lots auto-save as drafts so an
interrupted operator resumes without re-entering data. Recently used suppliers surface first in
the supplier picker, and supplier search is type-ahead.

**Why this priority**: Major speed multiplier that directly supports the 2–3 minute target, but
the workflow is usable without it, so P2.

**Independent Test**: Create a lot, then use "Create from Previous Lot" and confirm the copyable
fields are pre-filled and the lot-specific fields are flagged for review; start a new lot, enter
part of it, reload the app, and confirm the draft is recovered; confirm the last-used supplier
appears at the top of the picker.

**Acceptance Scenarios**:

1. **Given** an existing lot, **When** the operator chooses Create from Previous Lot, **Then** a
   new draft opens with fabric, size, bale, and cutting data copied and lot number / date /
   quantities / cutting date marked for review.
2. **Given** a partially entered new lot, **When** the operator leaves and returns, **Then** the
   draft is restored to the step and values they left.
3. **Given** the supplier picker, **When** the operator opens it, **Then** recently used suppliers
   are listed first and typing filters the list as they type.

---

### User Story 7 - Full operation on a mobile phone (Priority: P2)

An operator on the floor uses a phone to create a lot, enter sizes, add bales, view a lot, update
status, upload a pattern photo, and add notes. Touch targets are large, numeric fields raise a
numeric keypad, primary content never scrolls sideways, tables collapse to cards, and step
navigation is thumb-friendly.

**Why this priority**: Explicitly required and high value, but the desktop workflow can be
demonstrated first; mobile parity is verified as its own slice, so P2.

**Independent Test**: On a 360 px-wide viewport, complete each listed task (create lot, enter all
19 sizes, add six bales, view lot, change status, upload a pattern photo, add a note) without
horizontal scrolling of primary content and without pinch-zoom to hit controls.

**Acceptance Scenarios**:

1. **Given** a 360 px-wide screen, **When** the operator runs the New Lot workflow, **Then** every
   step is usable one-handed with no sideways scrolling of the form.
2. **Given** a numeric field on mobile, **When** it receives focus, **Then** the device shows a
   numeric keypad.
3. **Given** the Lots or Bale table on mobile, **When** it is displayed, **Then** rows render as
   stacked cards rather than a wide table.
4. **Given** the Cutting step on mobile, **When** the operator adds a pattern photo, **Then** they
   can capture or pick an image and see a preview.

---

### User Story 8 - Attach a pattern / marker image to a lot (Priority: P3)

Instead of digital drawing, the operator uploads a photo or scan of the marker/pattern for the
lot, sees a preview, and can replace or remove it. Structured cutting fields (pattern type, marker
length/width, lay length, layers, plies) are captured regardless of whether an image is attached.

**Why this priority**: Useful supporting detail; the cutting record is complete without it, so P3.

**Independent Test**: On a lot, upload an image, confirm the preview, replace it with another,
confirm the new preview, remove it, and confirm the structured cutting fields are unaffected.

**Acceptance Scenarios**:

1. **Given** the Cutting step, **When** the operator uploads an image file, **Then** a preview is
   shown and the image is associated with the lot on save.
2. **Given** a lot with a pattern image, **When** the operator replaces or removes it, **Then** the
   change persists and the previous image is no longer shown.
3. **Given** a non-image or oversized file, **When** the operator selects it, **Then** the system
   rejects it with a plain message and keeps any existing image.

---

### User Story 9 - Notes in Gujarati, Hindi, or English (Priority: P3)

The operator records short instructions such as "2 set cutting required" in whichever language
they use. The notes field accepts and displays Gujarati, Hindi, and English text (including a
mix) without corruption or forced transliteration.

**Why this priority**: Small scope, high everyday realism, but not blocking for the core
workflow, so P3.

**Independent Test**: Enter a note containing Gujarati, Hindi, and English in one string; save;
reopen the lot and the PDF; confirm the text is preserved exactly in both.

**Acceptance Scenarios**:

1. **Given** the Notes field, **When** the operator types mixed Gujarati/Hindi/English text,
   **Then** it is accepted and shown as typed.
2. **Given** a saved multilingual note, **When** the lot detail and PDF are viewed, **Then** the
   note renders correctly in both.

---

### Edge Cases

- **Duplicate lot number by case or spacing**: `lot-30`, `LOT-30`, and `LOT-30 ` must be treated
  as the same lot number and rejected as duplicates.
- **Concurrent lot numbers**: two operators accept the same auto-suggested `LOT-<n>` at the same
  time — only one save succeeds; the other is told the number is now taken.
- **PCS entered but no sizes**, or **sizes entered but PCS blank**: the system must make the
  incomplete side obvious rather than silently assuming.
- **All sizes zero at save** / **no bale entries at save**: must be caught before save.
- **Zero, negative, or non-numeric meter/quantity values** (including pasted text): rejected with
  a field-specific message.
- **Divide-by-zero in average consumption** (PCS or size total is 0): no crash, average shown as
  not-yet-available.
- **Fat-finger magnitude errors** (e.g. 5120 instead of 512): flagged by the "unusual result"
  warning, not silently accepted.
- **Cutting date equal to program date**: allowed; **before program date**: blocked.
- **Interrupted session** (tab closed, connection lost mid-workflow): draft is recoverable.
- **Editing a lot already in Cutting or Completed**: behavior must be defined (see Open
  Questions); at minimum the user is warned that the lot is past the planning stage.
- **Removing a bale that was part of a matched total**: totals and the match indicator recompute
  immediately.
- **Disabling a size that already has a quantity**: the operator is warned that its quantity will
  be dropped from the total.
- **Filter boundaries**: "Today / This Week / This Month" behave correctly around midnight and
  month/year boundaries in the factory's local time.
- **Very large size matrix or bale list**: entry and totals stay responsive.
- **Notes with mixed scripts and emoji**: stored and displayed without corruption.

## Requirements *(mandatory)*

### Functional Requirements

#### Navigation & Shell

- **FR-001**: System MUST present a minimal primary navigation with exactly these sections:
  Dashboard, New Lot, Lots, Cutting, Bale / Fabric, Reports, Settings.
- **FR-002**: System MUST render navigation as a simple left sidebar on desktop and as bottom or
  collapsible navigation on mobile, with no nested menus.
- **FR-003**: Each screen MUST be scoped to one clear task ("one screen = one clear job") and use
  progressive disclosure rather than presenting all fields at once.

#### New Lot Guided Workflow

- **FR-004**: System MUST provide lot creation as an ordered multi-step workflow with these
  steps: Lot Details, Fabric Details, Sizes, Bale / Roll, Cutting, Review, Save.
- **FR-005**: System MUST always show the operator which step they are on, which steps remain, and
  which fields on the current step are required.
- **FR-006**: System MUST allow the operator to move backward to a previous step without losing
  entered data.
- **FR-007**: System MUST block advancing past a step whose required fields are missing or whose
  values are invalid, showing why.
- **FR-008**: The Review step MUST summarize the whole lot and MUST state clearly whether any
  inconsistency remains; when none remains it MUST show an "Everything looks good" confirmation
  and a single Save Lot action.

#### Lot Details (Step 1)

- **FR-009**: System MUST capture Lot No., Date, Fabric Supplier, Short No., Program Date, and
  Cutting Date.
- **FR-010**: System MUST let the operator either type a lot number or request an auto-generated
  one; the auto-generated value MUST be the next `LOT-<n>` derived from existing lot numbers and
  MUST remain editable.
- **FR-011**: System MUST let the operator pick a supplier from existing suppliers, search
  suppliers as they type, or enter a new supplier name.
- **FR-012**: System MUST provide date entry via a date picker for Date, Program Date, and Cutting
  Date.
- **FR-013**: System MUST reject a lot number that duplicates an existing one (case- and
  whitespace-insensitive) with the message "Duplicate Lot No. Please use a different lot number."
- **FR-014**: System MUST reject a missing supplier, missing Program Date, or missing Cutting Date
  with a field-specific plain-language message.
- **FR-015**: System MUST reject a Cutting Date earlier than the Program Date with "Cutting Date
  cannot be before Program Date." (equal dates are allowed).

#### Fabric Details (Step 2)

- **FR-016**: System MUST capture Fabric Supplier, Short No., Fabric Type, Color, Fabric
  Description, PANA, MTR, Average, and PCS.
- **FR-017**: System MUST preserve the factory meaning of the terms PANA (layers/panels/plies as
  used by the factory), MTR (fabric meters), AVERAGE (average fabric consumption), and PCS (total
  pieces) in all labels and outputs.
- **FR-018**: System MUST auto-calculate derived fabric values whenever the inputs required are
  present and valid.
- **FR-019**: System MUST NOT overwrite a value the operator entered manually; where a calculated
  value and a manually entered value differ, the system MUST show both and explain the
  difference.
- **FR-020**: System MUST visually distinguish calculated values from manually entered values
  wherever both can appear.
- **FR-021**: System MUST treat the average-consumption formula as configurable in Settings,
  defaulting to Total Fabric Meters ÷ PCS, together with a configurable "expected" value (default
  1.0 m/pc) and a configurable plausibility band (default 0.25×–2× of the expected value) used
  only for the unusual-result warning (FR-044).

#### Size-wise Quantity (Step 3)

- **FR-022**: System MUST provide a size-entry matrix for the fixed size set 6, 8, 10, 12, 14, 16,
  18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42.
- **FR-023**: Size quantity inputs MUST accept non-negative integers only and MUST reject
  non-numeric input.
- **FR-024**: System MUST support keyboard-only entry across the matrix, with Tab and Enter
  advancing to the next size.
- **FR-025**: System MUST maintain a live Total Size Quantity (Total PCS) as values are entered.
- **FR-026**: System MUST let the operator enable or disable individual sizes for a lot, warning
  before dropping a non-zero quantity from a size being disabled.
- **FR-027**: System MUST provide bulk-fill, copy-previous-quantity, and clear-all actions for the
  matrix.
- **FR-028**: System MUST visibly highlight sizes that are enabled but not yet filled.
- **FR-029**: System MUST compare Total Size Quantity against the PCS value and, on mismatch, show
  a prominent message in the form "Size quantities total {X} pcs, but PCS is entered as {Y}."
  without requiring any operator action to reveal it. PCS is an operator-entered planned figure;
  this mismatch is an advisory warning — it MUST be shown prominently on the Sizes and Review
  steps but MUST NOT block saving the lot.

#### Bale / Roll Management (Step 4)

- **FR-030**: System MUST allow multiple bale/roll records per lot, each with at least a Bale/Roll
  Number and a Meter value, and optionally Weight, Color/Shade, and Remarks.
- **FR-031**: System MUST provide an explicit "+ Add Bale / Roll" action and allow removing any
  bale/roll row.
- **FR-032**: System MUST maintain a live Bale/Roll Count and Total Bale Meters.
- **FR-033**: System MUST compare Total Bale Meters against Lot MTR and, on any nonzero
  difference, show the Lot quantity, the Bale total, and the signed difference (e.g. "Lot
  quantity: 512 MTR / Bale total: 518 MTR / Difference: +6 MTR"). An exact match is required;
  there is no tolerance band in this release.
- **FR-034**: System MUST reject negative or non-numeric meter and weight values on a bale row.

#### Cutting / Pattern Information (Step 5)

- **FR-035**: System MUST capture structured cutting fields: Cutting Pattern, Pattern Type, Marker
  Length, Marker Width, Lay Length, Number of Layers, Number of Plies.
- **FR-036**: System MUST allow uploading one pattern/marker image per lot, with preview, replace,
  and remove; digital drawing is out of scope.
- **FR-037**: System MUST reject a non-image or oversized file for the pattern image with a plain
  message and keep any existing image.
- **FR-038**: System MUST NOT require a pattern image in order to save a lot.

#### Notes

- **FR-039**: System MUST provide a free-text Notes field on a lot that accepts and correctly
  stores and displays Gujarati, Hindi, and English text, including mixed content.
- **FR-040**: System MUST NOT restrict, transliterate, or truncate note content by language.

#### Smart Calculations

- **FR-041**: System MUST auto-calculate, wherever inputs allow: Total Size Quantity, Total Bale
  Meters, Average Consumption, Total Pieces, Remaining Fabric, Meter Difference, Bale Count, and
  Total Layers.
- **FR-042**: System MUST never silently modify an operator-entered value as a result of a
  calculation.
- **FR-043**: System MUST provide a short plain-language explanation for each significant
  calculation (at minimum Average Consumption, Meter Difference, Remaining Fabric).
- **FR-044**: System MUST warn, without blocking the operator, when Average Consumption falls
  outside the configurable plausibility band (default 0.25×–2× of the configurable expected
  value, default 1.0 m/pc) — e.g. "Average consumption looks unusually high."
- **FR-045**: System MUST allow the average-consumption formula, its expected value, and its
  plausibility band to be selected or adjusted in Settings rather than being hard-coded; the
  default formula is Total Fabric Meters ÷ PCS.

#### Smart Validation

- **FR-046**: System MUST validate, at minimum: duplicate lot number; missing supplier; missing
  cutting date; cutting date before program date; bale-meter vs lot-MTR mismatch; size-total vs
  PCS mismatch; invalid or non-numeric numeric values; negative meters; missing required fields;
  non-positive PANA values (PANA is validated only as a positive number in this release — its
  exact definition and any upper bound are deferred, see OQ-7).
- **FR-047**: Validation messages MUST be human-readable, name the field, and state the fix (e.g.
  "Please enter the Cutting Date."). The system MUST NOT display technical validation codes.
- **FR-048**: System MUST surface inconsistencies as early as the step where the relevant data is
  entered, and again on the Review step, so incorrect records are hard to create.
- **FR-049**: System MUST distinguish blocking errors (prevent save) from advisory warnings
  (allow save after the operator sees them). The size-total-vs-PCS mismatch (FR-029) and the
  unusual-average-consumption warning (FR-044) are advisory; duplicate lot number, missing
  supplier, missing Program/Cutting Date, Cutting Date before Program Date, and non-numeric or
  negative numeric values are blocking.

#### Lot Detail Page

- **FR-050**: After a lot is saved, System MUST show a lot detail page headed by the lot number
  and the current status shown as a label with an icon.
- **FR-051**: The detail page MUST make the key metrics MTR, PCS, PANA, and AVG visually
  prominent.
- **FR-052**: The detail page MUST present these sections distinctly: Lot Information, Fabric
  Information, Size Breakdown, Bale / Roll Details, Cutting Information, Notes.
- **FR-053**: The detail page MUST offer these actions: Edit, Start Cutting, Print, Download PDF,
  Duplicate Lot, Mark Completed.

#### Lot List

- **FR-054**: System MUST show a lot list with columns Lot No., Short No., Fabric Supplier, MTR,
  PCS, Cutting Date, Status, Created By, Action.
- **FR-055**: System MUST support search over lot number, short number, supplier, and bale number.
- **FR-056**: System MUST provide filters: Today, This Week, This Month, Pending, Cutting,
  Completed.
- **FR-057**: System MUST allow sorting the list by its columns and indicate the active sort.
- **FR-058**: Every list row MUST show status as a label plus icon and provide an action to open
  the lot detail and its PDF.

#### Status System

- **FR-059**: System MUST support the lot statuses Draft, Ready, Cutting, and Completed.
- **FR-060**: System MUST convey status through label and icon/shape and consistent treatment, not
  through color alone, on every surface where status appears.
- **FR-061**: System MUST let a user change a lot's status only along these transitions:
  Draft→Ready, Ready→Cutting (Start Cutting), Cutting→Completed (Mark Completed), Cutting→Ready,
  and Completed→Cutting. The two reversals (Cutting→Ready and Completed→Cutting) MUST require an
  explicit confirmation. All other transitions MUST be rejected. Until roles are enforced
  (FR-081), any user may perform an allowed transition.

#### Dashboard

- **FR-062**: System MUST show a dashboard with the summary figures Total Active Lots, Today's
  Cutting, Pending Cutting, Completed Lots, Total Fabric Used, and Total Pieces, each derived from
  current lot data.
- **FR-063**: System MUST show a "Today's Cutting" table with columns Lot No., Style / Short No.,
  Fabric, Pieces, Meter, Status, Action.
- **FR-064**: Dashboard MUST highlight lots waiting for cutting, lots with fabric mismatches, lots
  with missing information, today's production, and lots with high fabric consumption.
- **FR-065**: Dashboard MUST NOT include analytics beyond the operational highlights above.

#### Reports

- **FR-066**: System MUST provide a Reports section limited, for this release, to an operational
  summary (lots waiting, fabric-mismatch count, completed cutting, pending cutting, today's
  production). Advanced/analytical reporting is out of scope.

#### Print / PDF

- **FR-067**: System MUST generate an A4 document for a lot that is a redesigned, clearer version
  of the paper form — not a facsimile of it.
- **FR-068**: The document MUST include, where the data exists: company logo, lot number, date,
  fabric information, size breakdown, bale information, cutting information, and operator.
- **FR-069**: The document MUST include a scannable barcode/QR code encoding the lot identifier
  and a signature area.
- **FR-070**: The document MUST remain fully legible when printed in black and white (status not
  conveyed by color alone).

#### Speed & Repeat Entry

- **FR-071**: System MUST provide "Duplicate Lot" and "Create from Previous Lot" that copy fabric,
  size, bale, and cutting data into a new draft while requiring the operator to review lot number,
  date, quantities, and cutting date.
- **FR-072**: System MUST auto-save an in-progress lot as a draft and restore it if the operator
  leaves and returns.
- **FR-073**: System MUST offer recently used suppliers first in the supplier picker and support
  search-as-you-type there.
- **FR-074**: System MUST minimize clicks and keystrokes for numeric entry (numeric keypad on
  mobile, keyboard navigation on desktop).

#### Mobile

- **FR-075**: System MUST let an operator complete these tasks on a phone: create a lot, enter
  sizes, add bales, view a lot, update status, upload a pattern photo, add notes.
- **FR-076**: On mobile, numeric fields MUST invoke a numeric keypad, touch targets MUST be
  large, primary content MUST NOT scroll horizontally, and tables MUST reflow to cards.
- **FR-077**: Step navigation in the New Lot workflow MUST be usable one-handed on a phone.

#### Data & Extensibility

- **FR-078**: System MUST store lot data as normalized related records (lot, size rows, bale rows,
  cutting record, supplier, activity log) — never as a single JSON blob standing in for
  normalized data.
- **FR-079**: System MUST record significant actions (lot created, edited, status changed) in an
  activity log associated with the lot.
- **FR-080**: The data model and navigation MUST leave room for future modules (inventory,
  purchase, planning, bundle, sewing, finishing, dispatch, orders, notifications, scanning)
  without those modules being built in this release.
- **FR-081**: The system MUST be structured so that four roles — Admin, Supervisor, Operator,
  Viewer — can be enforced later (Admin: all; Supervisor: create/edit/view/complete; Operator:
  create/edit assigned lots; Viewer: view/reports), without full authentication/authorization
  being built now.
- **FR-082**: UI copy MUST be structured so that English, Hindi, and Gujarati interface
  translations can be added later without rearchitecting; full translation of the interface is
  out of scope for this release.

#### Settings

- **FR-083**: System MUST provide a Settings section exposing at least: the average-consumption
  formula choice, lot-number auto-generation on/off, and a reference view of the four roles and
  their intended permissions.

#### Experience & Feedback States

- **FR-084**: System MUST NOT show a blank screen where content can be absent; every such surface
  (no lots, no search results, empty dashboard sections) MUST show a guided empty state stating
  what is missing, why it matters, and the action to take (e.g. "No Lots Yet … + Create New Lot").
- **FR-085**: System MUST give visible feedback for in-progress actions (e.g. "Saving Lot…") and
  MUST confirm completion, so the user is never left unsure whether an action worked.
- **FR-086**: System MUST present failures in plain language with a recovery action — at minimum
  "Try Again" and, where the work can be preserved, "Save as Draft" — and MUST NOT display raw
  status codes or stack traces.
- **FR-087**: After a successful save the system MUST show a confirmation summary (lot number,
  PCS, MTR, resulting status) with two next actions: "View Lot" and "Create Another Lot".
- **FR-088**: Destructive actions MUST require an explicit confirmation that names the target and
  states the consequence, with the destructive choice visually distinct from the safe choice.
- **FR-089**: The search empty state MUST suggest what can be searched (lot number, supplier, bale
  number) rather than only saying "no results".
- **FR-090**: Loading of list and detail content SHOULD use skeleton placeholders rather than
  bare spinners where it improves the perception of speed.

#### Interaction Model & Navigation Affordances

- **FR-091**: The primary call to action ("+ New Lot") MUST be the single most prominent action
  on the dashboard; secondary quick actions (Continue Draft, View Lots, Start Cutting) MUST be
  clearly subordinate to it.
- **FR-092**: The New Lot workflow MUST show, on every step, a header with the step number and
  title, a one-sentence explanation of what to enter, and a fixed bottom bar with Back, Save
  Draft, and Continue (Continue as the primary button).
- **FR-093**: The dashboard MUST order information by priority: action-required items (fabric
  mismatch, missing information, pending cutting) above progress information (today's production,
  cutting progress, fabric usage) above historical/secondary statistics.
- **FR-094**: Optional bale/roll fields (Weight, Shade, Remarks) MUST be collapsed by default
  behind a "More Details" affordance and MUST NOT be shown until requested.
- **FR-095**: The Review step MUST present a per-section summary (Lot Details, Fabric, Sizes,
  Bales, Cutting) with an Edit control on each section, and MUST show at the top either
  "Everything looks good" or a count and list of the items needing attention; the reason Save is
  unavailable MUST always be visible.
- **FR-096**: On mobile, filters MUST open in a bottom sheet or modal and the filter control MUST
  show the count of active filters (e.g. "Filters · 2").
- **FR-097**: A single reusable status component MUST be used wherever a lot status appears —
  dashboard, lot list, lot detail, search results, and print — combining label, optional icon,
  and consistent treatment.
- **FR-098**: User-facing text MUST use factory-familiar terms ("Create Lot", "Add Bale", "Start
  Cutting"), not system or ERP phrasing.

#### Role-Tailored Interface

- **FR-099**: The interface MUST be organized so that Operator, Supervisor, and Admin each see a
  view scoped to their needs — Operator: fast entry and their lots; Supervisor: production
  overview, pending work, discrepancies, quick actions; Admin: management, settings, suppliers,
  users, reports — rather than one identical dense interface for all roles.
- **FR-100**: Until authentication exists (see FR-081), the active role MUST be selectable in the
  app, and the selected role MUST drive which sections and actions are emphasized or hidden.

#### Consistency & Responsiveness

- **FR-101**: The UI MUST be built from a consistent set of reusable components (button, input,
  select, date picker, status badge, metric card, section card, data table, mobile card, stepper,
  alert, toast, modal, bottom sheet, empty state, loading state, error state, confirmation
  dialog), each with consistent interaction states, rather than one-off components per page.
- **FR-102**: Layouts MUST reorganize (not merely scale) across mobile (~320–767px), tablet
  (~768–1023px), and desktop (1024px+); on mobile, data tables MUST become stacked cards and
  primary content MUST NOT scroll horizontally.
- **FR-103**: Presentation MUST be kept separate from business logic so calculation and
  validation rules are not duplicated per screen (supports FR-042, FR-046, and localization).

### Key Entities *(include if feature involves data)*

- **Supplier**: A fabric supplier the factory buys from. Attributes: name (unique), optional
  contact. Referenced by lots. Recently used suppliers are surfaced first in pickers.
- **Lot**: One incoming fabric lot at the cutting stage. Attributes: lot number (factory-unique,
  case-insensitive), date, supplier, short number, program date, cutting date, fabric type,
  color, fabric description, PANA, total meters (MTR), average consumption, total pieces (PCS),
  status (Draft/Ready/Cutting/Completed), notes, created-by, created-at, updated-at. Owns its
  size rows, bale rows, and one cutting record.
- **Lot Size**: A per-size quantity for a lot. Attributes: lot reference, size (from the fixed
  set), quantity (non-negative integer), enabled/disabled for this lot. The sum across rows is
  Total Size Quantity.
- **Bale / Roll**: One bale or roll of fabric received for a lot. Attributes: lot reference,
  bale/roll number, meters, optional weight, optional shade, optional remarks. The count and
  meter sum feed the lot-MTR reconciliation.
- **Cutting Record**: The cutting/pattern information for a lot. Attributes: lot reference, cutting
  pattern, pattern type, marker length, marker width, lay length, number of layers, number of
  plies, optional reference to one pattern image.
- **Pattern Image**: An uploaded photo/scan of the marker/pattern for a lot. Attributes: lot
  reference, image data/reference, upload time. At most one current image per lot.
- **Note**: Free-text instruction(s) on a lot in any of Gujarati/Hindi/English. May be modeled as
  a field on the lot or as related records; must not restrict content by language.
- **Activity Log Entry**: A record of a significant action on a lot. Attributes: lot reference,
  action, details, timestamp, actor (operator name until roles exist).
- **User (future-ready)**: A person using the system, with one of the roles Admin, Supervisor,
  Operator, Viewer. Not fully implemented in this release; the model and permission checks are
  structured to accept it.
- **Calculation Setting**: Factory-configurable calculation behavior, at minimum the
  average-consumption formula and plausibility thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trained operator can create a complete lot — lot details, fabric details, all
  applicable sizes, six bale entries, and cutting fields — in 3 minutes or less.
- **SC-002**: A first-time operator, given no training, starts a new lot within 10 seconds of
  opening the app (they find and use the New Lot action unaided).
- **SC-003**: 100% of the validation rules listed in FR-046 are enforced — each blocking error
  prevents the save and each advisory warning is shown before save — verified by a test covering
  every rule.
- **SC-004**: A supervisor can state any lot's current status within 5 seconds of looking at the
  Lots list, the lot detail page, or the dashboard.
- **SC-005**: Every P0/P1 operator task can be completed on a 360 px-wide screen with no
  horizontal scrolling of primary content and no pinch-zoom needed to operate controls.
- **SC-006**: The size-total-vs-PCS mismatch and the bale-meter-vs-lot-MTR mismatch are visible on
  the relevant step and on Review with zero extra operator actions, in 100% of mismatch cases.
- **SC-007**: Starting a lot from a previous one pre-fills the reusable fields in 2 actions or
  fewer and leaves lot number, date, quantities, and cutting date flagged for review.
- **SC-008**: An operator can enter quantities for all 19 sizes using only the keyboard, without
  touching a pointing device.
- **SC-009**: For any saved lot, its individual size rows and bale rows can each be retrieved and
  counted independently (no whole-lot JSON blob), confirmed by inspecting stored data.
- **SC-010**: Operators are shown zero technical error codes; every validation message names the
  field and the corrective action, verified across all validation paths.
- **SC-011**: An interrupted operator who reloads the app mid-workflow recovers their in-progress
  lot at the step and values they left, in 100% of interruption tests.
- **SC-012**: A multilingual note containing Gujarati, Hindi, and English is preserved byte-for-
  byte through save, reload, lot detail, and PDF.
- **SC-013**: Every screen that can lack content shows a guided empty state, and every failure
  path shows a plain-language message with a recovery action — verified across the lot list,
  search, dashboard sections, and the save/edit flows (0 blank screens, 0 raw error codes).
- **SC-014**: A first-time user completes the full 12-step reference scenario (create lot →
  supplier → short number → fabric quantity → PANA → sizes → six bales → verify meter total →
  cutting info → pattern image → review → save) unaided, and a save-confirmation screen offers
  "View Lot" and "Create Another Lot".
- **SC-015**: The same status component renders on the dashboard, lot list, lot detail, search
  results, and the printed record, and is legible without color in all five.

## Assumptions

- **Single factory / single tenant** for this release; no multi-site or multi-company support.
- **No authentication or enforced authorization in the MVP.** The operating user's name is
  captured (selected or entered) and stored as "Created By". The data model and permission points
  are shaped so the four roles can be enforced later.
- **Delivery is a responsive web application** used on modern mobile, tablet, and desktop
  browsers. Offline operation is not required; the factory floor and office are assumed to have
  connectivity.
- **The size set is fixed** to the 19 sizes from the reference form (6–42 even). Individual sizes
  can be disabled per lot; the set itself is not user-editable in this release.
- **Lot numbers are factory-wide unique**, compared case- and whitespace-insensitively.
  Auto-generation proposes the next `LOT-<n>` from the highest existing numeric suffix and is
  always editable.
- **Default average-consumption formula is Total Fabric Meters ÷ PCS**, exposed in Settings
  together with a configurable expected value (default 1.0 m/pc) and plausibility band (default
  0.25×–2× of expected) used only for the unusual-result warning; a manually entered average is
  never overwritten, only compared.
- **PCS is treated as an operator-entered planned figure** that the size breakdown is reconciled
  against; a mismatch is surfaced prominently but is advisory and does not block saving.
- **Total bale/roll meters must equal Lot MTR exactly**; any nonzero difference is flagged, with
  no tolerance band in this release.
- **Lot status follows a constrained state machine**: Draft→Ready→Cutting→Completed, plus
  confirmed Cutting→Ready and Completed→Cutting reversals; every other transition is rejected.
- **PANA is a positive-number-only field in this release**; its exact factory meaning (layers vs
  panels vs plies) and any upper bound are deferred (OQ-7).
- **One pattern image per lot** in this release, replaceable; images are stored as normal file
  attachments, not drawn in-app.
- **Notes accept arbitrary Unicode**; no per-language processing. Interface chrome remains English
  in this release, with copy organized for later translation.
- **Reports in this release** means the operational summary only; advanced analytics is out of
  scope.
- **Drafts are per-operator** and auto-saved; a draft is not visible as a completed lot until
  saved.
- **An initial thin implementation already exists** (an Express + SQLite backend and a single-file
  React frontend) and is treated as the starting codebase to be brought up to this specification,
  not a constraint on the target design.
- **"Style" on the dashboard equals the lot's Short No.** unless a distinct style field is
  introduced later.
- **Product name is "DP Creation"** with the subtitle "Garment Cutting Management", used on the
  app shell, headers, empty states, mobile header, and the printed record.
- **No login screen in the MVP.** The brand's appearance on "Login" in the design doc is treated
  as future-facing; if a login screen is added it will not gate MVP functionality (pending
  UXQ-4).
- **Hard deletion of a lot is not assumed to be in MVP scope.** The design doc's delete
  confirmation pattern applies if/when deletion is added; MVP covers status changes only (pending
  UXQ-5).
- **Role-tailored views in the MVP are presentation-level only**, driven by an in-app role
  selector, with no enforcement — full role enforcement follows authentication (FR-081).

## Open Questions

These are business rules where the factory's real workflow may differ from a reasonable default.
They are recorded here rather than decided silently, and should be resolved in `/speckit-clarify`.

**Resolved 2026-08-29** (see the Clarifications section): OQ-1 (PANA definition — deferred to
OQ-7; MVP validates PANA only as a positive number), OQ-2 (PCS authority — operator-entered,
mismatch is advisory), OQ-3 (average-consumption formula — MTR ÷ PCS with a configurable
0.25×–2× plausibility band), OQ-5 (bale-meter vs Lot-MTR — exact match, no tolerance), OQ-6
(status transitions — constrained state machine with two confirmed reversals).

- **OQ-4 — "Remaining Fabric" and "Meter Difference" definitions**: Exactly which quantity is
  subtracted from which (Lot MTR vs total bale meters vs consumed fabric)?
- **OQ-7 — Layers vs Plies vs PANA relationship**: How do these three quantities relate; is any of
  them derived from the others? (MVP treats PANA, Number of Layers, and Number of Plies as
  independent operator-entered fields.)
- **OQ-8 — Short No.**: Is it a style code that should be validated against a known list, or free
  text?
- **OQ-9 — Date semantics**: Precise business meaning of Date vs Program Date vs Cutting Date and
  any ordering rules beyond "cutting date ≥ program date".
- **OQ-10 — Edit after Cutting/Completed**: May a lot be edited once it leaves the planning stage,
  and are its calculations frozen at that point?
- **OQ-11 — "Set" cutting**: The note example "2 set cutting required" — should "set" be a
  structured field/concept, or remain a free-text note for this release? (Assumed note-only.)
- **OQ-12 — Operator identity without auth**: Is "Created By" a device-remembered operator name,
  or a required prompt each session?

UX-specific open questions (brand assets, whether a login screen ships, whether hard delete is in
scope, "Create Another Lot" carry-over, dashboard greeting) are listed in
[`design/ux-spec.md`](./design/ux-spec.md) under "Open UX questions" (UXQ-1 … UXQ-7) and should be
resolved alongside the above in `/speckit-clarify`.
