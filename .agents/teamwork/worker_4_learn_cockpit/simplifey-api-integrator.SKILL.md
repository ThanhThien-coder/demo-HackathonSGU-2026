# SimpliFey API Integrator Skill (Local Copy)
Source: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

1. Strictly preserve UI layout, CSS classes, SVG icons, Lottie animations.
2. Centralize API calls in `@/lib/api`.
3. Adhere 100% to API contract in `spec/02` and `spec/03`.
4. Dev mock & bypass auth support: when `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"` or no session, support smooth UI display.
5. 4 UI states for every API integration: Loading, Success, Error, Empty.
6. Verify with `npx tsc --noEmit`.
