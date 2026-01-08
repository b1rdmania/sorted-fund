import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './db/database';

// Import routes
import projectRoutes from './routes/projects';
import sponsorRoutes from './routes/sponsor';
import allowlistRoutes from './routes/allowlist';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('combined')); // Request logging

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'sorted-backend',
    version: '0.1.0',
  });
});

// API Routes
app.use('/projects', projectRoutes);
app.use('/sponsor', sponsorRoutes);
app.use('/projects', allowlistRoutes); // Allowlist routes under /projects/:id/allowlist

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize database and start server
async function start() {
  try {
    console.log('🚀 Starting Sorted.fund backend...\n');

    // Initialize database
    console.log('📊 Connecting to database...');
    await initializeDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log('\n✅ Sorted.fund backend running');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔑 Paymaster: ${process.env.PAYMASTER_ADDRESS || 'NOT_SET'}`);
      console.log(`⛓️  Chain ID: ${process.env.SONIC_CHAIN_ID || '14601'}`);
      console.log();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start the server
start();

export default app;
