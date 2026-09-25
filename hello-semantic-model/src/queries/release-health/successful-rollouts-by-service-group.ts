import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./successful-rollouts-by-service-group.dax?raw";
import spec from "./successful-rollouts-by-service-group.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const successfulRolloutsByServiceGroupColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "[Successful Rollouts]": {
        name: "SuccessfulRollouts",
        displayName: "Successful rollouts",
        format: "#,0",
    },
};

export function successfulRolloutsByServiceGroup() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: successfulRolloutsByServiceGroupColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
