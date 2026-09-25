import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./successful-and-failed-rollouts-by-date.dax?raw";
import spec from "./successful-and-failed-rollouts-by-date.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const successfulAndFailedRolloutsByDateColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
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
};

export function successfulAndFailedRolloutsByDate() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: successfulAndFailedRolloutsByDateColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
