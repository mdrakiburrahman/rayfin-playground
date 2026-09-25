import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./rollout-success-rate-by-date.dax?raw";
import spec from "./rollout-success-rate-by-date.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const rolloutSuccessRateByDateColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "[Rollout Success Rate]": {
        name: "RolloutSuccessRate",
        displayName: "Rollout success rate",
        format: "0.0%;-0.0%;0.0%",
    },
};

export function rolloutSuccessRateByDate() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: rolloutSuccessRateByDateColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
