import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./regional-version-drift.dax?raw";
import spec from "./regional-version-drift.json";

const connection = "releaseHealth";

export const regionalVersionDriftColumnMetadata: ColumnMetadataMap = {
    "Regional Deployment[region]": {
        name: "Region",
        displayName: "Region",
    },
    "[Average Versions Behind]": {
        name: "AverageVersionsBehind",
        displayName: "Average versions behind",
        format: "#,0.00",
    },
    "[Worst Versions Behind]": {
        name: "WorstVersionsBehind",
        displayName: "Worst versions behind",
        format: "#,0",
    },
    "[Drifted Deployments]": {
        name: "DriftedDeployments",
        displayName: "Drifted deployments",
        format: "#,0",
    },
};

export function regionalVersionDrift() {
    return {
        connection,
        query,
        columnMetadata: regionalVersionDriftColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
