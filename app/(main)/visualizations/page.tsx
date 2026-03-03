"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ApiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  BarChart3,
  Download,
  Calendar,
  Building2,
  Layers,
  AlertCircle,
  FileSpreadsheet,
  GripVertical,
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
        className="cursor-grab active:cursor-grabbing p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        title="Drag to move to another area"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {/* Clickable button */}
      <Button variant="outline" size="sm" className="gap-2 h-8" onClick={onClick}>
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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
        isOver
          ? "border-red-500 bg-red-50"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
      onDragOver={(e) => onDragOver(e, areaId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, areaId)}
    >
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-14 flex-shrink-0">
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

  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser);
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff);

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
        ApiClient.getDataElements(),
        ApiClient.getIndicators(),
        ApiClient.getReportTypes(),
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

  // ── Access guard ──────────────────────────────────────────────────────────
  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Visualizations</h1>
        <Alert>
          <AlertDescription>
            Visualizations are only available to staff and administrators. Contact your administrator if
            you need access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const areas: AreaId[] = ["columns", "rows", "filter"];
  const areaDims: Record<AreaId, DimId> = { columns: colDim, rows: rowDim, filter: filterDim };

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col"
      onDragEnd={handleDragEnd}
    >
      {/* ── Top action bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={generateLoading || selectedData.length === 0 || !periodResult}
            onClick={handleGenerate}
            style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}
            className="text-white"
          >
            {generateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={!pivot || exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
        </div>
        <p className="text-xs text-slate-400 hidden sm:block">
          Drag the grip handle{" "}
          <GripVertical className="h-3 w-3 inline" /> to move dimensions between areas
        </p>
      </div>

      {/* ── Dimension layout bar ───────────────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-2 flex flex-wrap items-center gap-2">
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

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {generateError && (
        <div className="px-4 py-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{generateError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        {!pivot ? (
          <Card className="max-w-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <BarChart3 className="h-5 w-5" />
                Getting started
              </CardTitle>
              <CardDescription>
                Build pivot tables by choosing data, periods and organisation units above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Use the layout bar to assign dimensions:{" "}
                  <strong>Columns</strong> (table columns), <strong>Rows</strong> (row groups), and{" "}
                  <strong>Filter</strong> (aggregated away).
                </li>
                <li>
                  <strong>Drag</strong> the{" "}
                  <GripVertical className="h-3.5 w-3.5 inline text-slate-400" /> handle to swap
                  dimensions between areas.
                </li>
                <li>
                  Click a dimension button to configure its selection, then click{" "}
                  <strong>Update</strong> to generate the table.
                </li>
                <li>
                  Click <strong>Download</strong> to export the result as an Excel (.xlsx) file.
                </li>
              </ul>
            </CardContent>
          </Card>
        ) : !pivotMatrix ? null : (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <FileSpreadsheet className="h-5 w-5" />
                  Pivot table
                </CardTitle>
                <CardDescription>
                  {pivot.meta.org_units?.length ?? 0} organisation unit(s) · {pivot.rows.length}{" "}
                  source row(s) · {pivotMatrix.colHeaders.length} column(s) · {pivotMatrix.rowKeys.length}{" "}
                  row(s). Rows: <strong>{DIM_LABELS[rowDim]}</strong> · Columns:{" "}
                  <strong>{DIM_LABELS[colDim]}</strong>
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export to Excel
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <div className="min-w-full border rounded-md bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="min-w-[180px] text-white text-xs font-semibold"
                        style={{ background: "linear-gradient(135deg, #8B3020, #C9433B)" }}
                      >
                        {DIM_ROW_HEADER[rowDim]}
                      </TableHead>
                      {pivotMatrix.colHeaders.map((col) => (
                        <TableHead
                          key={col}
                          className="min-w-[100px] text-right text-white text-xs font-semibold"
                          style={{ background: "linear-gradient(135deg, #8B3020, #C9433B)" }}
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivotMatrix.rowKeys.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={1 + pivotMatrix.colHeaders.length}
                          className="text-center py-8 text-slate-500"
                        >
                          No data available for the selected configuration.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pivotMatrix.rowKeys.map((rowKey, idx) => (
                        <TableRow
                          key={rowKey}
                          className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                        >
                          <TableCell className="font-medium text-sm">{rowKey}</TableCell>
                          {pivotMatrix.colHeaders.map((col) => (
                            <TableCell key={col} className="text-right text-sm">
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
            </CardContent>
          </Card>
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
