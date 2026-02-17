const path = require('path');
const fs = require('fs');

/**
 * 安全工具函数模块
 * 提供文件名清理、路径验证等安全功能
 */

/**
 * 清理名称，移除危险字符
 * @param {string} name - 原始名称
 * @returns {string} 清理后的安全名称
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // 清理名称：
  // 1. 移除路径分隔符
  // 2. 移除控制字符
  // 3. 移除特殊字符，只保留字母、数字、中文、下划线和连字符
  let sanitized = name
    .replace(/[\\/:*?"<>|]/g, '') // 移除 Windows 非法字符
    .replace(/[\x00-\x1f\x7f]/g, '') // 移除控制字符
    .replace(/[^\w\u4e00-\u9fa5\-]/g, '_') // 非字母数字中文下划线连字符替换为下划线
    .substring(0, 50); // 限制长度

  // 如果清理后为空，使用默认名称
  if (!sanitized) {
    sanitized = 'unknown';
  }

  return sanitized;
}

/**
 * 清理文件名，保留扩展名
 * @param {string} filename - 原始文件名
 * @returns {string} 清理后的安全文件名
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // 分离文件名和扩展名
  const ext = path.extname(filename);
  const basename = path.basename(filename, ext);

  // 清理文件名部分（不含扩展名）
  let safeBasename = basename
    .replace(/[\\/:*?"<>|]/g, '') // 移除 Windows 非法字符
    .replace(/[\x00-\x1f\x7f]/g, '') // 移除控制字符
    .replace(/[^\w\u4e00-\u9fa5\-]/g, '_') // 非字母数字中文下划线连字符替换为下划线
    .substring(0, 50); // 限制长度

  // 如果清理后为空，使用默认名称
  if (!safeBasename) {
    safeBasename = 'file';
  }

  // 重新组合文件名和扩展名
  return safeBasename + ext;
}

/**
 * 生成个人照片文件名
 * 格式: {成员名}_{序号}.jpg
 * @param {string} memberName - 成员名称
 * @param {number} sequence - 序号
 * @returns {string} 文件名
 */
function generatePersonalPhotoName(memberName, sequence) {
  const safeName = sanitizeName(memberName);
  const seqStr = sequence.toString().padStart(3, '0');
  return `${safeName}_${seqStr}.jpg`;
}

/**
 * 生成家庭照片文件名
 * 格式: {父亲名}_{母亲名}_{序号}.jpg
 * @param {string} fatherName - 父亲名称
 * @param {string} motherName - 母亲名称
 * @param {number} sequence - 序号
 * @returns {string} 文件名
 */
function generateFamilyPhotoName(fatherName, motherName, sequence) {
  const safeFatherName = sanitizeName(fatherName || '父亲');
  const safeMotherName = sanitizeName(motherName || '母亲');
  const seqStr = sequence.toString().padStart(3, '0');
  return `${safeFatherName}_${safeMotherName}_${seqStr}.jpg`;
}

/**
 * 验证文件路径是否在允许的目录内，防止路径遍历
 * @param {string} filePath - 要验证的文件路径
 * @param {string} allowedDir - 允许的根目录
 * @returns {boolean} 是否安全
 */
function isPathSafe(filePath, allowedDir) {
  if (!filePath || !allowedDir) {
    return false;
  }

  // 解析为绝对路径
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);

  // 确保文件路径以允许目录开头
  return resolvedPath.startsWith(resolvedAllowedDir);
}

/**
 * 通过文件头检测真实图片格式
 * 不依赖浏览器提供的 MIME 类型，直接读取文件内容判断
 * @param {string} filePath - 文件路径
 * @returns {string|null} 检测到的 MIME 类型，如果不支持返回 null
 */
function detectImageTypeByHeader(filePath) {
  try {
    // 读取文件前 16 个字节（足够检测常见格式）
    const buffer = fs.readFileSync(filePath);
    
    if (buffer.length < 4) {
      return null;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    }
    
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // GIF: 47 49 46 38 (GIF87a 或 GIF89a)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }
    
    // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      // 检查是否是 WebP (在 8-11 字节处应该是 WEBP)
      if (buffer.length >= 12 && 
          buffer[8] === 0x57 && buffer[9] === 0x45 && 
          buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'image/webp';
      }
    }
    
    // BMP: 42 4D (BM)
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
      return 'image/bmp';
    }
    
    // HEIC/HEIF: 需要更复杂的检测，暂不支持
    
    return null;
  } catch (error) {
    console.error('检测文件类型失败:', error);
    return null;
  }
}

/**
 * 验证文件是否为允许的图片类型
 * 使用文件头检测真实格式，不依赖浏览器提供的 MIME 类型
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否允许
 */
function isAllowedImageType(filePath) {
  const detectedType = detectImageTypeByHeader(filePath);
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  return allowedTypes.includes(detectedType);
}

/**
 * 获取检测到的图片类型（用于错误提示）
 * @param {string} filePath - 文件路径
 * @returns {string} 图片类型描述
 */
function getImageTypeDescription(filePath) {
  const type = detectImageTypeByHeader(filePath);
  const typeMap = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP',
    'image/bmp': 'BMP'
  };
  return typeMap[type] || '未知格式';
}

/**
 * 获取目录中下一个照片序号
 * @param {string} dirPath - 目录路径
 * @returns {number} 下一个序号
 */
function getNextPhotoNumber(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 1;
  }

  try {
    const files = fs.readdirSync(dirPath);
    const numbers = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
      })
      .map(file => {
        // 匹配序号部分 xxx_001.jpg
        const match = file.match(/_(\d{3})\.[a-zA-Z]+$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);

    if (numbers.length === 0) {
      return 1;
    }

    return Math.max(...numbers) + 1;
  } catch (error) {
    console.error('获取照片序号失败:', error);
    return 1;
  }
}

/**
 * 验证日期格式是否合法
 * @param {string} dateStr - 日期字符串
 * @returns {boolean} 是否合法
 */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  // 支持 YYYY-MM-DD 格式
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * 验证成员名称是否合法
 * @param {string} name - 成员名称
 * @returns {object} { valid: boolean, error?: string }
 */
function validateMemberName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '成员名称不能为空' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { valid: false, error: '成员名称不能为空' };
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: '成员名称不能超过50个字符' };
  }

  // 检查是否包含危险字符
  const dangerousChars = /[\\/:*?"<>|\x00-\x1f\x7f]/;
  if (dangerousChars.test(trimmedName)) {
    return { valid: false, error: '成员名称包含非法字符' };
  }

  return { valid: true };
}

module.exports = {
  sanitizeName,
  sanitizeFilename,
  generatePersonalPhotoName,
  generateFamilyPhotoName,
  isPathSafe,
  isAllowedImageType,
  getNextPhotoNumber,
  isValidDate,
  validateMemberName,
  detectImageTypeByHeader,
  getImageTypeDescription
};
