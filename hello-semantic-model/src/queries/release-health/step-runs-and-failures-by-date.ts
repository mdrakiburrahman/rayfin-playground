import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./step-runs-and-failures-by-date.dax?raw";
import spec from "./step-runs-and-failures-by-date.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const stepRunsAndFailuresByDateColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "[Step Runs]": {
        name: "StepRuns",
        displayName: "Step runs",
        format: "#,0",
    },
    "[Step Failures]": {
        name: "StepFailures",
        displayName: "Step failures",
        format: "#,0",
    },
};

export function stepRunsAndFailuresByDate() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: stepRunsAndFailuresByDateColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
