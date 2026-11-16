interface ValidationResult {
  success: boolean;
  confirmed: boolean;
  confirmations: number;
  amount?: string;
  toAddress?: string;
  tokenContract?: string;
  timestamp?: number;
  error?: string;
  log: string[];
}

interface NetworkConfig {
  minConfirmations: number;
  apiKey?: string;
  apiUrl: string;
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  TRC20: {
    minConfirmations: 19,
    apiUrl: 'https://api.trongrid.io',
  },
  ERC20: {
    minConfirmations: 12,
    apiUrl: 'https://api.etherscan.io',
  },
  BSC: {
    minConfirmations: 15,
    apiUrl: 'https://api.bscscan.com',
  },
  BTC: {
    minConfirmations: 2,
    apiUrl: 'https://blockstream.info/api',
  },
};

const USDT_CONTRACTS: Record<string, string> = {
  TRC20: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  ERC20: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  BSC: '0x55d398326f99059ff775485246999027b3197955',
};

const USDC_CONTRACTS: Record<string, string> = {
  TRC20: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
  ERC20: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  BSC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
};

export async function validateTxid(
  txid: string,
  network: string,
  expectedAmount: string,
  expectedWalletAddress: string,
  cryptocurrency: string,
  submissionTime: Date
): Promise<ValidationResult> {
  const log: string[] = [];
  log.push(`[${new Date().toISOString()}] Starting validation for TXID: ${txid}`);
  log.push(`Network: ${network}, Expected Amount: ${expectedAmount}, Expected Wallet: ${expectedWalletAddress}`);

  const config = NETWORK_CONFIGS[network];
  if (!config) {
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: `Unsupported network: ${network}`,
      log,
    };
  }

  try {
    switch (network) {
      case 'TRC20':
        return await validateTronTransaction(txid, expectedAmount, expectedWalletAddress, cryptocurrency, submissionTime, log);
      case 'ERC20':
        return await validateEthereumTransaction(txid, expectedAmount, expectedWalletAddress, cryptocurrency, submissionTime, log);
      case 'BSC':
        return await validateBscTransaction(txid, expectedAmount, expectedWalletAddress, cryptocurrency, submissionTime, log);
      case 'BTC':
        return await validateBitcoinTransaction(txid, expectedAmount, expectedWalletAddress, submissionTime, log);
      default:
        return {
          success: false,
          confirmed: false,
          confirmations: 0,
          error: `Unsupported network: ${network}`,
          log,
        };
    }
  } catch (error: any) {
    log.push(`[ERROR] ${error.message}`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: error.message,
      log,
    };
  }
}

async function validateTronTransaction(
  txid: string,
  expectedAmount: string,
  expectedWalletAddress: string,
  cryptocurrency: string,
  submissionTime: Date,
  log: string[]
): Promise<ValidationResult> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['TRON-PRO-API-KEY'] = apiKey;
  }

  log.push(`Fetching transaction from TronGrid...`);

  const response = await fetch(`https://api.trongrid.io/v1/transactions/${txid}/events`, {
    headers,
  });

  if (!response.ok) {
    log.push(`[ERROR] TronGrid API returned ${response.status}`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: `TronGrid API error: ${response.status}`,
      log,
    };
  }

  const data = await response.json();
  log.push(`Transaction data received`);

  if (!data.data || data.data.length === 0) {
    log.push(`[ERROR] Transaction not found or no events`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not found',
      log,
    };
  }

  const txInfoResponse = await fetch(`https://api.trongrid.io/v1/transactions/${txid}`, { headers });
  const txInfo = await txInfoResponse.json();

  if (!txInfo.data || txInfo.data.length === 0) {
    log.push(`[ERROR] Transaction info not found`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction info not found',
      log,
    };
  }

  const tx = txInfo.data[0];
  const txResult = tx.ret?.[0]?.contractRet;

  if (txResult !== 'SUCCESS') {
    log.push(`[ERROR] Transaction status is ${txResult}, not SUCCESS`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: `Transaction status: ${txResult}`,
      log,
    };
  }

  log.push(`Transaction status: SUCCESS`);

  const blockResponse = await fetch('https://api.trongrid.io/walletsolidity/getblock', {
    method: 'POST',
    headers,
    body: JSON.stringify({ detail: false }),
  });
  const blockData = await blockResponse.json();
  const currentBlock = blockData.block_header?.raw_data?.number || 0;
  const txBlock = tx.blockNumber || 0;
  const confirmations = currentBlock - txBlock;

  log.push(`Confirmations: ${confirmations} (min required: ${NETWORK_CONFIGS.TRC20.minConfirmations})`);

  let transferEvent = data.data.find((event: any) => event.event_name === 'Transfer');
  
  if (!transferEvent) {
    log.push(`[ERROR] No Transfer event found`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      error: 'No Transfer event found',
      log,
    };
  }

  const toAddress = transferEvent.result?.to || '';
  const contractAddress = transferEvent.contract_address;
  const rawAmount = transferEvent.result?.value || '0';
  const amount = (parseFloat(rawAmount) / 1e6).toString();

  log.push(`To Address: ${toAddress}`);
  log.push(`Contract: ${contractAddress}`);
  log.push(`Amount: ${amount}`);

  const expectedContract = cryptocurrency.includes('USDC') 
    ? USDC_CONTRACTS.TRC20 
    : USDT_CONTRACTS.TRC20;

  if (contractAddress.toLowerCase() !== expectedContract.toLowerCase()) {
    log.push(`[ERROR] Contract mismatch. Expected: ${expectedContract}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      tokenContract: contractAddress,
      error: 'Token contract mismatch',
      log,
    };
  }

  const normalizedExpectedWallet = expectedWalletAddress.toLowerCase();
  const normalizedToAddress = toAddress.toLowerCase();

  if (normalizedToAddress !== normalizedExpectedWallet) {
    log.push(`[ERROR] Destination address mismatch. Expected: ${expectedWalletAddress}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      toAddress,
      tokenContract: contractAddress,
      error: 'Destination address mismatch',
      log,
    };
  }

  const expectedAmountNum = parseFloat(expectedAmount);
  const actualAmountNum = parseFloat(amount);
  const tolerance = 0.01;

  if (Math.abs(actualAmountNum - expectedAmountNum) > tolerance) {
    log.push(`[ERROR] Amount mismatch. Expected: ${expectedAmount}, Got: ${amount}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      amount,
      toAddress,
      tokenContract: contractAddress,
      error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`,
      log,
    };
  }

  const txTimestamp = (tx.block_timestamp || 0);
  const submissionTimestamp = submissionTime.getTime();

  if (txTimestamp < submissionTimestamp - 3600000) {
    log.push(`[WARNING] Transaction timestamp (${txTimestamp}) is before submission time (${submissionTimestamp})`);
  }

  const confirmed = confirmations >= NETWORK_CONFIGS.TRC20.minConfirmations;
  log.push(`Validation ${confirmed ? 'PASSED' : 'PENDING'} - waiting for confirmations`);

  return {
    success: true,
    confirmed,
    confirmations,
    amount,
    toAddress,
    tokenContract: contractAddress,
    timestamp: txTimestamp,
    log,
  };
}

async function validateEthereumTransaction(
  txid: string,
  expectedAmount: string,
  expectedWalletAddress: string,
  cryptocurrency: string,
  submissionTime: Date,
  log: string[]
): Promise<ValidationResult> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  if (!apiKey) {
    log.push(`[WARNING] No Etherscan API key configured, manual review required`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Etherscan API key not configured',
      log,
    };
  }

  log.push(`Fetching transaction from Etherscan...`);

  const txUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txid}&apikey=${apiKey}`;
  const response = await fetch(txUrl);
  const data = await response.json();

  if (!data.result) {
    log.push(`[ERROR] Transaction not found`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not found',
      log,
    };
  }

  const tx = data.result;
  log.push(`Transaction found in block ${parseInt(tx.blockNumber, 16)}`);

  const receiptUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txid}&apikey=${apiKey}`;
  const receiptResponse = await fetch(receiptUrl);
  const receiptData = await receiptResponse.json();

  if (!receiptData.result) {
    log.push(`[ERROR] Transaction receipt not found`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not confirmed yet',
      log,
    };
  }

  const receipt = receiptData.result;
  const status = parseInt(receipt.status, 16);

  if (status !== 1) {
    log.push(`[ERROR] Transaction failed on-chain`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction failed',
      log,
    };
  }

  log.push(`Transaction status: SUCCESS`);

  const blockNumUrl = `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
  const blockNumResponse = await fetch(blockNumUrl);
  const blockNumData = await blockNumResponse.json();
  const currentBlock = parseInt(blockNumData.result, 16);
  const txBlock = parseInt(tx.blockNumber, 16);
  const confirmations = currentBlock - txBlock;

  log.push(`Confirmations: ${confirmations} (min required: ${NETWORK_CONFIGS.ERC20.minConfirmations})`);

  const transferLogs = receipt.logs.filter((l: any) => 
    l.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  );

  if (transferLogs.length === 0) {
    log.push(`[ERROR] No Transfer event found`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      error: 'No Transfer event found',
      log,
    };
  }

  const transferLog = transferLogs[0];
  const contractAddress = transferLog.address.toLowerCase();
  const toAddress = '0x' + transferLog.topics[2].slice(26);
  const rawAmount = BigInt(transferLog.data);
  const amount = (Number(rawAmount) / 1e6).toString();

  log.push(`To Address: ${toAddress}`);
  log.push(`Contract: ${contractAddress}`);
  log.push(`Amount: ${amount}`);

  const expectedContract = cryptocurrency.includes('USDC') 
    ? USDC_CONTRACTS.ERC20.toLowerCase() 
    : USDT_CONTRACTS.ERC20.toLowerCase();

  if (contractAddress !== expectedContract) {
    log.push(`[ERROR] Contract mismatch. Expected: ${expectedContract}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      tokenContract: contractAddress,
      error: 'Token contract mismatch',
      log,
    };
  }

  if (toAddress.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
    log.push(`[ERROR] Destination address mismatch. Expected: ${expectedWalletAddress}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      toAddress,
      tokenContract: contractAddress,
      error: 'Destination address mismatch',
      log,
    };
  }

  const expectedAmountNum = parseFloat(expectedAmount);
  const actualAmountNum = parseFloat(amount);
  const tolerance = 0.01;

  if (Math.abs(actualAmountNum - expectedAmountNum) > tolerance) {
    log.push(`[ERROR] Amount mismatch. Expected: ${expectedAmount}, Got: ${amount}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      amount,
      toAddress,
      tokenContract: contractAddress,
      error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`,
      log,
    };
  }

  const confirmed = confirmations >= NETWORK_CONFIGS.ERC20.minConfirmations;
  log.push(`Validation ${confirmed ? 'PASSED' : 'PENDING'} - waiting for confirmations`);

  return {
    success: true,
    confirmed,
    confirmations,
    amount,
    toAddress,
    tokenContract: contractAddress,
    log,
  };
}

async function validateBscTransaction(
  txid: string,
  expectedAmount: string,
  expectedWalletAddress: string,
  cryptocurrency: string,
  submissionTime: Date,
  log: string[]
): Promise<ValidationResult> {
  const apiKey = process.env.BSCSCAN_API_KEY;
  
  if (!apiKey) {
    log.push(`[WARNING] No BscScan API key configured, manual review required`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'BscScan API key not configured',
      log,
    };
  }

  log.push(`Fetching transaction from BscScan...`);

  const txUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txid}&apikey=${apiKey}`;
  const response = await fetch(txUrl);
  const data = await response.json();

  if (!data.result) {
    log.push(`[ERROR] Transaction not found`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not found',
      log,
    };
  }

  const tx = data.result;
  log.push(`Transaction found in block ${parseInt(tx.blockNumber, 16)}`);

  const receiptUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txid}&apikey=${apiKey}`;
  const receiptResponse = await fetch(receiptUrl);
  const receiptData = await receiptResponse.json();

  if (!receiptData.result) {
    log.push(`[ERROR] Transaction receipt not found`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not confirmed yet',
      log,
    };
  }

  const receipt = receiptData.result;
  const status = parseInt(receipt.status, 16);

  if (status !== 1) {
    log.push(`[ERROR] Transaction failed on-chain`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction failed',
      log,
    };
  }

  log.push(`Transaction status: SUCCESS`);

  const blockNumUrl = `https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
  const blockNumResponse = await fetch(blockNumUrl);
  const blockNumData = await blockNumResponse.json();
  const currentBlock = parseInt(blockNumData.result, 16);
  const txBlock = parseInt(tx.blockNumber, 16);
  const confirmations = currentBlock - txBlock;

  log.push(`Confirmations: ${confirmations} (min required: ${NETWORK_CONFIGS.BSC.minConfirmations})`);

  const transferLogs = receipt.logs.filter((l: any) => 
    l.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  );

  if (transferLogs.length === 0) {
    log.push(`[ERROR] No Transfer event found`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      error: 'No Transfer event found',
      log,
    };
  }

  const transferLog = transferLogs[0];
  const contractAddress = transferLog.address.toLowerCase();
  const toAddress = '0x' + transferLog.topics[2].slice(26);
  const rawAmount = BigInt(transferLog.data);
  const decimals = cryptocurrency.includes('BNB') ? 18 : 18;
  const amount = (Number(rawAmount) / Math.pow(10, decimals)).toString();

  log.push(`To Address: ${toAddress}`);
  log.push(`Contract: ${contractAddress}`);
  log.push(`Amount: ${amount}`);

  let expectedContract = '';
  if (cryptocurrency.includes('BUSD')) {
    expectedContract = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
  } else if (cryptocurrency.includes('USDT')) {
    expectedContract = USDT_CONTRACTS.BSC.toLowerCase();
  } else if (cryptocurrency.includes('USDC')) {
    expectedContract = USDC_CONTRACTS.BSC.toLowerCase();
  }

  if (expectedContract && contractAddress !== expectedContract) {
    log.push(`[ERROR] Contract mismatch. Expected: ${expectedContract}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      tokenContract: contractAddress,
      error: 'Token contract mismatch',
      log,
    };
  }

  if (toAddress.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
    log.push(`[ERROR] Destination address mismatch. Expected: ${expectedWalletAddress}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      toAddress,
      tokenContract: contractAddress,
      error: 'Destination address mismatch',
      log,
    };
  }

  const expectedAmountNum = parseFloat(expectedAmount);
  const actualAmountNum = parseFloat(amount);
  const tolerance = 0.01;

  if (Math.abs(actualAmountNum - expectedAmountNum) > tolerance) {
    log.push(`[ERROR] Amount mismatch. Expected: ${expectedAmount}, Got: ${amount}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      amount,
      toAddress,
      tokenContract: contractAddress,
      error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`,
      log,
    };
  }

  const confirmed = confirmations >= NETWORK_CONFIGS.BSC.minConfirmations;
  log.push(`Validation ${confirmed ? 'PASSED' : 'PENDING'} - waiting for confirmations`);

  return {
    success: true,
    confirmed,
    confirmations,
    amount,
    toAddress,
    tokenContract: contractAddress,
    log,
  };
}

async function validateBitcoinTransaction(
  txid: string,
  expectedAmount: string,
  expectedWalletAddress: string,
  submissionTime: Date,
  log: string[]
): Promise<ValidationResult> {
  log.push(`Fetching transaction from Blockstream API...`);

  const response = await fetch(`https://blockstream.info/api/tx/${txid}`);

  if (!response.ok) {
    log.push(`[ERROR] Transaction not found`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not found',
      log,
    };
  }

  const tx = await response.json();
  log.push(`Transaction found`);

  if (!tx.status.confirmed) {
    log.push(`Transaction not confirmed yet`);
    return {
      success: false,
      confirmed: false,
      confirmations: 0,
      error: 'Transaction not confirmed yet',
      log,
    };
  }

  const tipResponse = await fetch('https://blockstream.info/api/blocks/tip/height');
  const currentHeight = await tipResponse.json();
  const confirmations = currentHeight - tx.status.block_height + 1;

  log.push(`Confirmations: ${confirmations} (min required: ${NETWORK_CONFIGS.BTC.minConfirmations})`);

  const matchingOutput = tx.vout.find((output: any) => 
    output.scriptpubkey_address?.toLowerCase() === expectedWalletAddress.toLowerCase()
  );

  if (!matchingOutput) {
    log.push(`[ERROR] No output to expected address found`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      error: 'Destination address not found in transaction',
      log,
    };
  }

  const amount = (matchingOutput.value / 100000000).toString();
  log.push(`Amount to address: ${amount} BTC`);

  const expectedAmountNum = parseFloat(expectedAmount);
  const actualAmountNum = parseFloat(amount);
  const tolerance = 0.00001;

  if (Math.abs(actualAmountNum - expectedAmountNum) > tolerance) {
    log.push(`[ERROR] Amount mismatch. Expected: ${expectedAmount}, Got: ${amount}`);
    return {
      success: false,
      confirmed: false,
      confirmations,
      amount,
      toAddress: expectedWalletAddress,
      error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`,
      log,
    };
  }

  const confirmed = confirmations >= NETWORK_CONFIGS.BTC.minConfirmations;
  log.push(`Validation ${confirmed ? 'PASSED' : 'PENDING'} - waiting for confirmations`);

  return {
    success: true,
    confirmed,
    confirmations,
    amount,
    toAddress: expectedWalletAddress,
    timestamp: tx.status.block_time,
    log,
  };
}

export function getMinConfirmations(network: string): number {
  return NETWORK_CONFIGS[network]?.minConfirmations || 6;
}

export function isValidTxidFormat(txid: string, network: string): boolean {
  switch (network) {
    case 'TRC20':
      return /^[a-fA-F0-9]{64}$/.test(txid);
    case 'ERC20':
    case 'BSC':
      return /^0x[a-fA-F0-9]{64}$/.test(txid);
    case 'BTC':
      return /^[a-fA-F0-9]{64}$/.test(txid);
    default:
      return false;
  }
}
