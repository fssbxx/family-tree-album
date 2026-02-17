# 相册照片显示优化方案

## 问题描述
相册中显示的照片都不是原来的尺寸比例，需要优化显示方式。

## 问题分析

### 当前问题
1. **固定尺寸容器**：照片被强制放入固定尺寸的容器中
2. **object-fit: cover**：使用 cover 会导致照片被裁剪，显示不全
3. **object-fit: contain**：使用 contain 会导致照片周围出现空白
4. **不同比例的照片**：横版、竖版、方形的照片混在一起，难以统一显示

## 解决方案对比

### 方案一：瀑布流布局（Masonry Layout）⭐推荐

**思路**：像 Pinterest 那样，根据照片原始比例动态排列，不同高度的照片错落有致。

**优点**：
- 保持照片原始比例，不裁剪不拉伸
- 视觉效果好，空间利用率高
- 适合照片墙展示

**缺点**：
- 实现稍复杂
- 需要计算布局

**实现方式**：
- 使用 CSS columns 或 flexbox
- 或使用现成的库如 `vue-masonry`

```css
.masonry-layout {
  column-count: 3;
  column-gap: 16px;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 16px;
}

.masonry-item img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}
```

### 方案二：统一卡片高度 + 背景填充

**思路**：所有照片卡片高度统一，照片按比例缩放，超出部分用模糊背景填充。

**优点**：
- 布局整齐
- 保持照片比例
- 视觉效果好

**缺点**：
- 照片显示区域变小
- 边缘有模糊背景

**实现方式**：
```css
.photo-card {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 8px;
}

.photo-card .bg-blur {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  filter: blur(20px);
  opacity: 0.5;
}

.photo-card img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

### 方案三：网格布局 + 点击放大

**思路**：使用统一尺寸的网格显示缩略图（裁剪为正方形），点击后查看原图。

**优点**：
- 布局整齐划一
- 加载速度快（缩略图小）
- 查看原图时比例正确

**缺点**：
- 缩略图可能被裁剪
- 需要两步操作查看完整照片

**实现方式**：
```css
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.photo-thumb {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### 方案四：横向滚动 + 原始比例

**思路**：每张照片保持原始比例，横向排列，超出容器可滚动。

**优点**：
- 保持原始比例
- 适合浏览长图

**缺点**：
- 需要横向滚动
- 空间利用率低

### 方案五：智能分类显示

**思路**：根据照片方向（横版/竖版）分组显示。

**实现**：
- 横版照片：一行显示2张
- 竖版照片：一行显示3张
- 方形照片：一行显示4张

## 推荐方案

**推荐方案一（瀑布流布局）**，原因：
1. **最佳视觉效果**：错落有致，有照片墙的感觉
2. **保持原比例**：照片不被裁剪或拉伸
3. **空间利用率高**：不同高度的照片紧密排列
4. **用户体验好**：一眼能看到所有照片

## 实现计划

### 1. 修改相册组件
在 [FamilyTree.vue](file:///e:/code/family-tree-album/frontend/src/views/FamilyTree.vue) 中找到相册显示部分：
- 将固定高度的网格改为瀑布流布局
- 使用 CSS columns 实现

### 2. 添加点击放大功能
- 点击照片后全屏显示原图
- 支持左右切换浏览
- 显示照片信息（文件名、尺寸等）

### 3. 优化加载
- 照片懒加载
- 显示加载占位图

### 4. 响应式适配
- 移动端：2列
- 平板：3列
- 桌面：4列

## 代码示例

### 瀑布流布局实现
```vue
<template>
  <div class="masonry-gallery">
    <div 
      v-for="(photo, index) in photos" 
      :key="photo.filename"
      class="masonry-item"
      @click="openPreview(index)"
    >
      <img :src="`/photos/${photo.path}`" :alt="photo.filename" loading="lazy" />
    </div>
  </div>
</template>

<style scoped>
.masonry-gallery {
  column-count: 3;
  column-gap: 12px;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 12px;
  cursor: pointer;
  transition: transform 0.2s;
}

.masonry-item:hover {
  transform: scale(1.02);
}

.masonry-item img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .masonry-gallery {
    column-count: 2;
  }
}

@media (min-width: 1200px) {
  .masonry-gallery {
    column-count: 4;
  }
}
</style>
```

## 备选方案

如果瀑布流实现复杂，可以先用**方案二（统一卡片高度 + 背景填充）**，这样也能保持照片比例，同时布局整齐。

## 预期效果

- 照片保持原始比例显示
- 不同尺寸的照片错落有致
- 点击可查看大图
- 响应式适配不同屏幕
