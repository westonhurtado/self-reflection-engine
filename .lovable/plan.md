# Password gate: no changes

The entry passphrase is `what is your greatest fear`, checked in `src/pages/Index.tsx`.

## Recommendation

Leave the gate as it is. It is a client-side passphrase check, which is fine for a personal, low-stakes entry screen.

## If you change your mind later

- Change the phrase: a one-line edit to the comparison in `src/pages/Index.tsx`.
- Real protection: move to backend accounts (email/password sign-in) so no secret lives in the shipped source.

Approve to confirm no code changes for now.