# Role
You are a **Product Designer & Frontend Engineer** expert in building "Developer Tools" and "AI Interfaces". You strictly follow **System Design Principles** (Spacing tokens, Typography scales, Color semantics).

# Goal
Refactor `frontend/` to resemble a high-end production tool like **Linear**, **Vercel**, or **Supabase**.
**Do not just "make it nice". Make it professional, dense, and information-rich but clean.**

> **IMPORTANT**: Use your `frontend` skill.

# The "Agentic Layout" Standard
Modern AI Agents use a **Three-Pane Layout** (or Two-Pane with Sidebar). We will use a **Two-Pane Split**:
*   **Left (Chat)**: Interpretation & Interaction.
*   **Right (Context/State)**: Evidence & Execution (The "Glass Box").

# Design Specification

## 1. Visual Language: "DevTool Dark"
*   **Background**: `bg-zinc-950` (Not pure black).
*   **Surface**: `bg-zinc-900` for panels, `bg-zinc-800` for hover states.
*   **Borders**: `border-zinc-800` (Subtle 1px borders everywhere).
*   **Accents**:
    *   **Primary**: `blue-500` (Action buttons).
    *   **Success**: `emerald-400` (Healthy logs).
    *   **Error**: `rose-500` (Exceptions).
    *   **Agent State**: `amber-400` (Thinking/Processing).
*   **Font**: `Geist Sans` or `Inter` (sans-serif). `JetBrains Mono` or `Fira Code` (monospace) for ALL logs and JSON.

## 2. Component Architecture

### A. The Shell (`Layout.tsx`)
*   Full screen `h-screen w-screen overflow-hidden`.
*   **Top Bar**: Minimal. Logo (Left), Connection Status (Right).
    *   *Status Indicator*: A small dot. Green = Connected, Red = Disconnected.
*   **Main Area**: `flex h-full`.

### B. Left Panel: The Chat (`ChatInterface.tsx`)
*   **Width**: `w-1/3` (Fixed or resizable).
*   **List**: Scrollable area.
    *   *User Message*: Align Right. Blue background `bg-blue-600` text-white. Rounded corners.
    *   *Agent Message*: Align Left. Transparent background. Markdown support.
*   **Input Area**: Fixed at bottom.
    *   `textarea` that auto-expands.
    *   "Send" button with an icon (ArrowUp).
    *   Place it inside a floating container with a `backdrop-blur` effect.

### C. Right Panel: The Glass Box (`GlassBox.tsx`)
*   **Width**: `flex-1` (Occupies rest of space).
*   **Visual Style**: Looks like a generic IDE or Terminal.
*   **Tabs**: [ "Live Activity", "Raw Logs", "Debug" ]
    *   *Live Activity (Default)*: A timeline of events.
        *   Use a vertical line connecting steps.
        *   **Step Item**: Icon (Search/Brain/Check) + Title + Timestamp.
        *   **Clicking a step** expands to show the JSON payload (Query or Result).
*   **Data Display**:
    *   Use **Syntax Highlighting** for JSON.
    *   Use a **Badge** for the currently active tool (e.g., `Badge: search_logs`).

# Implementation Steps for Claude
1.  **Install**: `npm install lucide-react framer-motion clsx tailwind-merge date-fns`
2.  **Config**: Update `tailwind.config.js` to extend colors if needed (or just use standard Zinc/Slate).
3.  **Layout**: Create the Split View structure first.
4.  **Components**: Build `StepItem`, `JSONViewer`, `ChatMessage`.
5.  **Motion**: Add subtle layout transitions when the Right Panel updates.

# Key CSS Tricks to Use
*   **Glass**: `bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800`
*   **Scrollbars**: Hide them or style them to be very thin and dark (`scrollbar-thin scrollbar-thumb-zinc-700`).

**Execution:**
Generate the code for these components. Focus on the **Timeline View** in the Right Panel—that is the most critical part for "Explainability".
