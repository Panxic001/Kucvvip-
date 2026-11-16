import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  mobileNumber: text("mobile_number"),
  avatar: text("avatar"),
  walletAddress: text("wallet_address"),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredBy: integer("referred_by").references(() => users.id),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  role: text("role").notNull().default("user"), // user, admin, super_admin
  status: text("status").notNull().default("active"), // active, banned, blocked
  withdrawalBanned: boolean("withdrawal_banned").notNull().default(false), // true if banned from withdrawals
  withdrawalBanReason: text("withdrawal_ban_reason"), // Reason for withdrawal ban
  tradeWinRate: decimal("trade_win_rate", { precision: 5, scale: 2 }).default("50.00"), // Percentage for trade outcomes
  winPercentage: decimal("win_percentage", { precision: 6, scale: 2 }).notNull().default("85.00"), // Admin-controlled profit percentage when winning (e.g., 35%, 85%, 120%)
  createdAt: timestamp("created_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  pair: text("pair").notNull().default("BTC/USDT"),
  tradeType: text("trade_type").notNull(), // 'buy' or 'sell'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 2 }).notNull(),
  duration: decimal("duration", { precision: 4, scale: 1 }).notNull(), // in minutes
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  result: text("result"), // 'win', 'loss', or null if ongoing
  pnl: decimal("pnl", { precision: 10, scale: 2 }), // profit/loss amount
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'deposit' or 'withdrawal' or 'credit'
  cryptocurrency: text("cryptocurrency").notNull().default("USDT"), // 'USDT', 'TRX', 'ETH', 'BTC'
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(), // Support larger amounts with 2 decimal places
  status: text("status").notNull().default("pending"), // 'pending', 'auto_confirmed', 'manually_confirmed', 'approved', 'declined', 'completed', 'failed', 'rejected'
  walletAddress: text("wallet_address"),
  network: text("network"), // 'TRC20', 'ERC20', 'BTC', 'BSC', etc.
  transactionHash: text("transaction_hash").unique(), // TXID - must be unique to prevent double claims
  adminNote: text("admin_note"), // Admin notes for approval/decline
  approvedBy: integer("approved_by").references(() => users.id), // Admin who approved/declined
  isFirstDeposit: boolean("is_first_deposit").notNull().default(false),
  referralBonusProcessed: boolean("referral_bonus_processed").notNull().default(false),
  proofFilePath: text("proof_file_path"), // Path to uploaded proof file
  proofFileName: text("proof_file_name"), // Original filename
  depositWalletAddress: text("deposit_wallet_address"), // Snapshot of the wallet address used at submission
  validationStatus: text("validation_status"), // 'pending_validation', 'validating', 'validated', 'failed', 'manual_review'
  confirmationCount: integer("confirmation_count").default(0), // Number of blockchain confirmations
  validatedAmount: decimal("validated_amount", { precision: 15, scale: 6 }), // Amount found on blockchain
  validatedContract: text("validated_contract"), // Token contract verified
  validationLog: text("validation_log"), // JSON log of all validation steps
  autoValidatedAt: timestamp("auto_validated_at"), // When auto-validation completed
  manuallyValidatedAt: timestamp("manually_validated_at"), // When admin manually approved
  lastValidationCheck: timestamp("last_validation_check"), // Last time validation was checked
  receiptTxid: text("receipt_txid"), // System-generated TXID for withdrawal receipts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id),
  referredUserId: integer("referred_user_id").notNull().references(() => users.id),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull().default("10.00"),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).default("0.00"), // 50% of first deposit
  hasReceivedBonus: boolean("has_received_bonus").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteConfig = pgTable("site_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const kycVerifications = pgTable("kyc_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fullName: text("full_name").notNull(),
  idFrontImage: text("id_front_image").notNull(), // Base64 encoded image
  idBackImage: text("id_back_image").notNull(), // Base64 encoded image
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'email' or 'phone'
  value: text("value").notNull().unique(), // the email or phone number to blacklist
  reason: text("reason"), // optional reason for blacklisting
  addedBy: integer("added_by").references(() => users.id), // admin who added it
  createdAt: timestamp("created_at").defaultNow(),
});

export const depositWallets = pgTable("deposit_wallets", {
  id: serial("id").primaryKey(),
  network: text("network").notNull(), // 'TRC20', 'ERC20', 'BSC', 'BTC'
  address: text("address").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Visitor tracking for admin alerts
export const siteVisits = pgTable("site_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null if not logged in
  ipAddress: text("ip_address").notNull(),
  country: text("country"),
  city: text("city"),
  isp: text("isp"),
  deviceType: text("device_type"), // 'mobile', 'desktop', 'tablet'
  browser: text("browser"),
  os: text("os"),
  userAgent: text("user_agent"),
  pageVisited: text("page_visited"),
  isVpn: boolean("is_vpn").default(false),
  isProxy: boolean("is_proxy").default(false),
  securityFlags: text("security_flags"), // JSON array of flags
  telegramAlertSent: boolean("telegram_alert_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Track IP history per user for security monitoring
export const userIpHistory = pgTable("user_ip_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  country: text("country"),
  city: text("city"),
  isVpn: boolean("is_vpn").default(false),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  visitCount: integer("visit_count").default(1),
});

// High-risk countries list
export const highRiskCountries = pgTable("high_risk_countries", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull().unique(),
  countryName: text("country_name").notNull(),
  riskLevel: text("risk_level").default("high"), // 'high', 'medium'
  addedBy: integer("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const GIFT_CARD_CURRENCIES = [
  { code: "USD", name: "United States Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "AED", name: "UAE Dirham" },
  { code: "ZAR", name: "South African Rand" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "THB", name: "Thai Baht" },
] as const;

export const GIFT_CARD_FORMATS = ["E-Gift Card", "Physical Gift Card"] as const;

export const giftCardRedemptions = pgTable("gift_card_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  giftCardType: text("gift_card_type").notNull(),
  giftCardCode: text("gift_card_code").notNull(),
  giftCardCodeHash: text("gift_card_code_hash").notNull(),
  giftCardCurrency: text("gift_card_currency").notNull().default("USD"),
  giftCardFormat: text("gift_card_format").notNull().default("E-Gift Card"),
  giftCardAmount: decimal("gift_card_amount", { precision: 10, scale: 2 }).notNull(),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }),
  usdtCredited: decimal("usdt_credited", { precision: 10, scale: 2 }),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  referralCode: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  userId: true,
  entryPrice: true,
  startTime: true,
  endTime: true,
  result: true,
  pnl: true,
  isActive: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
  status: true,
  transactionHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cryptocurrency: z.enum([
    "USDT", "TRX", "ETH", "BTC", // Original options
    "USDT TRC20", "USDT ERC20", // USDT variants
    "USDC TRC20", "USDC ERC20", // USDC variants  
    "BNB BSC", "BUSD BSC"       // BSC options
  ]),
  type: z.enum(["deposit", "withdrawal"]),
  network: z.string().optional(),
});

export const updateProfileSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  mobileNumber: z.string().optional(),
  avatar: z.string().optional(),
  walletAddress: z.string().optional(),
});

// Admin schemas
export const adminUpdateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  balance: z.string().optional(),
  status: z.enum(["active", "banned", "blocked"]).optional(),
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  withdrawalBanned: z.boolean().optional(),
  withdrawalBanReason: z.string().optional(),
  tradeWinRate: z.string().nullable().optional(),
  winPercentage: z.string().optional(),
  password: z.string().optional(),
});

export const adminTransactionActionSchema = z.object({
  action: z.enum(["approve", "decline"]),
  adminNote: z.string().optional(),
});

export const siteConfigUpdateSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export const insertSiteConfigSchema = createInsertSchema(siteConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertKycSchema = createInsertSchema(kycVerifications).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
});

export const kycReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const changePasswordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertBlacklistSchema = createInsertSchema(blacklist).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["email", "phone"]),
  value: z.string().min(1, "Value is required"),
  reason: z.string().optional(),
});

export const adminTopupSchema = z.object({
  userId: z.number().positive("User ID is required"),
  amount: z.string().min(1, "Amount is required"),
  note: z.string().optional(),
});

export const insertDepositWalletSchema = createInsertSchema(depositWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  network: z.enum(["TRC20", "ERC20", "BSC", "BTC"]),
});

export const depositWithTxidSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  cryptocurrency: z.enum([
    "USDT", "TRX", "ETH", "BTC",
    "USDT TRC20", "USDT ERC20",
    "USDC TRC20", "USDC ERC20",
    "BNB BSC", "BUSD BSC"
  ]),
  network: z.enum(["TRC20", "ERC20", "BSC", "BTC"]),
  transactionHash: z.string().min(10, "Valid transaction hash is required"),
});

export const adminDepositActionSchema = z.object({
  action: z.enum(["approve", "reject", "override_approve"]),
  adminNote: z.string().optional(),
});

export const GIFT_CARD_TYPES = [
  "Amazon Gift Card",
  "Apple App Store & iTunes Gift Card",
  "Google Play Gift Card",
  "Visa Prepaid Gift Card",
  "Mastercard Prepaid Gift Card",
  "Steam Gift Card",
  "PlayStation Store Gift Card",
  "Xbox Gift Card",
  "Netflix Gift Card",
  "Spotify Gift Card",
  "Razer Gold Gift Card",
] as const;

export const insertGiftCardSchema = z.object({
  giftCardType: z.enum(GIFT_CARD_TYPES as unknown as [string, ...string[]]),
  giftCardCode: z.string().min(1, "Gift card code is required"),
  giftCardCurrency: z.string().min(1, "Currency is required"),
  giftCardFormat: z.enum(GIFT_CARD_FORMATS as unknown as [string, ...string[]]),
  giftCardAmount: z.string().min(1, "Amount is required"),
});

export const adminGiftCardActionSchema = z.object({
  action: z.enum(["approve", "decline"]),
  adminNote: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;
export type AdminTransactionAction = z.infer<typeof adminTransactionActionSchema>;
export type SiteConfigUpdate = z.infer<typeof siteConfigUpdateSchema>;
export type InsertSiteConfig = z.infer<typeof insertSiteConfigSchema>;
export type InsertKyc = z.infer<typeof insertKycSchema>;
export type KycReview = z.infer<typeof kycReviewSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type SiteConfig = typeof siteConfig.$inferSelect;
export type KycVerification = typeof kycVerifications.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Blacklist = typeof blacklist.$inferSelect;
export type InsertBlacklist = z.infer<typeof insertBlacklistSchema>;
export type AdminTopup = z.infer<typeof adminTopupSchema>;
export type DepositWallet = typeof depositWallets.$inferSelect;
export type InsertDepositWallet = z.infer<typeof insertDepositWalletSchema>;
export type DepositWithTxid = z.infer<typeof depositWithTxidSchema>;
export type AdminDepositAction = z.infer<typeof adminDepositActionSchema>;
export type SiteVisit = typeof siteVisits.$inferSelect;
export type UserIpHistory = typeof userIpHistory.$inferSelect;
export type HighRiskCountry = typeof highRiskCountries.$inferSelect;
export type GiftCardRedemption = typeof giftCardRedemptions.$inferSelect;
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;
export type AdminGiftCardAction = z.infer<typeof adminGiftCardActionSchema>;
