import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Settings, User, Bell, Lock, CreditCard, FileText, Shield, 
  ChevronRight, LogOut, Moon, Globe
} from "lucide-react"
import Link from "next/link"

export default async function ParentSettingsPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const settingsSections = [
    {
      title: "Account",
      items: [
        { label: "Edit Profile", icon: User, href: "/profile/modifier" },
        { label: "Notifications", icon: Bell, href: "/parent/notifications" },
        { label: "Privacy & Security", icon: Lock, href: "#" },
      ]
    },
    {
      title: "Family",
      items: [
        { label: "Manage Teens", icon: Shield, href: "/parent/teens" },
        { label: "Budget Limits", icon: CreditCard, href: "/parent/budget" },
        { label: "Documents", icon: FileText, href: "/parent/documents" },
      ]
    },
    {
      title: "Preferences",
      items: [
        { label: "Language", icon: Globe, href: "#" },
        { label: "Appearance", icon: Moon, href: "#" },
      ]
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.items.map((item) => (
                <Link 
                  key={item.label} 
                  href={item.href}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Logout */}
        <Card className="border-destructive/20">
          <CardContent className="p-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 mr-4" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
