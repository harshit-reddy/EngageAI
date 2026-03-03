# EngageAI Frontend — Styling Guide

## CSS Architecture

The styling uses a modular CSS architecture with CSS custom properties (design tokens). All styles are split into logical files and aggregated via a single `@import` entry point.

### File Structure

```
src/styles/
├── index.css           # @import aggregator (entry point)
├── variables.css       # CSS custom properties (design tokens)
├── base.css            # Reset, body, scrollbar, animations, modal
├── home.css            # Home/landing page
├── meeting.css         # Meeting room, video grid, engagement overlay
├── toolbar.css         # Floating toolbar, reactions, badges
├── monitor.css         # Real-time monitor page
├── summary.css         # End-of-meeting summary modal
├── panels.css          # Side panels (people, chat, DM)
├── dashboard.css       # Dashboard + meeting detail pages
└── responsive.css      # Media queries (600px, 900px, 1024px)
```

### Import Order

```css
/* index.css */
@import './variables.css';
@import './base.css';
@import './home.css';
@import './meeting.css';
@import './toolbar.css';
@import './monitor.css';
@import './summary.css';
@import './panels.css';
@import './dashboard.css';
@import './responsive.css';
```

## Design Tokens (variables.css)

### Colours

```css
--primary:          #6366f1;   /* Indigo — primary brand */
--primary-hover:    #5558e6;
--primary-light:    rgba(99, 102, 241, 0.08);
--bg-primary:       #f5f5f7;   /* Light background */
--bg-card:          #ffffff;
--text-primary:     #1a1a2e;
--text-secondary:   #5f6368;
--text-tertiary:    #9aa0a6;
--danger:           #ea4335;
--success:          #34a853;
--warning:          #fbbc04;
```

### Engagement Score Colours

| Score Range | Colour | Meaning |
|-------------|--------|---------|
| 60-100 | `#34a853` (green) | High engagement |
| 40-59  | `#fbbc04` (yellow) | Moderate engagement |
| 0-39   | `#ea4335` (red) | Low engagement |

### Spacing & Sizing

```css
--radius-sm:    8px;
--radius-md:    12px;
--radius-lg:    16px;
--shadow-sm:    0 2px 8px rgba(0,0,0,0.06);
--shadow-md:    0 4px 16px rgba(0,0,0,0.08);
--shadow-lg:    0 8px 32px rgba(0,0,0,0.12);
```

## Naming Conventions

### Component Prefix Pattern

CSS classes follow a component-based naming pattern:

```css
.home-page          /* Home page container */
.home-card          /* Home page card */
.home-btn           /* Home page primary button */
.home-btn-secondary /* Home page secondary button */

.meeting-container  /* Meeting room container */
.meeting-toolbar    /* Meeting toolbar */

.tool-btn           /* Toolbar button */
.tool-btn.active    /* Active state */
.tool-btn.danger    /* Danger/leave state */

.monitor-page       /* Monitor view container */
.dashboard-page     /* Dashboard container */
```

### State Modifiers

```css
.tool-btn.active     /* Currently toggled on */
.tool-btn.danger     /* Destructive action */
.tool-btn.highlight  /* Attention-grabbing */
.tool-btn.stop       /* Stop action */
.home-tab.active     /* Currently selected tab */
```

## Responsive Breakpoints

| Breakpoint | Target |
|------------|--------|
| `900px`    | Tablets — stack home page layout |
| `600px`    | Mobile — adjust toolbar, hide labels |
| `1024px`   | Dashboard grid adjustments |

## Animations

### Defined in base.css

```css
@keyframes spin          /* Loading spinner rotation */
@keyframes modalIn       /* Modal entrance (scale + fade) */
@keyframes fadeIn        /* Simple fade in */
@keyframes reactionFloat /* Emoji float up and fade */
```

### Usage

```css
.spinner        { animation: spin 0.8s linear infinite; }
.modal-enter    { animation: modalIn 0.25s ease; }
.reaction-float { animation: reactionFloat 2s ease forwards; }
```

## Accessibility

- All toolbar buttons have `aria-label` attributes
- Form inputs have `htmlFor` labels
- Tab navigation uses `role="tablist"` and `role="tab"` with `aria-selected`
- Error messages use `role="alert"`
- Transcript panel uses `aria-live="polite"` for screen reader updates
- Focus-visible outlines preserved (not removed)
