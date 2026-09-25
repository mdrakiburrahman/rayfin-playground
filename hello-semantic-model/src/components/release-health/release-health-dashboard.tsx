import { useMemo, useState, type ComponentType } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Layers3,
    Moon,
    RefreshCw,
    ShieldAlert,
    Sun,
    Workflow,
    X,
} from "lucide-react";
import type { VegaVisualCapabilities } from "@microsoft/fabric-visuals";
import {
    convertDataTableToRows,
    type InteractionEvent,
} from "@microsoft/fabric-visuals-core";

import { clearQueryCache, useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { useThemeContext } from "@/hooks/theme.context";
import type { MatrixRowDefinition } from "@/lib/pivot-matrix";
import { toDataTable } from "@/lib/to-data-table";
import { cn } from "@/lib/utils";
import {
    daysSinceLastSuccessfulDeployment,
    deployedEnvironment,
    deploymentStepsByFailure,
    failedDeploymentStepsByServiceGroup,
    failedRolloutsByServiceGroup,
    icmsOpenedByDate,
    releaseSummary,
    rolloutAttemptsByDate,
    rolloutSuccessByState,
    rolloutSuccessRateByDate,
    stalenessLeaderboard,
    stepRunsAndFailuresByDate,
    successfulAndFailedRolloutsByDate,
    successfulRolloutsByServiceGroup,
    versionsBehindByRegion,
} from "@/queries";

import {
    SemanticChart,
    SemanticMatrix,
    SemanticTable,
    type SemanticTableColumn,
} from "./query-visuals";

const wholeNumberFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
});
const denseDateCapabilities: VegaVisualCapabilities = {
    disableCategoricalScroll: {
        options: {
            threshold: 20,
            windowSize: 14,
            forceShow: true,
        },
    },
};

type Tone = "brand" | "success" | "warning" | "destructive" | "info";

interface MetricCardProps {
    label: string;
    value?: string;
    detail?: string;
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    tone: Tone;
}

const toneClasses: Record<Tone, { icon: string; accent: string }> = {
    brand: {
        icon: "bg-accent text-accent-foreground",
        accent: "text-brand-foreground",
    },
    success: {
        icon: "bg-success/10 text-success",
        accent: "text-success",
    },
    warning: {
        icon: "bg-warning/10 text-warning",
        accent: "text-warning",
    },
    destructive: {
        icon: "bg-destructive/10 text-destructive",
        accent: "text-destructive",
    },
    info: {
        icon: "bg-info/10 text-info",
        accent: "text-info",
    },
};

function MetricCard({
    label,
    value,
    detail,
    icon: Icon,
    tone,
}: MetricCardProps) {
    const classes = toneClasses[tone];

    return (
        <article className="signal-surface flex min-h-0 flex-col justify-between rounded-2xl border p-500">
            <div className="flex items-start justify-between gap-400">
                <p className="text-200 font-semibold uppercase leading-200 tracking-wider text-muted-foreground">
                    {label}
                </p>
                <div
                    className={cn(
                        "flex size-700 shrink-0 items-center justify-center rounded-xl",
                        classes.icon,
                    )}
                >
                    <Icon className="icon-size-300" aria-hidden={true} />
                </div>
            </div>
            {value ? (
                <div className="mt-500">
                    <p
                        className={cn(
                            "metric-value text-hero-800 font-semibold leading-hero-800",
                            classes.accent,
                        )}
                    >
                        {value}
                    </p>
                    {detail && (
                        <p className="mt-200 text-200 leading-200 text-muted-foreground">
                            {detail}
                        </p>
                    )}
                </div>
            ) : (
                <div className="mt-500 space-y-200">
                    <div className="skeleton-shimmer h-600 w-2/3 rounded-lg" />
                    <div className="skeleton-shimmer h-300 w-full rounded-lg" />
                </div>
            )}
        </article>
    );
}

function asNumber(row: Record<string, unknown> | undefined, key: string) {
    const value = row?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(row: Record<string, unknown> | undefined, key: string) {
    const value = row?.[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatCount(value: number | undefined) {
    return value === undefined ? undefined : wholeNumberFormatter.format(value);
}

function formatDecimal(value: number | undefined) {
    return value === undefined ? undefined : decimalFormatter.format(value);
}

function formatPercent(value: number | undefined) {
    return value === undefined ? undefined : percentFormatter.format(value);
}

function formatDate(value: string | undefined) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : dateFormatter.format(date);
}

function getSelectionLabel(events: InteractionEvent[]) {
    const selectEvent = events.find((event) => event.action === "select");
    if (!selectEvent || selectEvent.action !== "select") return undefined;

    for (const selection of selectEvent.selections) {
        for (const predicate of selection.predicates) {
            if (predicate.type === "set" && predicate.values.length > 0) {
                const value = predicate.values[0];
                if (typeof value === "string" || typeof value === "number") {
                    return String(value);
                }
            }
        }
    }

    return undefined;
}

const stalenessColumns: readonly SemanticTableColumn[] = [
    {
        field: "ServiceGroup",
        header: "Service group",
        wrap: true,
    },
    {
        field: "Environment",
        header: "Environment",
        wrap: true,
    },
    {
        field: "DaysSinceLastSuccessfulDeployment",
        header: "Days since success",
    },
    { field: "RolloutAttempts", header: "Attempts" },
    {
        field: "RolloutSuccessRate",
        header: "Success rate",
    },
    { field: "StepFailures", header: "Failures" },
    {
        field: "StepFailureRate",
        header: "Failure rate",
    },
    {
        field: "EngineeringManager",
        header: "Manager",
        wrap: true,
    },
    {
        field: "LastSuccessfulRollout",
        header: "Last rollout",
        linkLabel: "Open",
    },
];

const failureStepColumns: readonly SemanticTableColumn[] = [
    {
        field: "DeploymentStep",
        header: "Deployment step",
        wrap: true,
    },
    {
        field: "ServiceGroup",
        header: "Service group",
        wrap: true,
    },
    { field: "AverageDurationSeconds", header: "Average duration (s)" },
    { field: "StepRuns", header: "Step runs" },
    { field: "StepFailures", header: "Step failures" },
    { field: "StepFailureRate", header: "Failure rate" },
];

const versionsMatrixRows: readonly MatrixRowDefinition[] = [
    { field: "ServiceGroup", displayName: "Service group" },
    {
        field: "RolloutInfrastructure",
        displayName: "Rollout infrastructure",
    },
];

const deploymentAgeMatrixRows: readonly MatrixRowDefinition[] = [
    { field: "ServiceGroup", displayName: "Service group" },
];

export function ReleaseHealthDashboard() {
    const { isDark, toggleTheme } = useThemeContext();
    const [refreshKey, setRefreshKey] = useState(0);
    const [selection, setSelection] = useState<string>();
    const summaryConfig = useMemo(() => releaseSummary(), []);
    const summaryResult = useSemanticModelQuery({
        connection: summaryConfig.connection,
        query: summaryConfig.query,
        refreshKey,
    });

    const summaryRow = useMemo(() => {
        if (summaryResult.data?.status !== "success") return undefined;
        const table = toDataTable(
            summaryResult.data.table,
            summaryConfig.columnMetadata,
        );
        return convertDataTableToRows(table)[0];
    }, [summaryConfig.columnMetadata, summaryResult.data]);

    const latestDataDate = formatDate(asString(summaryRow, "LatestDataDate"));
    const rolloutAttempts = asNumber(summaryRow, "RolloutAttempts");
    const successfulRollouts = asNumber(summaryRow, "SuccessfulRollouts");
    const failedRollouts = asNumber(summaryRow, "FailedRollouts");
    const successRate = asNumber(summaryRow, "RolloutSuccessRate");
    const rolloutsInFlight = asNumber(summaryRow, "RolloutsInFlight");
    const awaitingMitigation = asNumber(summaryRow, "RolloutsAwaitingMitigation");
    const stepFailures = asNumber(summaryRow, "StepFailures");
    const stepFailureRate = asNumber(summaryRow, "StepFailureRate");
    const freshnessBreaches = asNumber(summaryRow, "DeploymentFreshnessBreaches");
    const averageVersionsBehind = asNumber(summaryRow, "AverageVersionsBehind");

    const summaryError =
        summaryResult.error?.message ??
        (summaryResult.data?.status === "error"
            ? summaryResult.data.error.message
            : undefined);

    const handleRefresh = () => {
        clearQueryCache("releaseHealth");
        setRefreshKey((current) => current + 1);
    };

    const handleInteraction = (source: string, events: InteractionEvent[]) => {
        const hasClear = events.some((event) => event.action === "clear");
        if (hasClear) {
            setSelection(undefined);
            return;
        }

        const label = getSelectionLabel(events);
        if (label) {
            setSelection(`${source}: ${label}`);
        }
    };

    return (
        <div className="release-app">
            <span className="release-packet release-packet-one" aria-hidden="true" />
            <span className="release-packet release-packet-two" aria-hidden="true" />
            <span className="release-packet release-packet-three" aria-hidden="true" />

            <header className="command-bar sticky top-0 z-50">
                <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-400 px-400 py-300 sm:px-600 lg:px-800">
                    <div className="flex min-w-0 items-center gap-300">
                        <div className="flex size-800 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2">
                            <Activity className="icon-size-400" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-heading text-400 font-semibold leading-400">
                                Release Health
                            </p>
                            <p className="truncate text-200 leading-200 text-muted-foreground">
                                HybridRelease + EV2
                            </p>
                        </div>
                    </div>

                    <nav
                        aria-label="Report pages"
                        className="hidden items-center gap-100 rounded-full border bg-secondary p-100 lg:flex"
                    >
                        <a
                            href="#overview"
                            className="rounded-full px-300 py-200 text-200 font-semibold text-secondary-foreground transition-colors hover:bg-accent"
                        >
                            Overview
                        </a>
                        <a
                            href="#failures"
                            className="rounded-full px-300 py-200 text-200 font-semibold text-secondary-foreground transition-colors hover:bg-accent"
                        >
                            Failures
                        </a>
                    </nav>

                    <div className="flex items-center gap-200">
                        {selection && (
                            <button
                                type="button"
                                onClick={() => setSelection(undefined)}
                                className="hidden max-w-md items-center gap-200 rounded-full border bg-secondary px-300 py-200 text-200 text-secondary-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:flex"
                                title="Clear visual focus"
                            >
                                <span className="truncate">{selection}</span>
                                <X className="icon-size-100 shrink-0" aria-hidden="true" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="flex size-800 items-center justify-center rounded-full border bg-secondary text-secondary-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Refresh release health data"
                            title="Refresh data"
                        >
                            <RefreshCw className="icon-size-300" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex size-800 items-center justify-center rounded-full border bg-secondary text-secondary-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {isDark ? (
                                <Sun className="icon-size-300" aria-hidden="true" />
                            ) : (
                                <Moon className="icon-size-300" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-400 pb-800 pt-700 sm:px-600 lg:px-800">
                <section className="mb-500 flex flex-col gap-300 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">
                            HybridRelease + EV2
                        </p>
                        <h1 className="mt-100 font-heading text-hero-800 font-semibold leading-hero-800 tracking-tight">
                            Release Health
                        </h1>
                        <p className="mt-200 text-300 leading-300 text-muted-foreground">
                            Report-scoped service groups · Data through {latestDataDate ?? "latest refresh"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-200 text-200 text-muted-foreground">
                        <span className="rounded-full border bg-secondary px-300 py-200">
                            {formatCount(rolloutAttempts) ?? "—"} rollout attempts
                        </span>
                        <span className="rounded-full border bg-secondary px-300 py-200">
                            {formatCount(rolloutsInFlight) ?? "—"} in flight
                        </span>
                    </div>
                </section>

                <section className="mb-700 grid gap-400 sm:grid-cols-2 lg:grid-cols-6">
                    <article className="signal-surface flex flex-col justify-between rounded-2xl border p-500 sm:col-span-2 lg:col-span-2">
                        <div className="flex items-start justify-between gap-400">
                            <div>
                                <p className="text-200 font-semibold uppercase leading-200 tracking-wider text-muted-foreground">
                                    Rollout success rate
                                </p>
                                {successRate === undefined ? (
                                    <div className="skeleton-shimmer mt-400 h-800 w-48 rounded-xl" />
                                ) : (
                                    <p className="metric-value mt-300 text-hero-900 font-semibold leading-hero-900 text-brand-foreground">
                                        {formatPercent(successRate)}
                                    </p>
                                )}
                            </div>
                            <div className="flex size-700 items-center justify-center rounded-xl bg-success/10 text-success">
                                <CheckCircle2 className="icon-size-300" aria-hidden="true" />
                            </div>
                        </div>
                        <p className="mt-400 text-200 leading-200 text-muted-foreground">
                            {formatCount(successfulRollouts) ?? "—"} successful of{" "}
                            {formatCount(rolloutAttempts) ?? "—"} attempts
                        </p>
                    </article>
                    <MetricCard
                        label="Failed rollouts"
                        value={formatCount(failedRollouts)}
                        detail="Report scope"
                        icon={ShieldAlert}
                        tone="destructive"
                    />
                    <MetricCard
                        label="Awaiting mitigation"
                        value={formatCount(awaitingMitigation)}
                        detail="Degraded and in flight"
                        icon={Clock3}
                        tone="warning"
                    />
                    <MetricCard
                        label="Freshness breaches"
                        value={formatCount(freshnessBreaches)}
                        detail="Beyond environment SLA"
                        icon={AlertTriangle}
                        tone="warning"
                    />
                    <MetricCard
                        label="Step failure rate"
                        value={formatPercent(stepFailureRate)}
                        detail={`${formatCount(stepFailures) ?? "—"} failed steps`}
                        icon={Workflow}
                        tone="info"
                    />
                </section>

                {summaryError && (
                    <div
                        role="alert"
                        className="mb-500 flex items-start gap-300 rounded-xl border border-destructive/40 bg-destructive/10 p-400 text-300 text-destructive"
                    >
                        <AlertTriangle className="icon-size-300 shrink-0" aria-hidden="true" />
                        <p>
                            Summary metrics couldn't load: {summaryError}
                        </p>
                    </div>
                )}

                <section id="overview" className="scroll-mt-24">
                    <div className="mb-400 flex items-end justify-between gap-400 border-b pb-300">
                        <div>
                            <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">
                                Power BI page
                            </p>
                            <h2 className="mt-100 font-heading text-600 font-semibold leading-600">
                                Overview
                            </h2>
                        </div>
                        <span className="text-200 text-muted-foreground">9 visuals</span>
                    </div>

                    <div className="grid gap-500 lg:grid-cols-12">
                        <div className="h-chart-sm lg:col-span-4">
                            <SemanticChart
                                config={rolloutAttemptsByDate()}
                                title="Rollout Attempts by date"
                                subtitle="Daily rollout attempts"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                capabilities={denseDateCapabilities}
                            />
                        </div>
                        <div className="h-chart-sm lg:col-span-4">
                            <SemanticChart
                                config={rolloutSuccessRateByDate()}
                                title="Rollout Success Rate by date"
                                subtitle="Daily successful rollouts divided by rollout attempts"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                capabilities={denseDateCapabilities}
                            />
                        </div>
                        <div className="h-chart-sm lg:col-span-4">
                            <SemanticChart
                                config={successfulAndFailedRolloutsByDate()}
                                title="Successful Rollouts and Failed Rollouts by date"
                                subtitle="Daily successful and failed rollout counts"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                capabilities={denseDateCapabilities}
                            />
                        </div>

                        <div className="h-chart-series lg:col-span-12">
                            <SemanticChart
                                config={successfulRolloutsByServiceGroup()}
                                title="Successful Rollouts by Service Group"
                                subtitle="Daily successful rollouts with service group color legend"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                            />
                        </div>
                        <div className="h-chart-series lg:col-span-12">
                            <SemanticChart
                                config={failedRolloutsByServiceGroup()}
                                title="Failed Rollouts by Service Group"
                                subtitle="Daily failed rollouts with service group color legend"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                            />
                        </div>

                        <div className="h-chart-md lg:col-span-6">
                            <SemanticChart
                                config={deployedEnvironment()}
                                title="Deployed Environment"
                                subtitle="Successful rollouts by deployment environment"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                            />
                        </div>
                        <div className="h-chart-md lg:col-span-6">
                            <SemanticChart
                                config={rolloutSuccessByState()}
                                title="Success?"
                                subtitle="Daily rollout count by success state"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                            />
                        </div>

                        <div className="h-matrix-xl lg:col-span-12">
                            <SemanticMatrix
                                config={versionsBehindByRegion()}
                                title="Versions behind by region"
                                subtitle="Service group and rollout infrastructure by region"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                rowFields={versionsMatrixRows}
                                columnField="Region"
                                valueField="AverageVersionsBehind"
                                legendTitle="Average versions behind"
                            />
                        </div>

                        <div className="h-matrix-lg lg:col-span-12">
                            <SemanticMatrix
                                config={daysSinceLastSuccessfulDeployment()}
                                title="Days since last successful deployment"
                                subtitle="Service group by environment"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                rowFields={deploymentAgeMatrixRows}
                                columnField="Environment"
                                valueField="DaysSinceLastSuccessfulDeployment"
                                legendTitle="Days since last success"
                            />
                        </div>
                    </div>
                </section>

                <section id="failures" className="mt-800 scroll-mt-24">
                    <div className="mb-400 flex items-end justify-between gap-400 border-b pb-300">
                        <div>
                            <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">
                                Power BI page
                            </p>
                            <h2 className="mt-100 font-heading text-600 font-semibold leading-600">
                                Failures
                            </h2>
                        </div>
                        <span className="text-200 text-muted-foreground">5 visuals</span>
                    </div>

                    <div className="grid gap-500 lg:grid-cols-12">
                        <div className="h-chart-md lg:col-span-6">
                            <SemanticChart
                                config={stepRunsAndFailuresByDate()}
                                title="Step Runs and Step Failures by date"
                                subtitle="Daily deployment step runs and failures"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                capabilities={denseDateCapabilities}
                            />
                        </div>
                        <div className="h-chart-md lg:col-span-6">
                            <SemanticChart
                                config={icmsOpenedByDate()}
                                title="ICMs Opened by date"
                                subtitle="Daily ICMs opened"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                capabilities={denseDateCapabilities}
                            />
                        </div>

                        <div className="h-chart-series lg:col-span-12">
                            <SemanticChart
                                config={failedDeploymentStepsByServiceGroup()}
                                title="Failed deployment steps per day, by service group"
                                subtitle="Daily step failures with service group color legend"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                            />
                        </div>

                        <div className="h-grid-xl lg:col-span-12">
                            <SemanticTable
                                config={stalenessLeaderboard()}
                                title="Staleness leaderboard - worst service group and cloud pairs"
                                subtitle="Sorted by days since last successful deployment"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                columns={stalenessColumns}
                                pageSize={10}
                            />
                        </div>

                        <div className="h-grid-lg lg:col-span-12">
                            <SemanticTable
                                config={deploymentStepsByFailure()}
                                title="Most failure-prone deployment steps"
                                subtitle="Deployment step, service group, duration, runs, failures, and failure rate"
                                refreshKey={refreshKey}
                                onInteraction={handleInteraction}
                                columns={failureStepColumns}
                                pageSize={10}
                            />
                        </div>
                    </div>
                </section>

                <footer className="mt-700 flex flex-col gap-300 border-t pt-500 text-200 leading-200 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        Data source: Release Health semantic model · Service-group filter matches the Release Health 360 report.
                    </p>
                    <div className="flex items-center gap-200">
                        <CheckCircle2 className="icon-size-200 text-success" aria-hidden="true" />
                        <span>Latest model date: {latestDataDate ?? "loading"}</span>
                        <Layers3 className="ml-200 icon-size-200" aria-hidden="true" />
                        <span>
                            {formatDecimal(averageVersionsBehind) ?? "—"} avg versions behind
                        </span>
                    </div>
                </footer>
            </main>
        </div>
    );
}
