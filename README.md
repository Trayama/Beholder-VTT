# Beholder VTT

面向 Owlbear Rodeo 的模块化 TRPG 扩展。项目采用 TypeScript + Owlbear SDK，在不替换 Owlbear 房间、地图和场景系统的前提下，逐步整合地图构造、角色、战斗与演出工具。

**当前版本：0.0.4（开发预览）**  
**许可证：GPL-3.0-only**

## 安装

在 Owlbear Rodeo 的扩展管理中添加以下 Manifest 地址：

`https://trayama.github.io/Beholder-VTT/manifest.json`

扩展由 GitHub Actions 自动构建并部署到 GitHub Pages。Manifest、后台脚本、总控面板、墙体属性面板和图标均由同一 GitHub Pages 站点提供；第三方 SDK 依赖仍通过 CDN 加载。当前开发预览从 `develop` 分支部署。

## 参考项目

旧 WallBrush 的可用实现继续作为行为参考：<https://github.com/Trayama/wallbrush>。Beholder VTT 是独立项目，不直接延续旧版 0.3.0 的单文件架构。

## 当前实现

### 总控界面

- Owlbear 左上角始终提供 Beholder VTT 总控入口。
- 总控面板可以独立控制右侧地图工具的显示/隐藏。
- GM 可以控制本地辅助线和网格吸附。
- 这些显示偏好保存在当前客户端本地，不写入共享场景。

### 墙体编辑器

- 直线拖动绘制。
- 连续折线绘制，支持完成和取消。
- 矩形墙体绘制。
- 选择整条墙体并移动。
- 拖动墙体端点编辑节点；连续墙体的相邻端点随节点一起更新。
- 橡皮擦按整条连续墙体删除。
- 墙体属性面板可分别保存移动、视野和光线阻挡标记。
- 网格吸附、GM 辅助线显示/隐藏、撤销、重做和二次确认清空。

### 墙体与空间数据

- GM 在共享场景中创建隐藏的 `LINE` 源对象，保存权威墙体几何与版本化属性。
- 连续墙体由共享 `wallId` 关联的多个线段组成，并保存分段索引。
- 每个客户端读取共享源对象，分别创建本地 `WALL` 投影，并通过 `attachedTo` 关联源对象。
- GM 额外获得本地辅助线；辅助线不会同步给玩家。
- 场景变化、投影丢失、重复对象、源对象删除及场景重新加载时执行协调。
- 墙体元数据独立保存 `blocksMovement`、`blocksVision`、`blocksLight` 三项属性。

**墙体与迷雾/光照保持分离。** 共享 `LINE` 是墙体几何的权威数据；本地 `WALL` 是各客户端可重建的投影，不把 Fog 或 Light 状态作为墙体数据源。当前只有 `blocksVision` 映射到 Owlbear 原生 `WALL.blocking`；移动碰撞和独立光线阻挡适配器仍未实现。墙体属性面板会保存这两项数据，供后续空间与光照模块接入。

## 尚未实现

- 端点吸附、自动连接、交叉点与接缝处理。
- 门窗及其墙体锚点、门状态。
- 独立移动碰撞、路径查询和空间查询接口。
- 动态光照配置与动态迷雾功能。
- 角色、战斗、行动资源追踪器和演出模块。

这些功能按 `docs/ROADMAP.md` 的阶段顺序推进。0.0.4 的自动化构建通过不等于墙体编辑器已经完成真实房间验收。

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

自动化测试通过不等于 Owlbear 实际运行验收。墙体阶段必须额外完成真实房间测试：GM/玩家双客户端、连续墙体创建/修改/删除、撤销/重做、重载、重新连接、无重复投影，以及玩家端不可见 GM 辅助线。

0.0.4 的 GitHub Actions 类型检查、构建、现有单元测试和 Pages 部署均通过。真实 Owlbear 房间的交互、多客户端和持久化验收仍待完成。

## 项目结构

```text
src/
├── core/                 # 模块注册、权限、日志、本地偏好
├── platform/             # Owlbear SDK 适配层
├── scene/walls/          # 墙体数据模型、几何与协调器
├── modules/walls/        # 墙体工具与编辑交互
├── control.ts            # 左上角总控面板
└── wall-properties.ts    # 墙体属性面板
public/                   # Manifest、后台页面、总控页面、图标
scripts/                  # 构建和本地开发脚本
tests/                    # 自动化测试
docs/                     # 路线图、架构与测试报告
```
