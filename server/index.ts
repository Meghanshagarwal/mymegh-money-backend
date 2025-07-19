import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
const frontendUrl = (process.env.FRONTEND_URL || 'https://mymegh-money-frontend.vercel.app').replace(/\/$/, '');
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MyMeghMoney Backend is running' });
});

// Import and setup routes (this will connect to MongoDB automatically)
const { registerRoutes } = await import('./routes.js');

(async () => {
  const server = await registerRoutes(app);
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`CORS enabled for: ${frontendUrl}`);
  });
})();