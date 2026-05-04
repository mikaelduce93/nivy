# Teens Party Morocco - API Documentation

## Overview

This document provides reference documentation for the Teens Party Morocco API.

**Base URL:** `https://teensparty.ma/api`

## Authentication

Most API endpoints require authentication via NextAuth session cookies. Session is automatically managed through the web application.

### CSRF Protection

All mutating requests (POST, PUT, DELETE) require a CSRF token:

```typescript
// Get CSRF token
const response = await fetch('/api/csrf')
const { csrfToken } = await response.json()

// Include in requests
await fetch('/api/bookings/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(data)
})
```

## API Endpoints

### Bookings

#### Create Booking
`POST /api/bookings/create`

Creates a new booking for an event or club.

**Request Body:**
```json
{
  "eventId": "uuid",
  "teenId": "uuid",
  "ticketType": "standard | vip | premium",
  "addons": ["string"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "totalAmount": 150,
    "paymentUrl": "https://..."
  }
}
```

### Check-in

#### Search Attendees
`GET /api/check-in/search?q={query}&eventId={eventId}`

Searches for attendees by name, pseudo, or ticket code.

**Parameters:**
- `q` (required): Search query (min 2 characters)
- `eventId` (required): Event UUID

#### Record Entry
`POST /api/check-in/entry`

Records an attendee's entry to an event.

**Request Body:**
```json
{
  "ticketId": "uuid",
  "eventId": "uuid"
}
```

#### Record Exit
`POST /api/check-in/exit`

Records an attendee's exit from an event.

#### Get Stats
`GET /api/check-in/stats?eventId={eventId}`

Returns check-in statistics for an event.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 150,
    "checkedIn": 120,
    "checkedOut": 45,
    "currentlyInside": 75
  }
}
```

### Payments

#### Process Payment
`POST /api/payments/process`

Process a payment for a booking.

**Request Body:**
```json
{
  "bookingId": "uuid",
  "provider": "stripe | cmi | mobile_money | xp",
  "returnUrl": "https://..."
}
```

#### Pay with XP
`POST /api/payments/xp`

Use accumulated XP coins for payment.

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 50
}
```

### Notifications

#### Get Notifications
`GET /api/notifications?limit=20&unreadOnly=false`

Returns user notifications.

#### Mark as Read
`POST /api/notifications/mark-read`

**Request Body:**
```json
{
  "notificationId": "uuid"
}
```

#### Mark All as Read
`POST /api/notifications/mark-all-read`

### Parent Dashboard

#### Get Teens
`GET /api/parent/teens`

Returns list of teen profiles linked to parent.

#### Create Teen
`POST /api/parent/teens/create`

**Request Body:**
```json
{
  "pseudo": "string",
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "male | female | other",
  "school": "string",
  "interests": ["string"]
}
```

#### Get/Update Budget
`GET /api/parent/budget`
`PUT /api/parent/budget`

**Update Request Body:**
```json
{
  "monthlyLimit": 500,
  "perEventLimit": 200
}
```

### Teen Features

#### Get Profile
`GET /api/teen/profile`

Returns the authenticated teen's profile.

### Tickets

#### Generate PDF
`POST /api/tickets/generate-pdf`

Generates a PDF ticket for a booking.

**Request Body:**
```json
{
  "bookingId": "uuid"
}
```

**Response:** PDF file (application/pdf)

### Admin (Requires Admin Role)

#### Get KPIs
`GET /api/admin/kpis`

Returns key performance indicators dashboard.

#### Export Analytics
`GET /api/admin/analytics/export`

Exports analytics data.

#### Manage Permissions
`GET /api/admin/permissions`
`POST /api/admin/permissions`

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## Rate Limiting

| User Type | Limit |
|-----------|-------|
| Standard | 100 req/min |
| Premium | 500 req/min |
| API Key | 1000 req/min |

## Webhooks

### Stripe Webhook
`POST /api/webhooks/stripe`

Handles Stripe payment events.

### CMI Callback
`POST /api/payments/cmi/callback`
`POST /api/payments/cmi/webhook`

Handles CMI payment callbacks.

## OpenAPI Specification

Full OpenAPI 3.1 specification available at:
- `docs/api/openapi.yaml`

You can view this in Swagger UI or import into Postman.
