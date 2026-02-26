"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import DataSelectionModal, { type DataItem } from "@/components/visualizations/DataSelectionModal";
import VisualizationPeriodModal, {
  type VisualizationPeriodResult,
} from "@/components/visualizations/VisualizationPeriodModal";
import OrgUnitFilterModal from "@/components/visualizations/OrgUnitFilterModal";

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

const VisualizationPage: React.FC = () => {
  const { djangoUser } = useAuth();
  const userOrgUnitId = djangoUser?.org_unit ?? null;

  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser);
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff);

  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [dataItemsLoading, setDataItemsLoading] = useState(false);
  const [dataItemsError, setDataItemsError] = useState<string | null>(null);

  const [datasets, setDatasets] = useState<{ id: number; name: string; code: string; data_elements: { id: number; code?: string; name?: string }[] }[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  const [selectedData, setSelectedData] = useState<DataItem[]>([]);
  const [periodResult, setPeriodResult] = useState<VisualizationPeriodResult | null>(null);
  const [orgUnitIds, setOrgUnitIds] = useState<number[] | "all">("all");

  const [pivot, setPivot] = useState<PivotResponse | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
        (rtList as { id: number; name: string; code: string; data_elements?: { id: number; code?: string; name?: string }[] }[]).map(
          (rt) => ({ id: rt.id, name: rt.name, code: rt.code, data_elements: rt.data_elements ?? [] })
        )
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

  const handleGenerate = async () => {
    setGenerateError(null);
    setPivot(null);

    if (selectedData.length === 0) {
      setGenerateError("Please add at least one data element or indicator in Columns.");
      return;
    }
    if (!periodResult?.startDate || !periodResult?.endDate) {
      setGenerateError("Please select at least one period in Rows.");
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

  const allMetricCodes = useMemo(() => {
    if (!pivot) return [];
    const codes = new Set<string>();
    pivot.rows.forEach((row) => Object.keys(row.data).forEach((c) => codes.add(c)));
    return Array.from(codes).sort();
  }, [pivot]);

  const handleExportExcel = () => {
    if (!pivot) return;
    setExporting(true);
    try {
      const metrics = allMetricCodes;
      const header = ["Org unit", "Period", ...metrics];
      const lines = [header.join("\t")];
      pivot.rows.forEach((row) => {
        const cells = [row.org_unit_name, row.period];
        metrics.forEach((m) => cells.push(row.data[m] != null ? String(row.data[m]) : ""));
        lines.push(cells.join("\t"));
      });
      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pivot_${pivot.meta.start_date}_${pivot.meta.end_date}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Visualizations</h1>
        <Alert>
          <AlertDescription>
            Visualizations are only available to staff and administrators. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const dataLabel = selectedData.length === 0 ? "Data..." : `${selectedData.length} item(s)`;
  const periodLabel =
    !periodResult?.selectedLabels?.length ? "Period..." : periodResult.selectedLabels[0] + (periodResult.selectedLabels.length > 1 ? ` +${periodResult.selectedLabels.length - 1}` : "");
  const orgLabel =
    orgUnitIds === "all" ? "Organisation unit..." : Array.isArray(orgUnitIds) ? `${orgUnitIds.length} unit(s)` : "Organisation unit...";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top action bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generateLoading || selectedData.length === 0 || !periodResult}
          >
            {generateLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Update
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDataModalOpen(true)}>
            File
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={!pivot || exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download
          </Button>
        </div>
      </div>

      {/* Dimension layout: Columns | Rows | Filter */}
      <div className="bg-white border-b px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Columns</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setDataModalOpen(true)}
          >
            <Layers className="h-4 w-4" />
            {dataLabel}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Rows</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setPeriodModalOpen(true)}
          >
            <Calendar className="h-4 w-4" />
            {periodLabel}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filter</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setOrgModalOpen(true)}
          >
            <Building2 className="h-4 w-4" />
            {orgLabel}
          </Button>
        </div>
      </div>

      {/* Error */}
      {generateError && (
        <div className="px-4 py-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{generateError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main content */}
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
                <li>Add dimensions in the layout bar: <strong>Columns</strong> (data elements and indicators), <strong>Rows</strong> (periods), and <strong>Filter</strong> (organisation units).</li>
                <li>Click a dimension button to add or remove items in the selection modal.</li>
                <li>Click <strong>Update</strong> to generate the pivot table. Use <strong>Download</strong> to export to Excel.</li>
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <FileSpreadsheet className="h-5 w-5" />
                  Pivot table
                </CardTitle>
                <CardDescription>
                  {pivot.meta.org_units?.length ?? 0} organisation unit(s), {pivot.rows.length} row(s), {allMetricCodes.length} metric(s).
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Export to Excel
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <div className="min-w-full border rounded-md bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Org unit</TableHead>
                      <TableHead className="min-w-[100px]">Period</TableHead>
                      {allMetricCodes.map((code) => (
                        <TableHead key={code} className="min-w-[90px] text-right">
                          {code}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivot.rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2 + allMetricCodes.length}
                          className="text-center py-8 text-slate-500"
                        >
                          No data available for the selected configuration.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pivot.rows.map((row, idx) => (
                        <TableRow key={`${row.org_unit_id}-${row.period}-${idx}`}>
                          <TableCell>{row.org_unit_name}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          {allMetricCodes.map((code) => (
                            <TableCell key={code} className="text-right">
                              {row.data[code] != null ? row.data[code] : ""}
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
