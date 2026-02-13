const express = require('express');
const router = express.Router();
const { dbAsync } = require('../models/database');
const { verifyToken, requireEditor, requireFamilyTreeAccess } = require('../middleware/auth');
const { validateFamilyRequest, validateRelationRequest, validateIdParam } = require('../middleware/validator');

router.get('/tree/:treeId', verifyToken, requireFamilyTreeAccess, async (req, res) => {
  try {
    const treeId = req.params.treeId;
    const families = await dbAsync.getFamiliesByTree(treeId);
    const members = await dbAsync.getMembersByTree(treeId);

    const result = families.map(f => ({
      ...f,
      father_name: members.find(m => m.id === parseInt(f.father_id))?.name,
      mother_name: members.find(m => m.id === parseInt(f.mother_id))?.name
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tree/:treeId/structure', verifyToken, requireFamilyTreeAccess, async (req, res) => {
  try {
    const treeId = req.params.treeId;
    const families = await dbAsync.getFamiliesByTree(treeId);
    const relations = await dbAsync.getRelationsByTree(treeId);
    const members = await dbAsync.getMembersByTree(treeId);

    const familyMap = {};
    families.forEach(f => {
      const father = f.father_id ? members.find(m => m.id === parseInt(f.father_id)) : null;
      const mother = f.mother_id ? members.find(m => m.id === parseInt(f.mother_id)) : null;
      familyMap[f.id] = {
        ...f,
        father: father || null,
        mother: mother || null,
        father_name: father?.name,
        mother_name: mother?.name,
        children: []
      };
    });

    relations.forEach(r => {
      if (familyMap[r.parent_family_id] && familyMap[r.child_family_id]) {
        familyMap[r.parent_family_id].children.push(familyMap[r.child_family_id]);
      }
    });

    const childIds = relations.map(r => r.child_family_id);
    const rootFamilies = families
      .filter(f => !childIds.includes(f.id))
      .map(f => familyMap[f.id]);

    res.json(rootFamilies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tree/:treeId', verifyToken, requireFamilyTreeAccess, requireEditor, validateFamilyRequest, async (req, res) => {
  try {
    const treeId = req.params.treeId;
    const { fatherId, motherId, generation, sortOrder } = req.body;

    if (fatherId) {
      const father = await dbAsync.getMember(fatherId, treeId);
      if (!father) {
        return res.status(400).json({ error: 'Father not found' });
      }
    }

    if (motherId) {
      const mother = await dbAsync.getMember(motherId, treeId);
      if (!mother) {
        return res.status(400).json({ error: 'Mother not found' });
      }
    }

    const family = await dbAsync.createFamily({
      father_id: fatherId || null,
      mother_id: motherId || null,
      generation: generation || 1,
      sort_order: sortOrder || 0
    }, parseInt(treeId));

    res.status(201).json(family);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:familyId', verifyToken, requireEditor, validateIdParam('familyId'), async (req, res) => {
  try {
    const familyId = req.params.familyId;
    let treeId = req.user.familyTreeId;
    const { fatherId, motherId, generation, sortOrder } = req.body;

    // 管理员跨家族查找
    let family;
    if (req.user.role === 'admin' && !treeId) {
      const result = await dbAsync.findFamilyAcrossTrees(familyId);
      if (!result) {
        return res.status(404).json({ error: 'Family not found' });
      }
      family = result.family;
      treeId = result.treeId;
    } else {
      family = await dbAsync.getFamily(familyId, treeId);
      if (!family) {
        return res.status(404).json({ error: 'Family not found' });
      }
    }

    const updates = {};
    if (fatherId !== undefined) updates.father_id = fatherId || null;
    if (motherId !== undefined) updates.mother_id = motherId || null;
    if (generation !== undefined) updates.generation = generation;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;

    const updated = await dbAsync.updateFamily(familyId, treeId, updates);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:familyId', verifyToken, requireEditor, validateIdParam('familyId'), async (req, res) => {
  try {
    const familyId = req.params.familyId;
    let treeId = req.user.familyTreeId;

    // 管理员跨家族查找
    let family;
    if (req.user.role === 'admin' && !treeId) {
      const result = await dbAsync.findFamilyAcrossTrees(familyId);
      if (!result) {
        return res.status(404).json({ error: 'Family not found' });
      }
      family = result.family;
      treeId = result.treeId;
    } else {
      family = await dbAsync.getFamily(familyId, treeId);
      if (!family) {
        return res.status(404).json({ error: 'Family not found' });
      }
    }

    await dbAsync.deleteFamily(familyId, treeId);
    res.json({ message: 'Family deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/relations', verifyToken, requireEditor, validateRelationRequest, async (req, res) => {
  try {
    const { parentFamilyId, childFamilyId } = req.body;
    let treeId = req.user.familyTreeId;

    // 管理员必须选择家族才能创建关系
    if (req.user.role === 'admin' && !treeId) {
      return res.status(403).json({ error: '管理员需要先选择家族才能创建家庭关系' });
    }

    const parentFamily = await dbAsync.getFamily(parentFamilyId, treeId);
    const childFamily = await dbAsync.getFamily(childFamilyId, treeId);

    if (!parentFamily || !childFamily) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const relation = await dbAsync.createRelation({
      parent_family_id: parseInt(parentFamilyId),
      child_family_id: parseInt(childFamilyId)
    }, treeId);

    res.status(201).json(relation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/relations/:relationId', verifyToken, requireEditor, validateIdParam('relationId'), async (req, res) => {
  try {
    let treeId = req.user.familyTreeId;
    
    // 管理员必须选择家族才能删除关系
    if (req.user.role === 'admin' && !treeId) {
      return res.status(403).json({ error: '管理员需要先选择家族才能删除家庭关系' });
    }
    
    await dbAsync.deleteRelation(req.params.relationId, treeId);
    res.json({ message: 'Relation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
