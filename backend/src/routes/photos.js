const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbAsync, photosPath } = require('../models/database');
const { verifyToken, requireEditor } = require('../middleware/auth');
const { isPathSafe, isAllowedImageType, generatePersonalPhotoName, generateFamilyPhotoName, getNextPhotoNumber, sanitizeName, sanitizeFilename } = require('../utils/security');

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(photosPath, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // 使用临时文件名，实际文件名在保存时生成
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `temp_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (isAllowedImageType(file.mimetype, file.originalname)) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件（JPEG, PNG, GIF, WebP, BMP）'));
    }
  }
});

// 获取成员的所有照片
router.get('/member/:memberId', verifyToken, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    let treeId = req.user.familyTreeId;

    // 管理员跨家族查找
    if (req.user.role === 'admin' && !treeId) {
      const result = await dbAsync.findMemberAcrossTrees(memberId);
      if (!result) {
        return res.status(404).json({ error: 'Member not found' });
      }
      treeId = result.treeId;
    }

    const photos = await dbAsync.getPhotosByMember(memberId, treeId);
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取家庭的所有照片
router.get('/family/:familyId', verifyToken, async (req, res) => {
  try {
    const familyId = req.params.familyId;
    let treeId = req.user.familyTreeId;

    // 管理员跨家族查找
    if (req.user.role === 'admin' && !treeId) {
      const result = await dbAsync.findFamilyAcrossTrees(familyId);
      if (!result) {
        return res.status(404).json({ error: 'Family not found' });
      }
      treeId = result.treeId;
    }

    const photos = await dbAsync.getFamilyPhotos(familyId, treeId);
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传照片
router.post('/upload', verifyToken, requireEditor, upload.array('photos', 50), async (req, res) => {
  try {
    const { memberIds, type, familyId, treeId: bodyTreeId } = req.body;
    let treeId = req.user.familyTreeId;

    // 管理员可以通过请求体传递 treeId
    if (req.user.role === 'admin' && !treeId && bodyTreeId) {
      treeId = parseInt(bodyTreeId);
    }

    // 管理员必须选择家族才能上传照片
    if (req.user.role === 'admin' && !treeId) {
      req.files?.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
      return res.status(403).json({ error: '管理员需要先选择家族才能上传照片' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Photos are required' });
    }

    const uploadedPhotos = [];

    // 上传到家庭相册
    if (type === 'family' && familyId) {
      const family = await dbAsync.getFamily(familyId, treeId);
      if (!family) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        return res.status(404).json({ error: 'Family not found' });
      }

      const familyDir = path.join(photosPath, treeId.toString(), 'families', familyId.toString());
      
      // 验证目标目录安全
      if (!isPathSafe(familyDir, photosPath)) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        return res.status(400).json({ error: 'Invalid directory path' });
      }

      if (!fs.existsSync(familyDir)) {
        fs.mkdirSync(familyDir, { recursive: true });
      }

      // 获取当前序号
      let nextNumber = getNextPhotoNumber(familyDir);

      // 获取父母名称
      const father = family.father_id ? await dbAsync.getMember(family.father_id, treeId) : null;
      const mother = family.mother_id ? await dbAsync.getMember(family.mother_id, treeId) : null;

      for (const file of req.files) {
        // 生成新的文件名: 父亲名_母亲名_序号.jpg
        const newFilename = generateFamilyPhotoName(
          father?.name,
          mother?.name,
          nextNumber++
        );
        const destPath = path.join(familyDir, newFilename);

        // 再次验证目标路径安全
        if (!isPathSafe(destPath, photosPath)) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          continue;
        }

        fs.copyFileSync(file.path, destPath);

        uploadedPhotos.push({
          family_id: parseInt(familyId),
          filename: newFilename,
          path: path.join(treeId.toString(), 'families', familyId.toString(), newFilename)
        });

        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    } else {
      // 上传到个人相册
      if (!memberIds) {
        req.files?.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        return res.status(400).json({ error: 'Member IDs are required' });
      }

      const memberIdList = JSON.parse(memberIds);

      if (!Array.isArray(memberIdList) || memberIdList.length === 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        return res.status(400).json({ error: 'At least one member must be selected' });
      }

      for (const memberId of memberIdList) {
        const member = await dbAsync.getMember(memberId, treeId);
        if (!member) {
          req.files.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          });
          return res.status(404).json({ error: `Member ${memberId} not found` });
        }
      }

      for (const file of req.files) {
        for (const memberId of memberIdList) {
          const member = await dbAsync.getMember(memberId, treeId);
          const safeMemberName = sanitizeName(member.name);
          const memberDir = path.join(photosPath, treeId.toString(), 'members', safeMemberName);

          // 验证目标目录安全
          if (!isPathSafe(memberDir, photosPath)) {
            continue;
          }

          if (!fs.existsSync(memberDir)) {
            fs.mkdirSync(memberDir, { recursive: true });
          }

          // 获取当前序号并生成文件名: 成员名_序号.jpg
          const nextNumber = getNextPhotoNumber(memberDir);
          const newFilename = generatePersonalPhotoName(member.name, nextNumber);
          const destPath = path.join(memberDir, newFilename);

          // 再次验证目标路径安全
          if (!isPathSafe(destPath, photosPath)) {
            continue;
          }

          fs.copyFileSync(file.path, destPath);

          uploadedPhotos.push({
            member_id: parseInt(memberId),
            filename: newFilename,
            path: path.join(treeId.toString(), 'members', safeMemberName, newFilename)
          });
        }

        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    res.json({
      message: 'Photos uploaded successfully',
      count: uploadedPhotos.length,
      photos: uploadedPhotos
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// 删除照片
router.delete('/:filename', verifyToken, requireEditor, async (req, res) => {
  try {
    const { memberId, familyId, type, treeId: bodyTreeId } = req.query;
    let treeId = req.user.familyTreeId;
    
    // 管理员可以通过请求参数传递 treeId
    if (req.user.role === 'admin' && !treeId && bodyTreeId) {
      treeId = parseInt(bodyTreeId);
    }
    
    // 管理员跨家族查找
    if (req.user.role === 'admin' && !treeId) {
      const result = await dbAsync.findMemberAcrossTrees(memberId);
      if (!result) {
        return res.status(404).json({ error: 'Member not found' });
      }
      treeId = result.treeId;
    }

    // 解码文件名
    const decodedFilename = decodeURIComponent(req.params.filename);
    const safeFilename = sanitizeFilename(decodedFilename);
    if (!safeFilename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    let filePath = null;

    if (type === 'family' && familyId) {
      // 删除家庭照片
      const familyDir = path.join(photosPath, treeId.toString(), 'families', familyId.toString());
      filePath = path.join(familyDir, safeFilename);
    } else if (memberId) {
      // 删除个人照片
      const member = await dbAsync.getMember(memberId, treeId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      const safeMemberName = sanitizeName(member.name);
      filePath = path.join(photosPath, treeId.toString(), 'members', safeMemberName, safeFilename);

      // 如果删除的是头像，清空头像设置
      if (member.avatar === safeFilename) {
        await dbAsync.setMemberAvatar(memberId, treeId, null);
      }
    } else {
      return res.status(400).json({ error: '必须提供 memberId 或 familyId' });
    }

    // 验证路径安全
    if (!filePath || !isPathSafe(filePath, photosPath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传裁剪后的头像
router.post('/avatar-crop', verifyToken, requireEditor, upload.single('avatar'), async (req, res) => {
  try {
    const { memberId, treeId: bodyTreeId } = req.body;
    let treeId = req.user.familyTreeId;

    // 管理员可以通过请求体传递 treeId
    if (req.user.role === 'admin' && !treeId && bodyTreeId) {
      treeId = parseInt(bodyTreeId);
    }

    // 管理员跨家族查找
    let member;
    if (req.user.role === 'admin' && !treeId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: '管理员需要先选择家族才能上传头像' });
    } else if (req.user.role === 'admin' && treeId) {
      member = await dbAsync.getMember(memberId, treeId);
    } else {
      member = await dbAsync.getMember(memberId, treeId);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file uploaded' });
    }

    if (!member) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Member not found' });
    }

    const safeMemberName = sanitizeName(member.name);
    const memberDir = path.join(photosPath, treeId.toString(), 'members', safeMemberName);
    
    // 验证路径安全
    if (!isPathSafe(memberDir, photosPath)) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // 确保目录存在
    if (!fs.existsSync(memberDir)) {
      fs.mkdirSync(memberDir, { recursive: true });
    }

    // 生成头像文件名: 成员名_avatar.jpg
    const avatarFilename = `${safeMemberName}_avatar.jpg`;
    const avatarPath = path.join(memberDir, avatarFilename);

    // 移动文件到目标位置
    fs.renameSync(req.file.path, avatarPath);

    // 更新数据库
    await dbAsync.setMemberAvatar(memberId, treeId, avatarFilename);

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: `/photos/${treeId}/members/${encodeURIComponent(safeMemberName)}/${avatarFilename}`
    });
  } catch (error) {
    console.error('上传头像错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
