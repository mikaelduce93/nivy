import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security/api-middleware'

export const POST = withSecurity(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    const data = await request.json()

    const {
      partner_type,
      company_name,
      company_registration_number,
      tax_id,
      email,
      phone,
      website,
      address,
      city,
      postal_code,
      description,
      contact_person_name,
      contact_person_role,
      contact_person_phone,
      contact_person_email,
    } = data

    // 1. Créer le partenaire principal
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        partner_type,
        company_name,
        company_registration_number,
        tax_id,
        email,
        phone,
        website,
        address,
        city,
        postal_code,
        description,
        contact_person_name,
        contact_person_role,
        contact_person_phone,
        contact_person_email,
        status: 'pending',
      })
      .select()
      .single()

    if (partnerError) {
      console.error('Error creating partner:', partnerError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du partenaire', details: partnerError.message },
        { status: 500 }
      )
    }

    const partnerId = partner.id

    // 2. Traiter selon le type de partenaire
    switch (partner_type) {
      case 'retail':
        await handleRetailPartner(supabase, partnerId, data)
        break
      case 'venue':
        await handleVenuePartner(supabase, partnerId, data)
        break
      case 'club':
        await handleClubPartner(supabase, partnerId, data)
        break
      case 'education':
        await handleEducationPartner(supabase, partnerId, data)
        break
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Demande de partenariat soumise avec succès',
        partnerId,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in partner registration:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    )
  }
}, { rateLimit: 'api' })

// =============================================
// RETAIL PARTNER
// =============================================
async function handleRetailPartner(supabase: any, partnerId: string, data: any) {
  const { locations, discounts } = data

  // Créer les locations
  if (locations && locations.length > 0) {
    const locationsToInsert = locations.map((loc: any) => ({
      partner_id: partnerId,
      location_name: loc.location_name,
      address: loc.address,
      city: loc.city,
      postal_code: loc.postal_code,
      phone: loc.phone,
    }))

    const { error: locationsError } = await supabase
      .from('partner_locations')
      .insert(locationsToInsert)

    if (locationsError) {
      console.error('Error creating locations:', locationsError)
      throw new Error('Erreur lors de la création des points de vente')
    }
  }

  // Créer les discounts
  if (discounts && discounts.length > 0) {
    const discountsToInsert = discounts.map((disc: any) => ({
      partner_id: partnerId,
      discount_name: disc.discount_name,
      description: disc.description,
      discount_type: disc.discount_type,
      discount_value: disc.discount_value,
      min_vip_level: disc.min_vip_level,
      min_purchase_amount: disc.min_purchase_amount,
      max_discount_amount: disc.max_discount_amount,
      valid_from: disc.valid_from,
      valid_until: disc.valid_until,
      applicable_categories: disc.applicable_categories,
      is_active: false, // Inactif jusqu'à approbation
    }))

    const { error: discountsError } = await supabase
      .from('partner_discounts')
      .insert(discountsToInsert)

    if (discountsError) {
      console.error('Error creating discounts:', discountsError)
      throw new Error('Erreur lors de la création des réductions')
    }
  }
}

// =============================================
// VENUE PARTNER
// =============================================
async function handleVenuePartner(supabase: any, partnerId: string, data: any) {
  const { venue_details, menu_items, event_packages } = data

  // Créer le venue
  const { data: venue, error: venueError } = await supabase
    .from('partner_venues')
    .insert({
      partner_id: partnerId,
      venue_type: venue_details.venue_type,
      capacity: venue_details.capacity,
      has_parking: venue_details.has_parking,
      has_wifi: venue_details.has_wifi,
      has_outdoor_seating: venue_details.has_outdoor_seating,
      cuisine_types: venue_details.cuisine_types,
      price_range: venue_details.price_range,
    })
    .select()
    .single()

  if (venueError) {
    console.error('Error creating venue:', venueError)
    throw new Error('Erreur lors de la création du lieu')
  }

  const venueId = venue.id

  // Créer les menu items
  if (menu_items && menu_items.length > 0) {
    const menuItemsToInsert = menu_items.map((item: any) => ({
      venue_id: venueId,
      item_name: item.item_name,
      description: item.description,
      category: item.category,
      base_price: item.base_price,
      is_vegetarian: item.is_vegetarian,
      is_vegan: item.is_vegan,
      is_gluten_free: item.is_gluten_free,
      is_available: false, // Inactif jusqu'à approbation
    }))

    const { error: menuError } = await supabase
      .from('venue_menu_items')
      .insert(menuItemsToInsert)

    if (menuError) {
      console.error('Error creating menu items:', menuError)
      throw new Error('Erreur lors de la création du menu')
    }
  }

  // Créer les event packages
  if (event_packages && event_packages.length > 0) {
    const packagesToInsert = event_packages.map((pkg: any) => ({
      venue_id: venueId,
      package_name: pkg.package_name,
      description: pkg.description,
      package_type: pkg.package_type,
      min_guests: pkg.min_guests,
      max_guests: pkg.max_guests,
      base_price_per_person: pkg.base_price_per_person,
      duration_hours: pkg.duration_hours,
      is_active: false, // Inactif jusqu'à approbation
    }))

    const { error: packagesError } = await supabase
      .from('venue_event_packages')
      .insert(packagesToInsert)

    if (packagesError) {
      console.error('Error creating packages:', packagesError)
      throw new Error('Erreur lors de la création des packages')
    }
  }
}

// =============================================
// CLUB PARTNER
// =============================================
async function handleClubPartner(supabase: any, partnerId: string, data: any) {
  const { club_details, offerings } = data

  // Créer le club
  const { data: club, error: clubError } = await supabase
    .from('partner_clubs')
    .insert({
      partner_id: partnerId,
      club_type: club_details.club_type,
      specialties: club_details.specialties,
      min_age: club_details.min_age,
      max_age: club_details.max_age,
      offers_trial_session: club_details.offers_trial_session,
      trial_session_price: club_details.trial_session_price,
      instructor_qualifications: club_details.instructor_qualifications,
    })
    .select()
    .single()

  if (clubError) {
    console.error('Error creating club:', clubError)
    throw new Error('Erreur lors de la création du club')
  }

  const clubId = club.id

  // Créer les offerings
  if (offerings && offerings.length > 0) {
    const offeringsToInsert = offerings.map((off: any) => ({
      club_id: clubId,
      offering_name: off.offering_name,
      description: off.description,
      offering_type: off.offering_type,
      base_price: off.base_price,
      billing_cycle: off.billing_cycle,
      skill_level: off.skill_level,
      max_participants: off.max_participants,
      is_active: false, // Inactif jusqu'à approbation
    }))

    const { error: offeringsError } = await supabase
      .from('club_offerings')
      .insert(offeringsToInsert)

    if (offeringsError) {
      console.error('Error creating offerings:', offeringsError)
      throw new Error('Erreur lors de la création des offres')
    }
  }
}

// =============================================
// EDUCATION PARTNER
// =============================================
async function handleEducationPartner(supabase: any, partnerId: string, data: any) {
  const { education_details, courses } = data

  // Pour l'instant, stocker les détails d'éducation dans la description ou JSONB
  // Vous pouvez créer une table partner_education si nécessaire

  // Stocker les cours dans un champ JSONB pour l'instant
  // Ou créer une table education_courses si vous le souhaitez
  const { error: updateError } = await supabase
    .from('partners')
    .update({
      business_hours: {
        education_details,
        courses,
      },
    })
    .eq('id', partnerId)

  if (updateError) {
    console.error('Error updating education details:', updateError)
    throw new Error('Erreur lors de la mise à jour des détails de formation')
  }
}
