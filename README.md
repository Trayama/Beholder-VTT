# Beholder VTT

面向 Owlbear Rodeo 的轻量化、模块化、规则无关 TRPG 桌面增强扩展。它不替换 Owlbear 的房间、地图和场景系统，而是在其上提供地图构造、角色、战斗与演出模块。

**当前版本：0.0.8（开发预览）**  
**许可证：GPL-3.0-only**

## 安装

在 Owlbear Rodeo 的扩展管理中添加：

`https://trayama.github.io/Beholder-VTT/manifest.json`

由 GitHub Actions 自动构建并部署到 GitHub Pages。当前开发预览从 `develop` 分支部署。

## 0.0.8 当前功能

### 原生选择工具集成（实验）

- Beholder 可将墙体感知移动模式绑定到 Owlbear 原生 Select 工具。
- 如果当前活动工具 ID 以 `/select` 结尾，会尝试自动识别。
- 未自动识别时，在 Beholder 控制台中先选中 Owlbear 原生 Select，再点击「绑定当前工具为选择工具」。
- 绑定只保存在当前客户端本地；GM 和每位玩家需要分别绑定。
- CHARACTER / MOUNT Token 普通拖动使用实时墙体碰撞。
- 多选组移动以所有角色 Token 中最先碰到墙体的对象作为整组移动限制；选中的其他对象随组移动。
- 空白区域框选、非角色对象拖动和 Token 旋转 / 缩放会临时委托给 Owlbear 原生交互模式。
- 原来的独立「墙体感知移动」工具仍保留为回退方案。此集成尚未完成真实房间验收。

### 左上角总控面板

- 统一查看场景状态、墙体数量和棋子数量。
- 显示 / 隐藏右侧墙体编辑工具。
- 自由绘制 / 网格吸附、端点吸附与辅助线设置。
- 墙体属性、撤销、重做和二次确认清空。
- 显示当前 Owlbear 工具 ID，并可绑定或解除本地原生选择工具。

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

- 原生 Select 集成的真实 GM / 玩家双客户端验收，尤其是原生选择、框选、变换手柄和多选组移动。
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

自动化构建成功不等于真实 Owlbear 功能完成。地图阶段必须验证 GM / 玩家双客户端、墙体投影同步、玩家端辅助线隔离、原生选择工具接管、Token 无光源移动阻挡、多选组移动、框选、旋转缩放、地图重载、重连和插件重启。

未经真实房间验收的功能不得标记为最终完成。
