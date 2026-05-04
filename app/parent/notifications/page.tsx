"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  CreditCard,
  Shield,
  AlertTriangle,
  PartyPopper,
  User,
  Settings,
  ArrowLeft,
  Trash2,
  MoreVertical,
  MessageSquare,
  MapPin
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Notification {
  id: string
  type: "event" | "approval" | "payment" | "safety" | "system" | "checkin"
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  teenName?: string
}

export default function ParentNotificationsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "checkin",
      title: "Check-in confirmé",
      message: "Yasmine est bien arrivée à la Neon Party Casablanca",
      timestamp: "Il y a 5 min",
      read: false,
      teenName: "Yasmine"
    },
    {
      id: "2",
      type: "approval",
      title: "Approbation requise",
      message: "Ahmed souhaite s'inscrire au Teen DJ Battle",
      timestamp: "Il y a 30 min",
      read: false,
      actionUrl: "/parent/approvals",
      teenName: "Ahmed"
    },
    {
      id: "3",
      type: "payment",
      title: "Paiement reçu",
      message: "150 DH ajoutés au compte de Yasmine via votre top-up",
      timestamp: "Il y a 2h",
      read: false,
      teenName: "Yasmine"
    },
    {
      id: "4",
      type: "event",
      title: "Rappel événement",
      message: "La soirée Neon Party commence dans 2 heures",
      timestamp: "Il y a 3h",
      read: true
    },
    {
      id: "5",
      type: "safety",
      title: "Alerte sécurité",
      message: "Demande de sortie anticipée pour Yasmine validée",
      timestamp: "Hier",
      read: true,
      teenName: "Yasmine"
    },
    {
      id: "6",
      type: "system",
      title: "Nouveau document à signer",
      message: "Une autorisation parentale est en attente de signature",
      timestamp: "Hier",
      read: true,
      actionUrl: "/parent/documents"
    },
    {
      id: "7",
      type: "checkin",
      title: "Check-out confirmé",
      message: "Ahmed a quitté la soirée Halloween",
      timestamp: "Il y a 3 jours",
      read: true,
      teenName: "Ahmed"
    }
  ])

  const [notificationSettings, setNotificationSettings] = useState({
    checkin: true,
    checkout: true,
    approvals: true,
    payments: true,
    events: true,
    safety: true,
    email: true,
    push: true,
    sms: false
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "event": return PartyPopper
      case "approval": return Shield
      case "payment": return CreditCard
      case "safety": return AlertTriangle
      case "system": return Settings
      case "checkin": return MapPin
      default: return Bell
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "event": return "bg-pink-500/20 text-pink-400"
      case "approval": return "bg-blue-500/20 text-blue-400"
      case "payment": return "bg-green-500/20 text-green-400"
      case "safety": return "bg-orange-500/20 text-orange-400"
      case "system": return "bg-zinc-500/20 text-zinc-400"
      case "checkin": return "bg-emerald-500/20 text-emerald-400"
      default: return "bg-primary/20 text-primary"
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const allNotifications = notifications
  const unreadNotifications = notifications.filter(n => !n.read)

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" className="text-zinc-400 hover:text-white">
            <Link href="/parent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-emerald-400" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-zinc-400 mt-1">Restez informé des activités de vos enfants</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer lu
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Notifications List */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900 mb-6">
                <TabsTrigger value="all">
                  Toutes ({allNotifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Non lues ({unreadNotifications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-3">
                  {allNotifications.map((notification) => {
                    const Icon = getTypeIcon(notification.type)
                    return (
                      <Card
                        key={notification.id}
                        className={`bg-zinc-900 border-zinc-800 transition-all ${
                          !notification.read ? "border-l-4 border-l-emerald-500" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold ${notification.read ? "text-zinc-400" : "text-white"}`}>
                                  {notification.title}
                                </h3>
                                {notification.teenName && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.teenName}
                                  </Badge>
                                )}
                              </div>
                              <p className={`text-sm ${notification.read ? "text-zinc-500" : "text-zinc-300"}`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {notification.timestamp}
                                </span>
                                {notification.actionUrl && (
                                  <Link
                                    href={notification.actionUrl}
                                    className="text-xs text-emerald-400 hover:underline"
                                  >
                                    Voir détails →
                                  </Link>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                {!notification.read && (
                                  <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Marquer comme lu
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => deleteNotification(notification.id)}
                                  className="text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {allNotifications.length === 0 && (
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="py-12 text-center">
                        <BellOff className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                        <p className="text-zinc-400">Aucune notification</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="unread">
                <div className="space-y-3">
                  {unreadNotifications.map((notification) => {
                    const Icon = getTypeIcon(notification.type)
                    return (
                      <Card
                        key={notification.id}
                        className="bg-zinc-900 border-zinc-800 border-l-4 border-l-emerald-500"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white">{notification.title}</h3>
                                {notification.teenName && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.teenName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-zinc-300">{notification.message}</p>
                              <span className="text-xs text-zinc-500 flex items-center gap-1 mt-2">
                                <Clock className="w-3 h-3" />
                                {notification.timestamp}
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {unreadNotifications.length === 0 && (
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="py-12 text-center">
                        <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <p className="text-white font-bold">Tout est lu!</p>
                        <p className="text-zinc-400">Vous êtes à jour</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Settings Sidebar */}
          <div>
            <Card className="bg-zinc-900 border-zinc-800 sticky top-32">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Préférences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Types */}
                <div>
                  <h4 className="text-sm font-bold text-zinc-400 mb-3">Types de notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="checkin" className="text-zinc-300">Check-in/out</Label>
                      <Switch
                        id="checkin"
                        checked={notificationSettings.checkin}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, checkin: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="approvals" className="text-zinc-300">Approbations</Label>
                      <Switch
                        id="approvals"
                        checked={notificationSettings.approvals}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, approvals: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payments" className="text-zinc-300">Paiements</Label>
                      <Switch
                        id="payments"
                        checked={notificationSettings.payments}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, payments: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="events" className="text-zinc-300">Événements</Label>
                      <Switch
                        id="events"
                        checked={notificationSettings.events}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, events: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="safety" className="text-zinc-300">Alertes sécurité</Label>
                      <Switch
                        id="safety"
                        checked={notificationSettings.safety}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, safety: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Channels */}
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-sm font-bold text-zinc-400 mb-3">Canaux</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email" className="text-zinc-300">Email</Label>
                      <Switch
                        id="email"
                        checked={notificationSettings.email}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, email: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push" className="text-zinc-300">Push</Label>
                      <Switch
                        id="push"
                        checked={notificationSettings.push}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, push: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms" className="text-zinc-300">SMS</Label>
                      <Switch
                        id="sms"
                        checked={notificationSettings.sms}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({ ...prev, sms: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                  Enregistrer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
