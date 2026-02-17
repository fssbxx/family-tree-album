# 抽屉页面文字放大方案

## 问题描述
抽屉页面的文字有点小，需要稍微放大一点。

## 当前样式分析

抽屉中的文字主要包括：
1. **标题**：个人信息（h3 标签）
2. **标签文字**：姓名、性别、出生日期等
3. **输入框文字**：表单输入内容
4. **按钮文字**：上传、保存等
5. **相册标签**：个人相册、家庭相册

## 解决方案

### 方案一：统一放大抽屉内所有文字（推荐）

在抽屉容器上设置基础字体大小，所有子元素继承：

```css
.detail-content {
  font-size: 15px;  /* 从默认 14px 放大到 15px */
}

.detail-header h3 {
  font-size: 20px;  /* 标题从默认 18px 放大到 20px */
}
```

### 方案二：分别调整各类文字大小

针对不同元素分别设置：

```css
/* 标题 */
.detail-header h3 {
  font-size: 20px;
}

/* 标签 */
.compact-form label {
  font-size: 15px;
}

/* 输入框 */
.compact-form .el-input {
  font-size: 15px;
}

/* 按钮 */
.detail-content .el-button {
  font-size: 14px;
}

/* 相册标签 */
.photo-tabs {
  font-size: 15px;
}
```

### 方案三：使用 Element Plus 的 size 属性

修改 Element Plus 组件的 size 属性：
- `size="small"` → `size="default"` 或 `size="large"`

## 推荐方案

**推荐方案一（统一放大）**，原因：
1. 简单直接，一次修改全局生效
2. 保持文字比例协调
3. 维护方便

## 实现计划

### 1. 修改 FamilyTree.vue 样式

找到抽屉内容区域的 CSS 样式，调整字体大小：

```css
/* 抽屉内容区域基础字体 */
.detail-content {
  font-size: 15px;
}

/* 标题放大 */
.detail-header h3 {
  font-size: 20px;
}
```

### 2. 调整表单标签

```css
.compact-form label {
  font-size: 15px;
}
```

### 3. 调整相册区域

```css
.photos-section .photo-tabs {
  font-size: 15px;
}
```

## 具体修改

### 文件：FamilyTree.vue

在样式区域添加/修改：

```css
.detail-content {
  font-size: 15px;
}

.detail-header h3 {
  font-size: 20px;
  font-weight: 600;
}

.compact-form label {
  font-size: 15px;
}
```

## 预期效果

- 抽屉内所有文字稍微放大
- 标题更醒目
- 表单标签更易读
- 整体视觉效果更舒适
