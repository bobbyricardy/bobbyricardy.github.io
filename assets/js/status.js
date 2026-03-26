const API =
    new URL(location.href).searchParams.get("api") ??
    "https://rotom-dex.rotom-dex.workers.dev/api/health";

const HISTORY_API = API.replace(/\/api\/health$/, "/api/history");

/**
 * Returns the dot CSS class for a given status.
 * @param {"operational"|"degraded"|"down"} status
 * @returns {string}
 */
function statusDot(status) {
    return status === "operational"
        ? "dot-green"
        : status === "degraded"
          ? "dot-amber"
          : "dot-red";
}

/**
 * Returns the pill CSS class for a given status.
 * @param {"operational"|"degraded"|"down"} status
 * @returns {string}
 */
function statusPillClass(status) {
    return status === "operational"
        ? "pill-ok"
        : status === "degraded"
          ? "pill-warn"
          : "pill-down";
}

/**
 * Returns a human-readable label for a given status.
 * @param {"operational"|"degraded"|"down"} status
 * @returns {string}
 */
function statusLabel(status) {
    return status === "operational"
        ? "operational"
        : status === "degraded"
          ? "degraded"
          : "down";
}

/**
 * Formats a number with locale-appropriate thousands separators.
 * @param {number|null} n
 * @returns {string}
 */
function formatNumber(n) {
    if (n == null) return "—";
    return n.toLocaleString();
}

/**
 * Formats a duration in minutes as a short human-readable string.
 * @param {number|null} minutes
 * @returns {string}
 */
function formatMinutes(minutes) {
    if (minutes === null) return "—";
    if (minutes < 60) return minutes + "m";
    if (minutes < 1440) return Math.round(minutes / 60) + "h";
    return Math.round(minutes / 1440) + "d";
}

/** Fetches health data and updates all DOM elements. */
async function load() {
    const checkedAt = document.getElementById("checked-at");
    checkedAt.textContent = "";
    checkedAt.classList.add("is-checking");

    try {
        const res = await fetch(API);
        const d = await res.json();

        const { overall, checked_at, services, latency, freshness } = d;

        const badge = document.getElementById("overall-badge");
        badge.className =
            "overall-badge " +
            (overall === "operational"
                ? "badge-operational"
                : overall === "degraded"
                  ? "badge-degraded"
                  : "badge-down");
        document.getElementById("overall-dot").className =
            "dot " + statusDot(overall);
        document.getElementById("overall-text").textContent =
            overall === "operational"
                ? "All systems operational"
                : overall === "degraded"
                  ? "Degraded performance"
                  : "Service disruption";

        checkedAt.classList.remove("is-checking");
        checkedAt.textContent =
            "Last checked: " + new Date(checked_at).toLocaleTimeString();

        const allOperational = Object.values(services).every(
            (s) => s.status === "operational",
        );
        document.getElementById("uptime").textContent = allOperational
            ? "100%"
            : "degraded";

        const p95 = latency?.rum_intake_p95_ms;
        document.getElementById("p95").textContent = p95 ? formatNumber(p95) + "ms" : "—";
        document.getElementById("last-event").textContent = formatMinutes(
            freshness?.last_event_minutes_ago,
        );

        const { apm_server: apm, elasticsearch: es } = services;

        document.getElementById("dot-apm").className =
            "dot " + statusDot(apm.status);
        const pillApm = document.getElementById("pill-apm");
        pillApm.className = "status-pill " + statusPillClass(apm.status);
        pillApm.textContent = statusLabel(apm.status);

        document.getElementById("dot-es").className =
            "dot " + statusDot(es.status);
        document.getElementById("desc-es").textContent =
            "health: " + es.health 
        const pillEs = document.getElementById("pill-es");
        pillEs.className = "status-pill " + statusPillClass(es.status);
        pillEs.textContent = statusLabel(es.status);

        const p95status =
            p95 < 3000 ? "operational" : p95 < 8000 ? "degraded" : "down";
        document.getElementById("dot-p95").className =
            "dot " + statusDot(p95status);
        document.getElementById("val-p95").textContent = p95 ? formatNumber(p95) + "ms" : "—";
        const pillP95 = document.getElementById("pill-p95");
        pillP95.className = "status-pill " + statusPillClass(p95status);
        pillP95.textContent = statusLabel(p95status);

        const mins = freshness?.last_event_minutes_ago;
        const freshStatus =
            mins === null
                ? "down"
                : mins < 60
                  ? "operational"
                  : mins < 360
                    ? "degraded"
                    : "down";
        document.getElementById("dot-fresh").className =
            "dot " + statusDot(freshStatus);
        document.getElementById("val-fresh").textContent = formatMinutes(mins);
        const pillFresh = document.getElementById("pill-fresh");
        pillFresh.className = "status-pill " + statusPillClass(freshStatus);
        pillFresh.textContent =
            freshStatus === "operational"
                ? "fresh"
                : freshStatus === "degraded"
                  ? "stale"
                  : "no data";
    } catch {
        checkedAt.classList.remove("is-checking");
        checkedAt.textContent = "Unable to reach API";

        const badge = document.getElementById("overall-badge");
        badge.className = "overall-badge badge-down";
        document.getElementById("overall-dot").className = "dot dot-red";
        document.getElementById("overall-text").textContent =
            "Unable to fetch status";
    }
}

/**
 * Returns the heatmap cell CSS class for a given day's data.
 * @param {number|null} pct - uptime percentage (0–100), or null if no data
 * @param {number} downChecks - number of checks that recorded a down status
 * @returns {string}
 */
function cellClass(pct, downChecks) {
    if (pct === null) return "cell-empty";
    if (downChecks > 0 || pct < 50) return "cell-red";
    if (pct < 100) return "cell-amber";
    return "cell-green";
}

/**
 * Renders a 30-day heatmap into a container element.
 * @param {string} containerId
 * @param {Array<{date: string}>} days - history data from /api/history
 * @param {function} getColor - (day|null) => CSS class string
 * @param {function} getTooltip - (dateStr, day|null) => tooltip text
 */
function renderHeatmap(containerId, days, getColor, getTooltip) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    const today = new Date();
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
    }

    const dayMap = {};
    days.forEach((d) => {
        dayMap[d.date] = d;
    });

    dates.forEach((dateStr) => {
        const day = dayMap[dateStr] ?? null;
        const cell = document.createElement("div");
        cell.className = "heatmap-cell " + getColor(day);

        const tip = document.createElement("div");
        tip.className = "tooltip";
        tip.textContent = getTooltip(dateStr, day);
        cell.appendChild(tip);

        container.appendChild(cell);
    });
}

/** Fetches 30-day history and renders the uptime heatmaps. */
async function loadHistory() {
    try {
        const res = await fetch(HISTORY_API);
        const d = await res.json();
        const days = d.days ?? [];

        renderHeatmap(
            "heatmap-apm",
            days,
            (day) => (day ? cellClass(day.uptime_pct, day.apm_down_checks) : "cell-empty"),
            (date, day) => (day ? `${date} — ${day.uptime_pct}% uptime` : `${date} — no data`),
        );
        renderHeatmap(
            "heatmap-es",
            days,
            (day) => (day ? cellClass(day.uptime_pct, day.es_down_checks) : "cell-empty"),
            (date, day) => (day ? `${date} — ${day.uptime_pct}% uptime` : `${date} — no data`),
        );
        renderHeatmap(
            "heatmap-overall",
            days,
            (day) =>
                day
                    ? cellClass(day.uptime_pct, day.apm_down_checks + day.es_down_checks)
                    : "cell-empty",
            (date, day) =>
                day
                    ? `${date} — ${day.uptime_pct}% · p95: ${formatNumber(day.avg_p95_ms)}ms`
                    : `${date} — no data`,
        );
    } catch (e) {
        console.error("History load failed:", e);
    }
}

load();
loadHistory();
setInterval(load, 60000);
