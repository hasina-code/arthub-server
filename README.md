# 🎨 ArtHub – Server

## Project Purpose

This backend powers the ArtHub platform by handling authentication, role management, artwork CRUD operations, Stripe payments, subscriptions, comments, analytics, and purchase management.

## 🌐 Live Site

https://arthub-server-phi.vercel.app

## Key Features

- RESTful API architecture
- JWT/Session-based authentication
- Role-based authorization
- Buyer, Artist, and Admin APIs
- Artwork CRUD operations
- Comment management system
- Purchase history management
- Stripe payment integration
- Subscription management
- Analytics and dashboard statistics
- Secure API endpoints
- MongoDB database integration

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Stripe API
- CORS
- Dotenv

## NPM Packages Used

express
mongodb
cors
dotenv
stripe

## Environment Variables

Create a .env file and add:

PORT=
MONGODB_URI=
BETTER_AUTH_SECRET=
STRIPE_SECRET_KEY=
CLIENT_URL=

## API Endpoints Overview

### Public Routes

- GET `/artworks`
- GET `/artworks/featured`
- GET `/artworks/:id`

### Buyer Routes

- POST `/create-checkout-session`
- POST `/purchase-success`
- GET `/purchase-history/:email`
- POST `/artworks/:id/comments`

### Artist Routes

- POST `/artist/artworks`
- PATCH `/artworks/:id`
- DELETE `/artworks/:id`

### Admin Routes

- GET `/users`
- PATCH `/users/role/:id`
- GET `/admin/analytics`
- GET `/admin/transactions`
