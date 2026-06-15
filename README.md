# Abiola NERD Registration App

A professional full-stack NERD registration platform built with a React + TypeScript frontend and an Express + TypeScript backend arranged with an MVC-style backend structure.

## Architecture

```text
backend/src
├── app/              # Express app composition
├── config/           # Environment and database configuration
├── controllers/      # MVC controllers for auth, admin, and public registration flows
├── middleware/       # JWT admin middleware
├── models/           # Mongoose models
├── routes/           # Feature route modules
├── services/         # Cloudinary, Paystack, and PDF integrations
└── validators/       # Joi request validation schemas

frontend/src
├── api/              # API client
├── components/       # Reusable UI components
├── constants/        # Registration form field definitions
├── pages/            # Admin dashboard and registration pages
└── types/            # Shared frontend TypeScript types
```

## Features

- Admin login and dashboard overview for links, active/revoked links, registrations, completed records, and uncompleted records.
- Worker registration link generation, revocation/restoration, and PDF credential generation with worker name, link, and passcode.
- Public NERD registration form covering personal information, contact information, next of kin, academic data, supervisor, HOD, and document uploads.
- Worker self-service panel protected by the worker passcode to view registrations under that link.
- Paystack payment initialization and verification before registration records are created.
- Cloudinary document uploads for passport, NIN picture, result/statement, signed certification page, and project PDF.
- MongoDB/Mongoose persistence with transaction-based registration/payment/document updates.
- Admin registration filtering by worker link and completion status toggling.

## Setup

```bash
npm install
cp backend/.env.example backend/.env
npm run dev:backend
npm run dev:frontend
```

Default local admin credentials are controlled by environment variables and fall back to `admin@nerd.local` / `admin12345`.
