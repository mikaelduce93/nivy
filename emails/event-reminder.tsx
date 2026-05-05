import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components"
import { getPublicAppConfig } from "@/lib/config/app-config"

interface EventReminderEmailProps {
  parentName: string
  childName: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventLocation: string
  bookingReference: string
}

export default function EventReminderEmail({
  parentName = "Parent",
  childName = "Adolescent",
  eventTitle = "Soirée Teens Party",
  eventDate = "demain",
  eventTime = "20:00",
  eventLocation = "Casablanca",
  bookingReference = "TP-20250215-ABCD",
}: EventReminderEmailProps) {
  const { appUrl } = getPublicAppConfig()
  return (
    <Html>
      <Head />
      <Preview>
        Rappel: {eventTitle} c'est {eventDate}!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>⏰ C'est bientôt!</Heading>
          </Section>

          <Text style={text}>Bonjour {parentName},</Text>
          <Text style={text}>
            Nous vous rappelons que <strong>{childName}</strong> participe à l'événement <strong>{eventTitle}</strong>{" "}
            {eventDate} à {eventTime}.
          </Text>

          <Section style={reminderBox}>
            <Heading style={h3}>Checklist avant l'événement</Heading>
            <Text style={checklistItem}>☐ Téléchargez votre billet avec QR code</Text>
            <Text style={checklistItem}>☐ Préparez une pièce d'identité</Text>
            <Text style={checklistItem}>☐ Arrivez 15 minutes en avance</Text>
            <Text style={checklistItem}>☐ Notez l'adresse: {eventLocation}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={buttonContainer}>
            <Button style={button} href={`${appUrl}/mes-reservations/${bookingReference}`}>
              Voir mon billet
            </Button>
          </Section>

          <Text style={footer}>Passez une excellente soirée! 🎉</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
}

const header = {
  padding: "32px 20px",
  backgroundColor: "#f59e0b",
  textAlign: "center" as const,
}

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0",
}

const h3 = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 16px",
}

const text = {
  color: "#1e293b",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 20px",
}

const reminderBox = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  padding: "20px",
  margin: "24px 20px",
}

const checklistItem = {
  color: "#78350f",
  fontSize: "14px",
  lineHeight: "28px",
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
  backgroundColor: "#f59e0b",
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
  fontSize: "14px",
  textAlign: "center" as const,
  padding: "20px",
}
