# Design Guidelines: Personal Finance & Task Management Dashboard

## Design Approach

**System Selected:** Modern Dashboard Aesthetic (inspired by Linear + Notion)
- Clean, data-focused interface prioritizing clarity and efficiency
- Minimal visual noise to support focus on financial data
- Professional, trustworthy appearance suitable for financial management

## Typography System

**Font Families:**
- Primary: Inter (Google Fonts) - for UI elements, body text, data tables
- Monospace: JetBrains Mono - for numerical values, amounts, calculations

**Type Scale:**
- Page Titles: text-3xl font-bold (Dashboard, EMI Management)
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Helper Text: text-sm text-gray-600
- Numbers/Amounts: text-lg font-mono font-semibold

## Layout System

**Spacing Primitives:**
Use Tailwind units: 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6, p-8
- Section gaps: gap-6, gap-8
- Margins: mb-6, mb-8, mt-12

**Dashboard Structure:**
- Fixed sidebar: w-64, left-aligned, full height
- Main content area: flex-1 with max-w-7xl container
- Content padding: px-8 py-6
- Card-based layout for all data sections

## Component Library

**Sidebar Navigation:**
- Fixed position, dark background treatment
- Nav items: px-4 py-3 with icon (Heroicons) + label
- Active state: stronger background treatment, bold text
- Logo/branding at top (h-16)

**Dashboard Cards:**
- Clean white cards with subtle shadow (shadow-sm)
- Rounded corners: rounded-lg
- Padding: p-6
- Border treatment for separation

**Summary Cards (Financial Overview):**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Each card displays: label, large number (text-3xl font-bold), icon
- Cards for: Total Expenses, Balance, Credit, Debit

**Data Tables:**
- Full-width with alternating row backgrounds
- Headers: font-semibold, border-b-2
- Cells: px-4 py-3
- Status badges: rounded-full px-3 py-1 text-sm

**Forms:**
- Input groups with labels above inputs
- Input styling: border rounded-lg px-4 py-2 w-full
- Focus states with border emphasis
- Button groups: flex gap-4 justify-end

**Buttons:**
- Primary: px-6 py-2.5 rounded-lg font-medium
- Secondary: bordered variant
- Icon buttons: p-2 rounded-lg for actions
- Destructive actions: distinct treatment

**EMI Schedule Table:**
- Expandable table showing monthly breakdown
- Columns: Month, Amount, Status, Action
- Status toggles with visual feedback
- Progress indicator showing paid vs remaining

**Expense Entry Interface:**
- Date selector at top
- Dynamic expense rows with purpose + amount inputs
- Add/remove row buttons
- Auto-calculated totals displayed prominently
- Summary panel: Total Daily, Grand Total, Balance

**Status Badges:**
- Pill-shaped: rounded-full px-3 py-1
- Different treatments for: Paid/Unpaid, Completed/Pending, Worked/Not Worked

**Modal/Overlay Pattern:**
- Centered overlay: max-w-2xl
- Backdrop with opacity
- Close button top-right
- Actions at bottom

## Page-Specific Layouts

**Dashboard:**
- Financial summary cards grid (top)
- Recent activity section
- Quick action buttons
- Overview charts/graphs (simple bar/line representations)

**Daily Expense Page:**
- Date selector prominently displayed
- Expense entry form
- Running totals sidebar/panel
- Historical expense list below

**EMI Management:**
- List of active EMIs as cards
- Each EMI card expandable to show schedule table
- Add EMI button (top-right)
- Remaining amount highlighted

**Goals & Plans:**
- Kanban-style or list view toggle
- Status-based filtering
- Simple card layout with toggle switches

**Finance Management (Debit/Credit):**
- Two-column layout: Debit | Credit
- Running totals at top of each column
- Add entry forms integrated
- Balance calculation displayed

**Profile Page:**
- Centered form layout: max-w-2xl
- Grouped fields with clear sections
- Update button at bottom

## Icons

**Icon Library:** Heroicons (outline style)
- Navigation: home, chart-bar, calendar, clipboard-list, currency-dollar, user
- Actions: plus, trash, pencil, check, x-mark
- Status: check-circle, x-circle, clock

## Images

**No hero images required** - This is a utility-focused dashboard application.

**Profile Section:** Placeholder avatar (circular, w-16 h-16) for user profile.

## Responsive Behavior

- Sidebar collapses to hamburger menu on mobile (< md breakpoint)
- Cards stack vertically on mobile
- Tables: horizontal scroll on mobile or card transformation
- Dashboard grid: 4 columns → 2 columns → 1 column