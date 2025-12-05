import express from 'express';
import cors from 'cors';
import path from 'path';
import storageAreasRouter from './routes/storageAreas';
import itemsRouter from './routes/items';
import aiRouter from './routes/ai';
import recipesRouter from './routes/recipes';
import dislikedRecipesRouter from './routes/dislikedRecipes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/storage-areas', storageAreasRouter);
app.use('/api/items', itemsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/disliked-recipes', dislikedRecipesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle client-side routing - serve index.html for non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pantry API server running on http://localhost:${PORT}`);
});

