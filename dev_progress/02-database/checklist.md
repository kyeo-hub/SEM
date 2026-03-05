# Phase 2: 数据库设计 - 任务清单

> 预计周期：Week 2  
> 负责人：@kyeo-hub

---

## ✅ 任务清单

### 2.1 数据库 Schema 设计

- [ ] 创建数据库 migrations 文件夹
- [ ] 编写 001_init_schema.sql
  - [ ] users 表
  - [ ] fault_level 表
  - [ ] equipment 表
  - [ ] inspection_standard 表
  - [ ] inspection_record 表
  - [ ] inspection_detail 表
  - [ ] inspection_attachment 表
  - [ ] equipment_status_history 表
  - [ ] operation_info_history 表
  - [ ] wechat_notification 表
- [ ] 编写 002_seed_data.sql (初始化数据)
- [ ] 编写 003_migrate_from_svm.sql (SVM 迁移脚本)
- [ ] 创建数据库视图
  - [ ] v_equipment_inspection_stats
  - [ ] v_equipment_fault_stats
  - [ ] v_daily_operation_summary

### 2.2 数据库迁移工具

- [ ] 创建 migrate 命令工具
- [ ] 实现迁移脚本执行逻辑
- [ ] 实现回滚功能
- [ ] 测试迁移脚本

### 2.3 GORM 模型定义

- [ ] 定义 User 模型
- [ ] 定义 FaultLevel 模型
- [ ] 定义 Equipment 模型
- [ ] 定义 InspectionStandard 模型
- [ ] 定义 InspectionRecord 模型
- [ ] 定义 InspectionDetail 模型
- [ ] 定义 InspectionAttachment 模型
- [ ] 定义 EquipmentStatusHistory 模型
- [ ] 定义 OperationInfoHistory 模型
- [ ] 定义 WechatNotification 模型

### 2.4 数据库连接配置

- [ ] 配置 PostgreSQL 连接池
- [ ] 配置自动迁移 (AutoMigrate)
- [ ] 配置数据库连接测试
- [ ] 配置慢查询日志

---

## 📅 开发日志

### 2026-03-05
- [ ] 记录今日开发内容...

---

## 📌 注意事项

1. 故障等级初始化数据必须包含 L1/L2/L3
2. 点检标准需要根据实际设备类型配置 (28 项)
3. SVM 迁移脚本需要提前分析原数据结构
4. 所有时间字段使用 TIMESTAMPTZ (时区安全)

---

**阶段状态**: ⏳ 未开始  
**更新日期**: 2026-03-05
