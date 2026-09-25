import type { DataTable } from "@microsoft/fabric-visuals-core";
import { describe, expect, it } from "vitest";

import {
    getMatrixHeatLevel,
    getMatrixRowSpan,
    pivotDataTable,
} from "@/lib/pivot-matrix";

const versionsTable: DataTable = {
    columns: [
        { name: "ServiceGroup", displayName: "Service group" },
        { name: "RolloutInfrastructure", displayName: "Rollout infrastructure" },
        { name: "Region", displayName: "Region" },
        {
            name: "AverageVersionsBehind",
            displayName: "Average versions behind",
            format: "#,0.00",
        },
    ],
    rows: [
        ["AdxProxy", "Fairfax", "southcentralus", 3],
        ["AdxProxy", "Fairfax", "westus", 1],
        ["AdxProxy", "Prod", "southcentralus", 5],
        ["RegionalCore", "Prod", "westus", 0],
    ],
};

describe("pivotDataTable", () => {
    it("pivots real query-shaped rows into matrix columns and hierarchy rows", () => {
        const result = pivotDataTable(versionsTable, {
            rowFields: [
                { field: "ServiceGroup", displayName: "Service group" },
                {
                    field: "RolloutInfrastructure",
                    displayName: "Rollout infrastructure",
                },
            ],
            columnField: "Region",
            valueField: "AverageVersionsBehind",
        });

        expect(result.columns).toEqual(["southcentralus", "westus"]);
        expect(result.rows).toHaveLength(3);
        expect(result.rows[0]?.values.get("southcentralus")).toBe(3);
        expect(result.minValue).toBe(0);
        expect(result.maxValue).toBe(5);
        expect(result.valueFormat).toBe("#,0.00");
    });

    it("rejects duplicate matrix cells", () => {
        const duplicateTable: DataTable = {
            ...versionsTable,
            rows: [...versionsTable.rows, versionsTable.rows[0]!],
        };

        expect(() =>
            pivotDataTable(duplicateTable, {
                rowFields: [
                    { field: "ServiceGroup", displayName: "Service group" },
                ],
                columnField: "Region",
                valueField: "AverageVersionsBehind",
            }),
        ).toThrow("duplicate values");
    });
});

describe("matrix presentation helpers", () => {
    it("assigns stable heat levels across a numeric range", () => {
        expect(getMatrixHeatLevel(0, 0, 10)).toBe(0);
        expect(getMatrixHeatLevel(1, 0, 10)).toBe(1);
        expect(getMatrixHeatLevel(5, 0, 10)).toBe(3);
        expect(getMatrixHeatLevel(10, 0, 10)).toBe(5);
    });

    it("computes merged hierarchy row spans", () => {
        const result = pivotDataTable(versionsTable, {
            rowFields: [
                { field: "ServiceGroup", displayName: "Service group" },
                {
                    field: "RolloutInfrastructure",
                    displayName: "Rollout infrastructure",
                },
            ],
            columnField: "Region",
            valueField: "AverageVersionsBehind",
        });

        expect(getMatrixRowSpan(result.rows, 0, 0)).toBe(2);
        expect(getMatrixRowSpan(result.rows, 1, 0)).toBe(0);
        expect(getMatrixRowSpan(result.rows, 2, 0)).toBe(1);
    });
});
