const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { dbAsync, photosPath } = require('../models/database');
const { verifyToken, requireEditor } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(photosPath, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
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
    const { memberIds, type, familyId } = req.body;
    let treeId = req.user.familyTreeId;

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
      if (!fs.existsSync(familyDir)) {
        fs.mkdirSync(familyDir, { recursive: true });
      }

      for (const file of req.files) {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const newFilename = `${basename}-${timestamp}${ext}`;
        const destPath = path.join(familyDir, newFilename);

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
          const memberDir = path.join(photosPath, treeId.toString(), 'members', member.name);

          if (!fs.existsSync(memberDir)) {
            fs.mkdirSync(memberDir, { recursive: true });
          }

          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const basename = path.basename(file.originalname, ext);
          const newFilename = `${basename}-${timestamp}${ext}`;
          const destPath = path.join(memberDir, newFilename);

          fs.copyFileSync(file.path, destPath);

          uploadedPhotos.push({
            member_id: parseInt(memberId),
            filename: newFilename,
            path: path.join(treeId.toString(), 'members', member.name, newFilename)
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
    const { memberId } = req.query;
    let treeId = req.user.familyTreeId;
    
    // 管理员跨家族查找
    let member;
    if (req.user.role === 'admin' && !treeId) {
      const result = await dbAsync.findMemberAcrossTrees(memberId);
      if (!result) {
        return res.status(404).json({ error: 'Member not found' });
      }
      member = result.member;
      treeId = result.treeId;
    } else {
      member = await dbAsync.getMember(memberId, treeId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
    }

    const filePath = path.join(photosPath, treeId.toString(), 'members', member.name, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 如果删除的是头像，清空头像设置
    if (member.avatar === req.params.filename) {
      await dbAsync.setMemberAvatar(memberId, treeId, null);
    }

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传裁剪后的头像
router.post('/avatar-crop', verifyToken, requireEditor, upload.single('avatar'), async (req, res) => {
  try {
    const { memberId } = req.body;
    let treeId = req.user.familyTreeId;

    // 管理员跨家族查找
    let member;
    if (req.user.role === 'admin' && !treeId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: '管理员需要先选择家族才能上传头像' });
    } else if (req.user.role === 'admin' && treeId) {
      // 管理员已选择家族，使用选择的家族
      member = await dbAsync.getMember(memberId, treeId);
    } else {
      // 普通用户
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

    // 生成头像文件名
    const avatarFilename = `avatar-${memberId}-${Date.now()}.jpg`;
    const memberDir = path.join(photosPath, treeId.toString(), 'members', member.name);
    const avatarPath = path.join(memberDir, avatarFilename);

    // 确保目录存在
    if (!fs.existsSync(memberDir)) {
      fs.mkdirSync(memberDir, { recursive: true });
    }

    // 移动文件到目标位置
    fs.renameSync(req.file.path, avatarPath);

    // 更新数据库
    await dbAsync.setMemberAvatar(memberId, treeId, avatarFilename);

    // 对成员名称进行 URL 编码（处理中文）
    const encodedMemberName = encodeURIComponent(member.name);
    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: `/photos/${treeId}/members/${encodedMemberName}/${avatarFilename}`
    });
  } catch (error) {
    console.error('上传头像错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取照片文件
router.get('/file/:filename', verifyToken, async (req, res) => {
  try {
    let treeId = req.user.familyTreeId;
    const { memberId } = req.query;

    // 解码文件名
    const filename = decodeURIComponent(req.params.filename);

    // 管理员跨家族查找
    let member = null;
    if (memberId) {
      if (req.user.role === 'admin' && !treeId) {
        const result = await dbAsync.findMemberAcrossTrees(memberId);
        if (result) {
          member = result.member;
          treeId = result.treeId;
        }
      } else {
        member = await dbAsync.getMember(memberId, treeId);
      }
    }

    let filePath = null;

    if (member && treeId) {
      // 如果提供了 memberId，直接从该成员的目录查找
      filePath = path.join(photosPath, treeId.toString(), 'members', member.name, filename);
    } else if (treeId) {
      // 如果没有提供 memberId，遍历所有成员的目录查找
      const membersPath = path.join(photosPath, treeId.toString(), 'members');
      if (fs.existsSync(membersPath)) {
        const memberDirs = fs.readdirSync(membersPath);
        for (const dir of memberDirs) {
          const possiblePath = path.join(membersPath, dir, filename);
          if (fs.existsSync(possiblePath)) {
            filePath = possiblePath;
            break;
          }
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
