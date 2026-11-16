import { storage } from "../storage";
import { validateTxid } from "./blockchainValidator";
import { sendDepositApprovedEmail } from "../email";
import { notifyDepositAutoConfirmed, notifyError } from "./telegramNotifier";

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

export async function recheckPendingDeposits(): Promise<void> {
  if (isRunning) {
    console.log("[DepositJob] Previous job still running, skipping...");
    return;
  }

  isRunning = true;
  console.log("[DepositJob] Starting deposit validation recheck...");

  try {
    const pendingDeposits = await storage.getPendingDepositsForValidation();
    console.log(`[DepositJob] Found ${pendingDeposits.length} pending deposits to validate`);

    for (const deposit of pendingDeposits) {
      if (!deposit.transactionHash || !deposit.network || !deposit.depositWalletAddress) {
        console.log(`[DepositJob] Skipping deposit ${deposit.id} - missing required fields`);
        continue;
      }

      try {
        console.log(`[DepositJob] Validating deposit ${deposit.id} (TXID: ${deposit.transactionHash})`);

        const result = await validateTxid(
          deposit.transactionHash,
          deposit.network,
          deposit.amount,
          deposit.depositWalletAddress,
          deposit.cryptocurrency,
          deposit.createdAt || new Date()
        );

        if (result.success && result.confirmed) {
          console.log(`[DepositJob] Deposit ${deposit.id} validated and confirmed!`);
          
          await storage.updateTransactionValidation(deposit.id, {
            validationStatus: 'validated',
            confirmationCount: result.confirmations,
            validatedAmount: result.amount,
            validatedContract: result.tokenContract,
            validationLog: JSON.stringify(result.log),
            autoValidatedAt: new Date(),
            status: 'auto_confirmed',
            lastValidationCheck: new Date(),
          });

          await storage.updateUserBalance(deposit.userId, deposit.amount);

          const user = await storage.getUser(deposit.userId);
          if (user) {
            await sendDepositApprovedEmail(
              user.email,
              user.username,
              deposit.amount,
              deposit.cryptocurrency
            );
            
            // Send Telegram notification for auto-confirmed deposit
            notifyDepositAutoConfirmed({
              userId: user.id,
              userEmail: user.email,
              userPhone: user.mobileNumber,
              amount: deposit.amount,
              cryptocurrency: deposit.cryptocurrency,
              network: deposit.network,
              txid: deposit.transactionHash,
              walletAddress: deposit.depositWalletAddress,
              confirmations: result.confirmations || 0,
            });
          }
        } else if (result.success && !result.confirmed) {
          console.log(`[DepositJob] Deposit ${deposit.id} found but needs more confirmations (${result.confirmations})`);
          
          await storage.updateTransactionValidation(deposit.id, {
            validationStatus: 'pending_confirmations',
            confirmationCount: result.confirmations,
            validatedAmount: result.amount,
            validatedContract: result.tokenContract,
            validationLog: JSON.stringify(result.log),
            lastValidationCheck: new Date(),
          });
        } else {
          console.log(`[DepositJob] Deposit ${deposit.id} validation failed: ${result.error}`);
          
          const checkCount = deposit.confirmationCount || 0;
          if (checkCount >= 10) {
            await storage.updateTransactionValidation(deposit.id, {
              validationStatus: 'manual_review',
              validationLog: JSON.stringify(result.log),
              lastValidationCheck: new Date(),
            });
          } else {
            await storage.updateTransactionValidation(deposit.id, {
              confirmationCount: checkCount + 1,
              validationLog: JSON.stringify(result.log),
              lastValidationCheck: new Date(),
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[DepositJob] Error validating deposit ${deposit.id}:`, error.message);
        await storage.updateTransactionValidation(deposit.id, {
          validationLog: JSON.stringify([`Error: ${error.message}`]),
          lastValidationCheck: new Date(),
        });
      }
    }

    console.log("[DepositJob] Deposit validation recheck completed");
  } catch (error) {
    console.error("[DepositJob] Error in deposit validation job:", error);
  } finally {
    isRunning = false;
  }
}

export function startDepositValidationJob(): void {
  const INTERVAL_MS = 2 * 60 * 1000;

  console.log("[DepositJob] Starting deposit validation background job (every 2 minutes)");

  recheckPendingDeposits();

  intervalId = setInterval(recheckPendingDeposits, INTERVAL_MS);
}

export function stopDepositValidationJob(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[DepositJob] Deposit validation job stopped");
  }
}
