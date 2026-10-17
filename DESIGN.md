# Pawfect Memories visual system

Operate-mode portal. One vertical working column, shared controls, no marketing chrome.

## Layout

- Desktop: fixed vertical rail (196px) plus a content column capped at 840px, centered. Sections stack. Kanban lanes stack.
- Mobile: rail hides. Primary actions sit in a bottom bar above the tab bar, inside the thumb zone. Tab targets are at least 44px. `100dvh` shell, safe-area padding, `viewport-fit=cover`.
- Inputs, selects, and textareas are 16px so iOS does not zoom. Zoom is allowed.

## Color

| Token | Light | Use |
| --- | --- | --- |
| `--bg` | `#f3f1ec` | page |
| `--surface` | `#fffcf8` | cards, sheets |
| `--ink` | `#1a2118` | text |
| `--ink-muted` | `#3e4a3c` | secondary text, ≥4.5:1 on `--bg` |
| `--line` | `#e3ddd3` | borders |
| `--green` | `#244018` | primary button |
| `--oak` | `#6a3f16` | accent text and current nav |
| `--danger` | `#9f1239` | unpaid / destructive text |
| `--focus` | `#6a3f16` | `:focus-visible` ring |

Dark values live on `html.dark` in `pm.css`.

## Space and type

4 / 8 / 12 / 16 / 24. Radius 12px. Body, labels, inputs, and buttons are 16px. Titles are 1.25–1.35rem.

## Motion

Emil Kowalski curves plus Transitions.dev durations. Transform and opacity only for enter and exit. No `transition: all`. No `scale(0)`. Press is `scale(0.97)` for 140ms. Sheets open at 250ms and close at 350ms. Modals open at 250ms and close at 150ms so they leave faster than they arrive. Toasts exit at 150ms. Easing is `--ease-smooth-out`. Hover styles in `pm.css` are gated to `(hover: hover) and (pointer: fine)`. `prefers-reduced-motion` keeps opacity and drops movement. High-frequency nav and list flips do not animate.

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | press, small UI |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | on-screen moves |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | drawer curve (available) |
| `--ease-smooth-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | sheet, modal, toast |
| `--duration-press` | 140ms | button press |
| `--duration-quick` | 150ms | modal close, toast exit, chevron |
| `--duration-fast` | 250ms | sheet / modal / toast open |
| `--duration-medium` | 350ms | sheet close |
