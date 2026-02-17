# 头像调整为标准2寸照片比例方案

## 标准2寸照片规格

| 项目 | 尺寸 |
|------|------|
| 宽度 | 35mm |
| 高度 | 49mm |
| 比例 | 35:49 ≈ **1:1.4** |
| 像素（300dpi）| 413 × 579px |

## 实现方案

### 1. 修改裁剪组件配置

在 [FamilyTree.vue](file:///e:/code/family-tree-album/frontend/src/views/FamilyTree.vue) 中修改 vue-cropper 配置：

```vue
<vue-cropper
  ref="cropperRef"
  :img="cropperImage"
  :output-size="1"
  :output-type="'jpeg'"
  :info="true"
  :can-scale="true"
  :auto-crop="true"
  :fixed="true"
  :fixed-number="[35, 49]"  <!-- 2寸照片比例 35:49 -->
  :fixed-box="true"
  :center-box="true"
/>
```

### 2. 修改头像显示区域样式

#### 个人卡片头像显示
```css
/* 个人卡片中的头像 */
.member-avatar {
  width: 70px;           /* 基础宽度 */
  height: 98px;          /* 70 * 1.4 = 98，保持2寸比例 */
  border-radius: 4px;    /* 轻微圆角，证件照风格 */
  overflow: hidden;
  object-fit: cover;
}

/* 或者使用比例单位 */
.member-avatar {
  width: 100%;
  aspect-ratio: 35 / 49;  /* CSS 标准比例属性 */
  border-radius: 4px;
  overflow: hidden;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

#### 族谱节点头像显示
```css
/* 族谱树中的头像 */
.node-avatar {
  width: 50px;
  height: 70px;          /* 50 * 1.4 = 70 */
  border-radius: 3px;
  overflow: hidden;
}
```

### 3. 输出尺寸设置

裁剪后的头像保存尺寸建议：
```javascript
// 标准2寸照片像素尺寸（300dpi）
const outputSize = {
  width: 413,
  height: 579
};
```

在 vue-cropper 中设置：
```vue
:output-size="{ width: 413, height: 579 }"
```

## 具体修改文件

### 1. FamilyTree.vue - 裁剪组件配置
找到 vue-cropper 组件，修改比例参数。

### 2. FamilyTree.vue - 头像显示样式
修改个人卡片中的头像显示区域 CSS。

### 3. FamilyNode.vue - 族谱节点头像
修改族谱树中头像的显示比例。

## 备选方案

如果2寸比例在某些场景显示过大，可以提供：

### 小尺寸版本（1寸照片比例）
| 项目 | 尺寸 |
|------|------|
| 比例 | 25:35 = **1:1.4** |
| 像素 | 295 × 413px |

```css
.avatar-small {
  aspect-ratio: 25 / 35;
}
```

## 预期效果

- 裁剪框显示为2寸照片比例（35:49）
- 用户裁剪时就能看到最终效果
- 显示时头像完整，不被裁剪或拉伸
- 符合证件照标准，正式美观
