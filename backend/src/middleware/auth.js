const jwt = require('jsonwebtoken');
const { dbAsync } = require('../models/database');

// JWT 密钥 - 可选，未设置时随机生成（注意：重启服务后所有 Token 会失效）
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('警告: 未设置 JWT_SECRET 环境变量，已随机生成。建议设置固定值以避免重启后 Token 失效。');
}

// 管理员密码 - 可选，未设置时使用默认密码（生产环境必须设置）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('警告: 未设置 ADMIN_PASSWORD 环境变量，使用默认密码 admin123。生产环境必须设置强密码！');
}

async function authenticate(req, res) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ 
      role: 'admin',
      familyTreeId: null 
    }, JWT_SECRET, { expiresIn: '24h' });
    
    return res.json({ 
      token, 
      role: 'admin',
      familyTreeId: null 
    });
  }

  try {
    const tree = await dbAsync.getFamilyTreeByPassword(password);
    
    if (!tree) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const role = password === tree.view_password ? 'viewer' : 'editor';
    const token = jwt.sign({ 
      role,
      familyTreeId: tree.id 
    }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      token, 
      role,
      familyTreeId: tree.id,
      familyTreeName: tree.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireEditor(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'editor') {
    next();
  } else {
    return res.status(403).json({ error: 'Editor access required' });
  }
}

function requireFamilyTreeAccess(req, res, next) {
  const treeId = parseInt(req.params.treeId);
  
  if (req.user.role === 'admin' || req.user.familyTreeId === treeId) {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied for this family tree' });
  }
}

module.exports = {
  authenticate,
  verifyToken,
  requireAdmin,
  requireEditor,
  requireFamilyTreeAccess,
  JWT_SECRET
};
