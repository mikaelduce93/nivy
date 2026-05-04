'use client'

/**
 * TEENS PARTY MOROCCO - Secure Form Examples
 * ==========================================
 *
 * Exemples d'utilisation des formulaires sécurisés.
 * Ces exemples démontrent les patterns recommandés.
 */

import { z } from 'zod'
import {
  SecureForm,
  FormField,
  ControlledField,
  SubmitButton,
  ResetButton,
  GlobalError,
  FormSection,
  FormActions,
} from '@/components/ui/forms'
import { useSecureForm } from '@/lib/hooks/use-secure-form'
import {
  loginSchema,
  registerSchema,
  contactSchema,
  emailSchema,
  nameSchema,
  phoneSchema,
  passwordSchema,
} from '@/lib/validation/schemas'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

/* ==========================================================================
   EXEMPLE 1: LOGIN FORM (Simple)
   ========================================================================== */

export function LoginFormExample() {
  // Simulation d'action serveur
  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    // Simuler un délai réseau
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simuler une erreur pour démonstration
    if (data.email === 'error@test.com') {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    console.log('Login successful:', data)
    return { success: true }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Connexion</h2>

      <SecureForm
        formOptions={{
          schema: loginSchema,
          defaultValues: { email: '', password: '', remember: false },
        }}
        action={handleLogin}
      >
        <GlobalError />

        <FormField
          name="email"
          label="Email"
          type="email"
          placeholder="votre@email.com"
          required
          autoComplete="email"
        />

        <FormField
          name="password"
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <div className="flex items-center gap-2">
          <Checkbox id="remember" name="remember" />
          <Label htmlFor="remember" className="text-sm">
            Se souvenir de moi
          </Label>
        </div>

        <FormActions>
          <SubmitButton>Se connecter</SubmitButton>
        </FormActions>
      </SecureForm>
    </div>
  )
}

/* ==========================================================================
   EXEMPLE 2: CONTACT FORM (Avec sections)
   ========================================================================== */

export function ContactFormExample() {
  const handleContact = async (data: z.infer<typeof contactSchema>) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Contact form submitted:', data)
    return { success: true }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Nous contacter</h2>

      <SecureForm
        formOptions={{
          schema: contactSchema,
          resetOnSuccess: true,
          onSuccess: () => {
            alert('Message envoyé avec succès !')
          },
        }}
        action={handleContact}
      >
        <GlobalError />

        <FormSection title="Vos coordonnées">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="name"
              label="Nom complet"
              placeholder="Jean Dupont"
              required
              autoComplete="name"
            />
            <FormField
              name="email"
              label="Email"
              type="email"
              placeholder="jean@example.com"
              required
              autoComplete="email"
            />
          </div>
          <FormField
            name="phone"
            label="Téléphone"
            type="tel"
            placeholder="0612345678"
            autoComplete="tel"
            description="Optionnel"
          />
        </FormSection>

        <FormSection title="Votre message">
          <FormField
            name="subject"
            label="Sujet"
            placeholder="Objet de votre message"
            required
          />
          <FormField
            name="message"
            label="Message"
            type="textarea"
            placeholder="Décrivez votre demande..."
            rows={6}
            required
          />
        </FormSection>

        <FormActions align="between">
          <ResetButton />
          <SubmitButton loadingText="Envoi...">Envoyer le message</SubmitButton>
        </FormActions>
      </SecureForm>
    </div>
  )
}

/* ==========================================================================
   EXEMPLE 3: REGISTRATION (Avec champs contrôlés)
   ========================================================================== */

const registrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  userType: z.enum(['parent', 'teen']),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les conditions' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

type RegistrationData = z.infer<typeof registrationSchema>

export function RegistrationFormExample() {
  const handleRegister = async (data: RegistrationData) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log('Registration:', data)
    return { success: true }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Créer un compte</h2>

      <SecureForm
        formOptions={{
          schema: registrationSchema,
          defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            userType: 'parent',
            acceptTerms: false as unknown as true,
          },
          onSuccess: () => {
            alert('Compte créé avec succès !')
          },
        }}
        action={handleRegister}
      >
        {(form, state) => (
          <>
            <GlobalError />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                name="firstName"
                label="Prénom"
                placeholder="Jean"
                required
                autoComplete="given-name"
              />
              <FormField
                name="lastName"
                label="Nom"
                placeholder="Dupont"
                required
                autoComplete="family-name"
              />
            </div>

            <FormField
              name="email"
              label="Email"
              type="email"
              placeholder="jean@example.com"
              required
              autoComplete="email"
            />

            <FormField
              name="phone"
              label="Téléphone"
              type="tel"
              placeholder="0612345678"
              required
              autoComplete="tel"
            />

            {/* Exemple de champ contrôlé avec Select */}
            <ControlledField<RegistrationData>
              name="userType"
              label="Type de compte"
              required
            >
              {({ value, onChange, disabled }) => (
                <Select
                  value={value as string}
                  onValueChange={onChange}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Je suis parent</SelectItem>
                    <SelectItem value="teen">Je suis un teen</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </ControlledField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                name="password"
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                description="Min. 8 caractères, 1 majuscule, 1 chiffre"
              />
              <FormField
                name="confirmPassword"
                label="Confirmer"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            {/* Checkbox contrôlé */}
            <ControlledField<RegistrationData>
              name="acceptTerms"
              label=""
            >
              {({ value, onChange, disabled, error }) => (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="acceptTerms"
                      checked={value as boolean}
                      onCheckedChange={onChange}
                      disabled={disabled}
                      aria-invalid={!!error}
                    />
                    <Label htmlFor="acceptTerms" className="text-sm leading-tight">
                      J&apos;accepte les{' '}
                      <a href="/terms" className="underline text-primary">
                        conditions d&apos;utilisation
                      </a>{' '}
                      et la{' '}
                      <a href="/privacy" className="underline text-primary">
                        politique de confidentialité
                      </a>
                    </Label>
                  </div>
                </div>
              )}
            </ControlledField>

            <FormActions>
              <SubmitButton size="lg" loadingText="Création...">
                Créer mon compte
              </SubmitButton>
            </FormActions>

            {/* Affichage debug en dev */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Debug: État du formulaire
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto">
                  {JSON.stringify({ state, values: form.watch() }, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </SecureForm>
    </div>
  )
}

/* ==========================================================================
   EXEMPLE 4: HOOK DIRECT (Sans SecureForm wrapper)
   ========================================================================== */

const searchSchema = z.object({
  query: z.string().min(2, 'Min. 2 caractères'),
  category: z.string().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().max(100000).optional(),
})

export function DirectHookExample() {
  const { form, state, handleSecureSubmit, reset } = useSecureForm({
    schema: searchSchema,
    submitDelay: 300, // Délai court pour recherche
    mode: 'onChange',
  })

  const handleSearch = async (data: z.infer<typeof searchSchema>) => {
    console.log('Search:', data)
    // Effectuer la recherche...
    return { success: true }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Recherche</h2>

      <form onSubmit={handleSecureSubmit(handleSearch)} className="space-y-4">
        <div>
          <Label htmlFor="query">Rechercher</Label>
          <input
            {...form.register('query')}
            id="query"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Que recherchez-vous ?"
          />
          {form.formState.errors.query && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.query.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceMin">Prix min</Label>
            <input
              {...form.register('priceMin')}
              id="priceMin"
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="priceMax">Prix max</Label>
            <input
              {...form.register('priceMax')}
              id="priceMax"
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="1000"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={state.isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            {state.isSubmitting ? 'Recherche...' : 'Rechercher'}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 border rounded-md"
          >
            Effacer
          </button>
        </div>
      </form>
    </div>
  )
}

/* ==========================================================================
   SHOWCASE
   ========================================================================== */

export function SecureFormShowcase() {
  return (
    <div className="space-y-12 py-8">
      <section>
        <h1 className="text-3xl font-bold text-center mb-2">
          Formulaires Sécurisés
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Démonstration des patterns de formulaire avec Zod + React Hook Form
        </p>
      </section>

      <section className="border-b pb-12">
        <LoginFormExample />
      </section>

      <section className="border-b pb-12">
        <ContactFormExample />
      </section>

      <section className="border-b pb-12">
        <RegistrationFormExample />
      </section>

      <section>
        <DirectHookExample />
      </section>
    </div>
  )
}
