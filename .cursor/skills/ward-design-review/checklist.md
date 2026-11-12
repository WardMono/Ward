# Design review checklist

Copy into the design review report when the screen is a primitive pass (`/design`) or a full shell review. For a single screen, fill the rows that screen uses and mark the rest `not this screen`.

| Item | Status | Evidence |
|---|---|---|
| Colors come from tokens, both themes | | |
| Light tokens are overrides on `[data-theme="light"]` only | | |
| Spacing is the 4 px scale | | |
| Radii are 6, 10, 14, or 999 | | |
| Raised surfaces use elev token plus a hairline | | |
| UI font is Inter, secrets and money are JetBrains Mono | | |
| Rows are compact, groups separated by space | | |
| Sidebar 240 or 64, list 340–420, detail measure ≤ 720 | | |
| Min window 960×620 still usable | | |
| Under 1100 px, detail becomes a sheet | | |
| Under 1000 px, sidebar collapses | | |
| Loading skeleton only after 200 ms | | |
| Empty state has one sentence and one action | | |
| No-results echoes the query and clears filters | | |
| Error says what happened, what to try, and offers retry | | |
| Password mask does not leak length | | |
| CopyButton runs idle → copied → clearing | | |
| Copy live region does not speak the secret | | |
| Focus ring visible, 2 px plus offset | | |
| Icon button has an aria-label | | |
| Status uses icon or text, not color alone | | |
| Theme toggle label is "Switch to light/dark theme" | | |
| Copy tone is plain. No "unhackable", no "Success!" | | |

Primitive states, when this review is the `/design` route. Each primitive: default, hover, focus, disabled, and loading or error where the component has them.

Button, IconButton, Input, PasswordInput, Textarea, Select, Checkbox, Switch, Segmented control, Tabs, Chip, Avatar tile, Tooltip, Popover, Dropdown, Dialog, Sheet, Toast, Confirm (including typed confirm), EmptyState, Skeleton, Kbd, ListRow, SectionHeader, ProgressRing, CopyButton, StrengthMeter, DatePicker, CurrencyInput.
