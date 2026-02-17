// 加载环境变量（本地开发使用 .env 文件，生产环境使用系统环境变量）
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');

const { authenticate } = require('./middleware/auth');
const { photosPath } = require('./models/database');
const familyTreesRouter = require('./routes/familyTrees');
const membersRouter = require('./routes/members');
const familiesRouter = require('./routes/families');
const photosRouter = require('./routes/photos');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

app.use('/photos', express.static(photosPath));

// API 路由统一添加 /api 前缀
app.post('/api/auth/login', authenticate);

app.use('/api/trees', familyTreesRouter);
app.use('/api/members', membersRouter);
app.use('/api/families', familiesRouter);
app.use('/api/photos', photosRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Family Tree Album API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
