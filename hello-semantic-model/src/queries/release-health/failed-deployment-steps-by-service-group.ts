import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./failed-deployment-steps-by-service-group.dax?raw";
import spec from "./failed-deployment-steps-by-service-group.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const failedDeploymentStepsByServiceGroupColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "[Step Failures]": {
        name: "StepFailures",
        displayName: "Step failures",
        format: "#,0",
    },
};

export function failedDeploymentStepsByServiceGroup() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: failedDeploymentStepsByServiceGroupColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
