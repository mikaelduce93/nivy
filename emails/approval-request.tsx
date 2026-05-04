import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface ApprovalRequestEmailProps {
  parentName: string
  teenName: string
  requestType: "booking" | "purchase" | "topup"
  title: string
  description?: string
  amount?: number
  eventDate?: string
  eventLocation?: string
  expiresAt?: string
}

export default function ApprovalRequestEmail({
  parentName = "Parent",
  teenName = "Votre teen",
  requestType = "booking",
  title = "Demande d'approbation",
  description,
  amount,
  eventDate,
  eventLocation,
  expiresAt,
}: ApprovalRequestEmailProps) {
  const getTypeEmoji = () => {
    switch (requestType) {
      case "booking":
        return "🎫"
      case "purchase":
        return "🛍️"
      case "topup":
        return "💰"
      default:
        return "📋"
    }
  }

  const getTypeLabel = () => {
    switch (requestType) {
      case "booking":
        return "Réservation d'événement"
      case "purchase":
        return "Achat boutique"
      case "topup":
        return "Demande de recharge"
      default:
        return "Demande d'approbation"
    }
  }

  return (
    <Html>
      <Head />
      <Preview>
        {getTypeEmoji()} {teenName} a besoin de votre approbation
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>{getTypeEmoji()} Approbation requise</Heading>
          </Section>

          {/* Greeting */}
          <Text style={text}>Bonjour {parentName},</Text>
          <Text style={text}>
            <strong>{teenName}</strong> a fait une demande qui nécessite votre approbation:
          </Text>

          {/* Request Details */}
          <Section style={requestCard}>
            <Text style={requestType_}>
              {getTypeLabel()}
            </Text>
            <Heading style={h2}>{title}</Heading>
            {description && (
              <Text style={requestDetail}>{description}</Text>
            )}
            {amount && (
              <Text style={amountText}>{amount} DH</Text>
            )}
            {eventDate && (
              <Text style={requestDetail}>
                📅 {eventDate}
              </Text>
            )}
            {eventLocation && (
              <Text style={requestDetail}>
                📍 {eventLocation}
              </Text>
            )}
          </Section>

          {/* Urgency notice */}
          {expiresAt && (
            <Section style={warningBox}>
              <Text style={warningText}>
                ⏰ Cette demande expire le {expiresAt}
              </Text>
            </Section>
          )}

          {/* Actions */}
          <Section style={actionsSection}>
            <Text style={text}>
              Que souhaitez-vous faire?
            </Text>
            <Section style={buttonRow}>
              <Button style={approveButton} href="https://teensparty.ma/parent/approvals">
                ✓ Approuver
              </Button>
              <Button style={rejectButton} href="https://teensparty.ma/parent/approvals">
                ✗ Refuser
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          {/* Info */}
          <Text style={infoText}>
            Vous pouvez gérer toutes les demandes depuis votre dashboard parent.
            L'approbation est nécessaire pour protéger les activités de votre teen.
          </Text>

          {/* Footer */}
          <Text style={footer}>
            <Link href="https://teensparty.ma/parent" style={link}>
              Accéder au dashboard parent
            </Link>
          </Text>
          <Text style={footer}>Teens Party Morocco - Contrôle parental intégré</Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
}

const header = {
  padding: "32px 20px",
  backgroundColor: "#f59e0b",
  textAlign: "center" as const,
}

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
}

const h2 = {
  color: "#1e293b",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "8px 0 12px",
}

const text = {
  color: "#1e293b",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 20px",
}

const requestCard = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 20px",
  borderLeft: "4px solid #f59e0b",
}

const requestType_ = {
  color: "#92400e",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  margin: "0",
  letterSpacing: "0.5px",
}

const requestDetail = {
  color: "#78350f",
  fontSize: "14px",
  margin: "8px 0",
}

const amountText = {
  color: "#b45309",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "12px 0",
}

const warningBox = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "16px 20px",
}

const warningText = {
  color: "#dc2626",
  fontSize: "14px",
  margin: "0",
  textAlign: "center" as const,
}

const actionsSection = {
  padding: "24px 20px",
  textAlign: "center" as const,
}

const buttonRow = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  marginTop: "16px",
}

const approveButton = {
  backgroundColor: "#10b981",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  marginRight: "8px",
}

const rejectButton = {
  backgroundColor: "#ef4444",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  marginLeft: "8px",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
}

const infoText = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: "22px",
  padding: "0 20px",
  textAlign: "center" as const,
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  margin: "8px 0",
}

const link = {
  color: "#f59e0b",
  textDecoration: "underline",
}
