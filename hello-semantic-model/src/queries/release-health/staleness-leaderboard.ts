import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./staleness-leaderboard.dax?raw";
import spec from "./staleness-leaderboard.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const stalenessLeaderboardColumnMetadata: ColumnMetadataMap = {
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "Deployment Freshness[environment]": {
        name: "Environment",
        displayName: "Environment",
    },
    "Service Group[primary_owner_alias]": {
        name: "EngineeringManager",
        displayName: "Engineering manager",
    },
    "Deployment Freshness[last_success_rollout_url]": {
        name: "LastSuccessfulRollout",
        displayName: "Last successful rollout",
    },
    "[Days Since Last Successful Deployment]": {
        name: "DaysSinceLastSuccessfulDeployment",
        displayName: "Days since last successful deployment",
        format: "#,0",
    },
    "[Rollout Attempts]": {
        name: "RolloutAttempts",
        displayName: "Rollout attempts",
        format: "#,0",
    },
    "[Rollout Success Rate]": {
        name: "RolloutSuccessRate",
        displayName: "Rollout success rate",
        format: "0.0%;-0.0%;0.0%",
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
};

export function stalenessLeaderboard() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: stalenessLeaderboardColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
