# Beholder VTT

面向 Owlbear Rodeo 的轻量化、模块化、规则无关 TRPG 桌面增强扩展。它不替换 Owlbear 的房间、地图和场景系统，而是在其上提供地图构造、角色、战斗与演出模块。

**当前版本：0.0.10（开发预览）**  
**许可证：GPL-3.0-only**

## 安装

在 Owlbear Rodeo 的扩展管理中添加：

`https://trayama.github.io/Beholder-VTT/manifest.json`

由 GitHub Actions 自动构建并部署到 GitHub Pages。当前开发预览从 `develop` 分支部署。

## 0.0.10 当前功能

### Beholder 选择与移动

- 独立的 Beholder Select + Move 工具作为日常选择与移动入口。
- 开启总设置中的「接管原生 Move」后，Beholder 将墙体感知 Tool Mode 挂载到 Owlbear 官方 Move；官方工具入口和位置保持不变。
- CHARACTER / MOUNT Token 拖动使用实时墙体碰撞；不要求 Token 拥有 Light。
- 多选组移动：选中的多个对象整体移动；组内任意角色 Token 碰到移动阻挡墙时，整组移动受到限制。
- 空白区域拖动执行框选。
- 道具、地图和绘图对象的拖动交还给 Owlbear 默认拖动行为。
- 移动工具的多选组移动设置位于独立悬浮窗。
- GM 客户端保留权威移动纠正作为安全网，防止其他工具绕过实时碰撞。

原生 Move 接管采用 SDK Tool Mode：角色 Token / MOUNT 的拖动由 Beholder 实时碰撞算法处理；普通对象、空白区域框选以及旋转 / 缩放手柄切换到原生委托模式。关闭接管时，官方 Move 保持原生行为。Beholder 独立移动工具继续保留，作为回退入口。该集成需要在真实 Owlbear 房间中完成 GM / 玩家双客户端验收。

### 总设置与功能悬浮窗

左上角 Beholder 面板只负责全局设置、模块状态和场景状态：

- 接管 Owlbear 原生 Move。
- 显示 / 隐藏 GM 墙体编辑工具栏。
- 当前场景、角色身份、墙体数量和 Token 数量。
- 模块状态概览。

具体功能设置由各模块自己的 Popover 管理，不堆入总设置：

- 墙体工具设置：自由绘制 / 网格吸附、端点吸附、GM 辅助线、撤销 / 重做、墙体清理和属性编辑。
- 移动工具设置：多选 Token 整组移动。

### 右侧地图工具

- 选择 / 编辑节点、直线、连续折线、矩形、橡皮擦。
- 自由定位为默认方式；可切换网格吸附。绘制时按住 Ctrl / Cmd 可临时绕过网格。
- 端点吸附独立于网格吸附。

### 墙体与空间数据

- GM 在共享场景中创建隐藏的 `LINE` 源对象，保存权威墙体几何与版本化属性。
- 连续墙体由共享 `wallId` 关联的多个线段组成，并保存分段索引。
- 每个客户端读取共享源对象，分别创建本地 `WALL` 投影，并通过 `attachedTo` 关联共享源对象。
- GM 额外获得本地辅助线；辅助线不会同步给玩家。
- 场景变化、投影丢失、重复对象、源对象删除及场景重新加载时执行协调。
- 墙体元数据独立保存 `blocksMovement`、`blocksVision`、`blocksLight` 三项属性。

## 墙体、迷雾与光照的边界

共享 `LINE` 是墙体几何的唯一权威数据。本地 `WALL` 只是可重建的视野投影；Fog 或 Light 不拥有墙体数据，也不负责墙体编辑生命周期。

Owlbear 原生 `WALL.blocking` 同时影响 Token 与 Light 的碰撞，因此 Beholder 不用它实现独立移动阻挡。本地 WALL 投影保持原生 blocking 关闭；移动阻挡只读取共享 LINE 数据。

## 旧版 WallBrush

Beholder VTT 已取代旧版 WallBrush 的工具入口。若 Owlbear 中仍同时启用了旧版 WallBrush，可能出现重复工具、重复操作和额外通知。请在扩展管理中停用旧版 WallBrush。

旧版源码仅作为实现参考：<https://github.com/Trayama/wallbrush>。

## 尚未完成

- 原生 Move Tool Mode 接管已实现代码路径，仍需真实房间验证原生模式切换时序、普通对象委托和变换手柄。
- Token 旋转 / 缩放与 Beholder 实时移动工具的统一交互仍需真实房间验收。
- Beholder 独立移动工具的框选目前使用边界框相交判定；原生 Move 接管模式将空白框选委托给 Owlbear。
- 端点吸附的连接拓扑、交叉点和接缝处理。
- 门窗及其墙体锚点、开关状态。
- 独立光线遮挡适配器、动态光照与动态迷雾。
- 移动路径预览、绕墙寻路、范围指示器和区域触发。
- Actor、角色卡、动作、骰子、行动资源追踪器和演出模块。

## 本地开发

要求 Node.js 22 或更新版本。

```bash
npm install
npm run typecheck
npm test
npm run dev
```

`npm run dev` 会在 `http://localhost:5173/manifest.json` 提供本地 Manifest。将完整地址添加到 Owlbear；开发服务器运行期间不要关闭终端。

## 测试与验收纪律

自动化构建成功不等于真实 Owlbear 功能完成。地图阶段必须验证 GM / 玩家双客户端、墙体投影同步、玩家端辅助线隔离、Beholder 选择与移动、Token 无光源移动阻挡、多选组移动、框选、普通道具移动、原生工具接管、场景重载、重连和插件重启。

未经真实房间验收的功能不得标记为最终完成。
