# 3D Gaussian Splatting 展馆

基于 Three.js 的程序化高斯泼溅效果展馆。每个效果（物品）独立封装，支持点击物品栏切换，切换时粒子散开→聚拢过渡。

## 物品

| 物品 | 图标 | 说明 |
|------|------|------|
| 玫瑰 | 🌹 | 程序化生成的 3D 玫瑰，bud→bloom 绽放动画 |
| 克莱因瓶 | ♾️ | 程序化生成的 Klein bottle 曲面，缓慢旋转 |

## 操作

| 按键 | 功能 |
|------|------|
| `Space` | 重播当前物品动画 |
| `R` | 重置相机视角 |
| `F` | 正面视角 |
| `T` | 俯视视角 |
| `A` | 切换自动旋转 |
| 鼠标拖动 | 旋转视角 |
| 滚轮 | 缩放 |
| 点击物品栏 | 切换效果 |

## 项目结构

```
art/
├── index.html              # 入口
├── styles/
│   └── style.css           # 宇宙主题 + 响应式物品栏
├── scripts/
│   ├── main.js             # 入口：注册物品，启动展馆
│   ├── core.js             # Gallery 类：场景/渲染/Shader/过渡/物品管理
│   └── items/
│       ├── rose.js         # 玫瑰效果
│       └── klein.js        # 克莱因瓶效果
└── README.md
```

## 添加新物品

1. 在 `scripts/items/` 下创建新文件，实现标准接口
2. 在 `main.js` 中 `import` 并 `gallery.register()`

物品接口参见 `scripts/items/rose.js` 中的示例。

## 技术栈

- [Three.js 0.157](https://threejs.org/) — WebGL 渲染，自定义 GLSL shader
- OrbitControls — 相机交互
- 确定性的 PRNG — 可复现的程序化几何
- 自定义 scatter/gather shader — 粒子过渡动画
