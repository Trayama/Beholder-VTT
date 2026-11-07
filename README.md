# Beholder VTT

面向 Owlbear Rodeo 的轻量化、模块化、规则无关 TRPG 桌面增强扩展。它不替换 Owlbear 的房间、地图和场景系统，而是在其上提供地图构造、角色、战斗与演出模块。

**当前版本：0.0.7（开发预览）**  
**许可证：GPL-3.0-only**

## 安装

在 Owlbear Rodeo 的扩展管理中添加：

`https://trayama.github.io/Beholder-VTT/manifest.json`

由 GitHub Actions 自动构建并部署到 GitHub Pages。当前开发预览从 `develop` 分支部署。

## 0.0.7 当前功能

### 左上角总控面板

- 统一查看场景状态、墙体数量和棋子数量。
- 显示 / 隐藏右侧墙体编辑工具。
- 直接切换自由绘制 / 网格吸附。
- 开关端点吸附与 GM 本地辅助线。
- 编辑选中墙体属性、撤销、重做和二次确认清空。
- 正常操作不发送通知；状态反馈显示在控制台内。

### 右侧地图工具

- 选择 / 移动 / 编辑节点。
- 直线绘制。
- 连续折线绘制。
- 矩形房间绘制。
- 整条墙体橡皮擦。
- 自由定位为默认方式；可切换网格吸附。绘制时按住 Ctrl / Cmd 可临时绕过网格。
- 端点吸附独立于网格吸附。
- 新增「Beholder VTT · 墙体感知移动」工具，GM 与玩家均可使用。

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

### 移动阻挡

- 角色 Token 按 Owlbear 的 IMAGE + CHARACTER / MOUNT 图层识别。
- 是否附着 Light、Token 由 GM 还是玩家创建，都不影响移动阻挡。
- 使用右侧「Beholder VTT · 墙体感知移动」工具时，客户端通过 Owlbear Interaction API 实时预览和更新移动位置，并在每次拖动更新时计算移动碰撞。
- 使用 Owlbear 原生 Select 等其他工具移动时，GM 客户端保留提交后纠正机制作为兜底，可能出现短暂回弹。
- 普通 PROP / DRAWING 图像不纳入角色 Token 碰撞，继续保留原生移动方式。
- 这是直线移动碰撞，不是绕墙寻路；端点、狭窄通道、多墙角和快速拖动仍需真实房间验收。

`blocksVision` 由本地 WALL 投影处理。 `blocksLight` 目前只独立保存，尚未接入动态光照适配器。

## 旧版 WallBrush

Beholder VTT 已取代旧版 WallBrush 的工具入口。若 Owlbear 中仍同时启用了旧版 WallBrush，可能出现重复工具、重复操作和额外通知。请在扩展管理中停用旧版 WallBrush，只保留 Beholder VTT。

旧版源码仅作为实现参考：<https://github.com/Trayama/wallbrush>。

## 尚未完成

- 端点吸附的连接拓扑、交叉点和接缝处理。
- 门窗及其墙体锚点、开关状态。
- 独立光线遮挡适配器。
- 动态光照配置与动态迷雾功能。
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

`npm run dev` 会在 `http://localhost:5173/manifest.json` 提供本地 Manifest。将完整地址（包含 `http://`）添加到 Owlbear；开发服务器运行期间不要关闭终端。

Windows 用户也可以运行 `start.bat`。

## 测试与验收纪律

自动化构建成功不等于真实 Owlbear 功能完成。地图阶段必须验证 GM / 玩家双客户端、连续墙体创建和编辑、投影同步、玩家端辅助线隔离、移动阻挡、地图重载、插件重启和多客户端同时移动。

未经真实房间验收的功能不得标记为最终完成。
