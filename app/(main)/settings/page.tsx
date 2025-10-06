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
import { 
  Switch 
} from "@/components/ui/switch"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database,
  Save,
  Loader2,
  CheckCircle
} from "lucide-react"

interface UserSettings {
  first_name: string
  last_name: string
  email: string
  notifications: {
    email_notifications: boolean
    report_reminders: boolean
    system_updates: boolean
  }
}

interface SystemSettings {
  maintenance_mode: boolean
  allow_registration: boolean
  session_timeout: number
  max_file_size: number
}

const SettingsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [userSettings, setUserSettings] = useState<UserSettings>({
    first_name: "",
    last_name: "",
    email: "",
    notifications: {
      email_notifications: true,
      report_reminders: true,
      system_updates: false
    }
  })
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    allow_registration: false,
    session_timeout: 30,
    max_file_size: 10
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
        
        // Load system settings (mock data for now)
        setSystemSettings({
          maintenance_mode: false,
          allow_registration: false,
          session_timeout: 30,
          max_file_size: 10
        })
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

  // Save system settings
  const handleSaveSystemSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess("System settings saved successfully!")
    } catch (err: unknown) {
      console.error("Failed to save system settings:", err)
      setError("Failed to save system settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
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
                  onChange={(e) => setUserSettings(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
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

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.notifications.email_notifications}
                    onCheckedChange={(checked) => setUserSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email_notifications: checked }
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Report Reminders</h4>
                    <p className="text-sm text-muted-foreground">
                      Get reminded about pending reports
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.notifications.report_reminders}
                    onCheckedChange={(checked) => setUserSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, report_reminders: checked }
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">System Updates</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about system updates
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.notifications.system_updates}
                    onCheckedChange={(checked) => setUserSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, system_updates: checked }
                    }))}
                  />
                </div>
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

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Maintenance Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable maintenance mode to restrict system access
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenance_mode}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, maintenance_mode: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Allow Registration</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register accounts
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.allow_registration}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, allow_registration: checked }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    value={systemSettings.session_timeout}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, session_timeout: parseInt(e.target.value) }))}
                    placeholder="30"
                    min="5"
                    max="480"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max File Size (MB)</label>
                  <Input
                    type="number"
                    value={systemSettings.max_file_size}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, max_file_size: parseInt(e.target.value) }))}
                    placeholder="10"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveSystemSettings} disabled={saving}>
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
