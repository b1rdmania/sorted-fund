import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './db/database';

// Import routes
import privyAuthRoutes from './routes/privyAuth';
import projectRoutes from './routes/projects';
import sponsorRoutes from './routes/sponsor';
import allowlistRoutes from './routes/allowlist';
import analyticsRoutes from './routes/analytics';
import blockchainRoutes from './routes/blockchain';
import demoRoutes from './routes/demo';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

// Middleware
app.use(helmet()); // Security headers

// CORS configuration with wildcard support
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // Check if origin matches any allowed origin or pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === origin) return true;
      // Support wildcard patterns like https://*.vercel.app
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
}));
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

function isAdminAuthorized(req: Request): boolean {
  if (!ADMIN_API_TOKEN) {
    return false;
  }

  const headerToken = req.headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken === ADMIN_API_TOKEN) {
    return true;
  }

  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${ADMIN_API_TOKEN}`;
}

// Temporary migration endpoint (remove after initial setup)
app.post('/admin/migrate', async (req: Request, res: Response) => {
  if (!isAdminAuthorized(req)) {
    return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  }

  try {
    const fs = await import('fs');
    const path = await import('path');
    const { query } = await import('./db/database');

    const migrationsDir = path.join(__dirname, 'db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const results = [];
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await query(sql);
      results.push(file);
    }

    res.status(200).json({
      success: true,
      message: 'Migrations completed',
      files: results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Routes
app.use('/auth', privyAuthRoutes); // Privy auth
app.use('/projects', projectRoutes);
app.use('/sponsor', sponsorRoutes);
app.use('/projects', allowlistRoutes); // Allowlist routes under /projects/:id/allowlist
app.use('/analytics', analyticsRoutes);
app.use('/blockchain', blockchainRoutes);
app.use('/demo', demoRoutes); // Public demo endpoint (no auth required)

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
