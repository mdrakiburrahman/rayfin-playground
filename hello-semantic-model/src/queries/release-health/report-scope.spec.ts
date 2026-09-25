import { describe, expect, it } from "vitest";

import { withReportScope } from "./report-scope";

describe("withReportScope", () => {
    it("replaces the report marker with the exact service-group filter", () => {
        const query = withReportScope(`
EVALUATE
SUMMARIZECOLUMNS(
    'Date'[date],
    /* REPORT_FILTER */
    "Rollout Attempts", [Rollout Attempts]
)`);

        expect(query).not.toContain("REPORT_FILTER");
        expect(query).toContain("Microsoft.Azure.HybridData.AdxProxy");
        expect(query).toContain("Microsoft.Azure.HybridData.UsageProcessing");
        expect(query).toContain("'Service Group'[service_group]");
    });

    it("fails explicitly when a query omits the marker", () => {
        expect(() => withReportScope("EVALUATE ROW(\"test\", 1)")).toThrow(
            "missing the report filter marker",
        );
    });
});
