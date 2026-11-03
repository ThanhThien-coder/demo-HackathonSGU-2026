# Handoff Report — Worker 2 (Home & Roadmap Domain)

**Agent Archetype**: Implementer / QA / Specialist  
**Domain**: Home & Roadmap (`src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`)  
**Completed Steps**: Bước 4 (`POST /api/ingest`), Bước 5 (`GET /api/sessions`)  

---

## 1. Observation

- **Modified Files**:
  1. `src/app/page.tsx` (Line 1 to 582): Replaced static scanner mock with dynamic `ingestRepoSafe` integration, supporting both GitHub repository URL submission and `.zip` file drag-and-drop upload (`FormData`). Added real-time scanning overlay with phase descriptions and elapsed timer. Integrated Bước 5 recent sessions section ("Tiếp tục học") with `getSessionsSafe({ limit: 3 })`, completion progress bars, and resume action routing to `/learn?session=${sessionId}`. Preserved `Navbar`, `HeroVisual`, `HeroAnimation` (`animation-robot.json`), `TrainingFramework`, `HomeFooter`, and Figma node IDs (`5:256`, `5:280`, etc.).
  2. `src/app/roadmap/page.tsx` (Line 1 to 243): Integrated Bước 5 `getSessionsSafe()` with complete 4 UI states:
     - **Loading**: Shimmer skeleton with 3 animated pulse cards inside container `data-node-id="5:828"`.
     - **Error**: Friendly Vietnamese error alert box with `RefreshCw` retry action.
     - **Empty**: Polished placeholder card with `FolderGit2` icon and CTA button redirecting to `/`.
     - **Success**: Mapped `LearningSessionSummary[]` to `RoadmapCourse[]` displaying repo names, progress percentages, completed/total counts, and link to `/roadmap/${sessionId}`.
     - **Dev Bypass Auth**: Banner and toggle supported when `process.env.NEXT_PUBLIC_BYPASS_AUTH === "true"`.
  3. `src/app/roadmap/[courseId]/page.tsx` (Line 1 to 276): Integrated session lookup and lesson progress via `getSessionsSafe()` and `getSessionProgressSafe(courseId)`:
     - Resolves dynamic `params` promise cleanly.
     - Discovers real session details and transforms node states (`COMPLETED`, `AVAILABLE`, `LOCKED`) into `LessonItem[]` targeting `/learn?session=${sessionId}&node=${nodeId}`.
     - Fallbacks gracefully to `getCourseDetail(courseId)` for demo/preset courses (`java-backend`, `react-frontend`, etc.).
     - Implements all 4 UI states (Loading skeleton, Error banner with retry, Empty state with back button, and Success state).
- **TypeScript and Test Results**:
  - `npx tsc --noEmit`: 0 errors in Worker 2 files (`src/app/page.tsx`, `src/app/roadmap/page.tsx`, `src/app/roadmap/[courseId]/page.tsx`).
  - `npm test`: 19 passed test files, 304 unit tests passed out of 304.

---

## 2. Logic Chain

1. **Step 4: `POST /api/ingest` in `src/app/page.tsx`**:
   - The user selects either "GitHub" or "File Zip" mode.
   - For GitHub mode, the URL is checked against `^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(?:\/)?$`. If invalid, immediate friendly feedback is displayed without unnecessary server load.
   - For Zip mode, file size is checked against `CONFIG.MAX_UPLOAD_BYTES` (4.5 MB). If valid, a `FormData` object with key `archive` is dispatched to `ingestRepoSafe(formData)`.
   - On success, the response contains `session_id`. The client triggers smooth navigation to `/learn?session=${sessionId}`.
   - Errors from `isApiError` are mapped to human-readable Vietnamese descriptions according to `spec/30_UI.md` (e.g. `ERR_INVALID_GITHUB_URL`, `ERR_EMPTY_REPOSITORY`, `ERR_STREAM_QUOTA_EXCEEDED`, `ERR_UNSUPPORTED_LANGUAGE`, `ERR_CLIENT_NETWORK`).
2. **Step 5: `GET /api/sessions` in Home & Roadmap**:
   - On `src/app/page.tsx`, recent sessions are fetched to provide immediate continuation for returning learners. Clicking "Học tiếp" calls `ingestRepoSafe({ session_id })` and opens the cockpit.
   - On `src/app/roadmap/page.tsx`, sessions are mapped into courses with calculated progress `completed_count / total_nodes * 100%`.
   - On `src/app/roadmap/[courseId]/page.tsx`, session ID is matched against the list of sessions; if matched, real node progress is loaded from `getSessionProgressSafe` and rendered in the lesson list. If not found or preset, it falls back to `getCourseDetail` so existing routes never 404.
3. **Preservation of Aesthetics & Integrity**:
   - No mock facades or hardcoded falsifications were introduced.
   - Genuine React state hooks, real API callers from `@/lib/api`, and full accessibility attributes (`role="progressbar"`, aria labels) were maintained.

---

## 3. Caveats

- **External Route**: Pre-existing TS error in `src/app/report/components/RadarChart.tsx` belongs exclusively to Worker 3's domain and was left untouched in accordance with file ownership rules.
- **Backend API Availability**: When the backend server is not running locally during development, the UI transitions gracefully to Error or Empty states with retry mechanisms, or displays Dev Bypass fallback if `NEXT_PUBLIC_BYPASS_AUTH="true"`.

---

## 4. Conclusion

Worker 2 has completed 100% of all assigned tasks for Bước 4 and Bước 5 across `src/app/page.tsx`, `src/app/roadmap/page.tsx`, and `src/app/roadmap/[courseId]/page.tsx`. All 4 UI states (Loading, Success, Error, Empty) are fully implemented. Zero TypeScript errors exist in the files owned by Worker 2, and all existing unit tests pass.

---

## 5. Verification Method

To independently verify the implementation:

1. **Verify TypeScript compilation**:
   ```bash
   npx tsc --noEmit
   ```
   Confirm that zero errors originate from `src/app/page.tsx`, `src/app/roadmap/page.tsx`, or `src/app/roadmap/[courseId]/page.tsx`.
2. **Execute project unit test suite**:
   ```bash
   npm test
   ```
   Confirm that all 19 test files and 304 tests pass.
3. **Inspect file modifications**:
   - `src/app/page.tsx`
   - `src/app/roadmap/page.tsx`
   - `src/app/roadmap/[courseId]/page.tsx`
