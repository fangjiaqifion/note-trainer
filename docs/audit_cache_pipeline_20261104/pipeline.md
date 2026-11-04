# 缓存与发布核验流水线

本记录保留初次本地构建时的结果；后续是否已推送以 git 远端和当次发布状态为准。

日期：2026-11-04。最终构建：29280ef61b（前期演练构建为 65da7cc46a）。

## 状态与命令

| 命令 | 作用 | 成功的含义 |
|---|---|---|
| `npm run build` | 生成构建号与 release.json | built，仅构建 |
| `npm run release -- --local` | 测试、起本地服务、核验两浏览器三地址 | ready，全部六个浏览器/地址目标收到实际加载回执 |
| `npm run release -- --local --local-only` | 明确限定本地两个地址 | ready，仅四个本地目标；远端未核验 |
| `npm run cache` | 不重建，重复清理/加载核验 | 六个目标全部 ready |
| `npm run cache -- --local-only` | 只核验本地缓存与加载 | 四个目标 ready |
| `npm run verify:remote` | 线上文件与本地 release.json 比较 | server-verified，不等于浏览器已刷新 |
| `npm run pages:refresh` | 只读查看重建计划 | 不发生远程修改 |
| `npm run pages:refresh -- --execute` | 重建远程已有 main 并核验文件 | 不推送本地代码，不代表浏览器已清理 |
| `npm run release -- --push` | 经授权推送、等待文件一致、六目标核验 | ready 后才交付远程测试链接 |

`--no-open` 只准备链接，状态 prepared；不能报浏览器已刷新。
完整核验缺任何目标都会非零退出。运行明细保存在 gitignored `.release/status.json`。原子运行锁禁止并行发布/清缓存；
已退出进程留下的锁可自动回收，活进程锁不抢占。并行 build 的负向演练已明确拒绝。
该文件有本轮短效令牌，不能提交。未知端口进程不会被自动终止。

## 三层保障

1. **本地服务**：Node 专用服务器对成功/错误响应统一使用 no-store。
   源码 SHA-256 作为服务指纹，防止继续使用旧 Python 服务或旧版 Node 服务。
   文件路径经 realpath 校验，禁止 .git 等隐藏路径。回执接口只收 loopback 请求。
2. **服务器文件**：清单列出 index、SW、清理页、manifest、图标八个文件的 SHA-256。
   CLI 每次带新查询参数取回核验，浏览器再用 reload 取回并核验。
   `.nojekyll` 避免 GitHub Pages 构建改变字节。CDN 混合新旧文件必须失败，不靠延时猜测。
3. **浏览器实际加载**：清理页只注销本游戏 scope 的 SW、删本游戏缓存，保留 localStorage。
   全部文件通过哈希检查后打开带 build 的游戏。游戏拒绝构建不符的链接，实际 boot 后才
   导航到一次性 localhost 回执地址，再由服务器跳回游戏。令牌随机、每浏览器/地址不同、
   内存保存十分钟。不读浏览器标签页、不需要 AppleScript 或 JS 自动化授权。
   各浏览器/地址逐个等待回执，避免 Safari 延迟后台标签页；核验用的临时游戏页不注册 SW，
   跳回正式游戏后才注册，避免注册与回执跳转竞态。清理步骤有独立超时，失败步骤也回执。

回执使用顶层导航，避免远程 HTTPS 页面后台 fetch 到本地时的 CORS/混合内容/本地网络权限问题。
远端到本地的实际浏览器路径仍须在授权部署新文件后完成实测，不能把本地通过写成远端通过。

## GitHub Pages

已只读核实：仓库 fangjiaqifion/note-trainer，Pages build_type=legacy，main 分支、根目录。
线上 main 仍是 dc501ef，尚不含新清理页和发布清单；release.json 返回 404。

官方没有公开的站点 CDN purge 接口。本项目的替代是可选重建 + 实际文件一致性校验，
不会删除 Actions 缓存冒充刷新网站，不改站点配置，也不会为了刷新远端而推送未授权代码。
重建命令校验 GitHub 账户和发布模式，等待新构建的时间戳、commit 和 built 状态，再核验线上文件。
说明依据：[GitHub Pages 官方接口](https://docs.github.com/en/rest/pages/pages)。

## 验证轮次与结果

- 第一轮：为混合部署、旧清单、SW 旧字节、404、503 增加独立测试，均可拦截。
- 第二轮：实机原方案能够加载新构建，但 AppleScript 标题读取超时，明确返回失败。
  因此移除标题读取依赖，改用一次性 loopback 导航回执。
- 第三轮：服务器测试覆盖无缓存响应、隐藏目录拦截、回执未就绪/错误构建/正确构建状态。
  浏览器回归覆盖清理后自动打开目标构建、旧构建拒绝进入、HTTP 错误不报成功。
  原游戏 45,900 节生成检查、1,144 种排题边界、布局/续学/报告/离线回归全部通过。
- 第四轮：完整本地 release（含全部测试）实机执行，Safari/Chrome × localhost/127.0.0.1
  四个目标均回执 ready，前期构建为 65da7cc46a。随后复测暴露 Safari 的 SW API 偶发挂起。
- 第五轮：关闭本次创建的 Safari 测试页，增加逐步超时与失败回执，核验跳转页不注册 SW。
  构建 29280ef61b 完整本地 release 四目标均 ready（`local_release.log`）。
  最终重复验证见 `final_validation.log`，并新增模拟 SW API 永不返回的自动化断言。
- 远端完整流程：因新清单尚未部署，目前不能成功。负向演练必须报告远端 404 并非零退出；
  不将其标为代码出题错误，也不将本地通过标为全流程通过。

本次未执行远程重建、未推送、未修改 Pages 设置。远端相关代码已准备，首次部署后才可端到端验证。
