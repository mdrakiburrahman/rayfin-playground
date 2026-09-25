import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./release-summary.dax?raw";
import spec from "./release-summary.json";

const connection = "releaseHealth";

export const releaseSummaryColumnMetadata: ColumnMetadataMap = {
    "[Latest Data Date]": {
        name: "LatestDataDate",
        displayName: "Latest data date",
        format: "mmm d, yyyy",
    },
    "[Rollout Attempts]": {
        name: "RolloutAttempts",
        displayName: "Rollout attempts",
        format: "#,0",
    },
    "[Successful Rollouts]": {
        name: "SuccessfulRollouts",
        displayName: "Successful rollouts",
        format: "#,0",
    },
    "[Failed Rollouts]": {
        name: "FailedRollouts",
        displayName: "Failed rollouts",
        format: "#,0",
    },
    "[Rollout Success Rate]": {
        name: "RolloutSuccessRate",
        displayName: "Rollout success rate",
        format: "0.0%;-0.0%;0.0%",
    },
    "[Rollouts In Flight]": {
        name: "RolloutsInFlight",
        displayName: "Rollouts in flight",
        format: "#,0",
    },
    "[Rollouts Awaiting Mitigation]": {
        name: "RolloutsAwaitingMitigation",
        displayName: "Awaiting mitigation",
        format: "#,0",
    },
    "[Step Failures]": {
        name: "StepFailures",
        displayName: "Step failures",
        format: "#,0",
    },
    "[Step Failure Rate]": {
        name: "StepFailureRate",
        displayName: "Step failure rate",
        format: "0.0%;-0.0%;0.0%",
    },
    "[Deployment Freshness Breaches]": {
        name: "DeploymentFreshnessBreaches",
        displayName: "Freshness breaches",
        format: "#,0",
    },
    "[Average Versions Behind]": {
        name: "AverageVersionsBehind",
        displayName: "Average versions behind",
        format: "#,0.00",
    },
    "[ICMs Opened]": {
        name: "ICMsOpened",
        displayName: "ICMs opened",
        format: "#,0",
    },
};

export function releaseSummary() {
    return {
        connection,
        query,
        columnMetadata: releaseSummaryColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
