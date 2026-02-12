const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { dbAsync, photosPath } = require('../models/database');
const { verifyToken, requireAdmin, requireFamilyTreeAccess } = require('../middleware/auth');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const trees = await dbAsync.getAllFamilyTrees();
    res.json(trees.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      view_password: t.view_password,
      edit_password: t.edit_password,
      created_at: t.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:treeId', verifyToken, requireFamilyTreeAccess, async (req, res) => {
  try {
    const tree = await dbAsync.getFamilyTree(req.params.treeId);
    if (!tree) {
      return res.status(404).json({ error: '家族不存在' });
    }
    res.json({
      id: tree.id,
      name: tree.name,
      description: tree.description,
      created_at: tree.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, viewPassword, editPassword, description } = req.body;

    if (!name || !viewPassword || !editPassword) {
      return res.status(400).json({ error: '家族名称、查看密码和编辑密码不能为空' });
    }

    // 查看密码和编辑密码不能相同
    if (viewPassword === editPassword) {
      return res.status(400).json({ error: '查看密码和编辑密码不能相同' });
    }

    // 密码不能和管理员密码相同
    if (viewPassword === ADMIN_PASSWORD || editPassword === ADMIN_PASSWORD) {
      return res.status(400).json({ error: '家族密码不能和管理员密码相同' });
    }

    // 获取所有家族检查密码是否重复
    const allTrees = await dbAsync.getAllFamilyTrees();
    for (const tree of allTrees) {
      if (tree.view_password === viewPassword || tree.view_password === editPassword ||
          tree.edit_password === viewPassword || tree.edit_password === editPassword) {
        return res.status(400).json({ error: '该密码已被其他家族使用' });
      }
    }

    const tree = await dbAsync.createFamilyTree({
      name,
      view_password: viewPassword,
      edit_password: editPassword,
      description
    });

    res.status(201).json({
      id: tree.id,
      name: tree.name,
      description: tree.description
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:treeId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const treeId = req.params.treeId;
    const { name, viewPassword, editPassword, description } = req.body;
    
    const tree = await dbAsync.getFamilyTree(treeId);
    if (!tree) {
      return res.status(404).json({ error: '家族不存在' });
    }

    // 检查新密码是否与编辑密码相同
    const newViewPassword = viewPassword || tree.view_password;
    const newEditPassword = editPassword || tree.edit_password;
    if (newViewPassword === newEditPassword) {
      return res.status(400).json({ error: '查看密码和编辑密码不能相同' });
    }

    // 密码不能和管理员密码相同
    if (viewPassword === ADMIN_PASSWORD || editPassword === ADMIN_PASSWORD) {
      return res.status(400).json({ error: '家族密码不能和管理员密码相同' });
    }

    // 检查密码是否被其他家族使用
    if (viewPassword || editPassword) {
      const allTrees = await dbAsync.getAllFamilyTrees();
      for (const otherTree of allTrees) {
        if (otherTree.id === parseInt(treeId)) continue; // 跳过当前家族
        
        if (viewPassword && (otherTree.view_password === viewPassword || otherTree.edit_password === viewPassword)) {
          return res.status(400).json({ error: '查看密码已被其他家族使用' });
        }
        if (editPassword && (otherTree.view_password === editPassword || otherTree.edit_password === editPassword)) {
          return res.status(400).json({ error: '编辑密码已被其他家族使用' });
        }
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (viewPassword) updates.view_password = viewPassword;
    if (editPassword) updates.edit_password = editPassword;
    if (description !== undefined) updates.description = description;
    
    const updated = await dbAsync.updateFamilyTree(treeId, updates);
    res.json({ id: updated.id, name: updated.name, description: updated.description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:treeId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const treeId = req.params.treeId;
    
    const tree = await dbAsync.getFamilyTree(treeId);
    if (!tree) {
      return res.status(404).json({ error: '家族不存在' });
    }

    const treePhotosPath = path.join(photosPath, treeId.toString());
    if (fs.existsSync(treePhotosPath)) {
      fs.rmSync(treePhotosPath, { recursive: true, force: true });
    }

    await dbAsync.deleteFamilyTree(treeId);
    res.json({ message: '家族已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
