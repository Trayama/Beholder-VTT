## 0.0.14 preview

GM can place shared point lights, edit radius/softness/falloff/cone angles, and set Owlbear scene fog. Wall, door, and window sources remain shared; WALL and LIGHT effects are projected locally on each client.

Known gaps: custom light color/brightness, token-attached lights, independent wall-to-light occlusion, and real Owlbear GM/player acceptance remain open. The complete feature checklist is in docs/ROADMAP.md.

# Beholder VTT

面向 Owlbear Rodeo 的轻量、模块化、规则无关 TRPG 桌面扩展。当前开发重点是地图构造与墙体感知移动。

**当前版本：0.0.14（开发预览）**  
**许可证：GPL-3.0-only**

## 安装

在 Owlbear Rodeo 的扩展管理中添加：

`https://trayama.github.io/Beholder-VTT/manifest.json`

`develop` 分支会构建并部署到 GitHub Pages。

## 当前功能

### 墙体、门与窗

- GM 可绘制直线、折线和矩形墙体，并选择、移动墙组、拖动端点、擦除、撤销和重做。
- 绘制门窗时沿现有墙段放置，墙段会拆分为普通墙与开口；开口和两侧墙段保留同一墙组，编辑时一起移动。
- GM 点击门工具中的门段即可开关门。关门阻挡移动、视野和光线；开门后移除这三种阻挡。
- 窗户默认透过视野和光线，同时阻挡移动。
- 墙体独立保存移动、视野和光线阻挡属性。GM 辅助线按墙、门、窗使用不同颜色。

### Owlbear 原生 Move 集成

- Beholder 将墙体感知模式注册到 Owlbear 官方 Move 工具，不添加第二个独立移动工具。
- CHARACTER 和 MOUNT Token 在拖动时实时受墙体限制，不需要 Token 拥有 Light。
- 普通物件仍使用 Owlbear 原生拖动；旋转和缩放手柄临时切回原生模式。
- GM 客户端保留移动纠正，作为其他移动方式绕过实时碰撞时的安全网。

### 数据与控制

- 共享隐藏 LINE 保存墙体的唯一权威几何；每个客户端按视野属性重建本地 WALL 投影。
- GM 辅助线和 WALL 投影均为本地对象，不会同步给其他客户端。
- 左上角控制面板管理全局开关和状态；右侧墙体工具负责地图编辑。

## 关键架构边界

共享 LINE 是墙体数据源。本地 WALL 仅提供 Owlbear 的视野遮挡。Owlbear 原生 WALL 会把棋子移动与光线碰撞耦合，因此 Beholder 保持本地 WALL 的原生 blocking 关闭，并由自己的移动适配器读取共享 LINE。墙体数据对客户端可见，隐藏显示不代表保密。

## 尚未完成

- 真实 Owlbear 房间中的 GM/玩家双客户端验收，尤其是官方 Move 模式切换、Token 无穿墙、多选组、普通物件拖动、旋转缩放、重连和场景重载。
- 端点自动连接、墙体交叉和接缝的完整拓扑处理。
- 独立光线遮挡适配器、动态光照和动态迷雾。
- 路径预览、绕墙寻路、距离与范围指示器、区域触发。
- Actor、角色卡、自定义动作、骰子、行动资源追踪器、HP 与状态模块。
- 对话、日志、音乐、SVG 转场、天气和规则模板。

自动化检查通过不等于真实房间验收通过；未完成真实环境测试的功能仍标记为预览。

## 本地开发

需要 Node.js 22 或更新版本。

```bash
npm install
npm run check
npm run dev
```

`npm run dev` 会在 `http://localhost:5173/manifest.json` 提供本地 Manifest。

## 测试

`npm run check` 执行类型检查、构建和单元测试。每个地图功能还需要在真实 Owlbear 房间完成 GM/玩家双客户端测试后，才能作为已验收功能发布。
