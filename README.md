# Kripon

A private, local-first UPI expense tracker built with Expo SDK 57, Expo Router, Drizzle ORM, Expo SQLite, Uniwind, and FlashList.

## Run

```bash
bun install
bun start
```

Excel imports work in Expo Go. GPay and BHIM PDF imports use native text extraction and need a development build:

```bash
npx expo run:ios
# or
npx expo run:android
```

The importer supports Paytm's `Passbook Payment History` workbook and text-based GPay/BHIM PDF exports. Imported transactions live only in the device SQLite database; an existing UPI reference is skipped automatically.
