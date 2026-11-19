export const variants = [
  { id: 'apricot', title: '陶橘', english: 'Apricot', shell: '#b16d4e', key: '#f5e9db', darkKey: '#dcc3aa', accent: '#294ad3', paper: '#eee2d4', price: 899, intro: '温润的陶橘外壳，配一抹电光蓝。' },
  { id: 'mist', title: '雾蓝', english: 'Glacier', shell: '#8e9fb8', key: '#f0f1ef', darkKey: '#cbd6ec', accent: '#676eea', paper: '#e7eaf7', price: 949, intro: '银蓝色外壳，搭配低饱和蓝紫键帽。' },
  { id: 'eclipse', title: '夜影', english: 'Eclipse', shell: '#252b3b', key: '#393e4d', darkKey: '#232936', accent: '#dafa55', paper: '#222637', price: 999, intro: '墨色金属壳体，荧光黄点亮常用键。' },
] as const

export type Variant = typeof variants[number]
export type VariantId = Variant['id']
export const angles = [
  { id: 'angle', name: '整机' },
  { id: 'top', name: '俯视' },
  { id: 'dial', name: '旋钮近景' },
  { id: 'side', name: '侧面' },
] as const
export type Angle = typeof angles[number]['id']
export const asset = (id: VariantId, view: Angle = 'angle') => `${import.meta.env.BASE_URL}products/${id}-${view}.webp`

export const products = {
  apricot: { name: 'K75 · 陶橘', price: 899, variant: 'apricot', tone: '#b16d4e' },
  mist: { name: 'K75 · 雾蓝', price: 949, variant: 'mist', tone: '#8e9fb8' },
  eclipse: { name: 'K75 · 夜影', price: 999, variant: 'eclipse', tone: '#252b3b' },
  caps: { name: 'PBT 键帽套装', price: 179, variant: null, tone: '#6777e1' },
  rest: { name: '胡桃木腕托', price: 129, variant: null, tone: '#995e42' },
} as const
export type ProductId = keyof typeof products
export type Basket = Partial<Record<ProductId, number>>
export const quantity = (basket: Basket) => Object.values(basket).reduce((sum, count) => sum + count, 0)
export const subtotal = (basket: Basket) => (Object.keys(basket) as ProductId[]).reduce((sum, key) => sum + (basket[key] ?? 0) * products[key].price, 0)

export const features = [
  { title: '柔性悬挂', intro: '缓和触底的冲击，长时间输入更从容。', icon: 'layers', detail: '定位板通过弹性垫片与外壳接触。按键触底时，垫片吸收一部分冲击。' },
  { title: '热插拔轴座', intro: '从顺滑到有段落，换一颗轴就能比较。', icon: 'chip', detail: '断开键盘电源后可替换兼容轴体。想比较手感时，先试一颗常用键。' },
  { title: '三种连接', intro: '有线、无线和蓝牙，切换手边的设备。', icon: 'radio', detail: '桌面优先用有线或无线接收器。需要连接其他设备时可以切换到蓝牙。' },
] as const

export const questions = [
  ['可以更换轴体吗？', 'K75 的示意配置使用兼容三脚和五脚轴体的热插拔轴座。可先在「比较轴体」里看三种手感的区别。'],
  ['兼容哪些系统？', '设计示例支持常用桌面系统的基础键位。详情里的「规格」提供演示参数。'],
  ['三种配色有什么区别？', '陶橘、雾蓝、夜影使用同一布局与外壳结构。壳体、键帽与旋钮的配色各不相同。'],
  ['购物袋里的订单会提交到哪里？', '所有金额、配送选项与订单都只在当前演示页内生效。填写示例邮箱即可体验表单反馈。'],
]

export const chapters = [
  { title: '首屏', first: 1, last: 4 },
  { title: '指针', first: 5, last: 7 },
  { title: '卖点卡片', first: 8, last: 10 },
  { title: '选版本', first: 11, last: 12 },
  { title: '看详情', first: 13, last: 15 },
  { title: '加入购物袋', first: 16, last: 21 },
  { title: '常见问题和结算', first: 22, last: 26 },
]

const entry = (title: string, english: string, time: string, target: string, instruction: string, brief: string) =>
  ({ title, english, time, target, instruction, brief })

export const effects = [
  entry('悬停', 'Hover', '00:37', 'nav-keyboard', '移入「键盘」再移出，也可试「查看参数」。', '导航下划线从左边长出，离开时向右边收走。参数链接的字从下面换上来，箭头轻推。'),
  entry('下拉菜单', 'Dropdown', '00:58', 'caps-trigger', '悬停或点「键帽」，选一种配色。', '面板从导航下展开，选项依次上移淡入。选中、按 Esc 或点击外部时收起。'),
  entry('磁吸按钮', 'Magnetic button', '01:11', 'magnetic', '沿按钮外侧接近，滑过再迅速离开。', '指针还没碰到按钮时就吸引按钮。内层字位移多一点，离开用弹簧回到原位。'),
  entry('跟随鼠标转动', 'Mouse-follow rotation', '01:24', 'hero-product', '在键盘两侧移动鼠标，或拖动键盘。', '用真实三维模型做俯仰与偏航，让整个产品朝指针转动，松开后逐渐回正。'),
  entry('自定义光标', 'Custom cursor', '01:36', 'feature-cards', '在空白、按钮、卖点卡片间移来移去。', '用即时小点和滞后空心圆替换指针。按钮处扩圈，卡片上变成写着「了解」的实心圆。'),
  entry('指针响应背景', 'Pointer-reactive background', '01:54', 'paper-field', '在首屏浅色点阵上缓慢画圈。', '让指针附近的各个点向外推开、变蓝，离开后逐个弹回，各点都有自己的位移。'),
  entry('光标拖尾', 'Cursor trail', '02:06', 'afterglow', '在暗底上快速画弧，再停住。', '按指针走过的真实路径画一条荧光尾迹，头亮尾细，停止后由尾部逐渐收尽。'),
  entry('倾斜卡片', 'Tilt card', '02:24', 'feature-cards', '对比卡片右上与左下两个角。', '指针所在角向下压，表面反光跟着移动。离开平顺回正，触屏可点按查看。'),
  entry('悬停显现', 'Hover reveal', '02:36', 'feature-cards', '分别从左、右两边划入同一张卡。', '从指针进入的真实位置扩出色块。文字同时转白，隐藏图标与辅助信息显现。'),
  entry('提示气泡', 'Tooltip', '02:51', 'travel-tip', '移入、聚焦或点按「键程」。', '在术语上方弹出简短解释，小三角指向术语。Esc 关闭，手机点按也可读。'),
  entry('光标聚光灯', 'Cursor spotlight', '03:10', 'edition-cards', '在版本卡的中央和边缘游走。', '柔光跟着指针，光内显示点阵。沿用相同坐标点亮指针附近的边框。'),
  entry('共享元素转场', 'Shared element transition', '03:21', 'edition-cards', '点开版本卡，再点右上角关闭。', '让卡片铺满视窗，原卡的商品图和名称平移、放大至详情位置，退出时沿原路回到卡片。'),
  entry('轮播', 'Carousel', '03:43', 'gallery', '拖动键盘图，或点箭头、圆点。', '四张不同角度随手指滑动，松手吸附到下一张或回弹，圆点同步更新。'),
  entry('标签切换', 'Tabs', '03:57', 'product-tabs', '按「规格 → 手感 → 包装清单」。', '选中指示线水平滑至新标签。内容从所选方向滑入，Tab 与方向键可操作。'),
  entry('图标形变', 'Icon morphing', '04:08', 'sound-button', '播放再暂停，接着点一次空心心形。', '把三角形的顶点连续变换成两根竖线。收藏心形先缩再弹，填色时散开小粒子。'),
  entry('点击涟漪', 'Ripple', '04:28', 'add-product', '轮流点按钮左右两侧，观察波纹起点。', '按下按钮轻压，从实际点击坐标扩大圆形波纹，波纹在按钮边界内淡出。'),
  entry('成功反馈', 'Success feedback', '04:38', 'add-product', '加入商品，等旋转结束看对勾。', '先显示短暂旋转，商品加入后画出对勾并换「已加入」，用图形和文字说明结果。'),
  entry('数字滚动', 'Number rolling', '04:44', 'detail-bag', '加入后看右上角件数，再在袋内增减。', '像机械计数器一样逐位滚动。只有发生变化的数字进入下一格，合计金额也滚动。'),
  entry('轻提示', 'Toast', '04:51', 'add-product', '加入购物袋后留意右上方，等进度线走完。', '浮层带商品缩略图、明确结果与查看按钮，从右侧进入，底部倒计时结束后收走。'),
  entry('抽屉', 'Drawer', '05:02', 'shop-bag', '点购物袋，点背景或按 Esc 收回。', '购物袋面板由右侧滑出，背景逐渐变暗，关闭时向右退出，焦点回到原按钮。'),
  entry('布局过渡', 'Layout animation', '05:11', 'cart-list', '在购物袋加配件、改数量，再删除一件。', '增减商品时用前后坐标让余下商品平滑换位，配件与总价保持联动。'),
  entry('折叠展开', 'Accordion', '05:30', 'faq', '依次展开两个问题，观察上一个如何关闭。', '问题展开到实际高度，图标从加号变为减号，打开下一项时前一项同时合起。'),
  entry('骨架屏', 'Skeleton screen', '05:47', 'load-reviews', '点「加载更多」，先看光扫过空卡。', '用与内容同尺寸的占位卡展示加载状态，光扫过之后用真正加载的条目替换。'),
  entry('弹窗', 'Modal', '05:59', 'switch-compare', '点「比较轴体」，再点背景或按 Esc。', '对比表从中心缩放进入，背景变暗并柔焦，键盘焦点留在弹窗。'),
  entry('错误反馈', 'Error feedback', '06:07', 'newsletter', '输入 demo@ 点订阅，再改成 demo@example.com。', '格式无效时输入框轻微横抖，下面保留可读的红字。改对后显示对勾与成功信息。'),
  entry('页面转场', 'Page transition', '06:23', 'checkout-start', '购物袋内点「去结算」，也可以从结算返回。', '蓝幕从底部弧形升起，品牌字母依次浮现。换好页面后幕布继续向上扫出。'),
].map((item, index) => ({ ...item, id: index + 1 }))

export const reference = 'https://www.douyin.com/video/7709126118539873587'
