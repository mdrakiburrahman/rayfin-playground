import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./rollout-attempts-by-date.dax?raw";
import spec from "./rollout-attempts-by-date.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const rolloutAttemptsByDateColumnMetadata: ColumnMetadataMap = {
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
};

export function rolloutAttemptsByDate() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: rolloutAttemptsByDateColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
