import reportScopeFilter from "./report-scope-filter.dax?raw";

const reportFilterMarker = "/* REPORT_FILTER */";

export function withReportScope(baseQuery: string): string {
    if (!baseQuery.includes(reportFilterMarker)) {
        throw new Error("The DAX query is missing the report filter marker.");
    }

    return baseQuery.replace(
        reportFilterMarker,
        `${reportScopeFilter.trim()},`,
    );
}
