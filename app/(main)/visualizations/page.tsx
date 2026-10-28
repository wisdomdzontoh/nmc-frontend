"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ApiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { PageCard } from "@/components/layout/PageCard";
import { SectionCard } from "@/components/common/section-card";
import { EmptyState } from "@/components/common/empty-state";
import { InlineNotice } from "@/components/common/inline-notice";
import { Illustration } from "@/components/common/illustration";
import {
  Loader2,
  Download,
  Calendar,
  Building2,
  Layers,
  FileSpreadsheet,
  GripVertical,
  RefreshCw,
  Table2,
} from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import DataSelectionModal, { type DataItem } from "@/components/visualizations/DataSelectionModal";
import VisualizationPeriodModal, {
  type VisualizationPeriodResult,
} from "@/components/visualizations/VisualizationPeriodModal";
import OrgUnitFilterModal from "@/components/visualizations/OrgUnitFilterModal";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PivotRow {
  org_unit_id: number;
  org_unit_name: string;
  period: string;
  data: Record<string, number>;
}

interface PivotResponse {
  meta: {
    period_type: string;
    start_date: string;
    end_date: string;
    org_units: { id: number; name: string; code?: string }[];
    data_elements: { id: number; code: string; name: string }[];
    indicators: { id: number; code: string; name: string }[];
  };
  rows: PivotRow[];
}

type DimId = "data" | "period" | "orgUnit";
type AreaId = "columns" | "rows" | "filter";

// ── Helpers ───────────────────────────────────────────────────────────────────
const DIM_LABELS: Record<DimId, string> = {
  data: "Data",
  period: "Period",
  orgUnit: "Org Unit",
};

const DIM_ROW_HEADER: Record<DimId, string> = {
  data: "Data Element",
  period: "Period",
  orgUnit: "Organisation Unit",
};

const AREA_LABELS: Record<AreaId, string> = {
  columns: "Columns",
  rows: "Rows",
  filter: "Filter",
};

function getDimValue(row: PivotRow, code: string, dim: DimId): string {
  if (dim === "period") return row.period;
  if (dim === "orgUnit") return row.org_unit_name;
  return code; // data
}

/**
 * Builds a pivot matrix from the API response.
 * - colDim:  which dimension appears as table column headers
 * - rowDim:  which dimension appears as table row keys
 * - The third (filter) dimension is aggregated away (summed).
 */
function buildPivotMatrix(
  pivotRows: PivotRow[],
  colDim: DimId,
  rowDim: DimId
): {
  colHeaders: string[];
  rowKeys: string[];
  matrix: Record<string, Record<string, number | null>>;
} {
  type FlatPoint = { rowKey: string; colKey: string; value: number };
  const flat: FlatPoint[] = [];

  for (const row of pivotRows) {
    for (const [code, val] of Object.entries(row.data)) {
      const rowKey = getDimValue(row, code, rowDim);
      const colKey = getDimValue(row, code, colDim);
      flat.push({ rowKey, colKey, value: val ?? 0 });
    }
  }

  const colHeaders = [...new Set(flat.map((f) => f.colKey))].sort();
  const rowKeys = [...new Set(flat.map((f) => f.rowKey))].sort();

  const matrix: Record<string, Record<string, number | null>> = {};
  for (const r of rowKeys) {
    matrix[r] = {};
    for (const c of colHeaders) matrix[r][c] = null;
  }
  for (const f of flat) {
    const existing = matrix[f.rowKey][f.colKey];
    matrix[f.rowKey][f.colKey] = existing != null ? existing + f.value : f.value;
  }

  return { colHeaders, rowKeys, matrix };
}

// ── Dimension chip component ──────────────────────────────────────────────────
interface DimChipProps {
  dimId: DimId;
  label: string;
  icon: React.ElementType;
  onDragStart: (e: React.DragEvent, dimId: DimId) => void;
  onClick: () => void;
  isDragging: boolean;
}

function DimChip({ dimId, label, icon: Icon, onDragStart, onClick, isDragging }: DimChipProps) {
  return (
    <div className={`flex items-center gap-1 transition-opacity ${isDragging ? "opacity-40" : ""}`}>
      {/* Drag handle */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, dimId)}
        className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground hover:text-muted-foreground hover:bg-muted"
        title="Drag to move to another area"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {/* Clickable button */}
      <Button variant="secondary" size="sm" className="h-8 gap-2 bg-card" onClick={onClick}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </Button>
    </div>
  );
}

// ── Drop zone component ───────────────────────────────────────────────────────
interface DropZoneProps {
  areaId: AreaId;
  isOver: boolean;
  onDragOver: (e: React.DragEvent, areaId: AreaId) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, areaId: AreaId) => void;
  children: React.ReactNode;
}

function DropZone({ areaId, isOver, onDragOver, onDragLeave, onDrop, children }: DropZoneProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-colors ${
        isOver
          ? "border-dashed border-primary bg-primary-soft"
          : "border-transparent bg-card hover:border-border"
      }`}
      onDragOver={(e) => onDragOver(e, areaId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, areaId)}
    >
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-14 flex-shrink-0">
        {AREA_LABELS[areaId]}
      </span>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const VisualizationPage: React.FC = () => {
  const { djangoUser } = useAuth();
  const userOrgUnitId = djangoUser?.org_unit ?? null;

  // ── Modal open/close state ────────────────────────────────────────────────
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  // ── Data items (for selection modal) ─────────────────────────────────────
  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [dataItemsLoading, setDataItemsLoading] = useState(false);
  const [dataItemsError, setDataItemsError] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<
    { id: number; name: string; code: string; data_elements: { id: number; code?: string; name?: string }[] }[]
  >([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedData, setSelectedData] = useState<DataItem[]>([]);
  const [periodResult, setPeriodResult] = useState<VisualizationPeriodResult | null>(null);
  const [orgUnitIds, setOrgUnitIds] = useState<number[] | "all">("all");

  // ── Pivot layout: which dimension is in which area ────────────────────────
  const [colDim, setColDim] = useState<DimId>("data");
  const [rowDim, setRowDim] = useState<DimId>("period");
  const [filterDim, setFilterDim] = useState<DimId>("orgUnit");

  // ── Drag state ────────────────────────────────────────────────────────────
  const [draggingDim, setDraggingDim] = useState<DimId | null>(null);
  const [dragOverArea, setDragOverArea] = useState<AreaId | null>(null);

  // ── Pivot data and loading ─────────────────────────────────────────────────
  const [pivot, setPivot] = useState<PivotResponse | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Load data items ───────────────────────────────────────────────────────
  const loadDataItems = useCallback(async () => {
    setDataItemsLoading(true);
    setDataItemsError(null);
    try {
      const [deRes, indRes, rtRes] = await Promise.all([
        ApiClient.getDataElements({ page_size: 10000 }),
        ApiClient.getIndicators({ page_size: 10000 }),
        ApiClient.getReportTypes({ page_size: 10000 }),
      ]);
      const deList = deRes.data?.results ?? deRes.data ?? [];
      const indList = indRes.data?.results ?? indRes.data ?? [];
      const elements: DataItem[] = (deList as { id: number; code: string; name: string }[]).map(
        (d) => ({ id: d.id, code: d.code, name: d.name, type: "data_element" })
      );
      const indicators: DataItem[] = (indList as { id: number; code: string; name: string }[]).map(
        (i) => ({ id: i.id, code: i.code, name: i.name, type: "indicator" })
      );
      setDataItems([...elements, ...indicators]);

      const rtList = rtRes.data?.results ?? rtRes.data ?? [];
      setDatasets(
        (
          rtList as {
            id: number;
            name: string;
            code: string;
            data_elements?: { id: number; code?: string; name?: string }[];
          }[]
        ).map((rt) => ({
          id: rt.id,
          name: rt.name,
          code: rt.code,
          data_elements: rt.data_elements ?? [],
        }))
      );
    } catch (err) {
      console.error("Failed to load data elements and indicators:", err);
      setDataItemsError("Failed to load data elements and indicators. Please try again.");
      setDataItems([]);
    } finally {
      setDataItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataItems();
  }, [loadDataItems]);

  const availableDataItems = useMemo(() => {
    if (!selectedDatasetId) return dataItems;
    const ds = datasets.find((d) => d.id === selectedDatasetId);
    if (!ds?.data_elements?.length) return dataItems;
    const allowedDeIds = new Set(ds.data_elements.map((de) => de.id));
    return dataItems.filter(
      (item) => item.type === "indicator" || (item.type === "data_element" && allowedDeIds.has(item.id))
    );
  }, [dataItems, datasets, selectedDatasetId]);

  // ── Generate pivot table ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerateError(null);
    setPivot(null);

    if (selectedData.length === 0) {
      setGenerateError("Please add at least one data element or indicator.");
      return;
    }
    if (!periodResult?.startDate || !periodResult?.endDate) {
      setGenerateError("Please select at least one period.");
      return;
    }

    setGenerateLoading(true);
    try {
      const dataElementIds = selectedData.filter((d) => d.type === "data_element").map((d) => d.id);
      const indicatorIds = selectedData.filter((d) => d.type === "indicator").map((d) => d.id);
      const org_units = orgUnitIds === "all" ? "all" : orgUnitIds;

      const res = await ApiClient.getPivotData({
        org_units,
        data_elements: dataElementIds,
        indicators: indicatorIds.length > 0 ? indicatorIds : undefined,
        period_type: periodResult.periodType,
        start_date: periodResult.startDate,
        end_date: periodResult.endDate,
      });
      setPivot(res.data as PivotResponse);
    } catch (err: unknown) {
      console.error("Failed to generate pivot:", err);
      const ax = err as { response?: { status?: number; data?: { detail?: string } } };
      const message =
        ax?.response?.data?.detail ||
        (ax?.response?.status === 400
          ? "Invalid selection. Check your data and period choices."
          : "Failed to generate pivot table. Please try again.");
      setGenerateError(message);
    } finally {
      setGenerateLoading(false);
    }
  };

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, dim: DimId) => {
    e.dataTransfer.setData("dim", dim);
    e.dataTransfer.effectAllowed = "move";
    setDraggingDim(dim);
  };

  const handleDragEnd = () => {
    setDraggingDim(null);
    setDragOverArea(null);
  };

  const handleDragOver = (e: React.DragEvent, areaId: AreaId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverArea(areaId);
  };

  const handleDragLeave = () => {
    setDragOverArea(null);
  };

  const handleDrop = (e: React.DragEvent, targetArea: AreaId) => {
    e.preventDefault();
    const draggedDim = (e.dataTransfer.getData("dim") || draggingDim) as DimId | null;
    if (!draggedDim) {
      setDraggingDim(null);
      setDragOverArea(null);
      return;
    }

    const sourceArea: AreaId =
      draggedDim === colDim ? "columns" : draggedDim === rowDim ? "rows" : "filter";

    if (sourceArea === targetArea) {
      setDraggingDim(null);
      setDragOverArea(null);
      return;
    }

    // Swap: move draggedDim to targetArea, push targetArea's current dim to sourceArea
    const targetDim = targetArea === "columns" ? colDim : targetArea === "rows" ? rowDim : filterDim;

    const newCol = targetArea === "columns" ? draggedDim : sourceArea === "columns" ? targetDim : colDim;
    const newRow = targetArea === "rows" ? draggedDim : sourceArea === "rows" ? targetDim : rowDim;
    const newFilter =
      targetArea === "filter" ? draggedDim : sourceArea === "filter" ? targetDim : filterDim;

    setColDim(newCol);
    setRowDim(newRow);
    setFilterDim(newFilter);
    setDraggingDim(null);
    setDragOverArea(null);
  };

  // ── Pivot matrix (memoised) ───────────────────────────────────────────────
  const pivotMatrix = useMemo(
    () => (pivot ? buildPivotMatrix(pivot.rows, colDim, rowDim) : null),
    [pivot, colDim, rowDim]
  );

  // ── Excel export ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!pivot || !pivotMatrix) return;
    setExporting(true);
    try {
      const { colHeaders, rowKeys, matrix } = pivotMatrix;
      const rowHeaderLabel = DIM_ROW_HEADER[rowDim];

      // Build worksheet data: header row + data rows
      const wsData: (string | number | null)[][] = [
        [rowHeaderLabel, ...colHeaders],
        ...rowKeys.map((r) => [r, ...colHeaders.map((c) => matrix[r][c] ?? "")]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-width columns
      const colWidths = wsData[0].map((_, ci) =>
        Math.min(
          40,
          Math.max(10, ...wsData.map((row) => String(row[ci] ?? "").length))
        )
      );
      ws["!cols"] = colWidths.map((w) => ({ wch: w }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pivot Table");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pivot_${pivot.meta.start_date}_${pivot.meta.end_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (ex) {
      console.error("Export failed:", ex);
    } finally {
      setExporting(false);
    }
  };

  // ── Modal openers per dimension ───────────────────────────────────────────
  const dimModalOpener: Record<DimId, () => void> = {
    data: () => setDataModalOpen(true),
    period: () => setPeriodModalOpen(true),
    orgUnit: () => setOrgModalOpen(true),
  };

  const dimIcons: Record<DimId, React.ElementType> = {
    data: Layers,
    period: Calendar,
    orgUnit: Building2,
  };

  const dimButtonLabel = (dim: DimId): string => {
    if (dim === "data") {
      return selectedData.length === 0 ? "Add data…" : `${selectedData.length} item(s)`;
    }
    if (dim === "period") {
      if (!periodResult?.selectedLabels?.length) return "Select period…";
      return (
        periodResult.selectedLabels[0] +
        (periodResult.selectedLabels.length > 1 ? ` +${periodResult.selectedLabels.length - 1}` : "")
      );
    }
    // orgUnit
    return orgUnitIds === "all"
      ? "All org units"
      : `${(orgUnitIds as number[]).length} unit(s)`;
  };

  const areas: AreaId[] = ["columns", "rows", "filter"];
  const areaDims: Record<AreaId, DimId> = { columns: colDim, rows: rowDim, filter: filterDim };

  return (
    <div className="space-y-6" onDragEnd={handleDragEnd}>
      <PageCard
        title="Visualizations"
        description="Build a pivot table: choose the data, period and organisation units, arrange them, then update the table."
        icon={<Table2 className="h-5 w-5" aria-hidden="true" />}
        actions={
          <>
            <Button variant="secondary" onClick={handleExportExcel} disabled={!pivot || exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {exporting ? "Downloading…" : "Download Excel"}
            </Button>
            <Button
              disabled={generateLoading || selectedData.length === 0 || !periodResult}
              onClick={handleGenerate}
            >
              {generateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              {generateLoading ? "Updating…" : "Update table"}
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-border bg-surface-subtle p-3">
          <div className="flex flex-wrap items-center gap-2">
            {areas.map((areaId) => {
              const dim = areaDims[areaId];
              return (
                <DropZone
                  key={areaId}
                  areaId={areaId}
                  isOver={dragOverArea === areaId}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <DimChip
                    dimId={dim}
                    label={dimButtonLabel(dim)}
                    icon={dimIcons[dim]}
                    onDragStart={handleDragStart}
                    onClick={dimModalOpener[dim]}
                    isDragging={draggingDim === dim}
                  />
                </DropZone>
              );
            })}
          </div>
          <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
            Click a box to choose what it shows. Drag the{" "}
            <GripVertical className="inline h-3 w-3" aria-hidden="true" /> handle to swap columns, rows and filter.
          </p>
        </div>
      </PageCard>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {generateError && (
        <InlineNotice tone="error" title="The table couldn't be updated">
          {generateError}
        </InlineNotice>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div>
        {!pivot ? (
          <section className="rounded-xl border border-border bg-card px-6 py-10">
            <div className="mx-auto max-w-xl text-center">
              <Illustration name="choose" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">Build your first table</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose what goes in the table using the boxes above, then select <strong>Update table</strong>.
              </p>
            </div>
            <ol className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                { title: "Choose the data", text: "Pick the data items or indicators you want to see." },
                { title: "Choose the period and units", text: "Set the months or quarters, and which organisation units." },
                { title: "Arrange and update", text: "Drag boxes between columns, rows and filter, then update." },
              ].map((step, i) => (
                <li key={step.title} className="select-card">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{step.title}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : !pivotMatrix ? null : (
          <SectionCard
            flush
            icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
            title="Pivot table"
            description={
              <>
                Rows: <strong className="text-foreground">{DIM_LABELS[rowDim]}</strong> · Columns:{" "}
                <strong className="text-foreground">{DIM_LABELS[colDim]}</strong> ·{" "}
                {pivot.meta.org_units?.length ?? 0} organisation unit(s) · {pivotMatrix.rowKeys.length} row(s) ·{" "}
                {pivotMatrix.colHeaders.length} column(s)
              </>
            }
          >
            <div className="max-h-[70vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 left-0 z-20 min-w-[180px] border-r border-border bg-surface-subtle">
                        {DIM_ROW_HEADER[rowDim]}
                      </TableHead>
                      {pivotMatrix.colHeaders.map((col) => (
                        <TableHead
                          key={col}
                          className="sticky top-0 z-10 min-w-[100px] bg-surface-subtle text-right"
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivotMatrix.rowKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={1 + pivotMatrix.colHeaders.length} className="p-0">
                          <EmptyState
                            illustration="no-results"
                            title="No data for this selection"
                            description="Try a longer period, more organisation units or different data items."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      pivotMatrix.rowKeys.map((rowKey, idx) => (
                        <TableRow key={rowKey} className={idx % 2 === 0 ? "bg-card" : "bg-surface-subtle"}>
                          <TableCell className="sticky left-0 z-[1] border-r border-border bg-inherit text-sm font-medium">{rowKey}</TableCell>
                          {pivotMatrix.colHeaders.map((col) => (
                            <TableCell key={col} className="font-clinical text-right text-sm">
                              {pivotMatrix.matrix[rowKey][col] != null
                                ? pivotMatrix.matrix[rowKey][col]
                                : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
            </div>
          </SectionCard>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <DataSelectionModal
        open={dataModalOpen}
        onOpenChange={setDataModalOpen}
        available={availableDataItems}
        selected={selectedData}
        onSelectedChange={setSelectedData}
        loading={dataItemsLoading}
        error={dataItemsError}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onDatasetChange={setSelectedDatasetId}
      />

      <VisualizationPeriodModal
        open={periodModalOpen}
        onOpenChange={setPeriodModalOpen}
        value={periodResult}
        onApply={setPeriodResult}
      />

      <OrgUnitFilterModal
        open={orgModalOpen}
        onOpenChange={setOrgModalOpen}
        selectedIds={orgUnitIds === "all" ? [] : orgUnitIds}
        onApply={setOrgUnitIds}
        userOrgUnitId={userOrgUnitId}
      />
    </div>
  );
};

export default VisualizationPage;
