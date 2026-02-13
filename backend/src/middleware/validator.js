const { validateMemberName, isValidDate } = require('../utils/security');

/**
 * 请求参数验证中间件
 */

/**
 * 验证成员创建/更新请求
 */
function validateMemberRequest(req, res, next) {
  const { name, gender, birthDate } = req.body;

  // 验证名称
  if (name !== undefined) {
    const nameValidation = validateMemberName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }
  }

  // 验证性别
  if (gender !== undefined) {
    const validGenders = ['male', 'female'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ error: '性别必须是 male 或 female' });
    }
  }

  // 验证日期
  if (birthDate !== undefined && birthDate !== null && birthDate !== '') {
    if (!isValidDate(birthDate)) {
      return res.status(400).json({ error: '日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
  }

  next();
}

/**
 * 验证家族创建/更新请求
 */
function validateFamilyTreeRequest(req, res, next) {
  const { name, viewPassword, editPassword, description } = req.body;

  // 验证家族名称
  if (name !== undefined) {
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: '家族名称不能为空' });
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return res.status(400).json({ error: '家族名称不能为空' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: '家族名称不能超过100个字符' });
    }
  }

  // 验证密码
  if (viewPassword !== undefined) {
    if (typeof viewPassword !== 'string' || viewPassword.length < 4) {
      return res.status(400).json({ error: '查看密码至少需要4个字符' });
    }
    if (viewPassword.length > 50) {
      return res.status(400).json({ error: '查看密码不能超过50个字符' });
    }
  }

  if (editPassword !== undefined) {
    if (typeof editPassword !== 'string' || editPassword.length < 4) {
      return res.status(400).json({ error: '编辑密码至少需要4个字符' });
    }
    if (editPassword.length > 50) {
      return res.status(400).json({ error: '编辑密码不能超过50个字符' });
    }
  }

  // 验证描述
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: '描述必须是字符串' });
    }
    if (description.length > 500) {
      return res.status(400).json({ error: '描述不能超过500个字符' });
    }
  }

  next();
}

/**
 * 验证家庭创建请求
 */
function validateFamilyRequest(req, res, next) {
  const { fatherId, motherId, generation } = req.body;

  // 验证至少有一个家长
  if (!fatherId && !motherId) {
    return res.status(400).json({ error: '家庭至少需要一位家长' });
  }

  // 验证 generation
  if (generation !== undefined) {
    const gen = parseInt(generation);
    if (isNaN(gen) || gen < -10 || gen > 10) {
      return res.status(400).json({ error: '代际值无效，应在 -10 到 10 之间' });
    }
  }

  next();
}

/**
 * 验证关系创建请求
 */
function validateRelationRequest(req, res, next) {
  const { parentFamilyId, childFamilyId } = req.body;

  if (!parentFamilyId) {
    return res.status(400).json({ error: '父家庭ID不能为空' });
  }

  if (!childFamilyId) {
    return res.status(400).json({ error: '子家庭ID不能为空' });
  }

  const parentId = parseInt(parentFamilyId);
  const childId = parseInt(childFamilyId);

  if (isNaN(parentId) || parentId <= 0) {
    return res.status(400).json({ error: '父家庭ID无效' });
  }

  if (isNaN(childId) || childId <= 0) {
    return res.status(400).json({ error: '子家庭ID无效' });
  }

  if (parentId === childId) {
    return res.status(400).json({ error: '父家庭和子家庭不能相同' });
  }

  next();
}

/**
 * 验证 ID 参数
 */
function validateIdParam(paramName) {
  return (req, res, next) => {
    const id = parseInt(req.params[paramName]);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: `无效的 ${paramName}` });
    }
    next();
  };
}

module.exports = {
  validateMemberRequest,
  validateFamilyTreeRequest,
  validateFamilyRequest,
  validateRelationRequest,
  validateIdParam
};
