import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface BookingConfirmationEmailProps {
  parentName: string
  childName: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  bookingReference: string
  totalAmount: number
  qrCodeUrl?: string
}

export default function BookingConfirmationEmail({
  parentName = "Parent",
  childName = "Adolescent",
  eventTitle = "Soirée Teens Party",
  eventDate = "15 février 2025",
  eventLocation = "Casablanca",
  bookingReference = "TP-20250215-ABCD",
  totalAmount = 250,
  qrCodeUrl,
}: BookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre réservation pour {eventTitle} est confirmée!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>🎉 Réservation Confirmée!</Heading>
          </Section>

          {/* Greeting */}
          <Text style={text}>Bonjour {parentName},</Text>
          <Text style={text}>
            Nous avons le plaisir de confirmer la réservation de <strong>{childName}</strong> pour l'événement:
          </Text>

          {/* Event Details Card */}
          <Section style={eventCard}>
            <Heading style={h2}>{eventTitle}</Heading>
            <Text style={eventDetail}>
              📅 <strong>Date:</strong> {eventDate}
            </Text>
            <Text style={eventDetail}>
              📍 <strong>Lieu:</strong> {eventLocation}
            </Text>
            <Text style={eventDetail}>
              💳 <strong>Montant:</strong> {totalAmount} DH
            </Text>
            <Text style={eventDetail}>
              🎫 <strong>Référence:</strong> {bookingReference}
            </Text>
          </Section>

          {/* QR Code */}
          {qrCodeUrl && (
            <Section style={qrSection}>
              <Text style={text}>Votre billet électronique:</Text>
              <Img src={qrCodeUrl} alt="QR Code" width="200" height="200" style={qrCode} />
              <Text style={smallText}>Présentez ce QR code à l'entrée</Text>
            </Section>
          )}

          {/* Important Info */}
          <Section style={infoBox}>
            <Heading style={h3}>Informations importantes</Heading>
            <Text style={infoText}>✓ Arrivez 15 minutes avant le début</Text>
            <Text style={infoText}>✓ Une pièce d'identité sera demandée à l'entrée</Text>
            <Text style={infoText}>✓ Événement sécurisé avec encadrement professionnel</Text>
            <Text style={infoText}>✓ Annulation gratuite jusqu'à 48h avant</Text>
          </Section>

          <Hr style={hr} />

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={button} href={`https://teensparty.ma/mes-reservations/${bookingReference}`}>
              Voir ma réservation
            </Button>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            Des questions? Contactez-nous à{" "}
            <Link href="mailto:support@teensparty.ma" style={link}>
              support@teensparty.ma
            </Link>
          </Text>
          <Text style={footer}>Teens Party Morocco - Événements sécurisés pour adolescents</Text>
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
  backgroundColor: "#0891b2",
  textAlign: "center" as const,
}

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
}

const h2 = {
  color: "#0891b2",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 12px",
}

const h3 = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px",
}

const text = {
  color: "#1e293b",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 20px",
}

const eventCard = {
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 20px",
}

const eventDetail = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
}

const qrSection = {
  textAlign: "center" as const,
  padding: "24px 20px",
}

const qrCode = {
  margin: "16px auto",
  border: "2px solid #e2e8f0",
  borderRadius: "8px",
}

const smallText = {
  color: "#64748b",
  fontSize: "12px",
  margin: "8px 0",
}

const infoBox = {
  backgroundColor: "#ecfdf5",
  borderLeft: "4px solid #10b981",
  padding: "20px",
  margin: "24px 20px",
}

const infoText = {
  color: "#065f46",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "4px 0",
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
  backgroundColor: "#0891b2",
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
  color: "#0891b2",
  textDecoration: "underline",
}
