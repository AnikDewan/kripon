# Kripon

A privacy-first UPI expense tracker for Android and iOS. Kripon reads the
statement exports you already have — Paytm spreadsheets, Google Pay and BHIM
PDFs — turns them into one clean, searchable ledger, and keeps every byte of
data on your own device.

No bank login. No account. No cloud.

## Features

- **Statement import** — parse Paytm `.xlsx`, and text-based Google Pay / BHIM
  `.pdf` exports into a unified transaction list. Duplicate payments are
  detected by their UPI reference number and skipped automatically.
- **Manual transactions** — add cash-style entries with an amount pad that only
  accepts numbers, a category, and an expense/income toggle.
- **Fixed spending categories** — ten curated categories (Food & dining,
  Groceries, Transport, Bills, Shopping, Health, Entertainment, Travel,
  Education, Housing) plus **Other**, with automatic category inference on
  imported statements.
- **Weekly & monthly budgets** — set limits once in Settings; Overview shows
  live progress against each period (transfers never count against a budget).
- **Insights** — total spent, typical vs largest payment, budget pacing,
  monthly spend trend, top categories, weekday breakdown, and where you pay
  (Paytm / GPay / BHIM).
- **Activity search** — filter by direction (spent/received) and date range,
  backed by SQL so the list stays smooth at any size.
- **Backup & restore** — export the entire database as a compressed, checksum
  verified `.zip` archive and restore it later on any device. Long-running
  exports are chunked so the UI never freezes.
- **Share-to-import** — share a PDF/XLSX statement from another app with
  "Open in Kripon"; incompatible files are rejected with a clear message.
- **Local-first** — all data lives in an on-device SQLite database.

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | [Expo SDK 57](https://expo.dev) · React Native 0.86 |
| Language   | TypeScript                                          |
| Navigation | expo-router (file-based, typed routes)              |
| Database   | SQLite via `expo-sqlite` + drizzle-orm              |
| Styling    | Tailwind CSS v4 via uniwind                         |
| Lists      | @shopify/flash-list                                 |
| Charts     | react-native-chart-kit                              |
| Archives   | fflate (pure-JS zip)                                |
| Tests      | vitest                                              |

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- An Expo development build for PDF import (`expo-pdf-text-extract` contains
  native code and is unavailable in Expo Go; spreadsheet import works in Go).

### Install and run

```bash
bun install
bun start          # start Metro
bun run android    # boot on a connected Android device/emulator
bun run ios        # boot on an iOS simulator
```

### Scripts

| Script                | Purpose                     |
| --------------------- | --------------------------- |
| `bun start`           | Start the Metro dev server  |
| `bun run android`     | Run on Android              |
| `bun run ios`         | Run on iOS                  |
| `bun run typecheck`   | `tsc --noEmit`              |
| `bun run test`        | Run the vitest suite        |
| `bun run db:generate` | Generate drizzle migrations |

## Project structure

```
app/                    # Screens (expo-router). Tabs: index, activity,
                        # insights, settings. add-transaction is a modal route.
components/             # UI pieces: transaction rows, date picker,
                        # budget cards/editors, charts, section headings
db/
  index.ts              # Opens kripon.db, creates schema at bootstrap
  schema.ts             # Drizzle table definitions (transactions, budgets)
lib/
  amount.ts             # Amount input sanitising + rupee->paise conversion
  budgets.ts            # Budget period maths and spend aggregation
  categories.ts         # The fixed category set
  data-transfer.ts      # Zipped export/import jobs with progress tracking
  format.ts             # Money/date formatting (INR aware)
  ledger-archive-core.ts# Archive types + validation (pure, unit tested)
  statement-import.ts   # Paytm/GPay/BHIM parsers + category inference
  zip.ts                # fflate helpers
styles/global.css       # Tailwind theme tokens (ink, paper, teal, ...)
```

## Money handling

Every amount is stored as an integer number of **paise** (`amountPaise`).
Formatting uses `Intl.NumberFormat` with the `en-IN` locale, showing two
decimal places whenever an amount has paise left over.

## Data archive format

Exports are `.zip` files containing:

- `ledger.json` — `{ kind: "kripon-ledger", version: 2, createdAt, transactions[], budgets[] }`
- `checksum.txt` — SHA-256 hex digest of `ledger.json`

Restores verify the checksum first and replace the whole database inside a
single transaction, so a failed import can never leave half-written data.

## Building with EAS

The repo ships an Android-only `eas.json`:

| Profile       | Output | Use                         |
| ------------- | ------ | --------------------------- |
| `android`     | `.aab` | Play Store production build |
| `android-apk` | `.apk` | Direct install / testing    |

```bash
bunx eas build --platform android --profile android      # production .aab
bunx eas build --platform android --profile android-apk  # test .apk
```

## Development workflow

- **Pre-commit hooks** (Husky + lint-staged): Prettier formats staged files,
  then `typecheck` and `test` must pass before a commit lands.
- **Testing**: pure logic (money formatting, input sanitising, category rules,
  archive validation, zip round-trips) is covered by vitest under `lib/*.test.ts`.

```bash
bunx vitest run          # full suite
bunx vitest lib/amount   # single file
```

## Privacy

Kripon has no server. Statements are parsed on-device, backups are saved
through your OS share sheet to wherever you choose, and nothing leaves the
device unless you export it yourself.
