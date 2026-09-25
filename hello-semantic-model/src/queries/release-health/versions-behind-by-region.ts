import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./versions-behind-by-region.dax?raw";
import spec from "./versions-behind-by-region.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const versionsBehindByRegionColumnMetadata: ColumnMetadataMap = {
    "Service Group[service_group_short]": {
        name: "ServiceGroup",
        displayName: "Service group",
    },
    "Regional Deployment[rollout_infra]": {
        name: "RolloutInfrastructure",
        displayName: "Rollout infrastructure",
    },
    "Regional Deployment[region]": {
        name: "Region",
        displayName: "Region",
    },
    "[Average Versions Behind]": {
        name: "AverageVersionsBehind",
        displayName: "Average versions behind",
        format: "#,0.00",
    },
};

export function versionsBehindByRegion() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: versionsBehindByRegionColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
