import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./rollout-trend.dax?raw";
import spec from "./rollout-trend.json";

const connection = "releaseHealth";

export const rolloutTrendColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
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
};

export function rolloutTrend() {
    return {
        connection,
        query,
        columnMetadata: rolloutTrendColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
