# Beholder VTT

面向 Owlbear Rodeo 的模块化 TRPG 扩展。项目采用 TypeScript + Owlbear SDK，目标是在不替换 Owlbear 房间、地图和场景系统的前提下，逐步整合地图构造、角色、战斗与演出工具。

**当前版本：0.0.3（开发预览）**  
**许可证：GPL-3.0-only**

## 安装

在 Owlbear Rodeo 的扩展管理中添加以下 Manifest 地址：

`https://trayama.github.io/Beholder-VTT/manifest.json`

扩展文件由 GitHub Actions 自动构建并部署到 GitHub Pages。Manifest、后台 HTML、后台 JS 和图标均由同一 GitHub Pages 站点提供；第三方 SDK 依赖仍通过 CDN 加载。当前开发预览从 `develop` 分支部署。

## 参考项目

旧 WallBrush 的可用实现继续作为行为参考：<https://github.com/Trayama/wallbrush>。Beholder VTT 是独立项目，不直接延续旧版 0.3.0 的单文件架构。

## 当前实现

### 阶段 0：工程基础

- 独立 TypeScript 项目，不以旧 WallBrush 0.3.0 代码为基础。
- Owlbear SDK 适配层、模块注册、日志和 GM 权限检查。
- 版本化墙体元数据。
- GitHub Actions 类型检查、自动化测试与 jsDelivr CDN 发布。

### 阶段 1A：墙体同步纵切片

- GM 专用的单段直线拖拽绘制。
- GM 在共享场景中创建隐藏的 `LINE` 源对象，保存墙体几何与属性。
- 每个客户端读取共享源对象，分别创建本地 `WALL` 投影，并通过 `attachedTo` 关联源对象。
- GM 额外获得本地辅助线；辅助线不会同步给玩家。
- 场景变更、投影丢失、重复对象、源对象删除及场景重新加载时执行协调。
- 墙体元数据独立保存 `blocksMovement`、`blocksVision`、`blocksLight` 三项属性。

**墙体与迷雾/光照必须保持分离。** 共享 `LINE` 是墙体几何的权威数据；本地 `WALL` 是各客户端可重建的投影，不把 Fog 或 Light 状态作为墙体数据源。不得为了实现墙体编辑而把墙体逻辑改造成迷雾或光照逻辑。当前版本仅将 `blocksVision` 映射到 Owlbear 原生 `WALL.blocking`；移动阻挡和独立光线阻挡尚未实现。

## 尚未实现

- 连续折线、矩形绘制、墙体选择与移动、节点编辑。
- 端点吸附、自动连接、交叉点与接缝处理。
- 门窗及其墙体锚点。
- 独立的移动碰撞和空间查询接口。
- 动态光照配置与动态迷雾功能。
- 角色、战斗、行动资源追踪器和演出模块。

这些功能按 `docs/ROADMAP.md` 的阶段顺序推进，不把未完成能力标记为已验收。

## 本地开发

要求 Node.js 22 或更新版本。

```bash
npm install
npm run typecheck
npm test
npm run dev
```

`npm run dev` 会构建本地开发版，并在 `http://localhost:5173/manifest.json` 提供 Manifest。将这个完整地址（包含 `http://`）添加到 Owlbear；开发服务器运行期间不要关闭终端。

Windows 用户也可以运行 `start.bat`。

## 测试与验收纪律

自动化测试通过不等于 Owlbear 实际运行验收。墙体阶段必须额外完成真实房间测试：GM/玩家双客户端、创建/修改/删除、重载、重新连接、无重复投影，以及玩家端不可见 GM 辅助线。

当前自动化检查：TypeScript 类型检查通过，8 项单元测试通过。真实 Owlbear 房间的双客户端验收仍待完成。

## 项目结构

```text
src/
├── core/                 # 模块注册、权限、日志
├── platform/             # Owlbear SDK 适配层
├── scene/walls/          # 墙体数据模型、几何与协调器
└── modules/walls/        # 墙体工具
public/                   # Manifest、后台页面与图标
scripts/                  # 构建和本地开发脚本
tests/                    # 自动化测试
docs/                     # 路线图、架构与测试报告
```
