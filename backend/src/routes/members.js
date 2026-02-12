const express = require('express');
const router = express.Router();
const { dbAsync, photosPath } = require('../models/database');
const { verifyToken, requireEditor, requireFamilyTreeAccess } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

router.get('/tree/:treeId', verifyToken, requireFamilyTreeAccess, async (req, res) => {
  try {
    const members = await dbAsync.getMembersByTree(req.params.treeId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:memberId', verifyToken, async (req, res) => {
  try {
    const treeId = req.user.familyTreeId || req.query.treeId;
    const member = await dbAsync.getMember(req.params.memberId, treeId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tree/:treeId', verifyToken, requireFamilyTreeAccess, requireEditor, async (req, res) => {
  try {
    const treeId = req.params.treeId;
    const { name, gender, birthDate, relationType, relatedMemberId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const members = await dbAsync.getMembersByTree(treeId);
    const existingNames = members.map(m => m.name);
    let uniqueName = name;
    let index = 1;
    while (existingNames.includes(uniqueName)) {
      uniqueName = `${name}-${index}`;
      index++;
    }

    const member = await dbAsync.createMember({
      name: uniqueName,
      gender,
      birth_date: birthDate
    }, parseInt(treeId));

    const memberPhotosPath = path.join(photosPath, treeId.toString(), uniqueName);
    if (!fs.existsSync(memberPhotosPath)) {
      fs.mkdirSync(memberPhotosPath, { recursive: true });
    }

    // 处理家庭关系
    if (relationType && relatedMemberId) {
      const relatedMember = await dbAsync.getMember(relatedMemberId, treeId);
      if (relatedMember) {
        await handleFamilyRelation(treeId, member, relatedMember, relationType);
      }
    }

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 处理家庭关系
async function handleFamilyRelation(treeId, newMember, relatedMember, relationType) {
  const families = await dbAsync.getFamiliesByTree(treeId);

  if (relationType === 'parent') {
    // 添加父母：新成员是父母，relatedMember 是子女
    // 找到包含 relatedMember 的家庭（作为子女）
    let childFamily = families.find(f =>
      f.father_id === relatedMember.id || f.mother_id === relatedMember.id
    );

    // 确定子女家庭的代际
    let childGeneration;
    if (!childFamily) {
      // 如果没有找到，说明 relatedMember 还没有家庭
      // 创建一个新的家庭，让 relatedMember 成为子女，代际为 0
      childGeneration = 0;
      childFamily = await dbAsync.createFamily({
        father_id: relatedMember.gender === 'male' ? relatedMember.id : null,
        mother_id: relatedMember.gender === 'female' ? relatedMember.id : null,
        generation: childGeneration
      }, parseInt(treeId));
    } else {
      childGeneration = childFamily.generation;
    }

    // 检查是否已经有父母家庭
    const existingRelation = await dbAsync.getRelationsByTree(treeId);
    const parentRelation = existingRelation.find(r => r.child_family_id === childFamily.id);
    
    if (parentRelation) {
      // 如果已经有父母家庭，将新成员添加到现有父母家庭作为配偶
      const parentFamily = families.find(f => f.id === parentRelation.parent_family_id);
      if (parentFamily) {
        const updates = {};
        if (newMember.gender === 'male') {
          updates.father_id = newMember.id;
        } else {
          updates.mother_id = newMember.id;
        }
        await dbAsync.updateFamily(parentFamily.id, parseInt(treeId), updates);
      }
    } else {
      // 创建新的父母家庭（在上方，代际减1）
      const parentFamily = await dbAsync.createFamily({
        father_id: newMember.gender === 'male' ? newMember.id : null,
        mother_id: newMember.gender === 'female' ? newMember.id : null,
        generation: childGeneration - 1
      }, parseInt(treeId));

      // 建立关系：父母家庭 -> 子女家庭
      await dbAsync.createRelation({
        parent_family_id: parentFamily.id,
        child_family_id: childFamily.id
      }, parseInt(treeId));
    }

  } else if (relationType === 'child') {
    // 添加子女：新成员是子女，relatedMember 是父母
    // 找到或创建包含 relatedMember 作为父母的家庭
    let parentFamily = families.find(f =>
      f.father_id === relatedMember.id || f.mother_id === relatedMember.id
    );

    if (!parentFamily) {
      parentFamily = await dbAsync.createFamily({
        father_id: relatedMember.gender === 'male' ? relatedMember.id : null,
        mother_id: relatedMember.gender === 'female' ? relatedMember.id : null,
        generation: 1
      }, parseInt(treeId));
    }

    // 创建子女的家庭
    const childFamily = await dbAsync.createFamily({
      father_id: newMember.gender === 'male' ? newMember.id : null,
      mother_id: newMember.gender === 'female' ? newMember.id : null,
      generation: parentFamily.generation + 1
    }, parseInt(treeId));

    // 建立关系：父母家庭 -> 子女家庭
    await dbAsync.createRelation({
      parent_family_id: parentFamily.id,
      child_family_id: childFamily.id
    }, parseInt(treeId));

  } else if (relationType === 'spouse') {
    // 添加配偶：新成员是配偶，与 relatedMember 组成家庭

    // 检查是否添加异性配偶
    if (newMember.gender === relatedMember.gender) {
      throw new Error('只能添加异性配偶');
    }

    // 找到或创建包含 relatedMember 的家庭
    let existingFamily = families.find(f =>
      f.father_id === relatedMember.id || f.mother_id === relatedMember.id
    );

    if (existingFamily) {
      // 检查家庭是否已有2人
      const hasFather = existingFamily.father_id !== null;
      const hasMother = existingFamily.mother_id !== null;
      if (hasFather && hasMother) {
        throw new Error('该成员已有配偶，不能再添加');
      }

      // 检查对应位置是否为空
      const isMale = newMember.gender === 'male';
      const positionOccupied = isMale ? hasFather : hasMother;
      if (positionOccupied) {
        throw new Error('该位置已有配偶');
      }

      // 更新现有家庭，添加配偶
      const updates = {};
      if (isMale) {
        updates.father_id = newMember.id;
      } else {
        updates.mother_id = newMember.id;
      }
      await dbAsync.updateFamily(existingFamily.id, parseInt(treeId), updates);
    } else {
      // 创建新家庭，包含两个人
      // 创建早的成员（relatedMember）排前面
      await dbAsync.createFamily({
        father_id: newMember.gender === 'male' ? newMember.id : relatedMember.id,
        mother_id: newMember.gender === 'female' ? newMember.id : relatedMember.id,
        first_parent_id: relatedMember.id,  // 创建早的成员排前面
        generation: 1
      }, parseInt(treeId));
    }
  }
}

router.put('/:memberId', verifyToken, requireEditor, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const { name, gender, birthDate } = req.body;

    // 管理员可以通过成员ID直接获取成员，不需要treeId
    let member;
    let treeId;
    if (req.user.role === 'admin' && !req.user.familyTreeId) {
      // 管理员跨家族查找成员
      const result = await dbAsync.findMemberAcrossTrees(memberId);
      if (result) {
        member = result.member;
        treeId = result.treeId;
      }
    } else {
      treeId = req.user.familyTreeId;
      member = await dbAsync.getMember(memberId, treeId);
    }

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    let newName = member.name;
    if (name && name !== member.name) {
      const members = await dbAsync.getMembersByTree(treeId);
      const existingNames = members.filter(m => m.id !== parseInt(memberId)).map(m => m.name);
      newName = name;
      let index = 1;
      while (existingNames.includes(newName)) {
        newName = `${name}-${index}`;
        index++;
      }

      const oldPath = path.join(photosPath, treeId.toString(), member.name);
      const newPath = path.join(photosPath, treeId.toString(), newName);
      if (fs.existsSync(oldPath)) {
        try {
          // 如果目标文件夹已存在，先删除它
          if (fs.existsSync(newPath)) {
            fs.rmSync(newPath, { recursive: true, force: true });
          }
          fs.renameSync(oldPath, newPath);
        } catch (err) {
          console.error('重命名照片文件夹失败:', err);
          // 继续执行，不阻止成员重命名
        }
      }
    }

    const updates = {};
    if (newName !== member.name) updates.name = newName;
    if (gender) updates.gender = gender;
    if (birthDate !== undefined) updates.birth_date = birthDate;

    // 如果性别发生变化，检查该成员所在家庭是否已有2人
    if (gender && gender !== member.gender) {
      const families = await dbAsync.getFamiliesByTree(treeId);
      for (const family of families) {
        const isInFamily = family.father_id === parseInt(memberId) || family.mother_id === parseInt(memberId);
        if (isInFamily) {
          const hasFather = family.father_id !== null;
          const hasMother = family.mother_id !== null;
          // 如果家庭已有2人，禁止修改性别
          if (hasFather && hasMother) {
            return res.status(400).json({ error: '该成员所在家庭已有配偶，不能修改性别' });
          }
        }
      }
    }

    // 如果性别发生变化，同步更新家庭中的 father_id/mother_id
    if (gender && gender !== member.gender) {
      const families = await dbAsync.getFamiliesByTree(treeId);
      for (const family of families) {
        if (family.father_id === parseInt(memberId)) {
          // 该成员原来是父亲，改成母亲
          await dbAsync.updateFamily(family.id, treeId, {
            father_id: null,
            mother_id: parseInt(memberId)
          });
        } else if (family.mother_id === parseInt(memberId)) {
          // 该成员原来是母亲，改成父亲
          await dbAsync.updateFamily(family.id, treeId, {
            father_id: parseInt(memberId),
            mother_id: null
          });
        }
      }
    }

    const updated = await dbAsync.updateMember(memberId, treeId, updates);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:memberId', verifyToken, requireEditor, async (req, res) => {
  try {
    const memberId = req.params.memberId;
    
    // 管理员可以通过成员ID直接获取成员，不需要treeId
    let member;
    let treeId;
    if (req.user.role === 'admin' && !req.user.familyTreeId) {
      // 管理员跨家族查找成员
      const result = await dbAsync.findMemberAcrossTrees(memberId);
      if (result) {
        member = result.member;
        treeId = result.treeId;
      }
    } else {
      treeId = req.user.familyTreeId;
      member = await dbAsync.getMember(memberId, treeId);
    }
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 禁止删除初始成员（ID为1的成员）
    if (parseInt(memberId) === 1) {
      return res.status(400).json({ error: '初始成员禁止删除' });
    }

    // 处理包含该成员的家庭
    const families = await dbAsync.getFamiliesByTree(treeId);
    for (const family of families) {
      if (family.father_id === parseInt(memberId) || family.mother_id === parseInt(memberId)) {
        // 检查家庭中是否还有其他成员（排除当前要删除的成员）
        const hasOtherFather = family.father_id && family.father_id !== parseInt(memberId);
        const hasOtherMother = family.mother_id && family.mother_id !== parseInt(memberId);
        
        // 如果家庭中还有其他成员，只更新家庭移除被删除的成员
        if (hasOtherFather || hasOtherMother) {
          const updates = {};
          if (family.father_id === parseInt(memberId)) {
            updates.father_id = null;
          }
          if (family.mother_id === parseInt(memberId)) {
            updates.mother_id = null;
          }
          await dbAsync.updateFamily(family.id, treeId, updates);
        } else {
          // 如果家庭只有被删除的成员，删除该家庭及其关系
          await dbAsync.deleteRelationsByFamily(family.id, treeId);
          await dbAsync.deleteFamily(family.id, treeId);
        }
      }
    }

    // 清理空家庭（没有父亲也没有母亲的家庭）
    const remainingFamilies = await dbAsync.getFamiliesByTree(treeId);
    for (const family of remainingFamilies) {
      if (!family.father_id && !family.mother_id) {
        await dbAsync.deleteRelationsByFamily(family.id, treeId);
        await dbAsync.deleteFamily(family.id, treeId);
      }
    }

    await dbAsync.deleteMember(memberId, treeId);
    res.json({ message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
