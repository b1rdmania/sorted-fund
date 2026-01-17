/**
 * Public Demo Routes
 * Allows anyone to execute a demo gasless transaction without authentication
 */

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

// Rate limiting - store last request time per IP
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 30000; // 30 seconds in milliseconds

// Demo configuration
const DEMO_CONFIG = {
  COUNTER_ADDRESS: '0xEcca59045D7d0dcfDB6A627fEB3a39BC046196E3',
  COUNTER_ABI: ['function increment() external'],
  CHAIN_ID: 14601,
  RPC_URL: 'https://rpc.testnet.soniclabs.com',
};

/**
 * POST /demo/execute
 * Execute a live demo transaction (increment counter)
 * No authentication required - rate limited by IP
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    // Get client IP for rate limiting
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

    // Check rate limit
    const lastRequest = rateLimitMap.get(clientIP);
    const now = Date.now();

    if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
      const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        message: `Please wait ${waitTime} seconds before trying again`,
        retryAfter: waitTime,
      });
    }

    // Get demo wallet from environment
    const demoPrivateKey = process.env.DEMO_WALLET_PRIVATE_KEY;
    if (!demoPrivateKey) {
      console.error('DEMO_WALLET_PRIVATE_KEY not configured');
      return res.status(500).json({
        error: 'Demo not configured',
        code: 'DEMO_NOT_CONFIGURED',
      });
    }

    // Set up provider and wallet
    const provider = new ethers.JsonRpcProvider(DEMO_CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(demoPrivateKey, provider);

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    if (balance < ethers.parseEther('0.001')) {
      console.error('Demo wallet has insufficient balance:', ethers.formatEther(balance));
      return res.status(503).json({
        error: 'Demo temporarily unavailable',
        code: 'INSUFFICIENT_DEMO_FUNDS',
        message: 'Demo wallet needs to be refilled. Please try again later.',
      });
    }

    // Connect to counter contract
    const counterContract = new ethers.Contract(
      DEMO_CONFIG.COUNTER_ADDRESS,
      DEMO_CONFIG.COUNTER_ABI,
      wallet
    );

    console.log('🎮 Demo transaction requested from IP:', clientIP);
    console.log('   Wallet:', wallet.address);
    console.log('   Balance:', ethers.formatEther(balance), 'S');

    // Execute the increment transaction
    const tx = await counterContract.increment({
      gasLimit: 100000, // Set reasonable gas limit
    });

    console.log('   Transaction sent:', tx.hash);

    // Update rate limit
    rateLimitMap.set(clientIP, now);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log('   ✅ Transaction confirmed in block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());

    // Return transaction details
    res.json({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://testnet.sonicscan.org/tx/${tx.hash}`,
      demoWallet: wallet.address,
      message: 'Demo transaction executed successfully!',
    });
  } catch (error: any) {
    console.error('Demo execution error:', error);

    // Handle specific errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(503).json({
        error: 'Demo temporarily unavailable',
        code: 'INSUFFICIENT_DEMO_FUNDS',
        message: 'Demo wallet needs to be refilled.',
      });
    }

    if (error.code === 'NETWORK_ERROR') {
      return res.status(503).json({
        error: 'Network error',
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to Sonic testnet. Please try again.',
      });
    }

    res.status(500).json({
      error: 'Demo execution failed',
      code: 'DEMO_ERROR',
      message: error.message || 'Unknown error occurred',
    });
  }
});

/**
 * GET /demo/status
 * Check demo availability and stats
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const demoPrivateKey = process.env.DEMO_WALLET_PRIVATE_KEY;
    if (!demoPrivateKey) {
      return res.json({
        available: false,
        reason: 'Demo not configured',
      });
    }

    const provider = new ethers.JsonRpcProvider(DEMO_CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(demoPrivateKey, provider);
    const balance = await provider.getBalance(wallet.address);

    res.json({
      available: balance >= ethers.parseEther('0.001'),
      demoWallet: wallet.address,
      balance: ethers.formatEther(balance) + ' S',
      counterContract: DEMO_CONFIG.COUNTER_ADDRESS,
      chainId: DEMO_CONFIG.CHAIN_ID,
      rateLimit: `${RATE_LIMIT_WINDOW / 1000} seconds`,
    });
  } catch (error: any) {
    res.status(500).json({
      available: false,
      error: error.message,
    });
  }
});

export default router;
