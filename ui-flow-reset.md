# UI Flow Reset: End-to-End User Journey Redesign

## Overview

This plan outlines the complete UX/UI redesign of the Aivon platform. The goal is to move away from abrupt workspace jumps and instead create a controlled, immersive user journey matching premium competitive coding platforms. We will implement progressive disclosure, smooth page transitions, and a clear cognitive funnel:
`Landing → Auth → First-Time Setup → Dashboard → Problems Explorer → Workspace`.

## Project Type

**WEB** (Next.js / React)
Primary Agent: `frontend-specialist`

## Success Criteria

1. **Seamless Transitions**: Fluid motion (180-240ms soft fade + glide) between all major routes.
2. **Unified Auth**: One-click OAuth entry in a polished, unified screen.
3. **Decisional Friction Reduction**: A command-center Dashboard that clearly states "Continue where you left off".
4. **Visual Differentiation**: No "Modern SaaS" clichés. Sharp/Net Geometry, bold colors (preventing AI purple clichés), layered animations, and topological depth.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS + Custom CSS for complex layouts and animations
- **Animations**: Framer Motion (for layout glides and spring physics)
- **Auth**: NextAuth.js (Auth.js)

## File Structure Additions & Modifications

```text
frontend/
├── app/
│   ├── page.tsx (Landing - Redesign with Hero, Value Strip, Social Proof)
│   ├── login/page.tsx (Unified Auth - Single click entry)
│   ├── onboarding/page.tsx (First-time setup - Skinnable 2-step Setup)
│   ├── dashboard/page.tsx (NEW Command Center Dashboard)
│   └── problems/
│       ├── page.tsx (Explorer - Refine filters and row UX)
│       └── [slug]/page.tsx (Workspace - Smooth entry animation)
├── components/
│   ├── ui/ (Motion primitives, buttons, cards)
│   ├── dashboard/ (Resume card, Stats grid)
│   ├── layout/ (Page transition wrappers)
```

## Task Breakdown

### Phase 1: Landing & Auth Redesign

- **Task 1.1: Implement Framer Motion Page Wrappers**
  - **Agent:** `frontend-specialist`
  - **Skill:** `frontend-design`
  - **INPUT:** `frontend/app/layout.tsx`
  - **OUTPUT:** Global `AnimatePresence` setup for soft fade + slide (180ms) between pages.
  - **VERIFY:** Navigating to any page does not feel jarring or cut instantly.
- **Task 1.2: Radical Landing Page (Phase 1)**
  - **Agent:** `frontend-specialist`
  - **Skill:** `frontend-design`
  - **INPUT:** `frontend/app/page.tsx`
  - **OUTPUT:** Typographic hero, 3-pillar value strip, social proof strip, and primary CTA. NO standard split layouts. Use depth layering.
  - **VERIFY:** Scroll-triggered animations work, feels like a premium developer tool.
- **Task 1.3: Unified Auth Screen (Phase 2)**
  - **Agent:** `frontend-specialist`
  - **Skill:** `frontend-design`
  - **INPUT:** `frontend/app/login/page.tsx`
  - **OUTPUT:** Sleek dark-theme box with Google/GitHub/X buttons. Minimal friction.
  - **VERIFY:** Clicking "Start Solving" on landing glides smoothly to this one-click login view.

### Phase 2: Onboarding & Dashboard Command Center

- **Task 2.1: Lightweight Setup (Phase 3)**
  - **Agent:** `frontend-specialist`
  - **Skill:** `frontend-design`
  - **INPUT:** `frontend/app/onboarding/page.tsx`
  - **OUTPUT:** 2-step skippable flow (Username → Goal Selection). Eliminate heavy micro-challenges for standard entry.
  - **VERIFY:** Completing goals redirects gracefully to `/dashboard`.
- **Task 2.2: The Dashboard (Phase 4)**
  - **Agent:** `frontend-specialist`
  - **Skill:** `frontend-design`
  - **INPUT:** `frontend/app/dashboard/page.tsx` (NEW)
  - **OUTPUT:** Top band (stats), massive "Continue where you left off" card, secondary grids for recommendations.
  - **VERIFY:** Dashboard answers "What should I do next?" immediately.

### Phase 3: Explorer & Workspace Smoothing

- **Task 3.1: Problems Explorer Polish (Phase 5)**
  - **Agent:** `frontend-specialist`
  - **Skill:** `frontend-design`
  - **INPUT:** `frontend/app/problems/page.tsx`
  - **OUTPUT:** Refined row UX, acceptance rates, difficulty badges matching the new geometric system.
  - **VERIFY:** Clicking a row immediately starts a layout transition to the workspace.
- **Task 3.2: Workspace Entry Polish (Phase 6)**
  - **Agent:** `frontend-specialist`
  - **Skill:** `react-best-practices`
  - **INPUT:** `frontend/app/problems/[slug]/page.tsx`
  - **OUTPUT:** The editor and judge fade in sequentially, preserving component state without layout shift.
  - **VERIFY:** The workspace transition holds zero visual congestion and header context is clear.

## Phase X: Verification

- [ ] **Lint & Type Check:** `npm run lint && npx tsc --noEmit`
- [ ] **UX Audit:** Run `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] **Manual Rule Check:**
  - [ ] No purple hex codes (`#8A2BE2` etc.) used as the new primary base.
  - [ ] Layout is NOT a standard 50/50 split.
  - [ ] Transitions are 180-240ms glides.
- [ ] **Build:** `npm run build` completely succeeds.
