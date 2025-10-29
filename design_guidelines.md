# Design Guidelines: AI CV Tailoring Platform

## Design Approach

**Selected Framework**: Carbon Design System (IBM)
**Rationale**: Enterprise-grade productivity tool requiring trust, clarity, and efficient data processing workflows. Carbon excels at information-dense interfaces with complex form interactions and status tracking.

**Core Principles**:
- **Trust & Security First**: Professional aesthetic that reinforces data privacy
- **Workflow Efficiency**: Minimize clicks, clear process visualization
- **Information Clarity**: Complex data presented accessibly
- **Progressive Disclosure**: Advanced features available but not overwhelming

---

## Typography System

**Font Stack**: IBM Plex Sans (primary), IBM Plex Mono (code/data)

**Hierarchy**:
- **Hero Headings**: 48px (3rem), semibold, tight leading (1.1)
- **Page Titles**: 32px (2rem), semibold
- **Section Headers**: 24px (1.5rem), medium
- **Subsections**: 20px (1.25rem), medium
- **Body Text**: 16px (1rem), regular, 1.5 line height
- **Small Text**: 14px (0.875rem), form labels, metadata
- **Micro Text**: 12px (0.75rem), timestamps, helper text
- **Code/Data**: IBM Plex Mono 14px for JSON schemas, URLs, technical displays

---

## Layout & Spacing System

**Tailwind Units**: Standardize on 4, 6, 8, 12, 16, 24 for consistency
- **Micro spacing**: `space-y-2`, `gap-2` (8px) - tight groupings
- **Standard spacing**: `space-y-4`, `p-4` (16px) - default component padding
- **Section spacing**: `space-y-8`, `py-12` (48px) - section separation
- **Large gaps**: `py-16`, `py-24` (64-96px) - major page divisions

**Grid System**:
- Main content: `max-w-7xl` container, centered
- Dashboard layouts: 12-column grid with `gap-6`
- Forms: Single column `max-w-2xl` for optimal readability
- Data tables: Full-width with horizontal scroll when needed

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header: `h-16`, `backdrop-blur-sm` with subtle shadow
- Logo left, primary nav center, user menu/notifications right
- Breadcrumbs below nav for deep workflows: `text-sm`, `space-x-2`

**Sidebar** (Dashboard view):
- `w-64`, collapsible to `w-16` icon-only mode
- Sectioned navigation groups with dividers
- Active state: Filled background, indicator line

### Forms & Inputs
**Input Fields**:
- Height: `h-12` for text inputs, `h-10` for compact variants
- Padding: `px-4`, `py-3`
- Border: 2px solid, increases to 3px on focus
- Labels: Above input, `text-sm`, `font-medium`, `mb-2`
- Helper text: Below input, `text-xs`, muted
- Error states: Border change + error message below

**File Upload Zone**:
- Dashed border, `min-h-48`, centered content
- Drag-drop target with hover state indication
- Upload progress bar: `h-2`, animated stripe pattern

**Multi-Step Forms**:
- Progress stepper at top: `space-x-8`, numbered circles
- Form sections: `space-y-8` between major groups
- Navigation: Back/Next buttons, `w-32` minimum width

### Data Display

**Status Indicators**:
- Pill badges: `px-3`, `py-1`, `rounded-full`, `text-xs`, `font-medium`
- States: Processing, Completed, Failed, Queued
- Icon + text combination for clarity

**Data Tables**:
- Sticky header: `sticky top-0`, backdrop blur
- Row height: `h-16`, `px-6` cell padding
- Hover state: Subtle background shift
- Action column: Fixed right with shadow overlay
- Pagination: Bottom-right, `text-sm`

**Scorecard Display**:
- Card grid: 2 columns desktop (`grid-cols-2 gap-6`), stack mobile
- Each metric: Label, value, 10-point progress bar
- Visual hierarchy: Large numbers, small labels
- Comparison view: Side-by-side CV strength vs. JD expectation

### Cards & Panels

**Job Application Card**:
- `rounded-lg` corners, `p-6` padding
- Header: Company logo (48px), role title, status badge
- Body: Key metrics in 3-column grid
- Footer: Action buttons, right-aligned, `space-x-3`

**Document Preview Panel**:
- Split view: Original (left) vs. Tailored (right)
- `gap-4` between panels
- Header: Document type, download button
- Scrollable content area with typography matching output

**Process Timeline**:
- Vertical stepper: `border-l-2`, connected nodes
- Each step: Icon (32px), title, timestamp, expandable details
- Active step: Animated pulse on icon
- Completed: Checkmark icon

### Buttons & Actions

**Primary Actions**: `h-12`, `px-8`, `rounded-md`, `font-medium`
**Secondary**: Same dimensions, outline variant
**Tertiary**: Text-only with underline on hover
**Icon Buttons**: `w-10`, `h-10`, `rounded-md`, centered icon (20px)

**Button Groups**:
- Attached: No gap, shared borders
- Spaced: `space-x-3` for independent actions

### Modals & Overlays

**Modal Structure**:
- Backdrop: `backdrop-blur-sm` with overlay
- Content: `max-w-2xl`, `rounded-lg`, `p-8`
- Header: Close button (top-right), title (left)
- Body: `max-h-[70vh]`, scrollable
- Footer: Right-aligned actions, `pt-6`, `border-t`

**Toast Notifications**:
- Position: Top-right, `space-y-3` stack
- Dimensions: `w-96`, `p-4`, `rounded-md`
- Auto-dismiss: 5s with progress bar
- Icon (24px) + message + close button

---

## Page Layouts

### Dashboard/Home
- Hero section: `py-16`, stats overview in 4-column grid
- Active jobs: Card grid, 2 columns, `gap-6`
- Recent activity: Timeline component, sidebar (`w-80`)

### Job Submission Form
- Centered layout: `max-w-2xl`
- Steps: URL input → Candidate select → Preferences
- Real-time validation indicators
- Preview panel slides in after URL validation

### Processing Status
- Full-width progress visualization
- Live log stream: Monospace font, `max-h-96`, auto-scroll
- Collapsible sections for each pipeline stage
- Cancel action: Prominent but destructive styling

### Results/Output
- Three-column layout: CV, Cover Letter, Enhancement Notes
- Tabs for navigation on mobile
- Download all: Sticky header button
- Comparison mode toggle: Before/after slider

### Settings/Configuration
- Sidebar navigation: Categories (Profile, Preferences, Security, API)
- Content area: `max-w-4xl`, form sections with `space-y-12`
- Danger zone: Bottom section, visually separated

---

## Accessibility & Security Indicators

- Focus states: 3px offset ring, high contrast
- Skip links: Hidden until focused
- ARIA labels: All interactive elements
- Security badges: Lock icons for encrypted data
- Compliance indicators: SOC2/GDPR badges in footer
- Session timeout: Warning modal at 2-min mark

---

## Responsive Behavior

**Breakpoints**:
- Mobile: Stack all columns, full-width cards
- Tablet (md:): 2-column grids, sidebar collapses to icons
- Desktop (lg:): Full layout, side-by-side panels

**Touch Targets**: Minimum `h-12`, `w-12` for mobile
**Typography Scale**: Reduce hero by 25% on mobile

---

## Images

**Hero Section**: No large hero image - dashboard focuses on functional data display
**Job Cards**: Company logos (48x48px), placeholder for missing logos
**Empty States**: Illustration (240px height) for "no jobs yet" states
**Process Diagrams**: SVG flowchart showing pipeline stages on settings/about page