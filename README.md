# 3D Gaussian Splatting 展馆

基于 Three.js 的程序化高斯泼溅效果展馆。每个效果（物品）独立封装，支持转动展品轮盘切换，切换时粒子散开→聚拢过渡。

## 物品

| 物品 | 图标 | 说明 |
|------|------|------|
| 玫瑰 | 🌹 | 程序化生成的 3D 玫瑰，bud→bloom 绽放动画 |
| Creeper | 💥 | Minecraft Creeper，走路+闪烁→爆炸→重聚循环 |
| J-20 战斗机 | ✈️ | 程序化双发隐身战斗机，带动画姿态控制 |
| Car | 🚗 | 程序化汽车模型，四轮旋转+道路动画 |

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
| 拖动展品轮盘 / 鼠标滚轮 | 旋转并切换效果 |

## 项目结构

```
art/
├── index.html              # 入口
├── styles/
│   └── style.css           # 宇宙主题 + 响应式物品栏
├── scripts/
│   ├── main.js             # 入口：注册物品，启动展馆
│   ├── Gallery.js          # Gallery 引擎：场景/渲染/过渡/展品轮盘
│   ├── Item.js             # Item 基类：buildModel / buildBackground / 生命周期
│   ├── core.js             # Splat 工具：shader、scatterFrom、createSplatMesh
│   ├── bg-utils.js         # 背景共享工具：makeBackground、点云生成
│   └── items/
│       ├── rose.js         # 玫瑰效果
│       ├── creeper.js      # Creeper 效果
│       ├── j20.js          # J-20 战斗机效果
│       └── car.js          # Car 效果 + 运动参数
└── README.md
```

## 添加新物品

1. 在 `scripts/items/` 下创建新文件，继承 `Item` 基类
2. 在 `main.js` 中 `import` 并 `gallery.register()`

物品接口参见 `scripts/items/rose.js` 中的示例。

每个物品是一个继承自 `Item` 的 class，可以声明背景和动画：

```js
import { Item } from '../core.js';
import { makeBackground, createRandom, mix, pushPoint } from '../bg-utils.js';

export class Rose extends Item {
  static id = 'rose';
  static displayName = 'Rose';

  buildBackground(ctx) {
    // 使用 pushPoint、mix 等生成点云...
    return makeBackground(ctx, positions, colors, options);
  }

  buildModel(ctx) {
    // 构建前景 meshes 和 lights...
    return { meshes, lights };
  }

  animate(time, dt) { /* 帧动画逻辑 */ }
  reset()           { /* 重置状态 */ }
}
```

## 技术栈

- [Three.js 0.157](https://threejs.org/) — WebGL 渲染，自定义 GLSL shader
- OrbitControls — 相机交互
- 确定性的 PRNG — 可复现的程序化几何
- 自定义 scatter/gather shader — 粒子过渡动画
