# Frontend Vite — Agent Notes

## Z-Index Stack

Fixed layering. Do not break this order.

| Layer | z-index | What |
|---|---|---|
| Sticky page bars (search, filters) | `z-10` | Per-page sticky elements |
| ContentTopBar | `z-20` | Global sticky header (`ContentTopBar.tsx`) |
| Mobile backdrop | `z-30` | Sidebar overlay backdrop in `AppShell.tsx` |
| Sidebar | `z-40` | `SideNavBar.tsx` — always on top |

Rule: anything inside `<main>` stays ≤ `z-20`. Backdrop must sit above all page content (`z-30`). Sidebar always wins (`z-40`).

---

## Layout

- **Sidebar** — `SideNavBar.tsx`. Always rendered (no mobile/desktop split). Collapses to `w-16` (icons only), expands to `w-64`.
- **Collapse state** — managed in `AppShell.tsx`. Defaults `collapsed = true` when `window.innerWidth < 768`.
- **Main content margin** — `ml-16` base always; `md:ml-64` added when expanded. Mobile: sidebar overlays (backdrop), content stays `ml-16`.
- **No bottom nav** — `BottomNavBar` removed. Mobile uses collapsed sidebar only.

---

## File Locations

| Thing | Location |
|---|---|
| Nav items (all roles) | `src/lib/navigation.ts` |
| Layout shell | `src/components/layout/AppShell.tsx` |
| Sidebar | `src/components/layout/SideNavBar.tsx` |
| Top bar | `src/components/layout/ContentTopBar.tsx` |
| Route pages | `src/routes/` |
| UI primitives | `src/components/ui/` |

---

## Sidebar Active Style

- **Expanded + active**: `text-violet-600 bg-violet-50 border-r-2 border-violet-600 rounded-l-xl`
- **Collapsed + active**: `text-violet-600 bg-violet-50 rounded-xl` (no border-right — item is centered)
- **Hover (expanded)**: `hover:translate-x-1` — do not add this when collapsed

---

## Tailwind Breakpoints Used

- `md` (768px) — sidebar push vs overlay boundary
- `sm` (640px) — grid/padding adjustments in pages
