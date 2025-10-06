/**
 * Period Selection Modal - DHIMS 2 Style
 * Monthly period selection for data entry
 */

"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Calendar, 
  CheckCircle
} from "lucide-react"

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  type: "relative" | "fixed"
}

interface PeriodSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedPeriod: Period) => void
}

const PeriodSelectionModal: React.FC<PeriodSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [activeTab, setActiveTab] = useState<"relative" | "fixed">("relative")
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null)
  const [periodType, setPeriodType] = useState<"months" | "quarters" | "years">("months")

  // Generate relative periods
  const generateRelativePeriods = (): Period[] => {
    const now = new Date()
    const periods: Period[] = []

    if (periodType === "months") {
      // This month
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      periods.push({
        id: "this-month",
        name: "This month",
        startDate: thisMonth.toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        type: "relative"
      })

      // Last month
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      periods.push({
        id: "last-month",
        name: "Last month",
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
        type: "relative"
      })

      // Last 3 months
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      periods.push({
        id: "last-3-months",
        name: "Last 3 months",
        startDate: threeMonthsAgo.toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        type: "relative"
      })

      // Last 6 months
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      periods.push({
        id: "last-6-months",
        name: "Last 6 months",
        startDate: sixMonthsAgo.toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        type: "relative"
      })

      // Months this year
      const yearStart = new Date(now.getFullYear(), 0, 1)
      periods.push({
        id: "months-this-year",
        name: "Months this year",
        startDate: yearStart.toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        type: "relative"
      })

      // Last 12 months
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      periods.push({
        id: "last-12-months",
        name: "Last 12 months",
        startDate: twelveMonthsAgo.toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
        type: "relative"
      })
    }

    return periods
  }

  // Generate fixed periods (last 12 months)
  const generateFixedPeriods = (): Period[] => {
    const periods: Period[] = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      periods.push({
        id: `month-${date.getFullYear()}-${date.getMonth() + 1}`,
        name: monthName,
        startDate: date.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        type: "fixed"
      })
    }

    return periods
  }

  const relativePeriods = generateRelativePeriods()
  const fixedPeriods = generateFixedPeriods()

  const handlePeriodSelect = (period: Period) => {
    setSelectedPeriod(period)
  }

  const handleUpdate = () => {
    if (selectedPeriod) {
      onSelect(selectedPeriod)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Period
          </DialogTitle>
          <DialogDescription>
            Select the reporting period for data entry
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "relative"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("relative")}
            >
              Relative periods
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "fixed"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("fixed")}
            >
              Fixed periods
            </button>
          </div>

          <div className="flex gap-6 h-96">
            {/* Left Panel - Period Selection */}
            <div className="flex-1">
              {activeTab === "relative" && (
                <div className="space-y-4">
                  {/* Period Type Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Period type</label>
                    <select
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value as "months" | "quarters" | "years")}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="months">Months</option>
                      <option value="quarters">Quarters</option>
                      <option value="years">Years</option>
                    </select>
                  </div>

                  {/* Relative Periods List */}
                  <div className="space-y-2">
                    {relativePeriods.map((period) => (
                      <div
                        key={period.id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                          selectedPeriod?.id === period.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                        }`}
                        onClick={() => handlePeriodSelect(period)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{period.name}</span>
                          {selectedPeriod?.id === period.id && (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "fixed" && (
                <div className="space-y-2">
                  {fixedPeriods.map((period) => (
                    <div
                      key={period.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedPeriod?.id === period.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                      onClick={() => handlePeriodSelect(period)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{period.name}</span>
                        {selectedPeriod?.id === period.id && (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel - Selected Periods */}
            <div className="w-80 border-l pl-6">
              <h3 className="text-sm font-medium mb-4">Selected Periods</h3>
              {selectedPeriod ? (
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium">{selectedPeriod.name}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(selectedPeriod.startDate).toLocaleDateString()} - {new Date(selectedPeriod.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No periods selected
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hide
          </Button>
          <Button onClick={handleUpdate} disabled={!selectedPeriod}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PeriodSelectionModal
