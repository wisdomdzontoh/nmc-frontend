import api from "./api"

export async function createLayout(data: any) {
  const response = await api.post("/reporting/report-layouts/", data)
  return response.data
}

export async function updateLayout(id: number, data: any) {
  const response = await api.patch(`/reporting/report-layouts/${id}/`, data)
  return response.data
}

export async function publishLayout(id: number) {
  const response = await api.post(`/reporting/report-layouts/${id}/publish/`)
  return response.data
}

export async function getLayouts(params?: {
  report_type?: number
  status?: string
  search?: string
}) {
  const response = await api.get("/reporting/layouts/", { params })
  return response.data
}

export async function getLayout(id: number) {
  const response = await api.get(`/reporting/layouts/${id}/`)
  return response.data
}

export async function deleteLayout(id: number) {
  const response = await api.delete(`/reporting/layouts/${id}/`)
  return response.data
}

export async function duplicateLayout(id: number, data: { name: string; code: string }) {
  const response = await api.post(`/reporting/layouts/${id}/duplicate/`, data)
  return response.data
}

export async function validateBindings(id: number) {
  const response = await api.get(`/reporting/layouts/${id}/validate_bindings/`)
  return response.data
}

export async function getLayoutHistory(id: number) {
  const response = await api.get(`/reporting/layouts/${id}/history/`)
  return response.data
}

export async function archiveLayout(id: number) {
  const response = await api.post(`/reporting/layouts/${id}/archive/`)
  return response.data
}

export async function getLayoutByReportType(reportTypeId: number, status = "published") {
  const response = await api.get("/reporting/layouts/by_report_type/", {
    params: { report_type: reportTypeId, status },
  })
  return response.data
}
