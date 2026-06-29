import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'recallai-server',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`[server] RecallAI server running at http://localhost:${PORT}`);
});
