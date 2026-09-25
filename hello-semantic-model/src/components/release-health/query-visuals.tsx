import { useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    DatabaseZap,
} from "lucide-react";
import {
    DataGrid,
    type GridColumnDef,
    type SortConfig,
} from "@microsoft/fabric-datagrid";
import {
    VegaVisual,
    type VegaVisualCapabilities,
    type VisualizationSpec,
} from "@microsoft/fabric-visuals";
import {
    convertDataTableToRows,
    formatValue,
    type InteractionEvent,
} from "@microsoft/fabric-visuals-core";
import { VisualContainer } from "@microsoft/fabric-visuals-extensibility";

import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { useThemeContext } from "@/hooks/theme.context";
import {
    getMatrixHeatLevel,
    getMatrixRowSpan,
    pivotDataTable,
    type MatrixRowDefinition,
} from "@/lib/pivot-matrix";
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { reorderDataTable, toDataTable } from "@/lib/to-data-table";
import { cn } from "@/lib/utils";

export interface QueryVisualConfig {
    connection: string;
    query: string;
    columnMetadata: ColumnMetadataMap;
    vegaLiteSpec: VisualizationSpec;
}

interface SharedVisualProps {
    config: QueryVisualConfig;
    title: string;
    subtitle: string;
    className?: string;
    refreshKey: number;
    onInteraction: (source: string, events: InteractionEvent[]) => void;
}

interface SemanticGridProps extends SharedVisualProps {
    columns?: GridColumnDef[];
    defaultSort?: SortConfig[];
    pageSize?: number;
}

interface SemanticChartProps extends SharedVisualProps {
    capabilities?: VegaVisualCapabilities;
}

interface SemanticMatrixProps extends SharedVisualProps {
    rowFields: readonly MatrixRowDefinition[];
    columnField: string;
    valueField: string;
    legendTitle: string;
}

export interface SemanticTableColumn {
    field: string;
    header: string;
    wrap?: boolean;
    linkLabel?: string;
}

interface SemanticTableProps extends SharedVisualProps {
    columns: readonly SemanticTableColumn[];
    pageSize?: number;
}

const matrixHeatClasses = [
    "matrix-heat-0",
    "matrix-heat-1",
    "matrix-heat-2",
    "matrix-heat-3",
    "matrix-heat-4",
    "matrix-heat-5",
] as const;

function PanelSkeleton({
    title,
    subtitle,
    className,
}: Pick<SharedVisualProps, "title" | "subtitle" | "className">) {
    return (
        <section
            aria-label={`Loading ${title}`}
            className={cn(
                "signal-surface flex h-full flex-col rounded-2xl border p-500",
                className,
            )}
        >
            <div className="mb-500 space-y-200">
                <div className="skeleton-shimmer h-400 w-1/3 rounded-lg" />
                <div className="skeleton-shimmer h-300 w-1/2 rounded-lg" />
                <span className="sr-only">{subtitle}</span>
            </div>
            <div className="skeleton-shimmer min-h-0 flex-1 rounded-xl" />
        </section>
    );
}

function PanelMessage({
    title,
    message,
    isError,
    className,
}: {
    title: string;
    message: string;
    isError?: boolean;
    className?: string;
}) {
    const Icon = isError ? AlertTriangle : DatabaseZap;

    return (
        <section
            role={isError ? "alert" : "status"}
            className={cn(
                "signal-surface flex h-full flex-col items-center justify-center rounded-2xl border p-600 text-center",
                className,
            )}
        >
            <div
                className={cn(
                    "mb-400 flex size-700 items-center justify-center rounded-full",
                    isError
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent text-accent-foreground",
                )}
            >
                <Icon className="icon-size-400" aria-hidden="true" />
            </div>
            <h2 className="text-400 font-semibold leading-400">{title}</h2>
            <p className="mt-200 max-w-xl text-300 leading-300 text-muted-foreground">
                {message}
            </p>
        </section>
    );
}

function getErrorMessage(
    result: ReturnType<typeof useSemanticModelQuery>,
): string | undefined {
    if (result.error) return result.error.message;
    if (result.data?.status === "error") return result.data.error.message;
    return undefined;
}

export function SemanticChart({
    config,
    title,
    subtitle,
    className,
    refreshKey,
    onInteraction,
    capabilities,
}: SemanticChartProps) {
    const { theme } = useThemeContext();
    const result = useSemanticModelQuery({
        connection: config.connection,
        query: config.query,
        refreshKey,
    });

    if (result.isLoading) {
        return <PanelSkeleton title={title} subtitle={subtitle} className={className} />;
    }

    const errorMessage = getErrorMessage(result);
    if (errorMessage) {
        return (
            <PanelMessage
                title={`${title} couldn't load`}
                message={errorMessage}
                isError
                className={className}
            />
        );
    }

    if (result.data?.status !== "success" || result.data.table.rows.length === 0) {
        return (
            <PanelMessage
                title={title}
                message="No data is available for the report's scoped service groups."
                className={className}
            />
        );
    }

    const dataTable = toDataTable(result.data.table, config.columnMetadata);

    return (
        <section className={cn("h-full min-h-0", className)}>
            <VegaVisual
                spec={config.vegaLiteSpec}
                data={dataTable}
                theme={theme}
                style={{ height: "100%" }}
                header={{ title, subtitle }}
                onInteraction={(events) => onInteraction(title, events)}
                capabilities={{
                    disableLegendScroll: false,
                    ...capabilities,
                }}
                visualContainerCapabilities={{ allowCopyVisual: false }}
                containerClassName="signal-surface h-full rounded-2xl border"
            />
        </section>
    );
}

export function SemanticGrid({
    config,
    title,
    subtitle,
    className,
    refreshKey,
    onInteraction,
    columns,
    defaultSort,
    pageSize,
}: SemanticGridProps) {
    const { theme } = useThemeContext();
    const result = useSemanticModelQuery({
        connection: config.connection,
        query: config.query,
        refreshKey,
    });

    if (result.isLoading) {
        return <PanelSkeleton title={title} subtitle={subtitle} className={className} />;
    }

    const errorMessage = getErrorMessage(result);
    if (errorMessage) {
        return (
            <PanelMessage
                title={`${title} couldn't load`}
                message={errorMessage}
                isError
                className={className}
            />
        );
    }

    if (result.data?.status !== "success" || result.data.table.rows.length === 0) {
        return (
            <PanelMessage
                title={title}
                message="No rows are available for the report's scoped service groups."
                className={className}
            />
        );
    }

    const dataTable = toDataTable(result.data.table, config.columnMetadata);
    const gridData = columns
        ? reorderDataTable(
              dataTable,
              columns.map((column) => column.id),
          )
        : dataTable;

    return (
        <section className={cn("h-full min-h-0", className)}>
            <DataGrid
                data={gridData}
                columns={columns}
                defaultSort={defaultSort}
                pageSize={pageSize}
                theme={theme}
                header={{ title, subtitle }}
                onInteraction={(events) => onInteraction(title, events)}
                visualContainerCapabilities={{ allowCopyVisual: false }}
                containerClassName="signal-surface h-full rounded-2xl border"
            />
        </section>
    );
}

function formatMatrixValue(value: number, format: string | undefined): string {
    const formatted = formatValue(value, format);
    return typeof formatted === "string" || typeof formatted === "number"
        ? String(formatted)
        : String(value);
}

export function SemanticMatrix({
    config,
    title,
    subtitle,
    className,
    refreshKey,
    onInteraction,
    rowFields,
    columnField,
    valueField,
    legendTitle,
}: SemanticMatrixProps) {
    const [selectedCell, setSelectedCell] = useState<string>();
    const [focusedCell, setFocusedCell] = useState<string>();
    const result = useSemanticModelQuery({
        connection: config.connection,
        query: config.query,
        refreshKey,
    });
    const matrixState = useMemo(() => {
        if (result.data?.status !== "success") {
            return {};
        }

        try {
            const dataTable = toDataTable(
                result.data.table,
                config.columnMetadata,
            );
            return {
                matrix: pivotDataTable(dataTable, {
                    rowFields,
                    columnField,
                    valueField,
                }),
            };
        } catch (error) {
            return {
                matrixError:
                    error instanceof Error ? error.message : String(error),
            };
        }
    }, [
        columnField,
        config.columnMetadata,
        result.data,
        rowFields,
        valueField,
    ]);

    if (result.isLoading) {
        return <PanelSkeleton title={title} subtitle={subtitle} className={className} />;
    }

    const errorMessage = getErrorMessage(result) ?? matrixState.matrixError;
    if (errorMessage) {
        return (
            <PanelMessage
                title={`${title} couldn't load`}
                message={errorMessage}
                isError
                className={className}
            />
        );
    }

    const matrix = matrixState.matrix;
    if (!matrix || matrix.rows.length === 0 || matrix.columns.length === 0) {
        return (
            <PanelMessage
                title={title}
                message="No matrix values are available for the report's scoped service groups."
                className={className}
            />
        );
    }

    const minLabel = formatMatrixValue(matrix.minValue, matrix.valueFormat);
    const maxLabel = formatMatrixValue(matrix.maxValue, matrix.valueFormat);
    let firstInteractiveCell: string | undefined;
    for (const row of matrix.rows) {
        const firstColumn = matrix.columns.find(
            (column) => row.values.get(column) !== null &&
                row.values.get(column) !== undefined,
        );
        if (firstColumn) {
            firstInteractiveCell = `${row.key}:${firstColumn}`;
            break;
        }
    }

    const handleCellSelection = (
        rowKey: string,
        rowHeaders: string[],
        column: string,
    ) => {
        const cellKey = `${rowKey}:${column}`;
        if (selectedCell === cellKey) {
            setSelectedCell(undefined);
            onInteraction(title, [{ action: "clear" }]);
            return;
        }

        setSelectedCell(cellKey);
        onInteraction(title, [
            {
                action: "select",
                selections: [
                    {
                        predicates: [
                            ...rowFields.map((definition, index) => ({
                                type: "set" as const,
                                name: definition.field,
                                values: [rowHeaders[index]],
                            })),
                            {
                                type: "set" as const,
                                name: columnField,
                                values: [column],
                            },
                        ],
                    },
                ],
            },
        ]);
    };

    const handleCellKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        rowIndex: number,
        columnIndex: number,
    ) => {
        const movementByKey: Record<string, readonly [number, number]> = {
            ArrowUp: [-1, 0],
            ArrowDown: [1, 0],
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1],
        };
        const movement = movementByKey[event.key];
        if (!movement) return;

        event.preventDefault();
        const [rowDelta, columnDelta] = movement;
        let nextRowIndex = rowIndex + rowDelta;
        let nextColumnIndex = columnIndex + columnDelta;

        while (
            nextRowIndex >= 0 &&
            nextRowIndex < matrix.rows.length &&
            nextColumnIndex >= 0 &&
            nextColumnIndex < matrix.columns.length
        ) {
            const nextRow = matrix.rows[nextRowIndex];
            const nextColumn = matrix.columns[nextColumnIndex];
            if (
                nextRow &&
                nextColumn &&
                nextRow.values.get(nextColumn) !== null &&
                nextRow.values.get(nextColumn) !== undefined
            ) {
                const table = event.currentTarget.closest("table");
                const nextButton = table?.querySelector<HTMLButtonElement>(
                    `[data-matrix-row-index="${nextRowIndex}"][data-matrix-column-index="${nextColumnIndex}"]`,
                );
                nextButton?.focus();
                return;
            }

            nextRowIndex += rowDelta;
            nextColumnIndex += columnDelta;
        }
    };

    return (
        <section className={cn("h-full min-h-0", className)}>
            <VisualContainer
                header={{ title, subtitle }}
                className="signal-surface h-full rounded-2xl border"
            >
                <div className="matrix-panel">
                    <div className="matrix-toolbar">
                        <div className="matrix-legend" aria-label={`${legendTitle} legend`}>
                            <span className="font-semibold text-foreground">
                                {legendTitle}
                            </span>
                            <span>Lower</span>
                            <div className="matrix-legend-scale" aria-hidden="true">
                                {matrixHeatClasses.slice(1).map((heatClass) => (
                                    <span
                                        key={heatClass}
                                        className={cn("matrix-legend-swatch", heatClass)}
                                    />
                                ))}
                            </div>
                            <span>Higher</span>
                            <span className="font-numeric text-foreground">
                                {minLabel}–{maxLabel}
                            </span>
                        </div>
                        <span className="text-200 text-muted-foreground">
                            {matrix.rows.length} rows · {matrix.columns.length} columns
                        </span>
                    </div>

                    <div className="matrix-scroll">
                        <table className="matrix-table" aria-label={title}>
                            <thead>
                                <tr>
                                    {rowFields.map((definition, index) => (
                                        <th
                                            key={definition.field}
                                            scope="col"
                                            className={cn(
                                                "matrix-column-header matrix-row-header matrix-corner-header",
                                                index === 0
                                                    ? "matrix-row-header-primary"
                                                    : "matrix-row-header-secondary",
                                            )}
                                        >
                                            {definition.displayName}
                                        </th>
                                    ))}
                                    {matrix.columns.map((column) => (
                                        <th
                                            key={column}
                                            scope="col"
                                            className="matrix-column-header"
                                            title={column}
                                        >
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {matrix.rows.map((row, rowIndex) => (
                                    <tr key={row.key}>
                                        {rowFields.map((definition, headerIndex) => {
                                            const rowSpan = getMatrixRowSpan(
                                                matrix.rows,
                                                rowIndex,
                                                headerIndex,
                                            );
                                            if (rowSpan === 0) return null;

                                            return (
                                                <th
                                                    key={definition.field}
                                                    rowSpan={rowSpan}
                                                    scope={
                                                        headerIndex === 0
                                                            ? "rowgroup"
                                                            : "row"
                                                    }
                                                    className={cn(
                                                        "matrix-row-header",
                                                        headerIndex === 0
                                                            ? "matrix-row-header-primary"
                                                            : "matrix-row-header-secondary",
                                                    )}
                                                    title={row.headers[headerIndex]}
                                                >
                                                    {row.headers[headerIndex]}
                                                </th>
                                            );
                                        })}
                                        {matrix.columns.map((column, columnIndex) => {
                                            const value = row.values.get(column) ?? null;
                                            if (value === null) {
                                                return (
                                                    <td
                                                        key={column}
                                                        className="matrix-empty-cell"
                                                        aria-label={`${column}: no data`}
                                                    >
                                                        —
                                                    </td>
                                                );
                                            }

                                            const heatLevel = getMatrixHeatLevel(
                                                value,
                                                matrix.minValue,
                                                matrix.maxValue,
                                            );
                                            const cellKey = `${row.key}:${column}`;
                                            const formattedValue = formatMatrixValue(
                                                value,
                                                matrix.valueFormat,
                                            );

                                            return (
                                                <td
                                                    key={column}
                                                    className={matrixHeatClasses[heatLevel]}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleCellSelection(
                                                                row.key,
                                                                row.headers,
                                                                column,
                                                            )
                                                        }
                                                        className={cn(
                                                            "matrix-cell-button",
                                                            selectedCell === cellKey &&
                                                                "matrix-cell-selected",
                                                        )}
                                                        aria-pressed={
                                                            selectedCell === cellKey
                                                        }
                                                        data-matrix-row-index={rowIndex}
                                                        data-matrix-column-index={columnIndex}
                                                        tabIndex={
                                                            focusedCell === cellKey ||
                                                            (!focusedCell &&
                                                                firstInteractiveCell ===
                                                                    cellKey)
                                                                ? 0
                                                                : -1
                                                        }
                                                        onFocus={() =>
                                                            setFocusedCell(cellKey)
                                                        }
                                                        onKeyDown={(event) =>
                                                            handleCellKeyDown(
                                                                event,
                                                                rowIndex,
                                                                columnIndex,
                                                            )
                                                        }
                                                        aria-label={`${row.headers.join(", ")}, ${column}, ${legendTitle}: ${formattedValue}`}
                                                        title={`${column}: ${formattedValue}`}
                                                    >
                                                        {formattedValue}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </VisualContainer>
        </section>
    );
}

export function SemanticTable({
    config,
    title,
    subtitle,
    className,
    refreshKey,
    onInteraction,
    columns,
    pageSize = 10,
}: SemanticTableProps) {
    const [pageIndex, setPageIndex] = useState(0);
    const [selectedRow, setSelectedRow] = useState<string>();
    const result = useSemanticModelQuery({
        connection: config.connection,
        query: config.query,
        refreshKey,
    });

    if (result.isLoading) {
        return <PanelSkeleton title={title} subtitle={subtitle} className={className} />;
    }

    const errorMessage = getErrorMessage(result);
    if (errorMessage) {
        return (
            <PanelMessage
                title={`${title} couldn't load`}
                message={errorMessage}
                isError
                className={className}
            />
        );
    }

    if (result.data?.status !== "success" || result.data.table.rows.length === 0) {
        return (
            <PanelMessage
                title={title}
                message="No rows are available for the report's scoped service groups."
                className={className}
            />
        );
    }

    const dataTable = toDataTable(result.data.table, config.columnMetadata);
    const rowRecords = convertDataTableToRows(dataTable);
    const metadataByName = new Map(
        dataTable.columns.map((column) => [column.name, column]),
    );
    const pageCount = Math.max(1, Math.ceil(rowRecords.length / pageSize));
    const currentPage = Math.min(pageIndex, pageCount - 1);
    const pageRows = rowRecords.slice(
        currentPage * pageSize,
        currentPage * pageSize + pageSize,
    );

    const handleRowSelection = (
        row: Record<string, unknown>,
        rowKey: string,
    ) => {
        if (selectedRow === rowKey) {
            setSelectedRow(undefined);
            onInteraction(title, [{ action: "clear" }]);
            return;
        }

        setSelectedRow(rowKey);
        onInteraction(title, [
            {
                action: "select",
                selections: [
                    {
                        predicates: columns.flatMap((column) => {
                            const value = row[column.field];
                            return typeof value === "string" ||
                                typeof value === "number" ||
                                typeof value === "boolean"
                                ? [
                                      {
                                          type: "set" as const,
                                          name: column.field,
                                          values: [value],
                                      },
                                  ]
                                : [];
                        }),
                    },
                ],
            },
        ]);
    };

    return (
        <section className={cn("h-full min-h-0", className)}>
            <VisualContainer
                header={{ title, subtitle }}
                className="signal-surface h-full rounded-2xl border"
            >
                <div className="report-table-panel">
                    <div className="report-table-scroll">
                        <table className="report-table" aria-label={title}>
                            <thead>
                                <tr>
                                    {columns.map((column) => (
                                        <th key={column.field} scope="col">
                                            {column.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((row, rowIndex) => {
                                    const absoluteIndex =
                                        currentPage * pageSize + rowIndex;
                                    const rowKey = String(absoluteIndex);

                                    return (
                                        <tr
                                            key={rowKey}
                                            tabIndex={0}
                                            aria-selected={
                                                selectedRow === rowKey
                                            }
                                            onClick={() =>
                                                handleRowSelection(row, rowKey)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    event.preventDefault();
                                                    handleRowSelection(
                                                        row,
                                                        rowKey,
                                                    );
                                                }
                                            }}
                                        >
                                            {columns.map((column) => {
                                                const value = row[column.field];
                                                const metadata =
                                                    metadataByName.get(
                                                        column.field,
                                                    );
                                                const formatted = formatValue(
                                                    value,
                                                    metadata?.format,
                                                );
                                                const displayValue =
                                                    formatted === null ||
                                                    formatted === undefined
                                                        ? "—"
                                                        : String(formatted);

                                                return (
                                                    <td
                                                        key={column.field}
                                                        className={cn(
                                                            column.wrap &&
                                                                "report-table-cell-wrap",
                                                        )}
                                                    >
                                                        {column.linkLabel &&
                                                        typeof value ===
                                                            "string" &&
                                                        value.startsWith(
                                                            "https://",
                                                        ) ? (
                                                            <a
                                                                href={value}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={(event) =>
                                                                    event.stopPropagation()
                                                                }
                                                                className="text-brand-foreground underline-offset-4 hover:underline"
                                                            >
                                                                {
                                                                    column.linkLabel
                                                                }
                                                            </a>
                                                        ) : (
                                                            <span
                                                                title={
                                                                    displayValue
                                                                }
                                                            >
                                                                {displayValue}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="report-table-pagination">
                        <span>
                            Page {currentPage + 1} of {pageCount} ·{" "}
                            {rowRecords.length} rows
                        </span>
                        <div className="flex items-center gap-100">
                            <button
                                type="button"
                                onClick={() =>
                                    setPageIndex((page) =>
                                        Math.max(0, page - 1),
                                    )
                                }
                                disabled={currentPage === 0}
                                aria-label="Previous page"
                                className="report-table-page-button"
                            >
                                <ChevronLeft
                                    className="icon-size-200"
                                    aria-hidden="true"
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setPageIndex((page) =>
                                        Math.min(pageCount - 1, page + 1),
                                    )
                                }
                                disabled={currentPage === pageCount - 1}
                                aria-label="Next page"
                                className="report-table-page-button"
                            >
                                <ChevronRight
                                    className="icon-size-200"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </VisualContainer>
        </section>
    );
}
