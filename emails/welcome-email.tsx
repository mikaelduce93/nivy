import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

interface WelcomeEmailProps {
  name: string
}

export default function WelcomeEmail({ name = "Parent" }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur Teens Party Morocco!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>👋 Bienvenue!</Heading>
          </Section>

          <Text style={text}>Bonjour {name},</Text>
          <Text style={text}>
            Merci d'avoir créé votre compte sur <strong>Teens Party Morocco</strong>, la plateforme n°1 d'événements
            sécurisés pour adolescents au Maroc.
          </Text>

          <Section style={featuresBox}>
            <Heading style={h3}>Découvrez nos services:</Heading>
            <Text style={featureItem}>🎉 Soirées encadrées et sécurisées</Text>
            <Text style={featureItem}>🏆 Clubs sportifs et artistiques</Text>
            <Text style={featureItem}>🎁 Programme de fidélité avec récompenses</Text>
            <Text style={featureItem}>👥 Rejoignez notre communauté</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href="https://teensparty.ma/evenements">
              Découvrir les événements
            </Button>
          </Section>

          <Text style={footer}>
            À très bientôt,
            <br />
            L'équipe Teens Party Morocco
          </Text>
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
  backgroundColor: "#8b5cf6",
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

const featuresBox = {
  backgroundColor: "#f5f3ff",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 20px",
}

const featureItem = {
  color: "#4c1d95",
  fontSize: "14px",
  lineHeight: "28px",
  margin: "4px 0",
}

const buttonContainer = {
  padding: "24px 20px",
  textAlign: "center" as const,
}

const button = {
  backgroundColor: "#8b5cf6",
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
  color: "#64748b",
  fontSize: "14px",
  lineHeight: "24px",
  padding: "20px",
  textAlign: "center" as const,
}
