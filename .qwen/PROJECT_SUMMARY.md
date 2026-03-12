# Project Summary

> **Project**: Equipment Inspection & Operation Management System (EIM)
> **Client**: Wuhan Steel Group Logistics Co., Ltd.
> **Last Updated**: 2026-03-11
> **Version**: v2.4
> **Overall Progress**: 95%

---

## Overall Goal

Build an Equipment Inspection & Operation Management System (EIM) for Wuhan Steel Group Logistics Co., Ltd. to digitize paper-based equipment inspection processes, with device status monitoring, fault management, and operational tracking.

---

## Key Knowledge

### Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend | Go 1.21+ + Gin + GORM | High-performance REST API |
| Frontend | Next.js 14+ (App Router) | Single codebase for PC + Mobile |
| UI Framework | Ant Design + Ant Design Mobile | Responsive design |
| Database | PostgreSQL 15+ | Main data store |
| Cache | Redis 7+ | Sessions, hot data |
| Mobile | H5 (Next.js responsive) + html5-qrcode | **No WeChat Mini Program** |
| Map | 高德地图 (AutoNavi) | Device location display |
| Charts | ECharts 5.x | Data visualization |
| Deployment | Docker + Docker Compose | Containerized |

### Key Architecture Decisions

- **H5 Mobile over WeChat Mini Program**: Saves 2-4 weeks development, no approval process required
- **Unified QR Code**: One QR code per device with 4 action options (作业/待命/点检/维保)
- **Simplified Personnel Management**: Backend generates accounts/passwords (Excel import supported), 7-day remember login
- **Fault Level System**: L1 (严重/Red), L2 (一般/Orange), L3 (轻微/Yellow) with work-allowance 判定
- **Enterprise WeChat Integration**: Daily fault reports (08:00) + real-time repair notifications via Webhook

### Database Schema (12 Tables)

- `users` - 用户表
- `roles` - 角色表
- `user_roles` - 用户角色关联表
- `fault_level` - 故障等级表
- `equipment` - 设备表
- `inspection_standard` - 点检标准表
- `inspection_record` - 点检记录主表
- `inspection_detail` - 点检明细表
- `inspection_attachment` - 点检附件表
- `equipment_status_history` - 设备状态历史表
- `operation_info_history` - 作业信息历史表
- `wechat_notification` - 企业微信推送记录表

### Project Structure

```
eim/
├── cmd/                    # Entry points
├── internal/               # Handler, Service, Repository, Model
├── pkg/                    # Shared packages (database, redis, jwt, qrcode, wechat)
├── web/                    # Next.js (admin + dashboard + mobile)
├── migrations/             # Database migrations
├── docker/                 # Docker configuration
└── docs/                   # Documentation
```

---

## ⭐ Core Business Rules (底层业务规则)

> **⚠️ IMPORTANT**: These rules are the foundation of the system. All development must follow these rules strictly. Any changes must be thoroughly discussed and tested.

### Rule 0: Role Permission Management (角色权限管理)

**3 Roles**: Admin (`admin`) | Maintainer (`maintainer`) | Operator (`operator`)

#### Permission Matrix

| Operation Type | Admin | Maintainer | Operator | Notes |
|----------------|-------|------------|----------|-------|
| **Work (作业)** | ✅ | ❌ | ✅ | Operator exclusive |
| **Standby (待命)** | ✅ | ✅ | ✅ | All roles |
| **Inspection (点检)** | ✅ | ✅ | ✅ | All roles |
| **Maintenance (维保)** | ✅ | ✅ | ❌ | Operator CANNOT maintain |
| **Fault Report (故障登记)** | ✅ | ✅ | ✅ | All roles |
| **Fault Resolve (故障处理)** | ✅ | ✅ | ❌ | Operator CANNOT resolve |
| **User Management** | ✅ | ❌ | ❌ | Admin only |
| **Equipment Management** | ✅ | ❌ | ❌ | Admin only |
| **Inspection Standard** | ✅ | ❌ | ❌ | Admin only |

#### Backend Validation (Go Middleware)

```go
// Role-based access control middleware
func RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole := c.Get("user_role")
        for _, role := range roles {
            if userRole == role {
                c.Next()
                return
            }
        }
        Error(c, http.StatusForbidden, "权限不足")
        c.Abort()
    }
}

// Usage examples
router.PUT("/equipments/:id/start-work", RequireRole("admin", "operator"), StartWork)
router.PUT("/equipments/:id/start-maintenance", RequireRole("admin", "maintainer"), StartMaintenance)
router.GET("/users", RequireRole("admin"), GetUsers)
```

#### Frontend Button Control (React Hook)

```typescript
const useRolePermission = () => {
  const { user } = useAuth();
  return {
    canWork: user?.role === 'admin' || user?.role === 'operator',
    canMaintenance: user?.role === 'admin' || user?.role === 'maintainer',
    canInspect: true, // All roles can inspect
    canManageUsers: user?.role === 'admin',
    canManageEquipment: user?.role === 'admin'
  };
};
```

---

### Rule 1: Equipment Status Management (设备状态管理)

**4 Statuses**: `standby` (待命) | `working` (作业) | `maintenance` (维保) | `fault` (故障)

#### Status Transition Matrix

| Current → Target | standby | working | maintenance | fault |
|------------------|---------|---------|-------------|-------|
| **standby** | - | ✅ (fault check) | ✅ | ✅ |
| **working** | ✅ (log work record) | - | ❌ **Must end work first** | ✅ |
| **maintenance** | ✅ (completion confirm) | ❌ **Must set standby first** | - | ✅ |
| **fault** | ✅ (all resolved) | ⚠️ (fault level check) | ✅ (partial resolve) | - |

#### Status Transition Diagram

```
                    ┌──────────────┐
                    │   standby    │
                    │    待命      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │ Start Work │ End Work   │
              ▼            │            │
       ┌────────────┐      │            │
       │  working   │──────┘            │
       │   作业     │                   │
       └─────┬──────┘                   │
             │                          │
             │ Fault during work        │
             ▼                          │
       ┌────────────┐                   │
       │   fault    │───────────────────┘
       │   故障     │ Fault resolved
       └────────────┘
             ▲
             │ Fault during maintenance
       ┌────────────┐
       │maintenance │
       │   维保     │
       └─────┬──────┘
             │
             │ Maintenance complete
             ▼
       ┌────────────┐
       │  standby   │
       └────────────┘
```

#### Safety Red Lines (安全红线)

```
❌ Work → Maintenance: Must end work first
❌ Maintenance → Work: Must set standby first
❌ Maintenance status → Work operation: FORBIDDEN
❌ Work status → Maintenance operation: FORBIDDEN
```

---

### Rule 2: Fault Level Work Restrictions (故障等级作业限制)

| Level | Name | Color | Allow Work | Notification |
|-------|------|------|------------|--------------|
| **L1** | 严重故障 | 🔴 Red | ❌ **NO** | Real-time WeChat alert |
| **L2** | 一般故障 | 🟠 Orange | ⚠️ **With confirmation** | Daily report |
| **L3** | 轻微故障 | 🟡 Yellow | ⚠️ **With confirmation** | Daily report |

#### Work Allowance Check Logic

```
Work Request
    │
    ▼
┌─────────────────────────┐
│ 1. Check status          │
│    = maintenance?        │
│    → YES: ❌ FORBIDDEN   │
│    → NO: Continue        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. Check fault level     │
│    = fault?              │
│    → YES: Check allow_work
│      - L1 (false) → ❌   │
│      - L2/L3 (true) → ⚠️ │
│    → NO: Continue        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 3. ✅ Allow work         │
└─────────────────────────┘
```

#### Frontend Validation (TypeScript)

```typescript
const checkAllowWork = () => {
  // 1. Maintenance status → FORBIDDEN
  if (equipment.status === 'maintenance') {
    Toast.show('设备正在维保中，禁止作业');
    return;
  }

  // 2. Fault status → Check fault level
  if (equipment.status === 'fault' && equipment.fault_level) {
    if (!equipment.fault_level.allow_work) {
      // L1 fault → FORBIDDEN
      Toast.show('设备严重故障，禁止作业！');
      return;
    } else {
      // L2/L3 fault → Allow with confirmation
      Dialog.confirm('设备故障，允许带病作业，是否继续？');
      return;
    }
  }

  // 3. Standby status → Allow
  setWorkModalVisible(true);
};
```

#### Backend Validation (Go)

```go
func (s *EquipmentService) UpdateStatus(ctx context.Context, id int64, req *UpdateStatusRequest) (*model.Equipment, error) {
    equipment, _ := s.equipmentRepo.GetByID(ctx, id)

    // Start work: check equipment status
    if req.Status == "working" {
        // Maintenance status → FORBIDDEN
        if equipment.Status == "maintenance" {
            return nil, errors.New("设备正在维保中，禁止作业")
        }

        // Fault status → Check fault level
        if equipment.Status == "fault" && equipment.FaultLevelID != nil {
            faultLevel, _ := s.equipmentRepo.GetFaultLevel(ctx, *equipment.FaultLevelID)
            if !faultLevel.AllowWork {
                return nil, errors.New("设备严重故障，禁止作业！")
            }
        }
    }

    // ... continue processing
}
```

---

### Rule 3: Dual Validation Mechanism (双重验证机制)

```
┌─────────────────────┐
│ Frontend Validation │ ← First line of defense (UX, instant feedback)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend Validation  │ ← Second line of defense (security, prevent bypass)
└─────────────────────┘
```

**Why Dual Validation?**

1. **Frontend**: Quick feedback, prevent invalid submissions, improve UX
2. **Backend**: Final security, prevent API bypass, ensure data integrity
3. **Both must pass**: If either fails, operation is rejected

**Example: Work Start Validation**

| Layer | Validations |
|-------|-------------|
| **Frontend** | - Role check (admin/operator)<br>- Status check (not maintenance)<br>- Fault level display (if fault)<br>- Form validation (ship name, cargo, operator) |
| **Backend** | - JWT authentication<br>- Role permission check<br>- Status re-validation<br>- Fault level re-check<br>- Business rule enforcement |

---

### Rule 4: One Device One QR Code (一机一码原则)

```
Each equipment has ONLY ONE QR code
Scan → Show 4 action buttons: [Work] [Standby] [Inspection] [Maintenance]
Button states change dynamically based on current equipment status
```

**QR Code Design**:
- Format: `https://eim.example.com/mobile/equipment/{UUID}`
- UUID stored in `equipment.qr_code_uuid`
- One QR code for all operations (no separate codes for work/maintenance/inspection)

**Button State Logic**:

```typescript
const getButtonStates = (equipment: Equipment, userRole: string) => {
  const { canWork, canMaintenance } = useRolePermission();

  return {
    work: {
      disabled: !canWork || 
                equipment.status === 'maintenance' ||
                (equipment.status === 'fault' && !equipment.fault_level?.allow_work),
      label: equipment.status === 'working' ? 'End Work' : 'Start Work'
    },
    maintenance: {
      disabled: !canMaintenance || 
                equipment.status === 'working' ||
                equipment.status === 'maintenance',
      label: 'Maintenance Register'
    },
    inspection: {
      disabled: false, // All roles can inspect
      label: 'Inspection'
    },
    standby: {
      disabled: equipment.status === 'standby' ||
                equipment.status === 'working',
      label: 'Set Standby'
    }
  };
};
```

---

### Rule 5: Work & Maintenance Mutual Exclusion (作业与维保互斥)

```
⚠️ SAFETY RED LINE:

❌ Work status → Maintenance operation: FORBIDDEN
❌ Maintenance status → Work operation: FORBIDDEN
✅ Must end current status before entering another state
```

**Correct Flow**:

```
Work → End Work → Standby → Start Maintenance → Maintenance Complete → Standby
Maintenance → Complete → Standby → Start Work → End Work → Standby
```

**Wrong Flow (FORBIDDEN)**:

```
Work → Start Maintenance ❌
Maintenance → Start Work ❌
```

**Backend Enforcement**:

```go
// Start maintenance: check if equipment is working
if req.Status == "maintenance" {
    if equipment.Status == "working" {
        return nil, errors.New("设备正在作业中，请先结束作业")
    }
}

// Start work: check if equipment is in maintenance
if req.Status == "working" {
    if equipment.Status == "maintenance" {
        return nil, errors.New("设备正在维保中，禁止作业")
    }
}
```

---

### Rule 6: Work Flow Management (作业流程管理)

#### Start Work

| Field | Required | Notes |
|-------|----------|-------|
| Ship Name | ⚠️ Optional | May not apply for yard/warehouse equipment |
| Cargo Name | ⚠️ Optional | May not apply for yard/warehouse equipment |
| Operator | ✅ Required | Must fill |

#### End Work

| Field | Required | Notes |
|-------|----------|-------|
| Duration | ✅ Auto | Calculated automatically (minutes) |
| Cargo Weight | ⚠️ Optional | May not apply for yard/warehouse equipment |
| Has Fault | ✅ Required | Yes/No |
| Fault Level | ⚠️ Conditional | Required if Has Fault = Yes |
| Fault Description | ⚠️ Conditional | Required if Has Fault = Yes |
| Operator | ✅ Required | Must fill |

**End Work Flow**:

```
End Work Request
    │
    ▼
┌─────────────────────────┐
│ 1. Create work record    │
│    - Duration            │
│    - Cargo weight        │
│    - Start/End time      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. Has fault?            │
│    → YES: Create fault  │
│         Update status   │
│         Send WeChat     │
│    → NO: Set standby    │
└─────────────────────────┘
```

---

### Rule 7: Inspection Abnormal Handling (点检异常处理)

**Inspection → Fault Flow** (Optional, not all abnormalities become faults):

```
Inspection finds abnormality
    │
    ▼
Mark abnormal item
    │
    ▼
┌─────────────────────────┐
│ System prompt:           │
│ Report fault?           │
│   ○ Yes → Create fault  │
│   ○ No → Record only    │
└────────────┬────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
   Select "Yes"  Select "No"
      │             │
      ▼             ▼
┌──────────┐   ┌──────────┐
│ Select   │   │ Record   │
│ L1/L2/L3 │   │ to       │
│ Fill desc│   │ inspection│
│ Upload   │   │ complete │
│ photos   │   │          │
└─────┬────┘
      │
      ▼
┌──────────────┐
│ Create fault │
│ Update status│
│ Send WeChat  │
└──────────────┘
```

---

## Recent Actions

### 2026-03-11 - Dashboard SSE Connection Fix ✅

**Version**: v2.4

#### Issue
Dashboard page SSE (Server-Sent Events) connection returned 404 error:
```
GET http://localhost:8080/api/events/equipments?token=xxx 404 (Not Found)
```

#### Root Cause
Backend server was started before the latest route configuration was loaded. The SSE route `/api/events/equipments` was properly configured in code but not registered in the running server.

#### Solution
1. Restarted backend server to load new route configuration
2. Fixed `JWT_SECRET` in `.env` file (was empty)
3. Verified SSE endpoint with curl tests

#### Result
- ✅ SSE connection successful
- ✅ Real-time equipment data push (every 5 seconds)
- ✅ Dashboard shows live connection status
- ✅ Equipment map updates automatically

#### Files Modified
- `eim/.env` - Added JWT_SECRET
- `eim/internal/handler/sse_handler.go` - SSE event stream handler
- `eim/web/app/dashboard/page.tsx` - Frontend SSE client

---

### 2026-03-09 - Phase 2: PC Frontend Enhancement ✅

**Version**: v2.3

#### New Features

1. **Equipment Management Enhancement**
   - QR code generation and download
   - Advanced search (code, status, type)
   - Form optimization (Switch, InputNumber)
   - Responsive table

2. **Inspection Management Enhancement**
   - Detail modal (basic info, problems, details table, image preview)
   - Advanced search (date, shift)

3. **Statistics Enhancement**
   - ECharts integration
   - Inspection trend (bar chart)
   - Equipment status trend (line chart)
   - Equipment status distribution (pie chart)

4. **Inspection Standard Enhancement**
   - CRUD operations
   - Search and filter

5. **Dashboard Enhancement**
   - Map toggle button
   - Equipment distribution map

### 2026-03-09 - Permission & User Management ✅

**Version**: v2.2

- Frontend permission control (AuthContext + PermissionGuard + usePermissions)
- User management interface (CRUD + role assignment)
- Image upload (backend API + frontend components)
- Dashboard map component (AutoNavi integration)

### 2026-03-09 - Backend v2.0 Complete ✅

**Version**: v2.1

- Role permission management (3 roles, permission matrix)
- Work flow (start/end work)
- Maintenance flow (start/complete)
- Fault management (report, resolve, WeChat notification)
- Statistics API (work, maintenance, fault statistics)

---

## Current Plan

### Development Roadmap (10 Weeks)

| Phase | Duration | Status | Tasks |
|-------|----------|--------|-------|
| **Phase 1** | Week 1-2 | ✅ Done | Go + Next.js scaffolding, database schema, basic CRUD |
| **Phase 2** | Week 3-4 | ✅ Done | Equipment CRUD, status management, QR code generation |
| **Phase 3** | Week 5-6 | ✅ Done | Inspection standards, records, image upload |
| **Phase 4** | Week 7 | ✅ Done | Enterprise WeChat push, statistics reports |
| **Phase 5** | Week 8 | ✅ Done | SVM data migration scripts, validation |
| **Phase 6** | Week 9-10 | ✅ Done | Web frontend (admin + dashboard + H5 mobile) |
| **Phase 7** | Week 11 | 🔄 In Progress | Integration testing |
| **Phase 8** | Week 12 | ⏳ Pending | Deployment |

### Next Immediate Actions

1. [ ] Backend API refinement (inspection standard CRUD)
2. [ ] Image upload integration (inspection/maintenance/fault)
3. [ ] Integration testing (complete business flow)
4. [ ] User acceptance testing
5. [ ] Deployment preparation

---

## Open Questions / Considerations

- **Image upload strategy**: Compression for mobile upload
- **PWA support**: Consider for better offline experience
- **SSE real-time update**: Dashboard map real-time status update
- **User training**: Transition plan from paper to digital
- **Role switching**: Support for users with multiple roles

---

## Test Accounts

| Role | Username | Password | Notes |
|------|----------|--------|-------|
| Admin | admin | 123456 | Backend management |
| Maintainer | maintainer01 | 123456 | Maintenance operations |
| Operator | operator01 | 123456 | Equipment operations |

---

**Last Updated**: 2026-03-09
**Project Version**: v2.3
**Repository**: `/workspaces/SEM`
**Documentation**: `/workspaces/SEM/docs/核心业务规则.md`

---

## Summary Metadata

**Update time**: 2026-03-09T08:00:00.000Z
