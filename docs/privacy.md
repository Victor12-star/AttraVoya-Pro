# AttraVoya Pro privacy-policy implementation

The canonical public policy is rendered at `/privacy` by
`apps/web/src/app/(main)/privacy/page.jsx`. The page must remain publicly
accessible without authentication and must be included in the production
website sitemap and footer.

The policy reflects the current implemented architecture rather than future
marketing plans. In particular:

- authentication uses an email address, a password hash, short-lived access
  credentials, hashed refresh credentials, and bounded security-session
  metadata;
- mobile credentials use operating-system encrypted secure storage;
- saved travel planning can contain budgets, dates, destinations, preferences,
  traveller types, and children's ages;
- foreground location is requested only for user-initiated location features;
- background location permission is blocked;
- essential cookies support authentication and security;
- optional preference storage defaults off where consent is required;
- optional analytics and advertising tracking are not currently enabled;
- provider data sharing is limited to the requested travel function;
- account deletion is available in the mobile Profile and at
  `/delete-account`;
- deletion removes private account data and replaces the retained database
  identity with a non-identifying audit anchor; and
- production backup and cleanup schedules must be verified against the selected
  hosting providers before their exact periods are published.

## Required production configuration

Set `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` to a monitored privacy address owned by
the production operator. The public page deliberately reports when this value
has not been configured rather than publishing an invented or unmonitored
address.

Before Google Play submission, verify that:

1. the deployed HTTPS `/privacy` URL loads without authentication;
2. the configured privacy email is visible and monitored;
3. the Google Play Data safety answers match the exact production providers,
   permissions, and data flows;
4. provider contracts, data regions, subprocessors, and international
   transfers have been reviewed;
5. retention and cleanup jobs match the statements in the public policy;
6. the app-store developer identity and contact details identify the actual
   legal operator; and
7. screenshots and tests confirm that both in-app and web account deletion
   remain usable.

Policy changes require legal and technical review. Do not claim that data is
anonymous, never retained, never shared, or deleted immediately unless the
deployed system and its backups prove that statement.
