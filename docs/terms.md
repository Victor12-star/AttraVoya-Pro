# AttraVoya Pro terms-of-service implementation

The canonical public terms are rendered at `/terms` by
`apps/web/src/app/(main)/terms/page.jsx`. The route must remain publicly
accessible without authentication so it can be linked from the website, mobile
application, store listing, and future purchase disclosures.

The terms deliberately distinguish live provider information from estimates,
state that the product is a planning aid rather than an emergency or official
advisory service, preserve mandatory consumer rights, and do not claim that paid
subscriptions are already available. The page links to the privacy policy and
public account-deletion route.

Set `NEXT_PUBLIC_SUPPORT_EMAIL` to a monitored support address owned by the
verified production operator. If it is absent, the page does not invent an
address and directs users to the verified application-store developer contact.

Before subscriptions are enabled or the application is submitted to Google
Play, verify that:

1. the deployed HTTPS `/terms` URL loads without authentication;
2. the operator identity, support contact, applicable governing-law language,
   and consumer terms have been reviewed for the actual production entity;
3. purchase screens disclose the exact store price, billing period, recurring
   benefits, renewal, trial or offer conditions, and cancellation route;
4. Google Play Billing and Google Play subscription rules are followed for the
   shipped Android build;
5. refund, cancellation, price-change, and customer-support wording matches the
   live store configuration; and
6. the privacy policy, Data safety declaration, store listing, application
   behaviour, and these terms remain consistent.

This document is an implementation and release checklist, not legal advice.
