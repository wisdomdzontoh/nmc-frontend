/**
 * Settings Page
 * System settings and configuration interface
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Save, Loader2, CheckCircle } from "lucide-react"
import { SectionLoader } from "@/components/ui/PageLoader"

interface UserSettings {
  first_name: string
  last_name: string
  email: string
}

const SettingsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [userSettings, setUserSettings] = useState<UserSettings>({
    first_name: "",
    last_name: "",
    email: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load user settings from current user data
        if (djangoUser) {
          setUserSettings(prev => ({
            ...prev,
            first_name: djangoUser.first_name || "",
            last_name: djangoUser.last_name || "",
            email: djangoUser.email || ""
          }))
        }
      } catch (err: unknown) {
        console.error("Failed to load settings:", err)
        setError("Failed to load settings. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [djangoUser])

  // Save user settings
  const handleSaveUserSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess("User settings saved successfully!")
    } catch (err: unknown) {
      console.error("Failed to save user settings:", err)
      setError("Failed to save user settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SectionLoader message="Loading settings…" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and system preferences
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 max-w-xs">
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={userSettings.first_name}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={userSettings.last_name}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={userSettings.email}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="Email address (managed by system)"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveUserSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
