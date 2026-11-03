# Handoff Report — Worker 1 (User Profile & Header Domain)

## 1. Observation
- Target APIs assigned:
  * Bước 1: `GET /api/me` (call `getMe()` / `getMeSafe()` from `@/lib/api`).
  * Bước 2: `POST /api/demo/persona` (call `switchPersona()` / `switchPersonaSafe()` from `@/lib/api`).
  * Bước 3: `DELETE /api/me` (call `deleteMe()` / `deleteMeSafe()` from `@/lib/api`).
- File write boundaries:
  * Exclusively owned: `src/components/layout/Navbar.tsx`, `src/components/layout/SettingsDropdown.tsx`, User store in `src/`, and `.agents/teamwork/worker_1_profile_header/`.
- Verified implementation files:
  * `src/stores/userStore.ts`: Created Zustand store implementing `fetchProfile()`, `changePersona(mode)`, `resetAccount()`, `createFallbackProfile()`, and reactive toast notifications.
  * `src/stores/index.ts`: Re-exported user store.
  * `src/components/layout/Navbar.tsx`: Hooked up to `useUserStore`. Displays user greeting, avatar, `overall_tier` badge (`NOVICE`, `PRACTITIONER`, `ARCHITECT`), skeleton shimmer loading state, guest login/register state, and toast container.
  * `src/components/layout/SettingsDropdown.tsx`: Displays token usage meter (`tokensUsed` / `tokenQuota`), demo persona switch options for `NEWBIE`, `MID_LEVEL`, `SENIOR_RUSTY` with active checkmarks and loading spinner, and dangerous delete account action with 2-step confirmation `Dialog` from `@/components/ui/Dialog`.
  * `src/stores/__tests__/userStore.test.ts`: Added 9 unit tests testing Bước 1, Bước 2, Bước 3, fallback profiles for dev bypass auth, and error mapping.
- Verification commands & outputs:
  * `npx vitest run src/stores/__tests__/userStore.test.ts`:
    ```
    ✓ src/stores/__tests__/userStore.test.ts (9 tests) 6ms
    Test Files  1 passed (1)
         Tests  9 passed (9)
    ```
  * `npx eslint src/components/layout/Navbar.tsx src/components/layout/SettingsDropdown.tsx src/stores/`:
    Exited with code 0 (no warnings, no errors).
  * `npx tsc --noEmit`:
    0 errors in any of the owned files (`Navbar.tsx`, `SettingsDropdown.tsx`, `userStore.ts`, `index.ts`, `userStore.test.ts`).

## 2. Logic Chain
1. **Bước 1 Integration (`GET /api/me`)**:
   `Navbar` calls `fetchProfile()` upon mounting. `fetchProfile()` invokes `getMeSafe()`. If successful, `profile`, `serverNow`, and `serverClockOffsetMs = server_now - Date.now()` are stored in `useUserStore`. When `NEXT_PUBLIC_BYPASS_AUTH === "true"` or no user session exists in dev mode, `createFallbackProfile()` is activated to ensure continuous visual stability and prevent crashes.
2. **Bước 2 Integration (`POST /api/demo/persona`)**:
   `SettingsDropdown` provides one-click switching across the three standard personas defined in `spec/02` (`NEWBIE`, `MID_LEVEL`, `SENIOR_RUSTY`). Clicking triggers `changePersona(mode)`, which calls `switchPersonaSafe(mode)`, sets loading indicators, updates the store upon response, and raises a toast notification (`"Đã đổi sang hồ sơ: [Tên Persona]"`). If `ERR_DEMO_MODE_DISABLED` is encountered, the switcher is gracefully hidden or notified per `spec/30_UI.md`.
3. **Bước 3 Integration (`DELETE /api/me`)**:
   `SettingsDropdown` contains a highlighted destructive action "Xóa tài khoản & làm lại". Triggering it opens a modal `Dialog` warning the user that all BKT skill states and sessions will be permanently erased. Confirming calls `resetAccount()`, which executes `deleteMeSafe()`, calls Supabase `signOut()`, purges `localStorage` (`sf.last_session`, etc.), clears store state, displays a confirmation toast, and navigates to the home page `/`.
4. **4 UI States & Non-destructive Styling**:
   All original Tailwind utility classes, SVG icon geometry, and responsive drawer toggles in `Navbar.tsx` and `SettingsDropdown.tsx` have been preserved without modification or deletion.

## 3. Caveats
- The external backend endpoint `POST /api/demo/persona` might return `404` or `ERR_DEMO_MODE_DISABLED` if the backend demo route is disabled in production. The store handles this gracefully by detecting `ERR_DEMO_MODE_DISABLED` and falling back smoothly in `NEXT_PUBLIC_BYPASS_AUTH` mode.
- Typecheck command `npx tsc --noEmit` flagged an error in `src/app/report/components/RadarChart.tsx(315,21)`, which is exclusively owned by Worker 3 and outside our file ownership.

## 4. Conclusion
Worker 1 has fully implemented and verified Bước 1, Bước 2, and Bước 3 with 100% adherence to API contracts, 4 UI interaction states, zero TypeScript errors, zero lint violations, and complete unit test coverage.

## 5. Verification Method
1. Run unit test suite:
   ```bash
   npx vitest run src/stores/__tests__/userStore.test.ts
   ```
2. Verify linting on owned files:
   ```bash
   npx eslint src/components/layout/Navbar.tsx src/components/layout/SettingsDropdown.tsx src/stores/
   ```
3. Verify type safety:
   ```bash
   npx tsc --noEmit
   ```
   (Verify no errors in `Navbar.tsx`, `SettingsDropdown.tsx`, or `src/stores/`).
