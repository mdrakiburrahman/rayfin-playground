import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import baseQuery from "./icms-opened-by-date.dax?raw";
import spec from "./icms-opened-by-date.json";
import { withReportScope } from "./report-scope";

const connection = "releaseHealth";

export const icmsOpenedByDateColumnMetadata: ColumnMetadataMap = {
    "Date[date]": {
        name: "Date",
        displayName: "Date",
        format: "mm/dd/yyyy",
    },
    "[ICMs Opened]": {
        name: "ICMsOpened",
        displayName: "ICMs opened",
        format: "#,0",
    },
};

export function icmsOpenedByDate() {
    return {
        connection,
        query: withReportScope(baseQuery),
        columnMetadata: icmsOpenedByDateColumnMetadata,
        vegaLiteSpec: spec as VisualizationSpec,
    };
}
