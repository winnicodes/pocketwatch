# Changelog

## 1.2.0

### Platform

- Updated base image: Alpine 3.24, PHP 8.5
- Updated frontend dependencies: React 19.3, Vite 8, TypeScript 7, Tailwind 4.3
- The image is built and published by GitHub Actions

### Interface

- Sharper logo in the header and the menu
- The Ko-fi link reads "Buy me a coffee"

## 1.1.0

### Data safety

- The app does not write the time entries if it cannot read them first. Before, a failed read showed an empty history, and the next change replaced all entries.
- The app shows a message if it cannot save. Before, the message was only in the browser console.
- The API accepts a list of entries only. It refuses other data.
- The upload limit is larger. Before, saving stopped at approximately 6000 entries.
- The JSON files contain accented characters. They no longer contain escape sequences.

### Export

- The dialog has a new period option: Standard filters. Select All, Day, Week, Month or Year, and step to an earlier or a later period.
- The dialog keeps the same height when you change the period option.

### Interface

- The calendar marks the full week when the period is Week.
- On a phone, the Edit dialog shows the client and the activity above the start and the end times.
- On a phone, the activity field is smaller.
- Buttons with long text no longer cut the text on a narrow screen.
- The week total in the header and its setting are removed.

## 1.0.1

- Corrected logo artwork

## 1.0.0

- Initial release
