"use client";

import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [reports, setReports] = useState<any[]>([]);

  // Fetch user info
  useEffect(() => {
    if (!loading && user) {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) return;
      api.get("/users/me/", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => setMe(res.data))
        .catch((err) => setMe(null));
    }
  }, [loading, user]);

  // Fetch org units
  useEffect(() => {
    if (!loading && user) {
      api.get("/org/tree/").then((res) => setOrgUnits(res.data));
    }
  }, [loading, user]);

  // Fetch datasets
  useEffect(() => {
    if (!loading && user) {
      api.get("/metadata/report-types/").then((res) => setDatasets(res.data));
    }
  }, [loading, user]);

  // Fetch recent reports (placeholder, can filter by org/dataset)
  useEffect(() => {
    if (!loading && user) {
      api.get("/reporting/reports/").then((res) => setReports(res.data.results || []));
    }
  }, [loading, user]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>You must be logged in.</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Org Unit</label>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Org Unit" />
            </SelectTrigger>
            <SelectContent>
              {orgUnits.map((ou) => (
                <SelectItem key={ou.id} value={String(ou.id)}>{ou.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dataset</label>
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select Dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((ds) => (
                <SelectItem key={ds.id} value={String(ds.id)}>{ds.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">Summary Widget 1</div>
        <div className="bg-white rounded-lg shadow p-4">Summary Widget 2</div>
        <div className="bg-white rounded-lg shadow p-4">Summary Widget 3</div>
      </div>
      {/* Recent Reports Table */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Recent Reports</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-1">ID</th>
              <th className="text-left py-1">Dataset</th>
              <th className="text-left py-1">Org Unit</th>
              <th className="text-left py-1">Period</th>
              <th className="text-left py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4">No reports found.</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-1">{r.id}</td>
                  <td className="py-1">{r.dataset_name || r.dataset}</td>
                  <td className="py-1">{r.org_unit_name || r.org_unit}</td>
                  <td className="py-1">{r.period}</td>
                  <td className="py-1">{r.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
