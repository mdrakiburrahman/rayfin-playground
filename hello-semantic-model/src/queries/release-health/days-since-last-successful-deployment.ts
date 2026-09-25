import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./days-since-last-successful-deployment.dax?raw";
import spec from "./days-since-last-successful-deployment.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const daysSinceLastSuccessfulDeploymentColumnMetadata: ColumnMetadataMap = {
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "Deployment Environment[environment_name]": {
        name: "Environment",
        displayName: "Environment",
    },
    "[Days Since Last Successful Deployment]": {
        name: "DaysSinceLastSuccessfulDeployment",
        displayName: "Days since last successful deployment",
        format: "#,0",
    },
};

export function daysSinceLastSuccessfulDeployment() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: daysSinceLastSuccessfulDeploymentColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
