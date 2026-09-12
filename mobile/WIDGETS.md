# Home screen widgets

The four widgets scoped for v1 — active job clock in/out, today's hours summary,
pending approvals count, and quick expense/photo capture — all read data this
app already has locally (the SQLite cache/outbox) or one cheap API call
(`/time-entries`, `/expenses?status=pending`).

True OS-level home screen widgets need native code that a JS-only Expo project
can't provide on its own, and can't be built or tested in this environment
(no Xcode/macOS for iOS, no device/emulator for Android). The recommended path:

- **iOS**: add a WidgetKit extension via `@bacons/apple-targets` (an Expo config
  plugin) or eject to a bare/dev-client build, then build with EAS Build or Xcode.
- **Android**: `react-native-android-widget` lets you define widgets in
  React/JSX and ships an Expo config plugin, so it fits the existing managed
  workflow with a dev client build.

Both need a small "widget data" bridge - e.g. an `updateWidgetData()` call after
every clock in/out, sync, and approval action that writes a compact JSON
snapshot to `SharedPreferences` (Android) / an App Group container (iOS) that
the native widget reads. The app-side data (active clock, today's hours,
pending approval count) is already centralized in `useActiveClock` and the
outbox/cache layer, so wiring that bridge in is additive once someone can
build and test on real devices/simulators.
