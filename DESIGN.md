# Pawfect Memories visual system

Operate-mode portal. One vertical working column, shared controls, no marketing chrome.

## Layout

- Desktop: fixed vertical rail (196px). Forms and finance stay in a column capped at 840px. The workspace board is five lanes side by side; each lane scrolls on its own. The list view stays a vertical stack.
- Mobile: the same five lanes stack, one under another.
- Mobile: rail hides. Primary actions sit in a bottom bar above the tab bar, inside the thumb zone. Tab targets are at least 44px. `100dvh` shell, safe-area padding, `viewport-fit=cover`.
- Inputs, selects, and textareas are 16px so iOS does not zoom. Zoom is allowed.

## Color

Warm wood and cream. Primary is only for main actions, the active nav item, and a few key figures. Semantic hues mark state (paid, owing, unpaid, destructive). They are not decoration.

Tokens live on `:root` and `html.dark` in `pm.css`. Tailwind colors (`pm-oak`, `pm-cream`, `pm-fill`, and the rest) read those channels, so one toggle updates both themes. `--green` and `--oak` are aliases of `--primary`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F6F3EE` | `#1A1816` | page |
| `--sidebar` | `#F0EBE3` | `#141210` | rail, mobile tab bar |
| `--card` / `--surface` | `#FFFFFF` | `#24211E` | cards, sheets, list rows |
| `--elevated` | `#FFFCF8` | `#2C2926` | raised inputs, search |
| `--ink` | `#2C2825` | `#F3EEE7` | primary text |
| `--ink-secondary` | `#6B645C` | `#B5ADA3` | secondary text, idle nav |
| `--ink-muted` | `#9A9288` | `#7A736B` | hints, placeholders |
| `--line` | `#E5DFD6` | `#3A3530` | borders, dividers |
| `--fill` | `#EDE7DE` | `#3A3530` | muted fills, active nav well |
| `--primary` | `#8F735A` | `#C4A484` | CTA, active nav, key highlight |
| `--primary-hover` | `#7A614C` | `#D4B896` | CTA hover |
| `--on-primary` | `#FFFCF8` | `#1A1816` | label on a primary button |
| `--success` | `#6B8F71` | `#8FAF94` | paid, saved, delivered |
| `--warning` | `#C4A35A` | `#D4B86A` | deposit still owing |
| `--danger` | `#B56B5C` | `#D4897A` | unpaid, destructive |
| `--info` | `#7A8B9A` | `#9AABBA` | new booking |
| `--focus` | `--primary` | `--primary` | `:focus-visible` ring |

Kanban lanes stay the quiet card color. A 3px inset bar and the column title carry the stage color:

| Lane | Token | Color |
| --- | --- | --- |
| 新預約 | `--info` | light `#7A8B9A` / dark `#9AABBA` |
| 基本修輯 | `--sage` | `#8B9A7D` |
| 揀相 | `--primary` | light `#8F735A` / dark `#C4A484` |
| 精修 | `--clay` | `#B8957A` |
| 已完成 | `--success` | light `#6B8F71` / dark `#8FAF94` |

Page backgrounds are never `#000`. Light cards may be `#FFFFFF`. The invoice is the light palette on white paper: ink `#2C2825`, secondary `#6B645C`, line `#E5DFD6`, wordmark `#8F735A`, deductions `#B56B5C`.

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
