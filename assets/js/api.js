/** @type {import('swagger-ui-dist').SwaggerUIBundle} */
const spec = {
    openapi: "3.0.0",
    info: {
        title: "rotom-dex API",
        version: "1.0.0",
        description:
            "Analytics and observability API for bobbyricardy.github.io — powered by Cloudflare Workers, Elasticsearch, and Elastic APM.\n\nBase URL: `https://rotom-dex.rotom-dex.workers.dev`",
    },
    servers: [
        {
            url: "https://rotom-dex.rotom-dex.workers.dev",
            description: "Production",
        },
    ],
    tags: [
        {
            name: "Analytics",
            description: "Visitor and page analytics from Elasticsearch",
        },
        {
            name: "Observability",
            description: "Service health and uptime history",
        },
    ],
    paths: {
        "/api/visitors": {
            get: {
                tags: ["Analytics"],
                summary: "Visitor analytics",
                description:
                    "Returns aggregate visitor stats including total visits, country breakdown, browser breakdown, and pageviews over time. Cached for 5 minutes.",
                responses: {
                    200: {
                        description: "Successful response",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        total_visitors: {
                                            type: "integer",
                                            example: 142,
                                        },
                                        countries: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        example: "Singapore",
                                                    },
                                                    count: {
                                                        type: "integer",
                                                        example: 45,
                                                    },
                                                },
                                            },
                                        },
                                        browsers: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        example: "Chrome",
                                                    },
                                                    count: {
                                                        type: "integer",
                                                        example: 89,
                                                    },
                                                },
                                            },
                                        },
                                        pageviews_over_time: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    date: {
                                                        type: "string",
                                                        format: "date",
                                                        example: "2026-03-25",
                                                    },
                                                    count: {
                                                        type: "integer",
                                                        example: 12,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: { description: "Internal server error" },
                },
            },
        },
        "/api/rum/latest-trace": {
            get: {
                tags: ["Analytics"],
                summary: "Latest page-load trace",
                description:
                    "Returns the most recent page-load transaction with full span breakdown including navigation timing, resource loads, and HTTP requests.",
                responses: {
                    200: {
                        description: "Successful response",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        meta: {
                                            type: "object",
                                            properties: {
                                                traceId: {
                                                    type: "string",
                                                    example:
                                                        "23ed4bba92837d5a2c14a998cac51a42",
                                                },
                                                service: {
                                                    type: "string",
                                                    example:
                                                        "rotom-dex-portfolio",
                                                },
                                                agentVersion: {
                                                    type: "string",
                                                    example: "4.8.1",
                                                },
                                                timestamp: {
                                                    type: "string",
                                                    format: "date-time",
                                                },
                                                clientIp: {
                                                    type: "string",
                                                    example: "1.2.3.4",
                                                },
                                                userAgent: {
                                                    type: "string",
                                                    example: "Mozilla/5.0...",
                                                },
                                                city: {
                                                    type: "string",
                                                    example: "Singapore",
                                                },
                                                country: {
                                                    type: "string",
                                                    example: "Singapore",
                                                },
                                                countryCode: {
                                                    type: "string",
                                                    example: "SG",
                                                },
                                            },
                                        },
                                        transaction: {
                                            type: "object",
                                            properties: {
                                                id: {
                                                    type: "string",
                                                    example: "43d36a58c7ed52c8",
                                                },
                                                duration: {
                                                    type: "number",
                                                    example: 1234.5,
                                                    description:
                                                        "Duration in milliseconds",
                                                },
                                                marks: { type: "object" },
                                            },
                                        },
                                        spans: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    name: {
                                                        type: "string",
                                                        example:
                                                            "GET /assets/main.css",
                                                    },
                                                    type: {
                                                        type: "string",
                                                        example: "resource",
                                                    },
                                                    subtype: {
                                                        type: "string",
                                                        example: "css",
                                                    },
                                                    start: {
                                                        type: "number",
                                                        description:
                                                            "Start time in ms",
                                                    },
                                                    duration: {
                                                        type: "number",
                                                        description:
                                                            "Duration in ms",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    404: {
                        description: "No page-load transactions found",
                    },
                    500: { description: "Internal server error" },
                },
            },
        },
        "/api/health": {
            get: {
                tags: ["Observability"],
                summary: "Live service health",
                description:
                    "Returns real-time health status of all services — APM Server, Elasticsearch, and Cloudflare Worker — along with p95 latency and data freshness.",
                responses: {
                    200: {
                        description: "Successful response",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        overall: {
                                            type: "string",
                                            enum: [
                                                "operational",
                                                "degraded",
                                                "down",
                                            ],
                                            example: "operational",
                                        },
                                        checked_at: {
                                            type: "string",
                                            format: "date-time",
                                        },
                                        services: {
                                            type: "object",
                                            properties: {
                                                apm_server: {
                                                    type: "object",
                                                    properties: {
                                                        status: {
                                                            type: "string",
                                                            enum: [
                                                                "operational",
                                                                "degraded",
                                                                "down",
                                                            ],
                                                        },
                                                        response_code: {
                                                            type: "integer",
                                                            example: 200,
                                                        },
                                                    },
                                                },
                                                elasticsearch: {
                                                    type: "object",
                                                    properties: {
                                                        status: {
                                                            type: "string",
                                                            enum: [
                                                                "operational",
                                                                "degraded",
                                                                "down",
                                                            ],
                                                        },
                                                        health: {
                                                            type: "string",
                                                            enum: [
                                                                "green",
                                                                "yellow",
                                                                "red",
                                                            ],
                                                        },
                                                        shards: {
                                                            type: "integer",
                                                            example: 43,
                                                        },
                                                    },
                                                },
                                                cloudflare_worker: {
                                                    type: "object",
                                                    properties: {
                                                        status: {
                                                            type: "string",
                                                            enum: [
                                                                "operational",
                                                            ],
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        latency: {
                                            type: "object",
                                            properties: {
                                                rum_intake_p95_ms: {
                                                    type: "integer",
                                                    example: 1453,
                                                    description:
                                                        "p95 page load duration in ms",
                                                },
                                            },
                                        },
                                        freshness: {
                                            type: "object",
                                            properties: {
                                                last_event_minutes_ago: {
                                                    type: "integer",
                                                    example: 5,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: { description: "Internal server error" },
                },
            },
        },
        "/api/history": {
            get: {
                tags: ["Observability"],
                summary: "30-day uptime history",
                description:
                    "Returns daily uptime percentages and downtime counts for the last 30 days, aggregated from health checks stored every 5 minutes.",
                responses: {
                    200: {
                        description: "Successful response",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        days: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    date: {
                                                        type: "string",
                                                        format: "date",
                                                        example: "2026-03-25",
                                                    },
                                                    total_checks: {
                                                        type: "integer",
                                                        example: 288,
                                                        description:
                                                            "Number of checks that day (every 5 min = 288/day)",
                                                    },
                                                    uptime_pct: {
                                                        type: "integer",
                                                        example: 100,
                                                        description:
                                                            "Percentage of checks that returned operational",
                                                    },
                                                    apm_down_checks: {
                                                        type: "integer",
                                                        example: 0,
                                                    },
                                                    es_down_checks: {
                                                        type: "integer",
                                                        example: 0,
                                                    },
                                                    avg_p95_ms: {
                                                        type: "integer",
                                                        example: 1453,
                                                        description:
                                                            "Average p95 page load duration for the day",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: { description: "Internal server error" },
                },
            },
        },
    },
};

SwaggerUIBundle({
    spec,
    dom_id: "#swagger-ui",
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: "BaseLayout",
    deepLinking: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
});
