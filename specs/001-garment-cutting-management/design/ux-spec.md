# DP Creation — UI/UX Design Specification

**Status**: Design source of truth for feature `001-garment-cutting-management`
**Created**: 2026-08-29
**Relationship to spec.md**: This document governs *how* the experience looks and behaves.
`spec.md` governs *what* the system must do and *why*. Where this document adds user-facing
behavior (empty states, feedback states, confirmation screens, role-tailored interfaces), those
requirements are also reflected as functional requirements in `spec.md`. Where the two ever
conflict, `spec.md`'s business rules win and this document is corrected.

Per §47 of this document: preserve the business requirements from the main specification; do not
introduce unnecessary features; do not redesign the workflow without a strong usability reason;
do not turn the product into a generic ERP; prefer reusable components; keep business logic
separate from presentation; keep the design responsive and localization-ready; document important
UX decisions; surface unresolved UX/business questions instead of inventing answers; validate
against the real factory-worker scenario; prioritize usability over decoration, speed over
feature density, and error prevention over error correction.

---

## Product

**DP Creation — Garment Cutting Management System.** A professional, modern, highly intuitive
UI/UX built specifically for garment manufacturing businesses, designed around the real working
behavior of factory operators and supervisors. The goal is not a generic SaaS dashboard; it is to
make garment production data entry faster, clearer, safer, and easier than the existing paper
process.

## 1. Design principle

A factory worker should understand what to do without software training. The UI must feel
obvious. On opening the app a user should immediately understand: where they are, what needs
attention, what action to take, and what the next step is. The software adapts to the user's
workflow, not the other way around.

## 2. Target users

- **Operator** — very fast data entry, large inputs, simple workflows, minimal typing, clear
  validation, mobile-friendly.
- **Supervisor** — quick production overview, pending work, cutting status, fabric discrepancies,
  lot information, quick actions.
- **Admin** — complete management: settings, users, suppliers, reports.

Do not give every role the same complicated interface.

## 3. Overall visual direction

Modern Industrial SaaS + Garment Manufacturing. The UI communicates professional, reliable,
efficient, clean, modern, practical, production-focused. It must not look like consumer social
media, a flashy startup landing page, a generic accounting app, an old ERP, a spreadsheet, or a
digital copy of the paper form.

## 4. Brand

- Application name: **DP Creation**
- Primary product label: **DP Creation**
- Suggested subtitle: **Garment Cutting Management**
- Used consistently on: login, sidebar, dashboard, page headers, print documents, empty states,
  mobile header. Do not overuse the brand.

## 5. Color system

Restrained and professional: neutral background; white or slightly elevated cards; one strong
primary brand color; one accent color where useful; semantic status colors. Status set: Draft,
Ready, Cutting, Completed — colors consistent throughout. Never use color alone; always combine
**color + text + optional icon** (e.g. `● Ready`, not just a green dot). Avoid rainbow
dashboards, excessive gradients, neon colors, too many accents, decorative color blocks.

## 6. Typography

Readability first, modern sans-serif. Hierarchy: page title (strong, prominent) → section title
(clear, smaller) → field label (highly readable) → input text (large enough for factory
operators) → supporting text (smaller but readable). Important production values
(`512 MTR`, `557 PCS`, `54 PANA`, `0.92 AVG`) use stronger typography and must be immediately
scannable. No tiny typography.

## 7. Layout

Consistent application shell. Desktop: top header + compact left sidebar + main content.

```text
┌────────────────────────────────────────────────────────┐
│ Top Header                                             │
├───────────────┬────────────────────────────────────────┤
│ Sidebar       │ Main Content                           │
│               │                                        │
└───────────────┴────────────────────────────────────────┘
```

Sidebar items: Dashboard, New Lot, Lots, Cutting, Bale / Fabric, Reports, Settings. No
unnecessary navigation items.

## 8. Mobile navigation

Mobile is designed intentionally, not a shrunken desktop. Compact top header; bottom navigation
for primary actions; collapsible secondary navigation; full-width forms; large touch targets.
Primary mobile actions: Dashboard, New Lot, Lots, Cutting. Secondary features under a menu.

## 9. Dashboard UX

The dashboard answers three questions immediately: What is happening? What needs attention? What
should I do next? Top area shows a greeting and "Today's Production". Summary cards: Active Lots,
Today's Cutting, Pending Cutting, Completed, Total Fabric, Total Pieces. Cards are not
excessively decorative.

## 10. Priority-based dashboard

Visual hierarchy by importance:

- **High priority**: fabric mismatch, missing information, pending cutting, lots requiring action.
- **Medium priority**: today's production, cutting progress, fabric usage.
- **Low priority**: historical statistics, secondary information.

The dashboard prioritizes actionable information.

## 11. Quick actions

Primary CTA: **+ New Lot** — extremely obvious. Secondary: Continue Draft, View Lots, Start
Cutting. Avoid many competing primary buttons.

## 12. New Lot UX

The most important workflow. Never a giant form — a stepper/wizard:

```text
1 Details → 2 Fabric → 3 Sizes → 4 Bales → 5 Cutting → 6 Review
```

Progress shown clearly: current step + completed steps + remaining steps.

## 13. Step design

Each step has: header (step number + title); one-sentence explanation of what to enter; main form
with only that step's fields; bottom navigation with Back, Save Draft, Continue. Primary button:
**Continue**. Navigation is never hidden.

## 14. Form UX

Every field answers "what do I enter here?" via clear labels, helpful placeholders, appropriate
input types, contextual helper text, sensible defaults. Placeholder text is never the only label.
Example:

```text
Fabric Meter
[ 512 ]
Total fabric quantity for this lot
```

## 15. Smart defaults

Reduce typing: remember recently used suppliers; suggest previous values; auto-generate lot
number; default dates appropriately; remember common sizes; preserve draft data. Never silently
change user-entered data.

## 16. Size matrix UX

Optimized for speed: large numeric fields; numeric keyboard on mobile; Tab navigation; Enter
moves to next row; auto total; quick fill; copy previous value; clear all; disable unused sizes.
Prominent total at the bottom:

```text
TOTAL PCS
557
```

## 17. Size validation UX

If size quantities ≠ PCS, show immediately (not at final submit):

```text
⚠ Quantity mismatch
Size quantities: 521 PCS
Entered PCS:     557 PCS
Difference:      36 PCS
```

Provide a clear next action (e.g. "Review quantities"). No technical validation language.

## 18. Bale / Roll UX

Feels like adding rows, not another complicated form. Core columns Bale Number + Meter. Optional
information (Weight, Shade, Remarks) is collapsed under "More Details" and not shown by default.
Explicit "+ Add Bale / Roll".

## 19. Fabric mismatch UX

High-priority warning. For Lot MTR = 512, Bale total = 518:

```text
⚠ Fabric quantity mismatch
Lot quantity   512 MTR
Bale total     518 MTR
Difference     +6 MTR
```

Clear, visible, understandable, actionable — never a generic red error banner without
explanation.

## 20. Cutting section

Simple. Fields: Pattern, Pattern Type, Marker Length, Marker Width, Lay Length, Layers, Plies.
Pattern image: a clear upload target; after upload show a preview with Replace, Remove, View.

## 21. Review screen

Confidence-building. Header **Review Lot**, then `LOT-30` and `READY TO SAVE`. Summary cards:
Fabric (512 MTR), Pieces (557 PCS), PANA (54), Average (0.92). Then sections: Lot Details,
Fabric, Sizes, Bales, Cutting — each with an **Edit** button.

## 22. Review validation

At the top: `✓ Everything looks good` when correct, or `⚠ 2 items need attention` with the exact
issues listed. The user never wonders why Save is disabled.

## 23. Save confirmation

Not a bare "Success". Show:

```text
✓ Lot Created
LOT-30
557 PCS
512 MTR
Ready for Cutting
```

Actions: **View Lot**, **Create Another Lot** (speeds up operators creating multiple lots).

## 24. Lot detail UX

A clear production record. Header: `LOT-30` + `Ready for Cutting`. Top actions: Edit, Start
Cutting, Print, More. Important metrics prominent: `512 MTR`, `557 PCS`, `54 PANA`, `0.92 AVG`.
Sections/cards: Lot Information, Fabric, Sizes, Bales, Cutting, Notes. Progressive disclosure.

## 25. Lot list UX

Prioritize scanning. Top: title, search ("Search lot, supplier, bale…"), Filters. Desktop: clean
table. Mobile: rows become cards:

```text
LOT-30
RUORA-FANCY
512 MTR · 557 PCS
Ready for Cutting
[ View ]
```

No forced horizontal scrolling on mobile unless absolutely necessary.

## 26. Search UX

Fast and forgiving; searches lot number, short number, supplier, bale number; search-as-you-type.
Useful empty result:

```text
No lots found
Try searching by: Lot number, Supplier, Bale number
```

## 27. Filter UX

Simple. Primary filters: Today, This Week, This Month, Pending, Cutting, Completed. On mobile,
filters open in a bottom sheet or modal. Show active filter count (e.g. `Filters · 2`).

## 28. Status UX

Consistent status components (`● Draft`, `● Ready`, `● Cutting`, `● Completed`) visible on
dashboard, lot list, lot detail, search results, and print/PDF.

## 29. Empty states

Never a blank screen. Tell the user what is missing, why it matters, and the action to take:

```text
No Lots Yet
Create your first fabric lot to start managing cutting production.
+ Create New Lot
```

## 30. Loading states

Skeleton loaders where useful; avoid unnecessary spinners. For important actions show progress
("Saving Lot…"). Never leave users unsure whether an action worked.

## 31. Error states

Human-readable, never raw codes:

```text
Something went wrong
We couldn't save this lot. Please try again.
```

Actions where appropriate: **Try Again**, **Save as Draft**.

## 32. Delete / destructive actions

Never easy to trigger accidentally. Confirmation required:

```text
Delete LOT-30?
This will permanently remove this lot and its associated records.
Cancel   Delete Lot
```

Destructive actions get stronger visual emphasis.

## 33. Mobile data entry

Heavily optimized for factory mobile use: numeric input types, large controls, sticky bottom
action bar, full-width buttons, minimal typing, short labels, large tap targets. Keep important
actions reachable when the keyboard is open where technically feasible.

## 34. Keyboard-first desktop UX

Support Tab navigation, Enter to continue, keyboard-friendly size entry, a search shortcut where
appropriate, and clear focus states. Don't force mouse interaction for repetitive data entry.

## 35. Accessibility

Strong contrast; readable text; visible focus states; keyboard navigation; clear labels;
accessible form errors; never rely on color alone; adequate touch targets. Usable in a busy
factory environment.

## 36. Information density

Progressive disclosure. Show important information first; secondary information expands. Don't
show everything at once, don't build huge forms, don't put dense spreadsheets everywhere, don't
bury important information behind too many clicks.

## 37. Factory environment UX

Assume use while standing, on a phone/tablet, at a factory desk, in a busy environment, with
quick interruptions. So: obvious primary actions, short workflows, no tiny controls, no
complicated interactions, visually clear data states.

## 38. Design system

Reusable components: Button, Input, Select, Date Picker, Status Badge, Metric Card, Section Card,
Data Table, Mobile Card, Stepper, Alert, Toast, Modal, Bottom Sheet, Empty State, Loading State,
Error State, Confirmation Dialog. No one-off components per page; maintain visual consistency.

## 39. Component behavior

Consistent states. Buttons: default, hover, focus, active, disabled, loading. Inputs: default,
focus, filled, error, disabled. Status: Draft, Ready, Cutting, Completed. Alerts: information,
success, warning, error.

## 40. Responsive breakpoint thinking

Mobile ~320–767px; tablet ~768–1023px; desktop 1024px+. Don't merely scale components —
reorganize layouts based on available space.

## 41. Print UX

The printed document and the web interface serve different purposes. Print prioritizes
information density, readability, A4 layout, clear sections, production-record accuracy. Web
prioritizes speed, interaction, data entry, navigation. Don't force the web UI to look like the
PDF.

## 42. UX microcopy

Simple, factory-familiar language: "Create Lot" not "Initialize Production Lot Record"; "Add
Bale" not "Create Fabric Inventory Unit"; "Start Cutting" not "Initiate Cutting Workflow".

## 43. Smart UX

Intelligent-feeling without gratuitous AI: auto calculations, smart defaults, recently used
suppliers, duplicate previous lot, instant validation, automatic totals, missing-data detection,
mismatch warnings, draft recovery. No AI for marketing's sake.

## 44. Trust

The user must always trust the numbers. Calculated values are clearly marked as calculated; every
warning explains why; every save is confirmed; important production data is never silently
modified.

## 45. UX performance target

The experience feels fast: fast initial load, fast navigation, instant local UI feedback,
efficient data entry, minimal unnecessary network requests, optimistic UI where safe, draft
preservation. The software never feels like it is slowing down factory operations.

## 46. Final UX test

Simulate: a worker receives a new fabric lot, opens DP Creation, and needs to (1) create a new
lot, (2) enter supplier, (3) enter short number, (4) enter fabric quantity, (5) enter PANA,
(6) enter size quantities, (7) add six bales, (8) verify meter total, (9) add cutting
information, (10) upload a pattern image, (11) review, (12) save. Judge by: can a first-time user
find where to start? Can they finish in ~2–3 minutes? Can they enter repetitive quantities
quickly? Can they immediately understand calculation results? Can they immediately identify
errors? Can a supervisor understand lot status within 5 seconds? Does mobile feel as natural as
desktop? Any "no" → simplify the UI before adding features.

## 48. Final design goal

DP Creation should feel like a smart digital assistant for garment cutting operations — not a
complicated ERP, not a digital paper form, not a generic SaaS dashboard. The experience
communicates: **Simple. Fast. Clear. Smart. Reliable.** The user looks at the screen and
immediately knows: *"What do I need to do next?"*

---

## Open UX questions

- **UXQ-1**: Exact primary brand color and accent color (hex values / token set).
- **UXQ-2**: Chosen sans-serif typeface (and licensing) for screen and print.
- **UXQ-3**: Company logo asset for the app shell and the printed document.
- **UXQ-4**: Does the MVP ship a login screen at all (the brand list in §4 mentions "Login"),
  given `spec.md` assumes no authentication in the MVP? If yes, what does it gate?
- **UXQ-5**: Is a hard delete of a lot (§32) in MVP scope, and which roles may do it? `spec.md`
  currently lists status changes but not deletion.
- **UXQ-6**: "Create Another Lot" after save — does it carry anything over (supplier, dates) or
  start fully blank?
- **UXQ-7**: Greeting text on the dashboard (§9 "Good Morning") — time-based greeting, and in
  which language(s) for the MVP?
