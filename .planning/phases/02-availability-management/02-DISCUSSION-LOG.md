# Phase 2: Availability Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 2-Availability Management
**Areas discussed:** Time slot structure, Calendar view UX, Weekly template setup, Day override UX, Time picker, Viewing others, Default state, Month navigation, Save behavior, Data model, Calendar library, Read-only indication, Timezone, Page structure

---

## Time Slot Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 60-min slot toggles | Discrete blocks user turns on/off | |
| Time ranges per day | User enters start/end times (e.g., 9-12, 14-17) | ✓ |

**User's choice:** Time ranges per day
**Notes:** User wants Teams-like flexibility. Time ranges are more natural than fixed slots.

---

## Calendar View UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline slot toggles on month view | Toggle availability directly on month cells | |
| Click day → dialog/side panel | Drill into a day to edit ranges | ✓ |

**User's choice:** Click day → side panel
**Notes:** Matches Teams/Outlook reading pane pattern

---

## Weekly Template Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page | Separate page for weekly template form | ✓ |
| Inline on calendar | Set recurring pattern from calendar directly | |

**User's choice:** Settings page
**Notes:** Clean separation — calendar is for viewing/overriding, settings is for configuring

---

## Day Override UX

| Option | Description | Selected |
|--------|-------------|----------|
| Expand day cell | Day cell grows within month grid | |
| Side panel | Right-hand panel opens on day click | ✓ |

**User's choice:** Side panel (Option 1b)
**Notes:** More room for time range editors. Keeps month context visible.

---

## Time Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Native `<input type="time">` | Browser's built-in time picker | ✓ |
| shadcn Select dropdowns | Custom time selectors | |
| Quick preset buttons | Pre-defined time blocks + custom | |

**User's choice:** Native `<input type="time">`
**Notes:** Simple, accessible, well-supported. Wrap in shadcn Input for styling consistency.

---

## Viewing Others

| Option | Description | Selected |
|--------|-------------|----------|
| User search/directory only | `/users` page with search | |
| URL-based only | Direct URL `/users/{id}/availability` | |
| Directory + direct URL | Both approaches | ✓ |

**User's choice:** Directory + direct URL
**Notes:** Directory is primary discovery, URLs for bookmarks

---

## Default State

| Option | Description | Selected |
|--------|-------------|----------|
| Empty + CTA | Show prompt to set weekly template | ✓ |
| Assume full availability | Default 9-17 every day | |

**User's choice:** Empty + CTA
**Notes:** Safer (no accidental bookings), drives template setup. Matches Teams/Calendly.

---

## Month Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Unlimited | Browse any month | |
| Reasonable window | 3mo past, 6mo future | ✓ |

**User's choice:** Reasonable window (3mo past, 6mo future)
**Notes:** Keeps API/data lean. Past availability irrelevant, future beyond 6mo unnecessary.

---

## Save Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save + debounce | Instantly persist, debounce ~500ms | ✓ |
| Save button | Manual save per day | |

**User's choice:** Auto-save + debounce
**Notes:** Modern, responsive UX. Single API call after debounce window.

---

## Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Two tables (template + override) | WeeklyTemplate + AvailabilityOverride | ✓ |
| Single table with type flag | One table with recurring/override type | |

**User's choice:** Two tables
**Notes:** Cleaner schema. Merge logic in Application service layer.

---

## Calendar Library

| Option | Description | Selected |
|--------|-------------|----------|
| FullCalendar React | Battle-tested, ~200KB | |
| Custom month grid with shadcn/ui | Lightweight, full control | ✓ |

**User's choice:** Custom month grid with shadcn/ui
**Notes:** Month view is simple (7-column grid). FullCalendar overkill for click-day → side-panel interaction.

---

## Read-only for Others

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded + header label | Different color, "Viewing X's Calendar" | ✓ |
| Side-by-side split view | Own + other's calendar parallel | |

**User's choice:** Color-coded + header label
**Notes:** Simple, clear for v1. Split view deferred.

---

## Timezone

| Option | Description | Selected |
|--------|-------------|----------|
| UTC with conversion | Store UTC, display in viewer's timezone | |
| No timezone handling | All users same timezone | ✓ |

**User's choice:** No timezone handling
**Notes:** All users assumed same timezone for v1

---

## Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Proposed route structure | `/` (My Calendar), `/settings/availability`, `/users`, `/users/{id}` | ✓ |

**User's choice:** Proposed route structure accepted
**Notes:** Navbar gains "My Calendar" + "Find People" links

---

## the agent's Discretion

- Exact component file structure within `src/features/availability/`
- Navbar icon for "Find People"
- Color palette for own vs others' available blocks
- Debounce timing (~500ms recommended)
- Side panel animation/transition

## Deferred Ideas

None — discussion stayed within phase scope
