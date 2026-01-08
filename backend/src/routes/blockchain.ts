/**
 * Blockchain Routes
 * Read on-chain state
 */

import { Router, Request, Response } from 'express';
import * as blockchainService from '../services/blockchainService';

const router = Router();

/**
 * GET /blockchain/counter/:contractAddress/:userAddress
 * Get current counter value for a user
 */
router.get('/counter/:contractAddress/:userAddress', async (req: Request, res: Response) => {
  try {
    const { contractAddress, userAddress } = req.params;

    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid contract address',
        code: 'INVALID_ADDRESS'
      });
    }

    if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid user address',
        code: 'INVALID_ADDRESS'
      });
    }

    const count = await blockchainService.getCounterValue(contractAddress, userAddress);

    res.json({
      contractAddress,
      userAddress,
      count
    });
  } catch (error: any) {
    console.error('Failed to get counter value:', error);
    res.status(500).json({
      error: 'Failed to read counter value',
      code: 'BLOCKCHAIN_READ_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /blockchain/balance/:address
 * Get account balance
 */
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid address',
        code: 'INVALID_ADDRESS'
      });
    }

    const balance = await blockchainService.getAccountBalance(address);

    res.json({
      address,
      balance
    });
  } catch (error: any) {
    console.error('Failed to get balance:', error);
    res.status(500).json({
      error: 'Failed to read balance',
      code: 'BLOCKCHAIN_READ_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /blockchain/block
 * Get current block number
 */
router.get('/block', async (req: Request, res: Response) => {
  try {
    const blockNumber = await blockchainService.getCurrentBlockNumber();

    res.json({
      blockNumber
    });
  } catch (error: any) {
    console.error('Failed to get block number:', error);
    res.status(500).json({
      error: 'Failed to get block number',
      code: 'BLOCKCHAIN_READ_ERROR',
      details: error.message
    });
  }
});

export default router;
