const path = require('path');
const fs = require('fs');

// 数据存储路径 - Docker 环境使用 /app/data，本地开发使用项目目录
const isDocker = fs.existsSync('/.dockerenv');
const dataPath = isDocker ? '/app/data' : path.join(__dirname, '../../data');
const photosPath = isDocker ? '/app/photos' : path.join(__dirname, '../../photos');
const treesIndexFile = path.join(dataPath, 'trees_index.json');

// 确保目录存在
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}
if (!fs.existsSync(photosPath)) {
  fs.mkdirSync(photosPath, { recursive: true });
}

// 家族索引（只存储家族列表和基本信息）
let treesIndex = {
  family_trees: []
};

// 从文件加载家族索引
function loadTreesIndex() {
  if (fs.existsSync(treesIndexFile)) {
    try {
      const data = fs.readFileSync(treesIndexFile, 'utf8');
      treesIndex = JSON.parse(data);
      console.log('Trees index loaded from file');
    } catch (err) {
      console.error('Failed to load trees index:', err);
    }
  }
}

// 保存家族索引到文件
function saveTreesIndex() {
  try {
    fs.writeFileSync(treesIndexFile, JSON.stringify(treesIndex, null, 2));
  } catch (err) {
    console.error('Failed to save trees index:', err);
  }
}

// 获取家族数据文件路径
function getTreeDataFile(treeId) {
  return path.join(dataPath, `tree_${treeId}.json`);
}

// 从文件加载家族数据
function loadTreeData(treeId) {
  const filePath = getTreeDataFile(treeId);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error(`Failed to load tree data for ${treeId}:`, err);
    }
  }
  // 返回默认结构
  return {
    members: [],
    families: [],
    relations: []
  };
}

// 保存家族数据到文件
function saveTreeData(treeId, data) {
  const filePath = getTreeDataFile(treeId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to save tree data for ${treeId}:`, err);
  }
}

// 获取成员照片列表（直接从文件夹读取）
function getMemberPhotos(treeId, memberName) {
  const memberDir = path.join(photosPath, treeId.toString(), 'members', memberName);
  if (!fs.existsSync(memberDir)) {
    return [];
  }
  try {
    const files = fs.readdirSync(memberDir);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
    }).map(file => ({
      filename: file,
      path: path.join(treeId.toString(), 'members', memberName, file)
    }));
  } catch (err) {
    console.error(`Failed to read photos for member ${memberName}:`, err);
    return [];
  }
}

// 初始化
loadTreesIndex();

// 数据库操作接口
const dbAsync = {
  // ========== 族谱操作 ==========
  async getFamilyTree(id) {
    return treesIndex.family_trees.find(t => t.id === parseInt(id));
  },

  async getFamilyTreeByPassword(password) {
    return treesIndex.family_trees.find(t =>
      t.view_password === password || t.edit_password === password
    );
  },

  async getAllFamilyTrees() {
    return treesIndex.family_trees;
  },

  async createFamilyTree(data) {
    const id = treesIndex.family_trees.length > 0
      ? Math.max(...treesIndex.family_trees.map(t => t.id)) + 1
      : 1;
    const tree = {
      id,
      ...data,
      created_at: new Date().toISOString()
    };
    treesIndex.family_trees.push(tree);
    saveTreesIndex();

    // 创建家族数据文件，包含默认成员
    const treeData = {
      members: [{
        id: 1,
        name: '成员1',
        gender: 'male',
        birth_date: '',
        avatar: null,
        created_at: new Date().toISOString()
      }],
      families: [],
      relations: []
    };
    saveTreeData(id, treeData);

    return tree;
  },

  async updateFamilyTree(id, data) {
    const index = treesIndex.family_trees.findIndex(t => t.id === parseInt(id));
    if (index === -1) return null;
    treesIndex.family_trees[index] = { ...treesIndex.family_trees[index], ...data };
    saveTreesIndex();
    return treesIndex.family_trees[index];
  },

  async deleteFamilyTree(id) {
    const treeId = parseInt(id);

    // 从索引中删除
    treesIndex.family_trees = treesIndex.family_trees.filter(t => t.id !== treeId);
    saveTreesIndex();

    // 删除家族数据文件
    const filePath = getTreeDataFile(treeId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除照片目录
    const treePhotosPath = path.join(photosPath, treeId.toString());
    if (fs.existsSync(treePhotosPath)) {
      fs.rmSync(treePhotosPath, { recursive: true, force: true });
    }

    return true;
  },

  // ========== 成员操作 ==========
  async getMember(id, treeId) {
    if (!treeId) return null;
    const treeData = loadTreeData(treeId);
    const member = treeData.members.find(m => m.id === parseInt(id));
    if (!member) return null;

    // 创建新对象，避免修改原始数据
    const memberData = { ...member };

    // 构建完整的头像 URL
    if (memberData.avatar) {
      const encodedName = encodeURIComponent(memberData.name);
      memberData.avatar = `/photos/${treeId}/members/${encodedName}/${memberData.avatar}`;
    }

    return memberData;
  },

  // 跨所有家族查找成员（用于管理员）
  async findMemberAcrossTrees(id) {
    for (const tree of treesIndex.family_trees) {
      const member = await this.getMember(id, tree.id);
      if (member) {
        return { member, treeId: tree.id };
      }
    }
    return null;
  },

  async getMembersByTree(treeId) {
    const treeData = loadTreeData(treeId);
    // 为每个成员添加照片列表和完整头像 URL
    return treeData.members.map(member => {
      const memberData = { ...member };

      // 构建完整的头像 URL
      if (memberData.avatar) {
        const encodedName = encodeURIComponent(memberData.name);
        memberData.avatar = `/photos/${treeId}/members/${encodedName}/${memberData.avatar}`;
      }

      memberData.photos = getMemberPhotos(treeId, member.name);
      return memberData;
    });
  },

  async createMember(data, treeId) {
    const treeData = loadTreeData(treeId);

    const id = treeData.members.length > 0
      ? Math.max(...treeData.members.map(m => m.id)) + 1
      : 1;
    const member = {
      id,
      avatar: null,
      ...data,
      created_at: new Date().toISOString()
    };
    treeData.members.push(member);
    saveTreeData(treeId, treeData);
    return member;
  },

  async updateMember(id, treeId, data) {
    if (!treeId) {
      // 如果没有 treeId，需要遍历所有家族查找
      for (const tree of treesIndex.family_trees) {
        const treeData = loadTreeData(tree.id);
        const index = treeData.members.findIndex(m => m.id === parseInt(id));
        if (index !== -1) {
          treeData.members[index] = { ...treeData.members[index], ...data };
          saveTreeData(tree.id, treeData);
          return treeData.members[index];
        }
      }
      return null;
    }

    const treeData = loadTreeData(treeId);
    const index = treeData.members.findIndex(m => m.id === parseInt(id));
    if (index === -1) return null;
    treeData.members[index] = { ...treeData.members[index], ...data };
    saveTreeData(treeId, treeData);
    return treeData.members[index];
  },

  async deleteMember(id, treeId) {
    if (!treeId) return false;
    const treeData = loadTreeData(treeId);
    const member = treeData.members.find(m => m.id === parseInt(id));
    if (member) {
      // 删除成员的照片目录
      const memberDir = path.join(photosPath, treeId.toString(), 'members', member.name);
      if (fs.existsSync(memberDir)) {
        try {
          fs.rmSync(memberDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Error deleting member photos directory:', err);
        }
      }
    }
    treeData.members = treeData.members.filter(m => m.id !== parseInt(id));
    saveTreeData(treeId, treeData);
    return true;
  },

  // ========== 照片操作（直接从文件系统操作）==========
  // 获取成员的所有照片
  async getPhotosByMember(memberId, treeId) {
    if (!treeId) return [];
    const member = await this.getMember(memberId, treeId);
    if (!member) return [];
    return getMemberPhotos(treeId, member.name);
  },

  // 设置成员头像
  async setMemberAvatar(memberId, treeId, avatarFilename) {
    const member = await this.getMember(memberId, treeId);
    if (!member) return null;
    return await this.updateMember(memberId, treeId, {
      avatar: avatarFilename
    });
  },

  // 删除成员照片
  async deleteMemberPhoto(memberId, treeId, filename) {
    const member = await this.getMember(memberId, treeId);
    if (!member) return null;

    const filePath = path.join(photosPath, treeId.toString(), 'members', member.name, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error('Photo file not found');
    }

    // 删除文件
    fs.unlinkSync(filePath);
    
    // 如果删除的是头像，清空头像设置
    if (member.avatar === filename) {
      await this.updateMember(memberId, treeId, {
        avatar: null
      });
    }
    
    return true;
  },

  // ========== 家庭操作 ==========
  async getFamily(id, treeId) {
    if (!treeId) return null;
    const treeData = loadTreeData(treeId);
    return treeData.families.find(f => f.id === parseInt(id));
  },

  // 跨所有家族查找家庭（用于管理员）
  async findFamilyAcrossTrees(id) {
    for (const tree of treesIndex.family_trees) {
      const family = await this.getFamily(id, tree.id);
      if (family) {
        return { family, treeId: tree.id };
      }
    }
    return null;
  },

  async getFamiliesByTree(treeId) {
    const treeData = loadTreeData(treeId);
    return treeData.families;
  },

  async createFamily(data, treeId) {
    const treeData = loadTreeData(treeId);

    const id = treeData.families.length > 0
      ? Math.max(...treeData.families.map(f => f.id)) + 1
      : 1;
    const family = {
      id,
      ...data,
      created_at: new Date().toISOString()
    };
    treeData.families.push(family);
    saveTreeData(treeId, treeData);
    return family;
  },

  async updateFamily(id, treeId, data) {
    if (!treeId) return null;
    const treeData = loadTreeData(treeId);
    const index = treeData.families.findIndex(f => f.id === parseInt(id));
    if (index === -1) return null;
    treeData.families[index] = { ...treeData.families[index], ...data };
    saveTreeData(treeId, treeData);
    return treeData.families[index];
  },

  async deleteFamily(id, treeId) {
    if (!treeId) return false;
    const treeData = loadTreeData(treeId);
    treeData.families = treeData.families.filter(f => f.id !== parseInt(id));
    treeData.relations = treeData.relations.filter(
      r => r.parent_family_id !== parseInt(id) && r.child_family_id !== parseInt(id)
    );
    saveTreeData(treeId, treeData);
    return true;
  },

  // ========== 关系操作 ==========
  async getRelationsByTree(treeId) {
    const treeData = loadTreeData(treeId);
    return treeData.relations;
  },

  async createRelation(data, treeId) {
    const treeData = loadTreeData(treeId);

    const id = treeData.relations.length > 0
      ? Math.max(...treeData.relations.map(r => r.id)) + 1
      : 1;
    const relation = {
      id,
      ...data,
      created_at: new Date().toISOString()
    };
    treeData.relations.push(relation);
    saveTreeData(treeId, treeData);
    return relation;
  },

  async deleteRelation(id, treeId) {
    if (!treeId) return false;
    const treeData = loadTreeData(treeId);
    treeData.relations = treeData.relations.filter(r => r.id !== parseInt(id));
    saveTreeData(treeId, treeData);
    return true;
  },

  async deleteRelationsByFamily(familyId, treeId) {
    if (!treeId) return false;
    const treeData = loadTreeData(treeId);
    treeData.relations = treeData.relations.filter(
      r => r.parent_family_id !== parseInt(familyId) && r.child_family_id !== parseInt(familyId)
    );
    saveTreeData(treeId, treeData);
    return true;
  },

  // ========== 家庭照片操作 ==========
  async getFamilyPhotos(familyId, treeId) {
    if (!treeId) return [];
    const familyDir = path.join(photosPath, treeId.toString(), 'families', familyId.toString());
    if (!fs.existsSync(familyDir)) {
      return [];
    }
    try {
      const files = fs.readdirSync(familyDir);
      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
      }).map(file => ({
        filename: file,
        path: path.join(treeId.toString(), 'families', familyId.toString(), file)
      }));
    } catch (err) {
      console.error(`Failed to read family photos for ${familyId}:`, err);
      return [];
    }
  }
};

module.exports = { dbAsync, photosPath };
