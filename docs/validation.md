# 实测记录 · 2026-11-19

生产构建在本机桌面浏览器运行。每项从实际控件触发，核对过程状态和最终结果，另检查索引、复制说明、390px 模拟触控布局及减少动画。

| 浏览器 | 交互结果 |
|---|---|
| Chrome 正式版 | [28/28](../evidence/check-chrome.json) |
| Edge 正式版 | [28/28](../evidence/check-edge.json) |
| Playwright WebKit | [28/28](../evidence/check-webkit.json) |

专项包含磁吸中心之外的位移、对角旋转的符号、按键图标中间顶点、动态 Canvas 像素、共享卡片展开与回程的矩形位置、点击波纹的实际起点、滚轮动画、购物袋增删后的坐标与金额、蓝幕与品牌字符错开以及实际路由变化。

[首屏](../evidence/hero.png) · [聚光灯](../evidence/spotlight.png) · [详情](../evidence/detail.png) · [提示](../evidence/toast.png) · [抽屉](../evidence/bag.png) · [结算过场](../evidence/curtain.png) · [术语索引](../evidence/index.png) · [窄屏](../evidence/mobile.png)

本次验证使用桌面无头模式和模拟触控，3D 由浏览器软件渲染。原片比较依据为分段取样，真人主观观感、独立手机或 Safari 真机表现未测。
