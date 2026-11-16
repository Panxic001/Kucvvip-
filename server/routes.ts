import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertTradeSchema, insertTransactionSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, insertKycSchema, insertBlacklistSchema, depositWithTxidSchema, adminDepositActionSchema, insertGiftCardSchema, adminGiftCardActionSchema, GIFT_CARD_TYPES } from "@shared/schema";
import { validateTxid, isValidTxidFormat, getMinConfirmations } from "./services/blockchainValidator";
import { startDepositValidationJob } from "./services/depositValidationJob";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  sendWelcomeEmail, 
  sendDepositNotificationEmail, 
  sendDepositApprovedEmail, 
  sendDepositRejectedEmail,
  sendWithdrawalRequestEmail, 
  sendWithdrawalApprovedEmail, 
  sendWithdrawalRejectedEmail, 
  sendTradeNotificationEmail, 
  sendTradeResultEmail,
  sendPasswordResetEmail,
  sendCreditAlertEmail
} from "./email";
import {
  notifyNewUserRegistration,
  notifyDepositSubmitted,
  notifyDepositAutoConfirmed,
  notifyDepositManuallyConfirmed,
  notifyDepositRejected,
  notifyWithdrawalRequest,
  notifyWithdrawalStatusChange,
  notifyTradeExecuted,
  notifyError
} from "./services/telegramNotifier";
import { trackVisitor } from "./services/visitorTracker";
import { startDailySummaryJob } from "./services/dailySummaryJob";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'deposit-proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deposit-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'), false);
    }
  }
});

interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

// Middleware to verify JWT token
function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
}

// Middleware to verify admin role
async function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await storage.getUser(decoded.userId);
    
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Middleware to verify super admin role
async function authenticateSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await storage.getUser(decoded.userId);
    
    if (!user || user.role !== "super_admin") {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add visitor tracking middleware for all requests
  app.use(trackVisitor);
  
  // Start the daily summary job
  startDailySummaryJob();
  
  // Serve uploaded proof files (admin only)
  app.get('/uploads/deposit-proofs/:filename', async (req: Request, res: Response) => {
    try {
      // Extract token from Authorization header or query parameter
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1] || req.query.token as string;
      
      if (!token) {
        return res.status(401).json({ message: 'Access token required' });
      }
      
      // Verify JWT token
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      
      const user = await storage.getUser(decoded.userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const filename = req.params.filename;
      const filePath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      console.log(`Admin ${user.username} accessing proof file: ${filename}`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving proof file:', error);
      res.status(500).json({ message: 'Error accessing file' });
    }
  });
  
  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email is blacklisted
      const emailBlacklisted = await storage.isBlacklisted(userData.email, 'email');
      if (emailBlacklisted) {
        return res.status(403).json({ 
          message: "Registration not allowed", 
          details: "This email address cannot be used for registration. Please contact support if you believe this is an error." 
        });
      }
      
      // Check if phone number is blacklisted (if provided)
      if (userData.mobileNumber) {
        const phoneBlacklisted = await storage.isBlacklisted(userData.mobileNumber, 'phone');
        if (phoneBlacklisted) {
          return res.status(403).json({ 
            message: "Registration not allowed", 
            details: "This phone number cannot be used for registration. Please contact support if you believe this is an error." 
          });
        }
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Account already registered", 
          details: "This email is already registered. Please sign in instead or use a different email address." 
        });
      }

      // Handle referral code
      let referredBy = null;
      if (req.body.referralCode) {
        const referrer = await storage.getUserByReferralCode(req.body.referralCode);
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      const user = await storage.createUser({ ...userData, referredBy });
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      // Send welcome email
      await sendWelcomeEmail(user.email, user.username);
      
      // Send Telegram notification for new user registration
      notifyNewUserRegistration({
        id: user.id,
        email: user.email,
        phone: user.mobileNumber,
        username: user.username,
        createdAt: user.createdAt,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      });
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          referralCode: user.referralCode,
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`)
        });
      }
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Demo login for testing
      if (email === "demo@test.com" && password === "demo123") {
        let demoUser = await storage.getUserByEmail(email);
        if (!demoUser) {
          demoUser = await storage.createUser({
            username: "demo",
            email: "demo@test.com", 
            password: "demo123"
          });
        }
        
        const token = jwt.sign({ userId: demoUser.id }, JWT_SECRET, { expiresIn: '7d' });
        
        return res.json({
          token,
          user: {
            id: demoUser.id,
            username: demoUser.username,
            email: demoUser.email,
            balance: demoUser.balance,
            referralCode: demoUser.referralCode,
          }
        });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          referralCode: user.referralCode,
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Protected routes
  app.get("/api/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        walletAddress: user.walletAddress,
        balance: user.balance,
        referralCode: user.referralCode,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const updates = updateProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.userId!, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        walletAddress: updatedUser.walletAddress,
        balance: updatedUser.balance,
        referralCode: updatedUser.referralCode,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Trading routes
  app.post("/api/trade", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log("Trade request body:", req.body);
      const tradeData = insertTradeSchema.parse(req.body);
      
      // Check if user has sufficient balance
      const user = await storage.getUser(req.userId!);
      console.log("User balance:", user?.balance, "Trade amount:", tradeData.amount);
      console.log("User win rate setting:", user?.tradeWinRate ? `${user.tradeWinRate}%` : "Not set (will use duration-based)");
      if (!user || parseFloat(user.balance || "0") < parseFloat(tradeData.amount)) {
        console.log("Balance check failed:", parseFloat(user?.balance || "0"), "<", parseFloat(tradeData.amount));
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct trade amount from balance
      await storage.updateUserBalance(req.userId!, `-${tradeData.amount}`);
      
      const trade = await storage.createTrade({ ...tradeData, userId: req.userId! });
      
      // Send trade placed notification email
      await sendTradeNotificationEmail(
        user.email, 
        user.username, 
        tradeData.pair || 'BTC/USDT', 
        tradeData.tradeType, 
        tradeData.amount, 
        '1'
      );
      
      // Simulate trade result after duration using user's individual win rate
      setTimeout(async () => {
        try {
          // Get user's individual win rate set by admin, fallback to duration-based rates
          const user = await storage.getUser(req.userId!);
          let winRate = 0.5; // Default 50%
          let winRateSource = "default";
          
          if (user && user.tradeWinRate !== null && user.tradeWinRate !== undefined) {
            // Use admin-set win rate for this user - ensure precise percentage enforcement
            const adminWinRate = parseFloat(user.tradeWinRate);
            winRate = adminWinRate / 100;
            winRateSource = `admin-set (${adminWinRate}%)`;
            console.log(`🎯 ADMIN WIN RATE ENFORCED: User ${user.username} has ${adminWinRate}% win rate set by admin`);
            
            // FORCE LOSS mode: 0% win rate guarantees loss
            if (adminWinRate === 0) {
              console.log(`🔴 FORCE LOSS MODE: User ${user.username} will definitely lose this trade (0% win rate)`);
            }
            // FORCE WIN mode: 100% win rate guarantees win
            else if (adminWinRate === 100) {
              console.log(`🟢 FORCE WIN MODE: User ${user.username} will definitely win this trade (100% win rate)`);
            }
            // Custom percentage mode
            else {
              console.log(`⚖️ CUSTOM WIN RATE: User ${user.username} has ${adminWinRate}% chance to win this trade`);
            }
          } else {
            // Fallback to duration-based win rates
            const duration = parseFloat(tradeData.duration);
            if (duration === 0.5) winRate = 0.30; // 30sec
            else if (duration === 1) winRate = 0.40; // 1min
            else if (duration === 5) winRate = 0.55; // 5min
            else if (duration === 10) winRate = 0.70; // 10min
            else if (duration === 30) winRate = 0.90; // 30min
            winRateSource = `duration-based (${(winRate * 100).toFixed(0)}%)`;
            console.log(`Using duration-based win rate for user ${user?.username}: ${(winRate * 100).toFixed(0)}%`);
          }
          
          // Generate precise random outcome based on admin-set percentage
          const randomValue = Math.random();
          let isWin: boolean;
          
          if (user && user.tradeWinRate !== null && user.tradeWinRate !== undefined) {
            const adminWinRate = parseFloat(user.tradeWinRate);
            
            // Ensure exact percentage enforcement for admin-set rates
            if (adminWinRate === 0) {
              isWin = false; // Guaranteed loss
            } else if (adminWinRate === 100) {
              isWin = true; // Guaranteed win
            } else {
              // Use precise percentage calculation
              isWin = (randomValue * 100) < adminWinRate;
            }
            
            console.log(`🎲 Random: ${(randomValue * 100).toFixed(2)}%, Win Rate: ${adminWinRate}%, Result: ${isWin ? 'WIN' : 'LOSS'}`);
          } else {
            // Duration-based calculation for users without admin-set rates
            isWin = randomValue < winRate;
            console.log(`🎲 Duration-based random: ${(randomValue * 100).toFixed(2)}%, Win Rate: ${(winRate * 100).toFixed(0)}%, Result: ${isWin ? 'WIN' : 'LOSS'}`);
          }
          
          // Get profit percentage - ONLY use admin-set winPercentage (no duration-based fallback)
          let profitPercentage = 85; // Default fallback for users without admin setting
          let profitSource = "default (85%)";
          
          if (user && user.winPercentage !== null && user.winPercentage !== undefined) {
            // Use admin-set profit percentage for this user
            profitPercentage = parseFloat(user.winPercentage);
            profitSource = `admin-set (${profitPercentage}%)`;
            console.log(`💰 ADMIN PROFIT PERCENTAGE ENFORCED: User ${user.username} gets ${profitPercentage}% profit when winning`);
          } else {
            // Use default percentage for users without admin setting
            console.log(`⚠️ NO ADMIN PROFIT PERCENTAGE SET: User ${user?.username} using default ${profitPercentage}% profit rate`);
          }
          
          const multiplier = isWin ? (1 + profitPercentage / 100) : 0; // Convert percentage to multiplier
          const pnl = isWin 
            ? (parseFloat(tradeData.amount) * multiplier - parseFloat(tradeData.amount)).toFixed(2)
            : `-${tradeData.amount}`;
          
          console.log(`Trade calculation: Win=${isWin}, Duration=${parseFloat(tradeData.duration)}min, Profit %=${profitPercentage}%, Multiplier=${multiplier}, PnL=${pnl}`);
          
          console.log(`Trade ${trade.id} for user ${user?.username} completed: ${isWin ? 'WIN' : 'LOSS'}, PnL: ${pnl}, Win Rate: ${winRateSource}, Profit Source: ${profitSource}, Random: ${randomValue.toFixed(3)}`);
          
          await storage.updateTradeResult(trade.id, isWin ? 'win' : 'loss', pnl);
          
          // Send trade result notification email and Telegram
          if (user) {
            await sendTradeResultEmail(
              user.email,
              user.username,
              tradeData.pair || 'BTC/USDT',
              tradeData.tradeType,
              tradeData.amount,
              isWin ? 'win' : 'loss',
              `${isWin ? '+' : ''}$${pnl}`
            );
            
            // Send Telegram notification for trade execution
            notifyTradeExecuted({
              userId: user.id,
              userEmail: user.email,
              tradeType: tradeData.tradeType,
              tradingPair: tradeData.pair || 'BTC/USDT',
              amount: tradeData.amount,
              entryPrice: trade.entryPrice || '0',
              exitPrice: null,
              result: isWin ? 'win' : 'loss',
              pnl: pnl.replace('-', '').replace('$', ''),
              duration: `${tradeData.duration} min`,
            });
          }
        } catch (error) {
          console.error('Error completing trade:', error);
          notifyError({
            type: 'trade_failed',
            details: 'Trade settlement failed',
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      }, parseFloat(tradeData.duration) * 60 * 1000);
      
      res.json(trade);
    } catch (error) {
      console.error("Trade placement error:", error);
      res.status(400).json({ message: "Failed to place trade", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/trades", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const trades = await storage.getUserTrades(req.userId!);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/active", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const activeTrades = await storage.getActiveTrades(req.userId!);
      res.json(activeTrades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active trades" });
    }
  });

  // Get cryptocurrency wallet addresses for deposits
  app.get("/api/crypto/wallets", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const wallets = {
        USDT: await storage.getSiteConfig("deposit_wallet_usdt"),
        TRX: await storage.getSiteConfig("deposit_wallet_trx"),
        ETH: await storage.getSiteConfig("deposit_wallet_eth"),
        BTC: await storage.getSiteConfig("deposit_wallet_btc"),
      };
      
      const minimums = {
        USDT: await storage.getSiteConfig("min_deposit_usdt"),
        TRX: await storage.getSiteConfig("min_deposit_trx"),
        ETH: await storage.getSiteConfig("min_deposit_eth"),
        BTC: await storage.getSiteConfig("min_deposit_btc"),
      };

      const qrCodes = {
        USDT: await storage.getSiteConfig("qr_code_usdt"),
        TRX: await storage.getSiteConfig("qr_code_trx"),
        ETH: await storage.getSiteConfig("qr_code_eth"),
        BTC: await storage.getSiteConfig("qr_code_btc"),
      };

      res.json({
        wallets: {
          USDT: wallets.USDT?.value || "TYourUSDTWalletAddress123456789",
          TRX: wallets.TRX?.value || "TYourTRXWalletAddress123456789",
          ETH: wallets.ETH?.value || "0xYourETHWalletAddress123456789",
          BTC: wallets.BTC?.value || "1YourBTCWalletAddress123456789",
        },
        minimums: {
          USDT: minimums.USDT?.value || "10.00",
          TRX: minimums.TRX?.value || "100.00",
          ETH: minimums.ETH?.value || "0.01",
          BTC: minimums.BTC?.value || "0.001",
        },
        qrCodes: {
          USDT: qrCodes.USDT?.value || null,
          TRX: qrCodes.TRX?.value || null,
          ETH: qrCodes.ETH?.value || null,
          BTC: qrCodes.BTC?.value || null,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wallet addresses" });
    }
  });

  // Transaction routes
  app.post("/api/deposit", authenticateToken, upload.single('proofFile'), async (req: AuthRequest, res) => {
    try {
      console.log("Deposit request body:", req.body);
      console.log("Uploaded file:", req.file);
      console.log("Form data keys:", Object.keys(req.body));
      console.log("File field name expected: 'proofFile'");
      
      if (!req.file) {
        console.error("❌ No file received in req.file");
        console.error("Request headers:", req.headers['content-type']);
        return res.status(400).json({ message: "Proof of deposit file is required" });
      }
      
      const transactionData = insertTransactionSchema.parse(req.body);
      console.log("Parsed transaction data:", transactionData);
      
      // Get minimum deposit amount for the cryptocurrency
      const minDepositConfig = await storage.getSiteConfig(`min_deposit_${transactionData.cryptocurrency.toLowerCase()}`);
      const minDeposit = parseFloat(minDepositConfig?.value || "10.00");
      
      if (parseFloat(transactionData.amount) < minDeposit) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting file:", err);
          });
        }
        return res.status(400).json({ 
          message: `Minimum deposit amount is ${minDeposit} ${transactionData.cryptocurrency}` 
        });
      }
      
      const transaction = await storage.createTransaction({
        ...transactionData,
        type: "deposit",
        userId: req.userId!,
        proofFilePath: req.file.path,
        proofFileName: req.file.originalname,
      });
      
      // Get user info for email and Telegram
      const user = await storage.getUser(req.userId!);
      if (user) {
        // Send deposit notification email
        await sendDepositNotificationEmail(
          user.email,
          user.username,
          transactionData.amount,
          transactionData.cryptocurrency,
          'Pending verification'
        );
        
        // Send Telegram notification
        notifyDepositSubmitted({
          userId: user.id,
          userEmail: user.email,
          userPhone: user.mobileNumber,
          amount: transactionData.amount,
          cryptocurrency: transactionData.cryptocurrency,
          network: transactionData.network || 'Unknown',
          txid: null,
          walletAddress: null,
          status: 'Pending (Manual upload)',
        });
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Deposit error:", error);
      // Clean up uploaded file if there's an error
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      res.status(400).json({ message: "Failed to create deposit request", error: error.message });
    }
  });

  // New deposit with TXID auto-validation endpoint
  app.post("/api/deposit/txid", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const depositData = depositWithTxidSchema.parse(req.body);
      console.log("Deposit with TXID request:", depositData);

      // Validate TXID format
      if (!isValidTxidFormat(depositData.transactionHash, depositData.network)) {
        return res.status(400).json({ 
          message: `Invalid transaction hash format for ${depositData.network} network` 
        });
      }

      // Check if TXID already exists (prevent double claims)
      const existingTx = await storage.getTransactionByTxid(depositData.transactionHash);
      if (existingTx) {
        return res.status(400).json({ 
          message: "This transaction hash has already been submitted" 
        });
      }

      // Get the active deposit wallet for this network
      const depositWallet = await storage.getActiveDepositWallet(depositData.network);
      if (!depositWallet) {
        // Fallback to siteConfig for backward compatibility
        const networkKey = depositData.network.toLowerCase();
        const walletConfig = await storage.getSiteConfig(`deposit_wallet_${networkKey === 'trc20' ? 'usdt' : networkKey}`);
        if (!walletConfig?.value) {
          return res.status(400).json({ 
            message: `No deposit wallet configured for ${depositData.network} network` 
          });
        }
        
        // Create deposit with siteConfig wallet
        const transaction = await storage.createDepositWithTxid({
          userId: req.userId!,
          amount: depositData.amount,
          cryptocurrency: depositData.cryptocurrency,
          network: depositData.network,
          transactionHash: depositData.transactionHash,
          depositWalletAddress: walletConfig.value,
        });

        // Trigger async validation
        validateAndUpdateDeposit(transaction.id, depositData.transactionHash, depositData.network, 
          depositData.amount, walletConfig.value, depositData.cryptocurrency, transaction.createdAt!);

        res.json({ 
          ...transaction,
          message: "Deposit submitted. Validating transaction on blockchain..." 
        });
        return;
      }

      // Create deposit with snapshot of wallet address
      const transaction = await storage.createDepositWithTxid({
        userId: req.userId!,
        amount: depositData.amount,
        cryptocurrency: depositData.cryptocurrency,
        network: depositData.network,
        transactionHash: depositData.transactionHash,
        depositWalletAddress: depositWallet.address,
      });

      // Trigger async validation
      validateAndUpdateDeposit(transaction.id, depositData.transactionHash, depositData.network, 
        depositData.amount, depositWallet.address, depositData.cryptocurrency, transaction.createdAt!);

      // Get user info for email and Telegram
      const user = await storage.getUser(req.userId!);
      if (user) {
        await sendDepositNotificationEmail(
          user.email,
          user.username,
          depositData.amount,
          depositData.cryptocurrency,
          'Validating on blockchain'
        );
        
        // Send Telegram notification for TXID deposit
        notifyDepositSubmitted({
          userId: user.id,
          userEmail: user.email,
          userPhone: user.mobileNumber,
          amount: depositData.amount,
          cryptocurrency: depositData.cryptocurrency,
          network: depositData.network,
          txid: depositData.transactionHash,
          walletAddress: depositWallet.address,
          status: 'Validating on blockchain',
        });
      }

      res.json({ 
        ...transaction,
        message: "Deposit submitted. Validating transaction on blockchain..." 
      });
    } catch (error: any) {
      console.error("Deposit with TXID error:", error);
      if (error.code === '23505') { // Unique constraint violation
        notifyError({
          type: 'duplicate_txid',
          details: `Duplicate TXID submission attempt: ${depositData.transactionHash}`,
        });
        return res.status(400).json({ message: "This transaction hash has already been submitted" });
      }
      res.status(400).json({ message: "Failed to create deposit request", error: error.message });
    }
  });

  // Helper function to validate and update deposit asynchronously
  async function validateAndUpdateDeposit(
    transactionId: number,
    txid: string,
    network: string,
    expectedAmount: string,
    expectedWallet: string,
    cryptocurrency: string,
    submissionTime: Date
  ) {
    try {
      await storage.updateTransactionValidation(transactionId, {
        validationStatus: 'validating',
        lastValidationCheck: new Date(),
      });

      const result = await validateTxid(txid, network, expectedAmount, expectedWallet, cryptocurrency, submissionTime);

      if (result.success && result.confirmed) {
        // Auto-confirm the deposit
        await storage.updateTransactionValidation(transactionId, {
          validationStatus: 'validated',
          confirmationCount: result.confirmations,
          validatedAmount: result.amount,
          validatedContract: result.tokenContract,
          validationLog: JSON.stringify(result.log),
          autoValidatedAt: new Date(),
          status: 'auto_confirmed',
        });

        // Credit the user's balance
        const transaction = await storage.getTransactionByTxid(txid);
        if (transaction) {
          await storage.updateUserBalance(transaction.userId, transaction.amount);
          
          // Send success email and Telegram notification
          const user = await storage.getUser(transaction.userId);
          if (user) {
            await sendDepositApprovedEmail(
              user.email,
              user.username,
              transaction.amount,
              cryptocurrency
            );
            
            // Send Telegram notification for auto-confirmed deposit
            notifyDepositAutoConfirmed({
              userId: user.id,
              userEmail: user.email,
              userPhone: user.mobileNumber,
              amount: transaction.amount,
              cryptocurrency: cryptocurrency,
              network: network,
              txid: txid,
              walletAddress: expectedWallet,
              confirmations: result.confirmations || 0,
            });
          }
        }
      } else if (result.success && !result.confirmed) {
        // Transaction found but not enough confirmations - keep as pending
        await storage.updateTransactionValidation(transactionId, {
          validationStatus: 'pending_confirmations',
          confirmationCount: result.confirmations,
          validatedAmount: result.amount,
          validatedContract: result.tokenContract,
          validationLog: JSON.stringify(result.log),
          lastValidationCheck: new Date(),
        });
      } else {
        // Validation failed - mark for manual review
        await storage.updateTransactionValidation(transactionId, {
          validationStatus: 'manual_review',
          validationLog: JSON.stringify(result.log),
          lastValidationCheck: new Date(),
        });
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      await storage.updateTransactionValidation(transactionId, {
        validationStatus: 'manual_review',
        validationLog: JSON.stringify([`Error: ${error.message}`]),
        lastValidationCheck: new Date(),
      });
    }
  }

  app.post("/api/withdraw", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      
      // Check if user has sufficient balance and withdrawal permissions
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Check if user is banned from withdrawals
      if (user.withdrawalBanned) {
        console.log(`Withdrawal blocked for banned user: ${user.email}`);
        return res.status(403).json({ 
          message: user.withdrawalBanReason || "Dear User your account has been Temporary suspended from withdrawal due to recurring multiple withdrawal requests for further assistance contact customer service"
        });
      }
      
      // Get minimum withdrawal amount for the cryptocurrency
      const minWithdrawalConfig = await storage.getSiteConfig(`min_withdrawal_${transactionData.cryptocurrency.toLowerCase()}`);
      const minWithdrawal = parseFloat(minWithdrawalConfig?.value || "20.00");
      
      if (parseFloat(transactionData.amount) < minWithdrawal) {
        return res.status(400).json({ 
          message: `Minimum withdrawal amount is ${minWithdrawal} ${transactionData.cryptocurrency}` 
        });
      }
      
      if (parseFloat(user.balance || "0") < parseFloat(transactionData.amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      const transaction = await storage.createTransaction({
        ...transactionData,
        type: "withdrawal",
        userId: req.userId!,
      });
      
      // Deduct amount from balance
      await storage.updateUserBalance(req.userId!, `-${transactionData.amount}`);
      
      // Send withdrawal request notification email
      try {
        console.log(`Sending withdrawal request email to ${user.email} for ${transactionData.amount} ${transactionData.cryptocurrency}`);
        const emailSent = await sendWithdrawalRequestEmail(
          user.email,
          user.username,
          transactionData.amount,
          transactionData.cryptocurrency,
          transactionData.walletAddress || 'Not provided'
        );
        console.log(`Withdrawal request email ${emailSent ? 'sent successfully' : 'failed to send'} to ${user.email}`);
      } catch (emailError) {
        console.error('Error sending withdrawal request email:', emailError);
      }
      
      // Send Telegram notification for withdrawal request
      notifyWithdrawalRequest({
        userId: user.id,
        userEmail: user.email,
        userPhone: user.mobileNumber,
        amount: transactionData.amount,
        cryptocurrency: transactionData.cryptocurrency,
        network: transactionData.network || 'Unknown',
        destinationAddress: transactionData.walletAddress || 'Not provided',
        currentBalance: user.balance || '0',
      });
      
      res.json(transaction);
    } catch (error) {
      console.error("Withdrawal request error:", error);
      res.status(400).json({ message: "Failed to create withdrawal request" });
    }
  });

  app.get("/api/transactions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.userId!);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:transactionId/receipt", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const userTransactions = await storage.getUserTransactions(req.userId!);
      const transaction = userTransactions.find(t => t.id === transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.type !== "withdrawal" || transaction.status !== "approved") {
        return res.status(400).json({ message: "Receipt only available for approved withdrawals" });
      }
      
      if (!transaction.receiptTxid) {
        return res.status(400).json({ message: "Receipt not yet generated" });
      }

      res.json({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        cryptocurrency: transaction.cryptocurrency,
        network: transaction.network,
        walletAddress: transaction.walletAddress,
        receiptTxid: transaction.receiptTxid,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch receipt" });
    }
  });

  // Referral routes
  app.get("/api/referral", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getReferralStats(req.userId!);
      const referrals = await storage.getUserReferrals(req.userId!);
      
      res.json({
        stats,
        referrals,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referral data" });
    }
  });

  // ============= ADMIN ROUTES =============

  // User Management Routes
  app.get("/api/admin/users", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const users = await storage.getAllUsers(page, limit);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:userId", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const updates = req.body;
      console.log(`Admin ${req.userId} updating user ${userId} with:`, updates);
      
      const user = await storage.adminUpdateUser(userId, updates, req.userId!);
      console.log(`Update result:`, user ? `Updated user ${user.username}` : 'User not found');
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Admin user update error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/admin/users/:userId/ban", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await storage.banUser(userId, req.userId!);
      res.json({ message: "User banned successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to ban user" });
    }
  });

  app.delete("/api/admin/users/:userId", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`Admin ${req.userId} attempting to delete user ${userId}`);
      
      // Check if user exists before deletion
      const userExists = await storage.getUser(userId);
      if (!userExists) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await storage.deleteUser(userId, req.userId!);
      console.log(`User ${userId} deleted successfully by admin ${req.userId}`);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        message: "Failed to delete user", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Transaction Management Routes
  app.get("/api/admin/transactions", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getAllTransactions(status, page, limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/admin/transactions/:transactionId/approve", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { adminNote } = req.body;
      
      // Get transaction details before approval
      const transactions = await storage.getAllTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      
      await storage.approveTransaction(transactionId, req.userId!, adminNote);
      
      // Send approval email notification
      if (transaction && transaction.user) {
        try {
          if (transaction.type === 'deposit') {
            console.log(`Sending deposit approval email to ${transaction.user.email} for ${transaction.amount} ${transaction.cryptocurrency}`);
            const emailSent = await sendDepositApprovedEmail(
              transaction.user.email,
              transaction.user.username,
              transaction.amount,
              transaction.cryptocurrency
            );
            console.log(`Deposit approval email ${emailSent ? 'sent successfully' : 'failed to send'} to ${transaction.user.email}`);
          } else if (transaction.type === 'withdrawal') {
            console.log(`Sending withdrawal approval email to ${transaction.user.email} for ${transaction.amount} ${transaction.cryptocurrency}`);
            const emailSent = await sendWithdrawalApprovedEmail(
              transaction.user.email,
              transaction.user.username,
              transaction.amount,
              transaction.cryptocurrency,
              transaction.txHash || 'Processing'
            );
            console.log(`Withdrawal approval email ${emailSent ? 'sent successfully' : 'failed to send'} to ${transaction.user.email}`);
          }
        } catch (emailError) {
          console.error('Error sending approval email notification:', emailError);
          // Don't fail the transaction approval if email fails
        }
        // Send Telegram notification for approved transaction
        if (transaction.type === 'deposit') {
          notifyDepositManuallyConfirmed({
            userId: transaction.user.id,
            userEmail: transaction.user.email,
            userPhone: transaction.user.mobileNumber,
            amount: transaction.amount,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network || 'Unknown',
            txid: transaction.transactionHash,
            adminNote: adminNote,
          });
        } else if (transaction.type === 'withdrawal') {
          notifyWithdrawalStatusChange({
            userId: transaction.user.id,
            userEmail: transaction.user.email,
            userPhone: transaction.user.mobileNumber,
            amount: transaction.amount,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network || 'Unknown',
            destinationAddress: transaction.walletAddress || 'N/A',
            status: 'approved',
            txHash: transaction.txHash,
          });
        }
      } else {
        console.error('Transaction or user data missing for email notification:', { 
          hasTransaction: !!transaction, 
          hasUser: !!(transaction?.user),
          transactionId 
        });
      }
      
      res.json({ message: "Transaction approved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve transaction" });
    }
  });

  app.post("/api/admin/transactions/:transactionId/decline", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { adminNote } = req.body;
      
      // Get transaction details before declining
      const transactions = await storage.getAllTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      
      await storage.declineTransaction(transactionId, req.userId!, adminNote);
      
      // Send rejection email notification
      if (transaction && transaction.user) {
        try {
          if (transaction.type === 'withdrawal') {
            console.log(`Sending withdrawal rejection email to ${transaction.user.email} for ${transaction.amount} ${transaction.cryptocurrency}`);
            const emailSent = await sendWithdrawalRejectedEmail(
              transaction.user.email,
              transaction.user.username,
              transaction.amount,
              transaction.cryptocurrency,
              adminNote || 'Transaction declined by admin'
            );
            console.log(`Withdrawal rejection email ${emailSent ? 'sent successfully' : 'failed to send'} to ${transaction.user.email}`);
          } else if (transaction.type === 'deposit') {
            console.log(`Sending deposit rejection email to ${transaction.user.email} for ${transaction.amount} ${transaction.cryptocurrency}`);
            const emailSent = await sendDepositRejectedEmail(
              transaction.user.email,
              transaction.user.username,
              transaction.amount,
              transaction.cryptocurrency,
              adminNote || 'Deposit verification failed'
            );
            console.log(`Deposit rejection email ${emailSent ? 'sent successfully' : 'failed to send'} to ${transaction.user.email}`);
          }
        } catch (emailError) {
          console.error('Error sending rejection email notification:', emailError);
        }
        
        // Send Telegram notification for declined transaction
        if (transaction.type === 'deposit') {
          notifyDepositRejected({
            userId: transaction.user.id,
            userEmail: transaction.user.email,
            userPhone: transaction.user.mobileNumber,
            amount: transaction.amount,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network || 'Unknown',
            txid: transaction.transactionHash,
            reason: adminNote,
          });
        } else if (transaction.type === 'withdrawal') {
          notifyWithdrawalStatusChange({
            userId: transaction.user.id,
            userEmail: transaction.user.email,
            userPhone: transaction.user.mobileNumber,
            amount: transaction.amount,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network || 'Unknown',
            destinationAddress: transaction.walletAddress || 'N/A',
            status: 'rejected',
            reason: adminNote,
          });
        }
      } else {
        console.error('Transaction or user data missing for email notification:', { 
          hasTransaction: !!transaction, 
          hasUser: !!(transaction?.user),
          transactionId 
        });
      }
      
      res.json({ message: "Transaction declined successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to decline transaction" });
    }
  });

  // Admin endpoint to manually override deposit validation
  app.post("/api/admin/deposits/:transactionId/override", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { action, adminNote } = adminDepositActionSchema.parse(req.body);
      
      const transactions = await storage.getAllTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.type !== 'deposit') {
        return res.status(400).json({ message: "This action is only for deposits" });
      }

      if (action === 'approve' || action === 'override_approve') {
        // Manually approve the deposit
        await storage.updateTransactionValidation(transactionId, {
          validationStatus: 'manually_approved',
          status: 'manually_confirmed',
        });
        
        // Update admin note and mark as approved
        await storage.approveTransaction(transactionId, req.userId!, adminNote || 'Manually approved by admin');
        
        // Send approval email and Telegram
        if (transaction.user) {
          await sendDepositApprovedEmail(
            transaction.user.email,
            transaction.user.username,
            transaction.amount,
            transaction.cryptocurrency
          );
          
          notifyDepositManuallyConfirmed({
            userId: transaction.user.id,
            userEmail: transaction.user.email,
            userPhone: transaction.user.mobileNumber,
            amount: transaction.amount,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network || 'Unknown',
            txid: transaction.transactionHash,
            adminNote: adminNote,
          });
        }
        
        res.json({ message: "Deposit manually approved" });
      } else if (action === 'reject') {
        // Reject the deposit
        await storage.updateTransactionValidation(transactionId, {
          validationStatus: 'rejected',
          status: 'rejected',
        });
        
        await storage.declineTransaction(transactionId, req.userId!, adminNote || 'Rejected by admin');
        
        if (transaction.user) {
          await sendDepositRejectedEmail(
            transaction.user.email,
            transaction.user.username,
            transaction.amount,
            transaction.cryptocurrency,
            adminNote || 'Deposit verification failed'
          );
          
          notifyDepositRejected({
            userId: transaction.user.id,
            userEmail: transaction.user.email,
            userPhone: transaction.user.mobileNumber,
            amount: transaction.amount,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network || 'Unknown',
            txid: transaction.transactionHash,
            reason: adminNote || 'Deposit verification failed',
          });
        }
        
        res.json({ message: "Deposit rejected" });
      }
    } catch (error) {
      console.error("Deposit override error:", error);
      res.status(500).json({ message: "Failed to process deposit override" });
    }
  });

  // Get deposit validation log
  app.get("/api/admin/deposits/:transactionId/validation-log", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const transactions = await storage.getAllTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json({
        transactionHash: transaction.transactionHash,
        validationStatus: transaction.validationStatus,
        confirmationCount: transaction.confirmationCount,
        validatedAmount: transaction.validatedAmount,
        validatedContract: transaction.validatedContract,
        depositWalletAddress: transaction.depositWalletAddress,
        validationLog: transaction.validationLog ? JSON.parse(transaction.validationLog) : [],
        lastValidationCheck: transaction.lastValidationCheck,
        autoValidatedAt: transaction.autoValidatedAt,
        manuallyValidatedAt: transaction.manuallyValidatedAt,
      });
    } catch (error) {
      console.error("Error fetching validation log:", error);
      res.status(500).json({ message: "Failed to fetch validation log" });
    }
  });

  // Admin endpoint to manage deposit wallets
  app.get("/api/admin/deposit-wallets", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const wallets = await storage.getAllDepositWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deposit wallets" });
    }
  });

  app.post("/api/admin/deposit-wallets", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { network, address } = req.body;
      
      if (!['TRC20', 'ERC20', 'BSC', 'BTC'].includes(network)) {
        return res.status(400).json({ message: "Invalid network" });
      }
      
      const wallet = await storage.createDepositWallet({
        network,
        address,
        isActive: true,
        updatedBy: req.userId!,
      });
      
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ message: "Failed to create deposit wallet" });
    }
  });

  app.put("/api/admin/deposit-wallets/:id", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const { address } = req.body;
      
      const wallet = await storage.updateDepositWallet(walletId, address, req.userId!);
      
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ message: "Failed to update deposit wallet" });
    }
  });

  app.delete("/api/admin/deposit-wallets/:id", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const walletId = parseInt(req.params.id);
      await storage.deactivateDepositWallet(walletId, req.userId!);
      res.json({ message: "Deposit wallet deactivated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate deposit wallet" });
    }
  });

  // Credit Alert Email Route
  app.post("/api/admin/send-credit-alert", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const { email, username, amount, cryptocurrency } = req.body;
      console.log(`Sending credit alert email to ${email} for ${amount} ${cryptocurrency}`);
      
      const emailSent = await sendCreditAlertEmail(email, username, amount, cryptocurrency);
      
      if (emailSent) {
        console.log(`Credit alert email sent successfully to ${email}`);
        res.json({ message: "Credit alert email sent successfully" });
      } else {
        console.log(`Credit alert email failed to send to ${email}`);
        res.status(500).json({ message: "Failed to send credit alert email" });
      }
    } catch (error) {
      console.error('Error sending credit alert email:', error);
      res.status(500).json({ message: "Failed to send credit alert email" });
    }
  });

  // Site Configuration Routes
  app.get("/api/admin/config", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const configs = await storage.getAllSiteConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site configurations" });
    }
  });

  app.put("/api/admin/config", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { key, value, description } = req.body;
      const config = await storage.updateSiteConfig(key, value, req.userId!, description);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update site configuration" });
    }
  });

  // Cryptocurrency Wallet Management Routes
  app.put("/api/admin/crypto/wallets", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { cryptocurrency, walletAddress } = req.body;
      
      if (!['USDT', 'TRX', 'ETH', 'BTC'].includes(cryptocurrency)) {
        return res.status(400).json({ message: "Invalid cryptocurrency" });
      }
      
      const configKey = `deposit_wallet_${cryptocurrency.toLowerCase()}`;
      const description = `${cryptocurrency} deposit wallet address`;
      
      const config = await storage.updateSiteConfig(configKey, walletAddress, req.userId!, description);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update wallet address" });
    }
  });

  // QR code upload route
  app.post("/api/admin/qr-upload", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      console.log("QR upload request body:", req.body);
      const { cryptocurrency, qrCodeData } = req.body;
      
      if (!cryptocurrency || !qrCodeData) {
        console.log("Missing data:", { cryptocurrency, qrCodeData: !!qrCodeData });
        return res.status(400).json({ message: "Cryptocurrency and QR code data are required" });
      }
      
      if (!['USDT', 'TRX', 'ETH', 'BTC'].includes(cryptocurrency)) {
        console.log("Invalid cryptocurrency:", cryptocurrency);
        return res.status(400).json({ message: "Invalid cryptocurrency" });
      }
      
      const configKey = `qr_code_${cryptocurrency.toLowerCase()}`;
      const description = `${cryptocurrency} deposit QR code`;
      
      console.log("Updating config:", { configKey, description });
      const config = await storage.updateSiteConfig(configKey, qrCodeData, req.userId!, description);
      console.log("QR code upload successful");
      res.json({ message: "QR code uploaded successfully", config });
    } catch (error) {
      console.error("QR upload error:", error);
      res.status(500).json({ message: "Failed to upload QR code", error: error.message });
    }
  });

  // Trading Control Routes
  app.post("/api/admin/users/:userId/trade-outcome", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { winRate } = req.body;
      await storage.setUserTradeOutcome(userId, winRate, req.userId!);
      res.json({ message: "User trade outcome updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update trade outcome" });
    }
  });

  // KYC Routes
  app.post("/api/kyc/submit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log("KYC submission received:", { 
        userId: req.userId,
        hasFullName: !!req.body.fullName,
        hasFrontImage: !!req.body.idFrontImage,
        hasBackImage: !!req.body.idBackImage,
        frontImageLength: req.body.idFrontImage?.length,
        backImageLength: req.body.idBackImage?.length
      });

      // Validate the request body against the schema
      const kycData = insertKycSchema.parse({
        ...req.body,
        userId: req.userId!,
        status: "pending" // Explicitly set default status
      });
      
      console.log("KYC data validation successful, submitting to database");
      const kyc = await storage.submitKyc(kycData);
      console.log("KYC submission successful:", { kycId: kyc.id, status: kyc.status });
      
      res.json(kyc);
    } catch (error) {
      console.error("KYC submission error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ 
        message: "Failed to submit KYC request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/kyc/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const kyc = await storage.getUserKyc(req.userId!);
      res.json(kyc || { status: "not_submitted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KYC status" });
    }
  });

  app.get("/api/admin/kyc", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const kycRequests = await storage.getAllKycRequests(status, page, limit);
      res.json(kycRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch KYC requests" });
    }
  });

  app.post("/api/admin/kyc/:kycId/review", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const kycId = parseInt(req.params.kycId);
      const review = req.body;
      await storage.reviewKyc(kycId, review, req.userId!);
      res.json({ message: "KYC request reviewed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to review KYC request" });
    }
  });

  // Admin user impersonation - Login as user
  app.post("/api/admin/users/:userId/impersonate", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`Admin ${req.userId} attempting to impersonate user ${userId}`);
      
      // Get the target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a new token for the target user
      const token = jwt.sign(
        { userId: targetUser.id, username: targetUser.username },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );
      
      console.log(`Admin ${req.userId} successfully impersonating user ${targetUser.username}`);
      res.json({ 
        token, 
        user: {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
          role: targetUser.role
        },
        message: "Impersonation successful" 
      });
    } catch (error) {
      console.error('Impersonation error:', error);
      res.status(500).json({ message: "Failed to impersonate user" });
    }
  });

  // Admin password reset
  app.post("/api/admin/users/:userId/reset-password", authenticateSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { newPassword } = req.body;
      
      console.log(`Admin ${req.userId} attempting to reset password for user ${userId}`);
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Get the target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update the user's password
      await storage.adminUpdateUser(userId, { password: hashedPassword }, req.userId!);
      
      console.log(`Admin ${req.userId} successfully reset password for user ${targetUser.username}`);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin Topup Credit - Add credit to user's balance
  app.post("/api/admin/users/:userId/topup", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { amount, note } = req.body;
      
      console.log(`Admin ${req.userId} attempting to topup user ${userId} with ${amount}`);
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Please enter a valid positive amount" });
      }
      
      // Get the target user
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a transaction record for the topup (as a credit/inbound transfer)
      const transaction = await storage.createAdminTopup({
        userId,
        amount: parseFloat(amount).toFixed(2),
        note: note || "Admin credit topup",
        adminId: req.userId!
      });
      
      // Update user's balance
      await storage.updateUserBalance(userId, parseFloat(amount).toFixed(2));
      
      // Get updated user info
      const updatedUser = await storage.getUser(userId);
      
      console.log(`Admin ${req.userId} successfully topped up user ${targetUser.username} with ${amount}`);
      res.json({ 
        message: "Credit added successfully",
        transaction,
        newBalance: updatedUser?.balance
      });
    } catch (error) {
      console.error('Topup error:', error);
      res.status(500).json({ message: "Failed to add credit" });
    }
  });

  // Blacklist management routes
  app.get("/api/admin/blacklist", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const blacklist = await storage.getAllBlacklist();
      res.json(blacklist);
    } catch (error) {
      console.error('Get blacklist error:', error);
      res.status(500).json({ message: "Failed to fetch blacklist" });
    }
  });

  app.post("/api/admin/blacklist", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertBlacklistSchema.parse(req.body);
      
      // Check if already blacklisted
      const isAlreadyBlacklisted = await storage.isBlacklisted(validatedData.value, validatedData.type);
      if (isAlreadyBlacklisted) {
        return res.status(400).json({ message: "This entry is already blacklisted" });
      }
      
      const entry = await storage.addToBlacklist({
        ...validatedData,
        addedBy: req.userId,
      });
      
      console.log(`Admin ${req.userId} added ${validatedData.type} '${validatedData.value}' to blacklist`);
      res.json(entry);
    } catch (error) {
      console.error('Add blacklist error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`)
        });
      }
      res.status(500).json({ message: "Failed to add to blacklist" });
    }
  });

  app.delete("/api/admin/blacklist/:id", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.removeFromBlacklist(id);
      console.log(`Admin ${req.userId} removed blacklist entry ${id}`);
      res.json({ message: "Removed from blacklist successfully" });
    } catch (error) {
      console.error('Remove blacklist error:', error);
      res.status(500).json({ message: "Failed to remove from blacklist" });
    }
  });

  // Forgot password - Send reset email
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const { email } = validatedData;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Always return success to prevent email enumeration
        return res.json({ message: "If an account with that email exists, a password reset link has been sent" });
      }

      // Generate reset token
      const resetToken = await storage.createPasswordResetToken(user.id);

      // Send reset email
      await sendPasswordResetEmail(user.email, user.username, resetToken);

      res.json({ message: "If an account with that email exists, a password reset link has been sent" });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const { token, newPassword } = validatedData;

      // Reset password
      const success = await storage.resetPassword(token, newPassword);
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password (authenticated user)
  app.post("/api/change-password", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const { currentPassword, newPassword } = validatedData;

      // Change password
      const success = await storage.changePassword(req.userId!, currentPassword, newPassword);
      if (!success) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ========== Gift Card Redemption Routes ==========
  
  // Create uploads directory for gift card images
  const giftCardUploadsDir = path.join(process.cwd(), 'uploads', 'gift-cards');
  if (!fs.existsSync(giftCardUploadsDir)) {
    fs.mkdirSync(giftCardUploadsDir, { recursive: true });
  }
  
  const giftCardUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, giftCardUploadsDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'giftcard-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG and PNG images are allowed') as any, false);
      }
    }
  });

  // User: Submit gift card redemption
  app.post("/api/gift-cards", authenticateToken, giftCardUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      const parsed = insertGiftCardSchema.parse(req.body);
      
      if (!req.file) {
        return res.status(400).json({ message: "Gift card image is required" });
      }
      
      const amount = parseFloat(parsed.giftCardAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" });
      }

      // Check daily limit (max 5 per day)
      const dailyCount = await storage.getUserDailyGiftCardCount(req.userId!);
      if (dailyCount >= 5) {
        return res.status(429).json({ message: "Daily submission limit reached (5 per day). Please try again tomorrow." });
      }

      // Check for duplicate gift card code
      const isUsed = await storage.isGiftCardCodeUsed(parsed.giftCardCode);
      if (isUsed) {
        return res.status(400).json({ message: "This gift card code has already been submitted" });
      }

      const imageUrl = `/uploads/gift-cards/${req.file.filename}`;
      
      const redemption = await storage.createGiftCardRedemption({
        userId: req.userId!,
        giftCardType: parsed.giftCardType,
        giftCardCode: parsed.giftCardCode,
        giftCardCurrency: parsed.giftCardCurrency,
        giftCardFormat: parsed.giftCardFormat,
        giftCardAmount: parsed.giftCardAmount,
        imageUrl,
      });

      res.json({ 
        message: "Your gift card is under review. Please wait for admin approval.",
        redemption 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      console.error('Gift card submission error:', error);
      res.status(500).json({ message: error.message || "Failed to submit gift card" });
    }
  });

  // User: Get my gift card redemptions
  app.get("/api/gift-cards", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cards = await storage.getUserGiftCards(req.userId!);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch gift card history" });
    }
  });

  // Serve gift card images (admin only)
  app.get('/uploads/gift-cards/:filename', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1] || req.query.token as string;
      if (!token) return res.status(401).json({ message: 'Access token required' });

      let decoded: any;
      try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(403).json({ message: 'Invalid token' }); }

      const user = await storage.getUser(decoded.userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const filename = req.params.filename;
      const filePath = path.join(giftCardUploadsDir, filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ message: 'Error accessing file' });
    }
  });

  // Admin: Get all gift card submissions
  app.get("/api/admin/gift-cards", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string | undefined;
      const cards = await storage.getAllGiftCards(status);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch gift cards" });
    }
  });

  // Exchange rate endpoint for live preview (public - no auth needed)
  app.get("/api/exchange-rate/:currency", async (req, res) => {
    try {
      const currency = req.params.currency.toUpperCase();
      if (currency === "USD") {
        return res.json({ rate: 1, currency: "USD" });
      }
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
      if (!response.ok) throw new Error("Failed to fetch exchange rate");
      const data = await response.json() as any;
      const rateToUsd = data.rates?.USD;
      if (!rateToUsd) throw new Error("USD rate not found");
      res.json({ rate: rateToUsd, currency });
    } catch (error: any) {
      console.error('Exchange rate error:', error);
      res.status(500).json({ message: "Failed to fetch exchange rate" });
    }
  });

  // Admin: Approve or decline gift card
  app.post("/api/admin/gift-cards/:id/action", authenticateAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { action, adminNote } = adminGiftCardActionSchema.parse(req.body);

      if (action === "approve") {
        const card = await storage.getGiftCardById(id);
        if (!card) return res.status(404).json({ message: "Gift card not found" });
        if (card.status !== "pending") return res.status(400).json({ message: "Gift card already processed" });

        const currency = card.giftCardCurrency || "USD";
        const giftCardAmount = parseFloat(card.giftCardAmount || "0");
        let exchangeRate = 1;

        if (currency !== "USD") {
          try {
            const rateResponse = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
            if (!rateResponse.ok) throw new Error("Exchange rate API error");
            const rateData = await rateResponse.json() as any;
            exchangeRate = rateData.rates?.USD || 1;
          } catch (rateError) {
            console.error('Exchange rate fetch failed, using fallback:', rateError);
            return res.status(500).json({ message: "Failed to fetch exchange rate. Please try again." });
          }
        }

        const usdValue = giftCardAmount * exchangeRate;
        const processingFeeRate = 0.05;
        const processingFee = usdValue * processingFeeRate;
        const usdtCredited = usdValue - processingFee;

        await storage.approveGiftCard(id, req.userId!, exchangeRate, usdValue, processingFee, usdtCredited, adminNote);
        res.json({ 
          message: `Gift card approved. ${giftCardAmount} ${currency} → ${usdValue.toFixed(2)} USD → Fee ${processingFee.toFixed(2)} → ${usdtCredited.toFixed(2)} USDT credited.`,
          exchangeRate,
          usdValue: usdValue.toFixed(2),
          processingFee: processingFee.toFixed(2),
          usdtCredited: usdtCredited.toFixed(2),
        });
      } else {
        await storage.declineGiftCard(id, req.userId!, adminNote);
        res.json({ message: "Gift card declined" });
      }
    } catch (error: any) {
      console.error('Gift card action error:', error);
      res.status(500).json({ message: error.message || "Failed to process gift card" });
    }
  });

  // Start background job for deposit validation
  startDepositValidationJob();

  const httpServer = createServer(app);
  return httpServer;
}
