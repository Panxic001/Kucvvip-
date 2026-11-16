# KUCOIN VIP Trading Platform

## Overview

KUCOIN VIP is a comprehensive cryptocurrency trading platform built with a modern full-stack architecture. The application provides real-time trading capabilities, user authentication, wallet management, referral systems, and administrative controls. The platform simulates cryptocurrency trading with configurable win rates and includes comprehensive user management features.

## System Architecture

The application follows a monorepo structure with clear separation between client and server components:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom KuCoin branding
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state and caching
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Email Service**: SendGrid for transactional emails
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

### Database Design
- **ORM**: Drizzle with type-safe schema definitions
- **Database**: PostgreSQL (configured for Neon serverless)
- **Tables**: Users, trades, transactions, referrals, site configuration, KYC verifications, password reset tokens
- **Relationships**: Foreign key constraints with proper indexing

## Key Components

### Authentication System
- JWT token-based authentication
- Secure password hashing with bcrypt
- Role-based access control (user, admin, super_admin)
- Password reset functionality via email
- Session persistence with secure storage

### Trading Engine
- Simulated cryptocurrency trading with 40+ pairs
- Configurable trade outcomes based on user-specific win rates
- Duration-based profit percentages (30s=30%, 1m=45%, 3m=55%, 5m=60%, 10m=65%, 15m=70%, 30m=85%, 1h=98%)
- Real-time trade execution with countdown timers
- Portfolio tracking and P&L calculations
- Trade history with filtering and pagination

### Wallet Management
- Multi-cryptocurrency support with expanded withdrawal options
- Advanced withdrawal system supporting 9 cryptocurrency options:
  - USDT TRC20 (Tron Network - Low fees)
  - USDT ERC20 (Ethereum Network - Higher fees)
  - Ethereum (ETH) on ERC20
  - Bitcoin (BTC) on Bitcoin Network
  - USDC TRC20 (USD Coin on Tron)
  - USDC ERC20 (USD Coin on Ethereum)
  - Tron (TRX) on TRC20
  - BNB on Binance Smart Chain (BSC)
  - BUSD on Binance Smart Chain (BSC)
- Deposit and withdrawal functionality with network-specific fee structures
- Multiple network support (TRC20, ERC20, Bitcoin, BSC)
- QR code generation for wallet addresses
- Transaction status tracking and admin approval workflows
- User-friendly cryptocurrency selection with icons and fee information

### Referral System
- Unique referral codes for each user
- Hierarchical referral tracking
- Bonus calculations and distribution
- Referral statistics and earnings tracking

### Administrative Interface
- User management with status controls (active, banned, blocked)
- Transaction approval/rejection workflows
- Site configuration management
- Trade outcome manipulation capabilities
- Comprehensive analytics and reporting
- Blacklist management system for blocking email addresses and phone numbers from registration
- Admin topup system for manually crediting user accounts with instant balance updates

### Visitor Tracking System
- Real-time visitor tracking with IP geolocation using ip-api.com
- VPN/Proxy detection for security monitoring
- High-risk country flagging (configurable list: RU, CN, KP, IR, etc.)
- Multiple IP activity detection for logged-in users
- New country login detection for existing users
- Rate-limited tracking (1-minute window per IP/user combo)
- Full device/browser/OS detection

### Telegram Admin Notifications
- Real-time alerts for all visitor activity
- Registered vs unregistered user visit notifications
- Security alerts for VPN usage, high-risk countries, suspicious activity
- Daily summary reports with 24-hour analytics
- New user registration notifications
- Deposit and withdrawal status notifications
- Trade execution alerts

## Data Flow

1. **User Authentication**: Users register/login → JWT tokens issued → Stored in localStorage
2. **Trading Flow**: User initiates trade → Parameters validated → Trade stored with outcome prediction → Results calculated based on win rate
3. **Wallet Operations**: Deposit/withdrawal requests → Admin approval workflow → Status updates → Email notifications
4. **Referral Processing**: User registration with referral code → Referral relationship created → Bonus calculations triggered

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Email Service**: SendGrid for all email communications
- **UI Components**: Radix UI primitives for accessible components
- **Validation**: Zod for runtime type validation

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESBuild**: Fast bundling for production
- **Drizzle Kit**: Database migrations and schema management
- **TSX**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20
- **Database**: PostgreSQL 16 module
- **Port Configuration**: Internal port 5000, external port 80
- **Hot Reload**: Vite dev server with HMR support

### Production Build
- **Frontend**: Vite build with optimizations
- **Backend**: ESBuild bundling with external packages
- **Static Assets**: Served from dist/public
- **Process Management**: Single Node.js process

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `SENDGRID_API_KEY`: API key for email service
- `NODE_ENV`: Environment specification

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
- July 15, 2025. Implemented duration-based profit percentage system with 8 timeframes
- July 17, 2025. Expanded withdrawal system with 9 cryptocurrency options including USDT TRC20/ERC20, ETH, BTC, USDC, TRX, BNB, and BUSD support
- July 17, 2025. Fixed customer chat widget visibility in admin panel with comprehensive hiding mechanisms
- July 17, 2025. Successfully executed migration announcement email campaign to all 5 registered users
- July 17, 2025. Fixed withdrawal system schema validation issues - updated cryptocurrency enum to support all 9 withdrawal options
- July 17, 2025. Resolved authentication flow issues - improved user login experience with demo account access
- August 18, 2025. Removed duration-based profit rates - all users now use admin-controlled win percentages only for complete profit control
- November 08, 2025. Added blacklist management system - admins can now block email addresses and phone numbers from registering new accounts
- December 17, 2025. Added admin topup credit feature - admins can now manually add credits to user accounts with optional notes, appears in user transaction history as inbound transfer
- December 25, 2025. Implemented complete visitor tracking system with IP geolocation, VPN/proxy detection, high-risk country monitoring, and real-time Telegram notifications
- December 25, 2025. Added daily summary reports for 24-hour visit analytics sent via Telegram
- February 14, 2026. Added Gift Card Redemption payment method with 10 supported gift card types, image upload, admin approval/decline workflow, duplicate code prevention, daily submission limits, and encrypted code storage
- February 14, 2026. Enhanced Gift Card system with multi-currency support (15 currencies), gift card format selection (E-Gift/Physical), automatic currency-to-USDT conversion on admin approval using live exchange rates from exchangerate-api.com, live rate preview for users
- February 22, 2026. Added withdrawal receipt system - approved withdrawals get a system-generated TXID with a dark-themed branded receipt dialog, download capability, and copy-to-clipboard functionality
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```