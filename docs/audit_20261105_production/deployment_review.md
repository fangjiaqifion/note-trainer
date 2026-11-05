# 正式云功能部署审阅

## 已准备的数据库变更

文件：`scripts/migrations/001_cloud.sql`。全程单事务，新建专用 `nt_cloud_*` 表与 `nt_private` schema。
不读取、不改写原 `nt_sync_events`，不修改既有身份、不自动上传本机学生档案。

- 默认关闭入组，仅管理员一次性开通码可以创建班级。
- Supabase 匿名 Auth 负责签发身份；恢复码只存 SHA-256 哈希。
- 教师有本班权限，学生只访问绑定的学生 ID，研究者只有授权班级只读权限。
- 表启用 RLS，客户端无直接写表权限；写入只能走检查权限的 RPC。
- 恢复码可撤销、一年到期、最多十台有效设备；原始设备也可撤销。
- 答题 append-only、50 条一批、冲突整批回滚；进度做乐观版本检查。
- 每学生每日最多 20,000 条新增事件；默认每班最多 500 位学生。
- 可导出单一 MVCC 快照的班级灾备；管理员才能恢复，拒绝覆盖存在的班级。
- 浏览器灾备限 50,000 条事件且 payload 文本总量不超过 25 MiB，超限明确失败而不截断。

本地已在真实 PostgreSQL 引擎完成 RLS、角色负例、重试、撤销、版本冲突和空库灾备恢复。
真实 Supabase 的最终验收需要先执行迁移，再通过普通线上页面创建新的虚拟班级与学生。

## 开通与控制台边界

首次开通码是服务器访问凭据，应由用户在数据库控制台生成和保管，不能提交到 Git。
批准迁移后，打开 SQL Editor，先运行迁移，再由用户运行下方的一次性引导语句。
此查询只创建一个 24 小时有效、只能消费一次的班级开通码；结果不要粘到聊天里。

```sql
with token as materialized (
 select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') as secret
), inserted as (
 insert into nt_private.bootstrap(hash,expires_at)
 select sha256(convert_to(secret,'UTF8')),now()+interval '24 hours' from token
 returning hash
)
select secret as bootstrap_code from token,inserted;
```

配置使用已有项目 publishable key，从本机配置文件加载，不发布密钥或恢复码。
教师在游戏页面开通班级后，先下载教师恢复码，再逐个备份、绑定学生。
已有测试与新班级表物理分开；真实学生应在虚拟班级的线上验收完成后才逐个接入。

## 真实环境还需验收

- 服务器迁移和新权限检查；普通 GitHub Pages 页面全流程虚拟数据验证。
- 发布全部文件哈希与 Safari/Chrome 实际加载回执。
- iPadOS Safari 与主屏幕模式：首次启动、回后台、锁屏、离线；三条声道的实际试听。
- 内地/香港实际网络；免费项目暂停后的恢复演练与长期容量、保存耗时。
- 免费项目没有可下载的托管数据库备份。应用班级灾备不包含 Supabase 配置、Auth/审计与其他项目对象；
  运维仍需另存 schema、配置，定期离线导出班级灾备，较大规模使用管理员数据库转储或有预算后升级托管备份。

未经这些真实环境验证，不把“本地功能实现完成”写成 production ready。
