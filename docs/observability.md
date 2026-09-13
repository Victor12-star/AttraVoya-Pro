# Observability topology

AttraVoya Pro records bounded aggregate metrics in memory on each API replica. Recording does not perform database writes, network calls, or payload retention, so observability cannot add remote latency to user-facing requests.

The administrator service-metrics endpoint is always a process-local snapshot. Its `topology` object identifies the producing instance, the declared active replica count, and whether an external collector is required. It must never be interpreted as a cluster-wide response by itself.

For one production replica, `METRICS_AGGREGATION_MODE=process_local` is supported. For multiple production replicas:

1. Set `API_REPLICA_COUNT` to every process that can simultaneously accept traffic.
2. Set `METRICS_AGGREGATION_MODE=external`.
3. Give each active replica a unique stable `METRICS_INSTANCE_ID`.
4. Scrape the authenticated service-metrics endpoint through a direct per-instance route, not through a load balancer that may repeatedly select the same replica.
5. Aggregate counters, status classes, latency buckets, provider outcomes, runtime saturation, cache activity, and database-pool state across all observed instance identities.
6. Alert when the number or set of observed identities differs from the declared topology.

Instance identifiers are operational labels only. They must not contain user data, credentials, host secrets, request values, or other private information. Metric labels remain bounded and code-defined.

This exporter architecture keeps shared coordination off the request path. A managed monitoring backend may be selected during deployment, but the repository does not require Redis or write high-frequency telemetry into the application database merely to support horizontal API scaling.
