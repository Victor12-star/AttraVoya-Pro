# Phase 9N validation gate

The exact final pull-request head must pass these five top-level GitHub Actions jobs before squash merge:

1. Code quality and unit tests
2. PostgreSQL and Prisma verification
3. Production builds
4. Live no-cost provider checks
5. Dependency and secret checks

After merge, the exact resulting `develop` commit must pass the same five jobs before Phase 9N is complete.
