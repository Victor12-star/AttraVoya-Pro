# Cookies, Preferences, and Recent Searches

AttraVoya Pro separates authentication cookies from convenience data instead of
putting everything into browser cookies.

## Authentication cookies

Authentication cookies are security credentials. They are `HttpOnly`, use
`SameSite=Lax`, become `Secure` in production, and are never readable by normal
browser JavaScript.

The short-lived access token uses `attravoya_access`. The long-lived opaque
refresh credential uses `attravoya_refresh`; only its SHA-256 hash is stored in
PostgreSQL, and the credential is rotated after every successful refresh.

## Preferences

Language, preferred currency, country, and theme are convenience preferences.
Guests can keep these locally for fast repeat visits. Signed-in users will also
persist their selected preferences in `UserProfile` so web and mobile can share
them.

## Recent searches

Recent destination, flight, stay, and budget-trip searches are deliberately not
stored in cookies. Cookies are sent with HTTP requests and are a poor place for
larger travel-history payloads.

Guest recent searches use local browser storage with a small eight-item limit **only after preference storage is allowed**. Search criteria are allowlisted by search type so unrelated fields such as tokens or email addresses cannot be accidentally persisted.
Signed-in recent searches use the `RecentSearch` PostgreSQL model and must be
owner-authorized on the backend. Users must be able to remove individual items
or clear their recent searches.

Do not store passwords, access/refresh tokens, passport details, payment-card
information, precise location history, or other sensitive information in this
recent-search mechanism.

## Cookie consent

The customer UI must distinguish essential cookies from optional preference and analytics storage. The consent state defaults to optional categories being off. Analytics code is not installed/enabled by this foundation. Future marketing storage, if ever added, requires its own explicit category and review. Essential authentication/security cookies do not
depend on marketing consent. Optional analytics or marketing technologies must
not be enabled until the user has made the appropriate choice, and the user
must be able to change that choice later.
