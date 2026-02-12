const jwt = require('jsonwebtoken');
const { dbAsync } = require('../models/database');

// 生成随机 JWT 密钥（每次重启服务会重新生成，导致旧 Token 失效）
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function authenticate(req, res) {
  const { password } = req.body;
  
  console.log('Login attempt:', { password, adminPassword: ADMIN_PASSWORD, match: password === ADMIN_PASSWORD });
  
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
