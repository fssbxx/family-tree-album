const jwt = require('jsonwebtoken');
const { dbAsync } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('警告: 未设置 JWT_SECRET 环境变量，已随机生成。建议设置固定值以避免重启后 Token 失效。');
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.ADMIN_PASSWORD) {
  console.warn('警告: 未设置 ADMIN_PASSWORD 环境变量，使用默认密码 admin123。生产环境必须设置强密码！');
}

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 };
  
  if (attempts.lockedUntil > now) {
    const remainingMinutes = Math.ceil((attempts.lockedUntil - now) / 60000);
    return { allowed: false, remainingMinutes };
  }
  
  if (attempts.count >= MAX_ATTEMPTS && (now - attempts.firstAttempt) < LOCKOUT_TIME) {
    attempts.lockedUntil = now + LOCKOUT_TIME;
    loginAttempts.set(ip, attempts);
    return { allowed: false, remainingMinutes: 15 };
  }
  
  if ((now - attempts.firstAttempt) >= LOCKOUT_TIME) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }
  
  return { allowed: true, attempts };
}

function recordFailedAttempt(ip, attempts) {
  attempts.count++;
  attempts.firstAttempt = attempts.firstAttempt || Date.now();
  loginAttempts.set(ip, attempts);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (data.lockedUntil && data.lockedUntil < now) {
      loginAttempts.delete(ip);
    }
  }
}, 60000);

async function authenticate(req, res) {
  const ip = req.ip || req.connection.remoteAddress;
  const rateCheck = checkRateLimit(ip);
  
  if (!rateCheck.allowed) {
    return res.status(429).json({ 
      error: `登录尝试次数过多，请 ${rateCheck.remainingMinutes} 分钟后再试`,
      locked: true,
      remainingMinutes: rateCheck.remainingMinutes
    });
  }
  
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (password === ADMIN_PASSWORD) {
    clearAttempts(ip);
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
      recordFailedAttempt(ip, rateCheck.attempts);
      const remaining = MAX_ATTEMPTS - rateCheck.attempts.count;
      return res.status(401).json({ 
        error: 'Invalid password',
        remainingAttempts: remaining > 0 ? remaining : 0
      });
    }

    clearAttempts(ip);
    const role = password === tree.view_password ? 'viewer' : 'editor';
    const token = jwt.sign({ 
      role,
      familyTreeId: tree.id 
    }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      token, 
      role,
      familyTreeId: tree.id,
      familyTreeName: tree.name,
      familyTreeDescription: tree.description
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
