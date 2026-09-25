import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./deployed-environment.dax?raw";
import spec from "./deployed-environment.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const deployedEnvironmentColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "Deployment Environment[environment]": {
        name: "Environment",
        displayName: "Environment",
    },
    "[Successful Rollouts]": {
        name: "SuccessfulRollouts",
        displayName: "Successful rollouts",
        format: "#,0",
    },
};

export function deployedEnvironment() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: deployedEnvironmentColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
