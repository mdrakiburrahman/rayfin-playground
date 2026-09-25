import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./rollout-success-by-state.dax?raw";
import spec from "./rollout-success-by-state.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const rolloutSuccessByStateColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "Rollout State[is_success]": {
        name: "IsSuccess",
        displayName: "Success",
    },
    "[Daily Rollout Count]": {
        name: "DailyRolloutCount",
        displayName: "Daily rollout count",
        format: "#,0",
    },
};

export function rolloutSuccessByState() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: rolloutSuccessByStateColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
