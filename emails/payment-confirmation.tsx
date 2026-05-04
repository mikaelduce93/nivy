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

interface PaymentConfirmationEmailProps {
  parentName: string
  paymentType: "booking" | "topup"
  amount: number
  description: string
  transactionId: string
  paymentMethod: string
  paidAt: string
}

export default function PaymentConfirmationEmail({
  parentName = "Parent",
  paymentType = "booking",
  amount = 250,
  description = "Réservation événement",
  transactionId = "TRX-123456",
  paymentMethod = "Carte bancaire",
  paidAt = "15 janvier 2025 à 14:30",
}: PaymentConfirmationEmailProps) {
  const isTopup = paymentType === "topup"

  return (
    <Html>
      <Head />
      <Preview>{`Confirmation de paiement - ${amount} DH`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>
              {isTopup ? "💳 Recharge confirmée!" : "✅ Paiement confirmé!"}
            </Heading>
          </Section>

          {/* Greeting */}
          <Text style={text}>Bonjour {parentName},</Text>
          <Text style={text}>
            Votre paiement a été traité avec succès. Voici le récapitulatif de votre transaction:
          </Text>

          {/* Payment Details */}
          <Section style={paymentCard}>
            <Text style={paymentLabel}>Description</Text>
            <Text style={paymentValue}>{description}</Text>

            <Text style={paymentLabel}>Montant</Text>
            <Text style={paymentAmount}>{amount} DH</Text>

            <Text style={paymentLabel}>Méthode de paiement</Text>
            <Text style={paymentValue}>{paymentMethod}</Text>

            <Text style={paymentLabel}>Transaction ID</Text>
            <Text style={paymentValue}>{transactionId}</Text>

            <Text style={paymentLabel}>Date</Text>
            <Text style={paymentValue}>{paidAt}</Text>
          </Section>

          {/* Success Badge */}
          <Section style={successBox}>
            <Text style={successText}>✓ Paiement validé et sécurisé</Text>
          </Section>

          <Hr style={hr} />

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={button} href="https://teensparty.ma/parent/history">
              Voir mon historique
            </Button>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            Une question? Contactez-nous à{" "}
            <Link href="mailto:support@teensparty.ma" style={link}>
              support@teensparty.ma
            </Link>
          </Text>
          <Text style={footer}>Teens Party Morocco - Paiements 100% sécurisés</Text>
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
  backgroundColor: "#10b981",
  textAlign: "center" as const,
}

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
}

const text = {
  color: "#1e293b",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 20px",
}

const paymentCard = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 20px",
  border: "1px solid #e2e8f0",
}

const paymentLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  margin: "16px 0 4px",
  letterSpacing: "0.5px",
}

const paymentValue = {
  color: "#1e293b",
  fontSize: "14px",
  margin: "0 0 8px",
}

const paymentAmount = {
  color: "#10b981",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 8px",
}

const successBox = {
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 20px",
  textAlign: "center" as const,
}

const successText = {
  color: "#059669",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
}

const buttonContainer = {
  padding: "24px 20px",
  textAlign: "center" as const,
}

const button = {
  backgroundColor: "#10b981",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  margin: "8px 0",
}

const link = {
  color: "#10b981",
  textDecoration: "underline",
}
