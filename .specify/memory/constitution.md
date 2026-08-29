<!--
SYNC IMPACT REPORT
Version change: [TEMPLATE / unversioned] → 1.0.0
Bump rationale: Initial ratification. All template placeholders replaced with concrete,
project-specific governance derived from the Vastra product brief.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Operator-First Simplicity & Speed
  - [PRINCIPLE_2_NAME] → II. Prevent Errors Before They Happen
  - [PRINCIPLE_3_NAME] → III. Calculations Assist, Never Override
  - [PRINCIPLE_4_NAME] → IV. Preserve Factory Semantics
  - [PRINCIPLE_5_NAME] → V. Normalized Relational Data
Added principles:
  - VI. Mobile-Equivalent Experience
  - VII. MVP Discipline with Extensible Architecture

Added sections:
  - Design & UX Standards (replaces [SECTION_2_NAME])
  - Development Workflow & Quality Gates (replaces [SECTION_3_NAME])

Removed sections: none

Templates / files requiring review:
  - .specify/templates/plan-template.md ................. ⚠ verify Constitution Check gates
    reference Principles I–VII by name
  - .specify/templates/spec-template.md ................. ⚠ verify "open questions" convention
    matches Principle VII (unclear business rules → open questions, never silent decisions)
  - .specify/templates/tasks-template.md ................ ⚠ verify test-first expectations for
    validation rules and calculations (Quality Gates)
  - CLAUDE.md / agent context files .................... ⚠ none present yet; when created they
    MUST defer to this constitution

Deferred / TODO items: none
-->

# Vastra Garment Cutting Management System Constitution

## Core Principles

### I. Operator-First Simplicity & Speed

The primary user is a garment factory operator who may have limited computer experience, works
under time pressure, and receives no formal software training. Every feature MUST be usable by
that person on first encounter.

- One screen MUST do one clear job. Use progressive disclosure and guided multi-step workflows
  instead of large single-page forms.
- The user MUST always be able to tell where they are, what is required, and what comes next.
- Creating a complete lot MUST be achievable in roughly 2–3 minutes by a trained operator.
- Numeric entry MUST support full keyboard navigation (Tab/Enter advance, numeric keypad on
  mobile), bulk fill, copy-previous, and clear-all.
- Drafts MUST auto-save so an interrupted operator loses no work.
- UI copy MUST use familiar garment-factory terminology, never software jargon.

Rationale: Adoption depends entirely on whether a real worker can finish a lot quickly and
confidently. Feature count is not a success metric; time-to-complete and accuracy are.

### II. Prevent Errors Before They Happen

The system MUST make incorrect records hard to create, not merely report them after the fact.

- Cross-field business checks MUST run continuously, at minimum: total size quantity vs. PCS,
  entered bale meters vs. lot MTR, cutting date vs. program date, duplicate lot number,
  negative or non-numeric quantities, missing required fields and supplier.
- Mismatches MUST be shown plainly with the concrete numbers and the difference
  (e.g. "Lot quantity: 512 MTR, Bale total: 518 MTR, Difference: +6 MTR").
- Validation messages MUST be human-readable and actionable. Technical codes
  (e.g. "Validation Error 402") MUST NOT be shown to operators.
- Status MUST be conveyed by label plus icon or shape, never by color alone.

Rationale: A wrong production record propagates cost and rework through the whole factory. The
cheapest place to stop a data error is before it is saved.

### III. Calculations Assist, Never Override

Automatic calculation is a convenience layer on top of operator intent, not a replacement for it.

- The system MUST auto-calculate derived values wherever the inputs are reliable (totals, counts,
  averages, remaining fabric, meter differences).
- The system MUST NOT silently modify or overwrite a value a user entered manually.
- Calculated values MUST be visually distinguishable from manually entered values at all times.
- When a calculated value and a manually entered value disagree, the system MUST show both and
  explain the discrepancy.
- Business formulas that may vary by factory (e.g. average consumption) MUST be configurable
  rather than hard-coded as universal truth.
- Unusual results (e.g. abnormally high average consumption) MUST trigger a visible warning.

Rationale: The factory's real formulas are not fully known and differ between sites. Guessing and
overwriting destroys trust; surfacing and explaining builds it.

### IV. Preserve Factory Semantics

The product digitizes an existing workflow; it MUST NOT force operators to learn a foreign ERP.

- The business meaning of core domain terms MUST be preserved exactly: Lot No., Fabric Supplier,
  Short No., PANA, MTR, Average, PCS, Size Quantities, Bale Number, Bale Meter, Cutting/Pattern
  information, Notes.
- The reference paper form is a source of workflow understanding only. The product MUST modernize
  the interaction and MUST NOT reproduce the paper layout field-for-field.
- Free-text fields (notably Notes) MUST accept English, Hindi, and Gujarati content without
  restriction or transliteration.

Rationale: Operators already hold a correct mental model of their process. The software must map
onto that model, not replace it.

### V. Normalized Relational Data

Production data MUST be stored in a proper relational structure.

- Distinct entities (e.g. Users, Suppliers, Lots, LotSizes, Bales, CuttingRecords, Patterns,
  Notes, ActivityLogs) MUST be modeled as separate related records with referential integrity.
- Application or lot state MUST NOT be persisted as a single large JSON blob where normalized
  relational data is the appropriate representation.
- Significant create/update/status actions MUST be recorded in an activity log.

Rationale: Every planned future module (reporting, inventory, planning, dispatch) depends on
queryable normalized data. A JSON blob forecloses those futures on day one.

### VI. Mobile-Equivalent Experience

Mobile is a first-class target, not a degraded view.

- An operator MUST be able to create a lot, enter sizes, add bales, view a lot, update status,
  upload a pattern photo, and add notes entirely on a phone.
- Touch targets MUST be large; numeric fields MUST invoke a numeric keyboard; horizontal scrolling
  of primary content MUST be avoided.
- Tables MUST reflow to readable cards on small screens, and step navigation MUST remain usable
  one-handed.

Rationale: Much of this work happens on the factory floor, away from a desktop. If mobile is
weaker, the tool is not used where the work is.

### VII. MVP Discipline with Extensible Architecture

The first release scope is Garment Cutting / Fabric Lot Management only. Nothing else ships now.

- Work MUST follow the priority order: P0 (New Lot, Lot Details, Fabric Details, Size Matrix,
  Bale/Roll Management, Automatic Calculations, Validation, Save/Edit, Lot Detail, Lot List,
  Status) → P1 (Dashboard, Search, Filters, Duplicate Lot, Mobile optimization, Print/PDF,
  Pattern image upload) → P2 (advanced reports, role permissions, QR/barcode, notifications,
  further ERP modules).
- Future modules (Inventory, Purchase, Production/Cutting Planning, Bundle Management, Sewing,
  Finishing, Dispatch, Orders, notifications, scanning) MUST NOT be built in the MVP, but the
  architecture MUST NOT block them.
- The architecture MUST be ready for four roles (Admin, Supervisor, Operator, Viewer) and for
  localization (English, Hindi, Gujarati) without implementing full authorization or full
  translation in the MVP unless the chosen stack requires it.
- Where a business rule is unclear or an assumption is unconfirmed, it MUST be recorded as an
  explicit open question. The team MUST NOT silently decide contested factory logic, and MUST NOT
  invent factory logic the requirements do not support.

Rationale: An excellent, narrow Cutting workflow that ships beats a broad ERP that does not. Keeping
seams clean is how the narrow product grows later without a rewrite.

## Design & UX Standards

The visual language is Modern Industrial SaaS: modern, minimal, professional, clean, highly
readable.

- Typography MUST use a highly readable sans-serif face; tiny text and dense layouts are
  prohibited.
- Forms MUST place labels above inputs. Primary actions MUST use large, obvious, action-oriented
  buttons.
- The palette MUST be mostly neutral with a single primary brand color and a consistent set of
  status colors. Excessive gradients, decorative animation, and consumer social-media aesthetics
  are prohibited.
- Cards MUST use restrained rounded corners without ornamental decoration.
- Key lot metrics (e.g. MTR, PCS, PANA, AVG) MUST be visually prominent on detail and dashboard
  views.
- The Print/PDF output MUST be a professional A4 document that a worker familiar with the original
  paper form recognizes, while being cleaner and more readable than that form. It MUST NOT be a
  pixel copy of the paper layout.
- The dashboard MUST stay operationally focused (active lots, today's cutting, pending, completed,
  fabric used, pieces, and data-quality warnings) and MUST avoid speculative analytics.

## Development Workflow & Quality Gates

- Features MUST proceed through the Spec Kit flow: `/speckit-specify` → `/speckit-clarify` (when
  open questions exist) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- Every plan MUST include a Constitution Check that names Principles I–VII and states how the
  design satisfies each. A violation MUST be resolved or recorded as an explicit, justified
  complexity trade-off before implementation begins.
- Validation rules (Principle II) and derived calculations (Principle III) MUST have explicit
  automated tests, including the cross-field mismatch cases and configurable-formula behavior.
- Ambiguities surfaced during specification MUST be carried as open questions into
  `/speckit-clarify` and resolved with a stakeholder, not by the implementer alone.
- Each change MUST be validated against the MVP success scenario: a worker receiving a new lot can
  (1) tell where to start unaided, (2) create a lot in ~2–3 minutes, (3) enter sizes quickly,
  (4) add six bales quickly, (5) immediately see whether meter totals are correct, (6) let a
  supervisor read lot status within ~5 seconds, (7) work comfortably on mobile, and (8) be stopped
  from common data-entry mistakes. A "no" on any point is a signal to simplify, not to ship.
- Code review MUST verify constitution compliance and MUST reject unjustified scope creep beyond
  the current priority tier.

## Governance

- This constitution supersedes other development practices and conventions for this project. Where
  a repository guidance file (e.g. `CLAUDE.md` or agent context files) conflicts with it, the
  constitution wins and the guidance file MUST be corrected.
- Amendments MUST be proposed with a written rationale, MUST update the version and the
  Last Amended date, and MUST note downstream template or guidance impact in the Sync Impact
  Report.
- Versioning follows semantic versioning:
  - MAJOR: backward-incompatible governance change — a principle removed or redefined in a way
    that invalidates existing compliance.
  - MINOR: a new principle or section added, or existing guidance materially expanded.
  - PATCH: clarifications, wording, and non-semantic refinements.
- Compliance MUST be reviewed at two gates: the plan gate (Constitution Check) and the
  implementation gate (code review). Unresolved violations block merge.
- Open questions raised under Principle VII MUST be tracked to closure and MUST NOT be resolved by
  silent default.

**Version**: 1.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
