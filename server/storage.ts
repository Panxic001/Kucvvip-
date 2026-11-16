import { users, trades, transactions, referrals, siteConfig, kycVerifications, passwordResetTokens, blacklist, depositWallets, giftCardRedemptions, type User, type InsertUser, type Trade, type InsertTrade, type Transaction, type InsertTransaction, type Referral, type UpdateProfile, type AdminUpdateUser, type AdminTransactionAction, type InsertSiteConfig, type SiteConfig, type KycVerification, type InsertKyc, type KycReview, type Blacklist, type InsertBlacklist, type DepositWallet, type InsertDepositWallet, type GiftCardRedemption } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateProfile): Promise<User | undefined>;
  updateUserBalance(id: number, amount: string): Promise<void>;
  
  // Trade methods
  createTrade(trade: InsertTrade & { userId: number }): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;
  getActiveTrades(userId: number): Promise<Trade[]>;
  updateTradeResult(tradeId: number, result: 'win' | 'loss', pnl: string): Promise<void>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction & { userId: number }): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  updateTransactionStatus(transactionId: number, status: string): Promise<void>;
  
  // Referral methods
  createReferral(referrerId: number, referredUserId: number): Promise<Referral>;
  getUserReferrals(userId: number): Promise<Referral[]>;
  getReferralStats(userId: number): Promise<{ count: number; earnings: string }>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  
  // Admin methods
  getAllUsers(page?: number, limit?: number): Promise<User[]>;
  adminUpdateUser(userId: number, updates: AdminUpdateUser, adminId: number): Promise<User | undefined>;
  banUser(userId: number, adminId: number): Promise<void>;
  deleteUser(userId: number, adminId: number): Promise<void>;
  getAllTransactions(status?: string, page?: number, limit?: number): Promise<Transaction[]>;
  approveTransaction(transactionId: number, adminId: number, adminNote?: string): Promise<void>;
  declineTransaction(transactionId: number, adminId: number, adminNote?: string): Promise<void>;
  
  // Site configuration methods
  getSiteConfig(key: string): Promise<SiteConfig | undefined>;
  getAllSiteConfigs(): Promise<SiteConfig[]>;
  updateSiteConfig(key: string, value: string, adminId: number, description?: string): Promise<SiteConfig>;
  
  // Trading control methods
  setUserTradeOutcome(userId: number, winRate: string, adminId: number): Promise<void>;
  
  // KYC methods
  submitKyc(kycData: InsertKyc & { userId: number }): Promise<KycVerification>;
  getUserKyc(userId: number): Promise<KycVerification | undefined>;
  getAllKycRequests(status?: string, page?: number, limit?: number): Promise<any[]>;
  reviewKyc(kycId: number, review: KycReview, adminId: number): Promise<void>;
  
  // Password reset methods
  createPasswordResetToken(userId: number): Promise<string>;
  validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: number }>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Bulk operations
  getAllUserEmails(): Promise<{ email: string; username: string }[]>;
  
  // Blacklist methods
  addToBlacklist(data: InsertBlacklist & { addedBy?: number }): Promise<Blacklist>;
  removeFromBlacklist(id: number): Promise<void>;
  getAllBlacklist(): Promise<Blacklist[]>;
  isBlacklisted(value: string, type: 'email' | 'phone'): Promise<boolean>;
  
  // Admin topup methods
  createAdminTopup(data: { userId: number; amount: string; note?: string; adminId: number }): Promise<Transaction>;
  
  // Deposit wallet methods
  getActiveDepositWallet(network: string): Promise<DepositWallet | undefined>;
  getAllDepositWallets(): Promise<DepositWallet[]>;
  createDepositWallet(data: InsertDepositWallet & { updatedBy?: number }): Promise<DepositWallet>;
  updateDepositWallet(id: number, address: string, adminId: number): Promise<DepositWallet | undefined>;
  deactivateDepositWallet(id: number, adminId: number): Promise<void>;
  
  // Gift card methods
  createGiftCardRedemption(data: { userId: number; giftCardType: string; giftCardCode: string; giftCardCurrency: string; giftCardFormat: string; giftCardAmount: string; imageUrl: string }): Promise<GiftCardRedemption>;
  getUserGiftCards(userId: number): Promise<GiftCardRedemption[]>;
  getAllGiftCards(status?: string): Promise<any[]>;
  getGiftCardById(id: number): Promise<GiftCardRedemption | undefined>;
  isGiftCardCodeUsed(code: string): Promise<boolean>;
  getUserDailyGiftCardCount(userId: number): Promise<number>;
  approveGiftCard(id: number, adminId: number, exchangeRate: number, usdValue: number, processingFee: number, usdtCredited: number, adminNote?: string): Promise<void>;
  declineGiftCard(id: number, adminId: number, adminNote?: string): Promise<void>;

  // Transaction validation methods
  getTransactionByTxid(txid: string): Promise<Transaction | undefined>;
  getPendingDepositsForValidation(): Promise<Transaction[]>;
  updateTransactionValidation(
    transactionId: number,
    updates: {
      validationStatus?: string;
      confirmationCount?: number;
      validatedAmount?: string;
      validatedContract?: string;
      validationLog?: string;
      lastValidationCheck?: Date;
      autoValidatedAt?: Date;
      status?: string;
    }
  ): Promise<void>;
  createDepositWithTxid(data: {
    userId: number;
    amount: string;
    cryptocurrency: string;
    network: string;
    transactionHash: string;
    depositWalletAddress: string;
  }): Promise<Transaction>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    // Generate shorter referral code to fit in 20 character limit
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
    const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
    const referralCode = `VIP${timestamp}${randomPart}`; // Max 11 chars: VIP + 4 + 4

    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
        referralCode,
        balance: "0.00",
      })
      .returning();
    
    if (insertUser.referredBy) {
      await this.createReferral(insertUser.referredBy, user.id);
    }
    
    return user;
  }

  async updateUser(id: number, updates: UpdateProfile): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserBalance(id: number, amount: string): Promise<void> {
    const user = await this.getUser(id);
    if (!user) return;
    
    const currentBalance = parseFloat(user.balance || "0");
    const changeAmount = parseFloat(amount);
    const newBalance = (currentBalance + changeAmount).toFixed(2);
    
    console.log(`💰 BALANCE UPDATE: User ${id} | Current: $${currentBalance} | Change: ${changeAmount >= 0 ? '+' : ''}$${changeAmount} | New: $${newBalance}`);
    
    await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, id));
  }

  async createTrade(tradeData: InsertTrade & { userId: number }): Promise<Trade> {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + tradeData.duration * 60 * 1000);
    const entryPrice = "43250.00";
    
    const [trade] = await db
      .insert(trades)
      .values({
        ...tradeData,
        entryPrice,
        startTime,
        endTime,
        result: null,
        pnl: null,
        isActive: true,
      })
      .returning();
    
    return trade;
  }

  async getUserTrades(userId: number): Promise<Trade[]> {
    const userTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.createdAt));
    
    return userTrades;
  }

  async getActiveTrades(userId: number): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.isActive, true)));
  }

  async updateTradeResult(tradeId: number, result: 'win' | 'loss', pnl: string): Promise<void> {
    await db
      .update(trades)
      .set({
        result,
        pnl,
        isActive: false,
      })
      .where(eq(trades.id, tradeId));
    
    const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId));
    if (trade) {
      if (result === 'win') {
        // For wins: Add back original amount + profit (total return)
        const totalReturn = parseFloat(trade.amount) + parseFloat(pnl);
        await this.updateUserBalance(trade.userId, totalReturn.toFixed(2));
        console.log(`✅ WIN: Added ${totalReturn.toFixed(2)} to user ${trade.userId} balance (${trade.amount} original + ${pnl} profit)`);
      } else {
        // For losses: Amount was already deducted when trade was placed, no further action needed
        console.log(`❌ LOSS: User ${trade.userId} lost ${trade.amount} (already deducted)`);
      }
    }
  }

  async createTransaction(transactionData: InsertTransaction & { userId: number }): Promise<Transaction> {
    // Check if this is the user's first deposit
    const isFirstDeposit = transactionData.type === 'deposit' && 
      (await this.getUserTransactions(transactionData.userId))
        .filter(t => t.type === 'deposit' && t.status === 'completed').length === 0;

    const [transaction] = await db
      .insert(transactions)
      .values({
        ...transactionData,
        status: "pending",
        transactionHash: null,
        isFirstDeposit,
        referralBonusProcessed: false,
      })
      .returning();
    
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
    
    return userTransactions;
  }

  async updateTransactionStatus(transactionId: number, status: string): Promise<void> {
    await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, transactionId));

    // If deposit is completed, process referral bonus for first-time deposits
    if (status === 'completed') {
      await this.processReferralBonus(transactionId);
    }
  }

  async processReferralBonus(transactionId: number): Promise<void> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction || transaction.type !== 'deposit' || 
        !transaction.isFirstDeposit || transaction.referralBonusProcessed) {
      return;
    }

    // Get the user who made the deposit
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, transaction.userId));

    if (!user || !user.referredBy) {
      return;
    }

    // Calculate 50% bonus
    const bonusAmount = (parseFloat(transaction.amount) * 0.5).toFixed(2);

    // Add bonus to referrer's balance
    await this.updateUserBalance(user.referredBy, bonusAmount);

    // Update referral record with bonus amount
    await db
      .update(referrals)
      .set({ 
        bonusAmount,
        hasReceivedBonus: true 
      })
      .where(eq(referrals.referredUserId, user.id));

    // Mark transaction as processed
    await db
      .update(transactions)
      .set({ referralBonusProcessed: true })
      .where(eq(transactions.id, transactionId));
  }

  async createReferral(referrerId: number, referredUserId: number): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values({
        referrerId,
        referredUserId,
        rewardAmount: "10.00",
      })
      .returning();
    
    await this.updateUserBalance(referrerId, "10.00");
    
    return referral;
  }

  async getUserReferrals(userId: number): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
  }

  async getReferralStats(userId: number): Promise<{ count: number; earnings: string }> {
    const userReferrals = await this.getUserReferrals(userId);
    const count = userReferrals.length;
    const earnings = userReferrals
      .reduce((total, referral) => {
        const baseReward = parseFloat(referral.rewardAmount || "0");
        const bonusReward = parseFloat(referral.bonusAmount || "0");
        return total + baseReward + bonusReward;
      }, 0)
      .toFixed(2);
    
    return { count, earnings };
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user;
  }

  // Admin methods implementation
  async getAllUsers(page: number = 1, limit: number = 50): Promise<User[]> {
    const offset = (page - 1) * limit;
    return await db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
  }

  async adminUpdateUser(userId: number, updates: AdminUpdateUser, adminId: number): Promise<User | undefined> {
    console.log('adminUpdateUser called with:', { userId, updates, adminId });
    
    const updateData: any = {};
    
    if (updates.username) updateData.username = updates.username;
    if (updates.email) updateData.email = updates.email;
    if (updates.balance) updateData.balance = updates.balance;
    if (updates.status) updateData.status = updates.status;
    if (updates.role) updateData.role = updates.role;
    if (updates.tradeWinRate !== undefined) updateData.tradeWinRate = updates.tradeWinRate;
    if (updates.winPercentage !== undefined) updateData.winPercentage = updates.winPercentage;
    if (updates.password) updateData.password = updates.password;
    if (updates.withdrawalBanned !== undefined) updateData.withdrawalBanned = updates.withdrawalBanned;
    if (updates.withdrawalBanReason !== undefined) updateData.withdrawalBanReason = updates.withdrawalBanReason;
    
    console.log('Update data prepared:', updateData);
    
    if (Object.keys(updateData).length === 0) {
      console.log('No valid update data, returning undefined');
      return undefined;
    }
    
    console.log('Executing database update...');
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    console.log('Database update result:', user);
    return user;
  }

  async banUser(userId: number, adminId: number): Promise<void> {
    await db
      .update(users)
      .set({ status: "banned" })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number, adminId: number): Promise<void> {
    try {
      // Use a transaction to ensure all deletions complete or none do
      await db.transaction(async (tx) => {
        // Delete user's password reset tokens first
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        // Delete user's KYC verifications
        await tx.delete(kycVerifications).where(eq(kycVerifications.userId, userId));
        // Delete user's trades
        await tx.delete(trades).where(eq(trades.userId, userId));
        // Delete user's transactions
        await tx.delete(transactions).where(eq(transactions.userId, userId));
        // Delete user's referrals (both as referrer and referred)
        await tx.delete(referrals).where(eq(referrals.referrerId, userId));
        await tx.delete(referrals).where(eq(referrals.referredUserId, userId));
        // Finally delete the user
        await tx.delete(users).where(eq(users.id, userId));
        
        console.log(`All data for user ${userId} deleted successfully in transaction`);
      });
    } catch (error) {
      console.error('Error deleting user in transaction:', error);
      throw new Error('Failed to delete user and associated data');
    }
  }

  async getAllTransactions(status?: string, page: number = 1, limit: number = 50): Promise<any[]> {
    const offset = (page - 1) * limit;
    let query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        userEmail: users.email,
        userName: users.username,
        type: transactions.type,
        cryptocurrency: transactions.cryptocurrency,
        amount: transactions.amount,
        status: transactions.status,
        walletAddress: transactions.walletAddress,
        network: transactions.network,
        transactionHash: transactions.transactionHash,
        txHash: transactions.transactionHash, // Alias for email compatibility
        adminNote: transactions.adminNote,
        approvedBy: transactions.approvedBy,
        referralBonusProcessed: transactions.referralBonusProcessed,
        proofFileName: transactions.proofFileName,
        proofFilePath: transactions.proofFilePath,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id));
    
    if (status) {
      query = query.where(eq(transactions.status, status));
    }
    
    const results = await query.limit(limit).offset(offset).orderBy(desc(transactions.createdAt));
    
    // Add user object to each result for email compatibility
    return results.map(result => ({
      ...result,
      user: {
        id: result.userId,
        email: result.userEmail,
        username: result.userName,
      }
    }));
  }

  private generateReceiptTxid(): string {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  async approveTransaction(transactionId: number, adminId: number, adminNote?: string): Promise<void> {
    const transaction = await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1);
    if (!transaction[0]) throw new Error("Transaction not found");
    
    const txn = transaction[0];
    
    const updateData: any = {
      status: "approved",
      adminNote: adminNote || null,
      approvedBy: adminId,
      updatedAt: new Date(),
    };

    if (txn.type === "withdrawal") {
      updateData.receiptTxid = this.generateReceiptTxid();
    }

    await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, transactionId));
    
    if (txn.type === "deposit") {
      await this.updateUserBalance(txn.userId, txn.amount);
      console.log(`✅ DEPOSIT APPROVED: Added $${txn.amount} to user ${txn.userId} balance`);
    }
  }

  async declineTransaction(transactionId: number, adminId: number, adminNote?: string): Promise<void> {
    // Get transaction details before updating
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));
    
    if (transaction.length === 0) {
      throw new Error("Transaction not found");
    }
    
    const txn = transaction[0];
    
    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: "declined",
        adminNote: adminNote || null,
        approvedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
    
    // If it's a withdrawal, return funds to user balance (FIXED: pass change amount, not total balance)
    if (txn.type === "withdrawal") {
      await this.updateUserBalance(txn.userId, txn.amount);
      console.log(`✅ WITHDRAWAL REJECTED: Returned $${txn.amount} to user ${txn.userId} balance`);
    }
  }

  private async getUserBalance(userId: number): Promise<string> {
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    return user?.balance || "0.00";
  }

  // Site configuration methods
  async getSiteConfig(key: string): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
    return config;
  }

  async getAllSiteConfigs(): Promise<SiteConfig[]> {
    return await db.select().from(siteConfig).orderBy(siteConfig.key);
  }

  async updateSiteConfig(key: string, value: string, adminId: number, description?: string): Promise<SiteConfig> {
    const existing = await this.getSiteConfig(key);
    
    if (existing) {
      const [updated] = await db
        .update(siteConfig)
        .set({
          value,
          description: description || existing.description,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(siteConfig.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(siteConfig)
        .values({
          key,
          value,
          description,
          updatedBy: adminId,
        })
        .returning();
      return created;
    }
  }

  // Trading control methods
  async setUserTradeOutcome(userId: number, winRate: string, adminId: number): Promise<void> {
    await db
      .update(users)
      .set({ tradeWinRate: winRate })
      .where(eq(users.id, userId));
  }

  // KYC methods
  async submitKyc(kycData: InsertKyc & { userId: number }): Promise<KycVerification> {
    const [kyc] = await db
      .insert(kycVerifications)
      .values(kycData)
      .returning();
    return kyc;
  }

  async getUserKyc(userId: number): Promise<KycVerification | undefined> {
    const [kyc] = await db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.userId, userId))
      .orderBy(desc(kycVerifications.submittedAt))
      .limit(1);
    return kyc;
  }

  async getAllKycRequests(status?: string, page: number = 1, limit: number = 50): Promise<any[]> {
    const offset = (page - 1) * limit;
    let query = db
      .select({
        id: kycVerifications.id,
        userId: kycVerifications.userId,
        userEmail: users.email,
        fullName: kycVerifications.fullName,
        idFrontImage: kycVerifications.idFrontImage,
        idBackImage: kycVerifications.idBackImage,
        status: kycVerifications.status,
        adminNote: kycVerifications.adminNote,
        reviewedBy: kycVerifications.reviewedBy,
        submittedAt: kycVerifications.submittedAt,
        reviewedAt: kycVerifications.reviewedAt,
      })
      .from(kycVerifications)
      .innerJoin(users, eq(kycVerifications.userId, users.id));

    if (status) {
      query = query.where(eq(kycVerifications.status, status));
    }

    return await query.limit(limit).offset(offset).orderBy(desc(kycVerifications.submittedAt));
  }

  async reviewKyc(kycId: number, review: KycReview, adminId: number): Promise<void> {
    await db
      .update(kycVerifications)
      .set({
        status: review.status,
        adminNote: review.adminNote || null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      })
      .where(eq(kycVerifications.id, kycId));
  }

  // Password reset methods
  async createPasswordResetToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );

    if (!resetToken) {
      return { valid: false };
    }

    return { valid: true, userId: resetToken.userId };
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const validation = await this.validatePasswordResetToken(token);
    if (!validation.valid || !validation.userId) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, validation.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));

    return true;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return false;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return true;
  }

  async getAllUserEmails(): Promise<{ email: string; username: string }[]> {
    const userEmails = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(eq(users.status, 'active'));
    return userEmails;
  }

  async addToBlacklist(data: InsertBlacklist & { addedBy?: number }): Promise<Blacklist> {
    const [entry] = await db
      .insert(blacklist)
      .values(data)
      .returning();
    return entry;
  }

  async removeFromBlacklist(id: number): Promise<void> {
    await db.delete(blacklist).where(eq(blacklist.id, id));
  }

  async getAllBlacklist(): Promise<Blacklist[]> {
    return await db.select().from(blacklist).orderBy(desc(blacklist.createdAt));
  }

  async isBlacklisted(value: string, type: 'email' | 'phone'): Promise<boolean> {
    const [entry] = await db
      .select()
      .from(blacklist)
      .where(and(eq(blacklist.value, value.toLowerCase()), eq(blacklist.type, type)));
    return !!entry;
  }

  async createAdminTopup(data: { userId: number; amount: string; note?: string; adminId: number }): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: data.userId,
        type: "credit",
        cryptocurrency: "USDT",
        amount: data.amount,
        status: "completed",
        adminNote: data.note || "Admin credit topup",
        approvedBy: data.adminId,
        network: "Internal",
      })
      .returning();
    return transaction;
  }

  async getActiveDepositWallet(network: string): Promise<DepositWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(depositWallets)
      .where(and(eq(depositWallets.network, network), eq(depositWallets.isActive, true)))
      .orderBy(desc(depositWallets.updatedAt))
      .limit(1);
    return wallet;
  }

  async getAllDepositWallets(): Promise<DepositWallet[]> {
    return await db.select().from(depositWallets).orderBy(desc(depositWallets.createdAt));
  }

  async createDepositWallet(data: InsertDepositWallet & { updatedBy?: number }): Promise<DepositWallet> {
    const [wallet] = await db
      .insert(depositWallets)
      .values(data)
      .returning();
    return wallet;
  }

  async updateDepositWallet(id: number, address: string, adminId: number): Promise<DepositWallet | undefined> {
    const [wallet] = await db
      .update(depositWallets)
      .set({ address, updatedBy: adminId, updatedAt: new Date() })
      .where(eq(depositWallets.id, id))
      .returning();
    return wallet;
  }

  async deactivateDepositWallet(id: number, adminId: number): Promise<void> {
    await db
      .update(depositWallets)
      .set({ isActive: false, updatedBy: adminId, updatedAt: new Date() })
      .where(eq(depositWallets.id, id));
  }

  async getTransactionByTxid(txid: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionHash, txid));
    return transaction;
  }

  async getPendingDepositsForValidation(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "deposit"),
          sql`${transactions.transactionHash} IS NOT NULL`,
          sql`${transactions.status} IN ('pending', 'pending_validation')`
        )
      )
      .orderBy(transactions.createdAt);
  }

  async updateTransactionValidation(
    transactionId: number,
    updates: {
      validationStatus?: string;
      confirmationCount?: number;
      validatedAmount?: string;
      validatedContract?: string;
      validationLog?: string;
      lastValidationCheck?: Date;
      autoValidatedAt?: Date;
      status?: string;
    }
  ): Promise<void> {
    await db
      .update(transactions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
  }

  async createGiftCardRedemption(data: { userId: number; giftCardType: string; giftCardCode: string; giftCardCurrency: string; giftCardFormat: string; giftCardAmount: string; imageUrl: string }): Promise<GiftCardRedemption> {
    const codeHash = crypto.createHash('sha256').update(data.giftCardCode).digest('hex');
    const [redemption] = await db.insert(giftCardRedemptions).values({
      userId: data.userId,
      giftCardType: data.giftCardType,
      giftCardCode: data.giftCardCode,
      giftCardCodeHash: codeHash,
      giftCardCurrency: data.giftCardCurrency,
      giftCardFormat: data.giftCardFormat,
      giftCardAmount: data.giftCardAmount,
      imageUrl: data.imageUrl,
      status: "pending",
    }).returning();
    return redemption;
  }

  async getUserGiftCards(userId: number): Promise<GiftCardRedemption[]> {
    return await db.select().from(giftCardRedemptions).where(eq(giftCardRedemptions.userId, userId)).orderBy(desc(giftCardRedemptions.createdAt));
  }

  async getAllGiftCards(status?: string): Promise<any[]> {
    const conditions = status && status !== "all" ? [eq(giftCardRedemptions.status, status)] : [];
    const results = await db.select({
      id: giftCardRedemptions.id,
      userId: giftCardRedemptions.userId,
      giftCardType: giftCardRedemptions.giftCardType,
      giftCardCode: giftCardRedemptions.giftCardCode,
      giftCardCurrency: giftCardRedemptions.giftCardCurrency,
      giftCardFormat: giftCardRedemptions.giftCardFormat,
      giftCardAmount: giftCardRedemptions.giftCardAmount,
      amountUsd: giftCardRedemptions.amountUsd,
      usdtCredited: giftCardRedemptions.usdtCredited,
      processingFee: giftCardRedemptions.processingFee,
      exchangeRate: giftCardRedemptions.exchangeRate,
      imageUrl: giftCardRedemptions.imageUrl,
      status: giftCardRedemptions.status,
      adminNote: giftCardRedemptions.adminNote,
      createdAt: giftCardRedemptions.createdAt,
      reviewedAt: giftCardRedemptions.reviewedAt,
      reviewedBy: giftCardRedemptions.reviewedBy,
      userEmail: users.email,
      username: users.username,
    })
    .from(giftCardRedemptions)
    .leftJoin(users, eq(giftCardRedemptions.userId, users.id))
    .where(conditions.length > 0 ? conditions[0] : undefined as any)
    .orderBy(desc(giftCardRedemptions.createdAt));
    return results;
  }

  async getGiftCardById(id: number): Promise<GiftCardRedemption | undefined> {
    const [result] = await db.select().from(giftCardRedemptions).where(eq(giftCardRedemptions.id, id));
    return result;
  }

  async isGiftCardCodeUsed(code: string): Promise<boolean> {
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const [existing] = await db.select().from(giftCardRedemptions).where(eq(giftCardRedemptions.giftCardCodeHash, codeHash)).limit(1);
    return !!existing;
  }

  async getUserDailyGiftCardCount(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const results = await db.select().from(giftCardRedemptions)
      .where(and(
        eq(giftCardRedemptions.userId, userId),
        gt(giftCardRedemptions.createdAt, today)
      ));
    return results.length;
  }

  async approveGiftCard(id: number, adminId: number, exchangeRate: number, usdValue: number, processingFee: number, usdtCredited: number, adminNote?: string): Promise<void> {
    const [card] = await db.select().from(giftCardRedemptions).where(eq(giftCardRedemptions.id, id));
    if (!card) throw new Error("Gift card not found");
    if (card.status !== "pending") throw new Error("Gift card already processed");

    await db.update(giftCardRedemptions).set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      adminNote: adminNote || null,
      exchangeRate: exchangeRate.toFixed(6),
      amountUsd: usdValue.toFixed(2),
      processingFee: processingFee.toFixed(2),
      usdtCredited: usdtCredited.toFixed(2),
    }).where(eq(giftCardRedemptions.id, id));

    const [user] = await db.select().from(users).where(eq(users.id, card.userId));
    if (user) {
      const newBalance = (parseFloat(user.balance || "0") + usdtCredited).toFixed(2);
      await db.update(users).set({ balance: newBalance }).where(eq(users.id, card.userId));
    }
  }

  async declineGiftCard(id: number, adminId: number, adminNote?: string): Promise<void> {
    const [card] = await db.select().from(giftCardRedemptions).where(eq(giftCardRedemptions.id, id));
    if (!card) throw new Error("Gift card not found");
    if (card.status !== "pending") throw new Error("Gift card already processed");

    await db.update(giftCardRedemptions).set({
      status: "declined",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      adminNote: adminNote || null,
    }).where(eq(giftCardRedemptions.id, id));
  }

  async createDepositWithTxid(data: {
    userId: number;
    amount: string;
    cryptocurrency: string;
    network: string;
    transactionHash: string;
    depositWalletAddress: string;
  }): Promise<Transaction> {
    const existingDeposits = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, data.userId), eq(transactions.type, "deposit")));
    
    const isFirstDeposit = existingDeposits.length === 0;

    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: data.userId,
        type: "deposit",
        cryptocurrency: data.cryptocurrency,
        amount: data.amount,
        network: data.network,
        transactionHash: data.transactionHash,
        depositWalletAddress: data.depositWalletAddress,
        status: "pending",
        validationStatus: "pending_validation",
        isFirstDeposit,
      })
      .returning();
    return transaction;
  }
}

export const storage = new DatabaseStorage();