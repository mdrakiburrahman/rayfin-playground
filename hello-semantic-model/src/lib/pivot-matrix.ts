import type { DataTable } from "@microsoft/fabric-visuals-core";

export interface MatrixRowDefinition {
    field: string;
    displayName: string;
}

export interface PivotMatrixRow {
    key: string;
    headers: string[];
    values: Map<string, number | null>;
}

export interface PivotMatrixResult {
    columns: string[];
    rows: PivotMatrixRow[];
    minValue: number;
    maxValue: number;
    valueFormat?: string;
}

export interface PivotMatrixOptions {
    rowFields: readonly MatrixRowDefinition[];
    columnField: string;
    valueField: string;
}

function requireColumnIndex(table: DataTable, field: string): number {
    const index = table.columns.findIndex((column) => column.name === field);
    if (index === -1) {
        throw new Error(`Matrix field "${field}" was not found.`);
    }
    return index;
}

export function pivotDataTable(
    table: DataTable,
    options: PivotMatrixOptions,
): PivotMatrixResult {
    if (options.rowFields.length === 0) {
        throw new Error("A matrix requires at least one row field.");
    }

    const rowIndexes = options.rowFields.map(({ field }) =>
        requireColumnIndex(table, field),
    );
    const columnIndex = requireColumnIndex(table, options.columnField);
    const valueIndex = requireColumnIndex(table, options.valueField);
    const columnValues = new Set<string>();
    const rowsByKey = new Map<string, PivotMatrixRow>();
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;

    for (const sourceRow of table.rows) {
        const headers = rowIndexes.map((index) => String(sourceRow[index] ?? ""));
        const columnValue = String(sourceRow[columnIndex] ?? "");
        if (!columnValue) continue;

        const rawValue = sourceRow[valueIndex];
        const value =
            typeof rawValue === "number" && Number.isFinite(rawValue)
                ? rawValue
                : null;
        const rowKey = JSON.stringify(headers);
        const matrixRow = rowsByKey.get(rowKey) ?? {
            key: rowKey,
            headers,
            values: new Map<string, number | null>(),
        };

        if (matrixRow.values.has(columnValue)) {
            throw new Error(
                `Matrix cell "${headers.join(" / ")}" × "${columnValue}" has duplicate values.`,
            );
        }

        matrixRow.values.set(columnValue, value);
        rowsByKey.set(rowKey, matrixRow);
        columnValues.add(columnValue);

        if (value !== null) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
        }
    }

    const hasValues = Number.isFinite(minValue) && Number.isFinite(maxValue);
    const valueFormat = table.columns[valueIndex]?.format;

    return {
        columns: [...columnValues].sort((left, right) =>
            left.localeCompare(right, undefined, { sensitivity: "base" }),
        ),
        rows: [...rowsByKey.values()],
        minValue: hasValues ? minValue : 0,
        maxValue: hasValues ? maxValue : 0,
        valueFormat,
    };
}

export function getMatrixHeatLevel(
    value: number,
    minValue: number,
    maxValue: number,
): 0 | 1 | 2 | 3 | 4 | 5 {
    if (value === 0 && minValue === 0) return 0;
    if (maxValue <= minValue) return value > 0 ? 3 : 0;

    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio <= 0.2) return 1;
    if (ratio <= 0.4) return 2;
    if (ratio <= 0.6) return 3;
    if (ratio <= 0.8) return 4;
    return 5;
}

export function getMatrixRowSpan(
    rows: readonly PivotMatrixRow[],
    rowIndex: number,
    headerIndex: number,
): number {
    const row = rows[rowIndex];
    if (!row) return 0;

    const matchesThroughHeader = (
        candidate: PivotMatrixRow,
        reference: PivotMatrixRow,
    ) =>
        reference.headers
            .slice(0, headerIndex + 1)
            .every((value, index) => candidate.headers[index] === value);

    const previous = rows[rowIndex - 1];
    if (previous && matchesThroughHeader(previous, row)) {
        return 0;
    }

    let span = 1;
    for (let index = rowIndex + 1; index < rows.length; index += 1) {
        const candidate = rows[index];
        if (!candidate || !matchesThroughHeader(candidate, row)) break;
        span += 1;
    }
    return span;
}
