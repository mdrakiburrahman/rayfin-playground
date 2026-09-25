import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./failed-rollouts-by-service-group.dax?raw";
import spec from "./failed-rollouts-by-service-group.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const failedRolloutsByServiceGroupColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "[Failed Rollouts]": {
        name: "FailedRollouts",
        displayName: "Failed rollouts",
        format: "#,0",
    },
};

export function failedRolloutsByServiceGroup() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: failedRolloutsByServiceGroupColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
