/**
 * TEENS PARTY MOROCCO - Error Messages Helper
 * ===========================================
 * 
 * Messages d'erreur contextuels et accessibles pour l'utilisateur.
 * Évite le jargon technique et propose des actions claires.
 */

export const ErrorMessages = {
  // Authentification
  auth: {
    notAuthenticated: {
      title: 'Connexion requise',
      message: 'Vous devez être connecté pour accéder à cette page.',
      suggestion: 'Connectez-vous ou créez un compte pour continuer.',
      action: 'Se connecter',
    },
    sessionExpired: {
      title: 'Session expirée',
      message: 'Votre session a expiré pour des raisons de sécurité.',
      suggestion: 'Reconnectez-vous pour continuer.',
      action: 'Se reconnecter',
    },
    invalidCredentials: {
      title: 'Identifiants incorrects',
      message: 'L\'email ou le mot de passe que vous avez saisi est incorrect.',
      suggestion: 'Vérifiez vos identifiants et réessayez. Si vous avez oublié votre mot de passe, utilisez la réinitialisation.',
      action: 'Réessayer',
    },
  },

  // Réservations
  booking: {
    notFound: {
      title: 'Réservation introuvable',
      message: 'Cette réservation n\'existe pas ou a été supprimée.',
      suggestion: 'Vérifiez que vous avez bien accès à cette réservation ou consultez vos réservations.',
      action: 'Voir mes réservations',
    },
    budgetExceeded: {
      title: 'Budget dépassé',
      message: 'Le montant de cette réservation dépasse le budget disponible.',
      suggestion: 'Demandez l\'approbation de vos parents ou choisissez un événement moins cher.',
      action: 'Voir d\'autres événements',
    },
    eventFull: {
      title: 'Événement complet',
      message: 'Désolé, cet événement est complet.',
      suggestion: 'Consultez d\'autres événements disponibles ou inscrivez-vous sur la liste d\'attente.',
      action: 'Voir d\'autres événements',
    },
    alreadyBooked: {
      title: 'Déjà réservé',
      message: 'Vous avez déjà une réservation pour cet événement.',
      suggestion: 'Consultez vos réservations pour voir les détails.',
      action: 'Voir mes réservations',
    },
  },

  // Paiements
  payment: {
    failed: {
      title: 'Paiement échoué',
      message: 'Votre paiement n\'a pas pu être traité.',
      suggestion: 'Vérifiez vos informations de paiement ou essayez une autre méthode. Votre réservation est toujours en attente.',
      action: 'Réessayer le paiement',
    },
    cancelled: {
      title: 'Paiement annulé',
      message: 'Vous avez annulé le processus de paiement.',
      suggestion: 'Votre réservation est toujours en attente. Vous pouvez compléter le paiement plus tard.',
      action: 'Compléter le paiement',
    },
    timeout: {
      title: 'Paiement en attente',
      message: 'Votre paiement est en cours de traitement. Cela peut prendre quelques minutes.',
      suggestion: 'Ne fermez pas cette page. Vous recevrez une confirmation une fois le paiement validé.',
      action: 'Actualiser',
    },
  },

  // Réseau
  network: {
    offline: {
      title: 'Pas de connexion',
      message: 'Vous n\'êtes pas connecté à internet.',
      suggestion: 'Vérifiez votre connexion WiFi ou mobile et réessayez.',
      action: 'Réessayer',
    },
    timeout: {
      title: 'Connexion lente',
      message: 'La connexion prend trop de temps. Votre réseau peut être instable.',
      suggestion: 'Vérifiez votre connexion internet et réessayez. Si le problème persiste, passez en WiFi.',
      action: 'Réessayer',
    },
    serverError: {
      title: 'Service temporairement indisponible',
      message: 'Notre serveur rencontre un problème technique.',
      suggestion: 'Nos équipes travaillent sur la résolution. Réessayez dans quelques instants.',
      action: 'Réessayer',
    },
  },

  // Validation
  validation: {
    required: {
      title: 'Champ requis',
      message: 'Ce champ est obligatoire.',
      suggestion: 'Remplissez tous les champs marqués d\'un astérisque (*).',
      action: 'Corriger',
    },
    invalidFormat: {
      title: 'Format incorrect',
      message: 'Le format de cette information n\'est pas valide.',
      suggestion: 'Vérifiez le format attendu (ex: email, téléphone) et corrigez.',
      action: 'Corriger',
    },
    tooShort: {
      title: 'Trop court',
      message: 'Cette information est trop courte.',
      suggestion: 'Assurez-vous de respecter la longueur minimale requise.',
      action: 'Corriger',
    },
    tooLong: {
      title: 'Trop long',
      message: 'Cette information est trop longue.',
      suggestion: 'Réduisez la longueur pour respecter la limite.',
      action: 'Corriger',
    },
  },

  // Générique
  generic: {
    unexpected: {
      title: 'Oups, quelque chose s\'est mal passé',
      message: 'Une erreur inattendue s\'est produite.',
      suggestion: 'Essayez de rafraîchir la page. Si le problème persiste, notre équipe a été automatiquement notifiée.',
      action: 'Rafraîchir',
    },
    notFound: {
      title: 'Page introuvable',
      message: 'La page que vous recherchez n\'existe pas.',
      suggestion: 'Vérifiez l\'adresse ou retournez à l\'accueil.',
      action: 'Retour à l\'accueil',
    },
    forbidden: {
      title: 'Accès non autorisé',
      message: 'Vous n\'avez pas les permissions nécessaires.',
      suggestion: 'Si vous pensez que c\'est une erreur, vérifiez que vous êtes connecté avec le bon compte.',
      action: 'Retour',
    },
  },
} as const

/**
 * Get error message by category and type
 */
export function getErrorMessage(
  category: keyof typeof ErrorMessages,
  type: string,
): typeof ErrorMessages.auth.notAuthenticated {
  const categoryMessages = ErrorMessages[category] as Record<string, typeof ErrorMessages.auth.notAuthenticated>
  return categoryMessages[type] || ErrorMessages.generic.unexpected
}

/**
 * Format error for API response
 */
export function formatApiError(
  category: keyof typeof ErrorMessages,
  type: string,
  technicalError?: string,
) {
  const message = getErrorMessage(category, type)
  return {
    error: {
      ...message,
      technical: process.env.NODE_ENV === 'development' ? technicalError : undefined,
    },
  }
}







