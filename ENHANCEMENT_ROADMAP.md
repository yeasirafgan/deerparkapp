# 🚀 Deer Park Timesheet Enhancement Roadmap

## 📋 Overview
This roadmap outlines the complete implementation plan for enhancing the existing timesheet application with:
- Leave Management System (Annual, Sick, Maternity, Paternity)
- Training Hours Tracking
- Draft Submission System
- Friday Payment Cutoff Logic
- Enhanced Admin Interface with Approval Workflow

## 🎯 Core Requirements
- Maintain existing code style and architecture
- Keep server components as default, client components only when necessary
- Mobile responsive design matching current UI/UX
- Use existing Kinde authentication
- Preserve current 4-week cycle logic
- Filter-based export system for admin

---

## 📁 Phase 1: Database Models & API Routes

### 1.1 Create New Models

**File: `models/Leave.js`**
```javascript
// Leave request model with approval workflow
- userId (ObjectId, required)
- username (String, required)
- leaveType (enum: 'annual', 'sick', 'maternity', 'paternity')
- startDate (Date, required)
- endDate (Date, required)
- totalDays (Number, required)
- reason (String, optional)
- status (enum: 'pending', 'approved', 'rejected', default: 'pending')
- approvedBy (String, optional)
- approvedAt (Date, optional)
- comments (String, optional)
- isDraft (Boolean, default: false)
- createdAt (Date, default: Date.now)
- updatedAt (Date, default: Date.now)
```

**File: `models/Training.js`**
```javascript
// Training hours model
- userId (ObjectId, required)
- username (String, required)
- date (Date, required)
- hours (Number, required, min: 0.5, max: 12)
- trainingType (String, required)
- description (String, required)
- status (enum: 'pending', 'approved', 'rejected', default: 'pending')
- approvedBy (String, optional)
- approvedAt (Date, optional)
- comments (String, optional)
- isDraft (Boolean, default: false)
- createdAt (Date, default: Date.now)
- updatedAt (Date, default: Date.now)
```

### 1.2 Update Existing Models

**File: `models/Timesheet.js`**
```javascript
// Add new fields to existing schema
- isDraft (Boolean, default: false)
- submittedAt (Date, optional)
- paymentCycle (String, optional) // Format: "2024-W01-W04"
```

### 1.3 Create API Routes

**Files to create:**
- `app/api/leaves/route.js` - CRUD operations for leaves
- `app/api/leaves/[id]/route.js` - Individual leave operations
- `app/api/leaves/approve/route.js` - Bulk approval endpoint
- `app/api/training/route.js` - CRUD operations for training
- `app/api/training/[id]/route.js` - Individual training operations
- `app/api/training/approve/route.js` - Bulk approval endpoint
- `app/api/drafts/route.js` - Draft management
- `app/api/drafts/submit/route.js` - Bulk draft submission

---

## 📱 Phase 2: User Interface Enhancements

### 2.1 Timesheet Page Enhancement

**File: `app/timesheet/page.js`**
- Add tabbed interface (Work Hours, Leave Request, Training Hours, My Drafts)
- Implement Friday grace period logic for UserTimesheetData
- Maintain existing server component structure

**New Components to create:**
- `components/TabNavigation.js` (client component)
- `components/LeaveForm.js` (client component)
- `components/TrainingForm.js` (client component)
- `components/DraftManager.js` (client component)
- `components/PaymentSummary.js` (server component)

### 2.2 Enhanced TimesheetForm

**File: `app/timesheet/TimesheetForm.js`**
- Add "Save as Draft" and "Submit Final" buttons
- Implement draft validation
- Add success/error states
- Maintain existing styling and mobile responsiveness

### 2.3 UserTimesheetData Enhancement

**File: `components/UserTimesheetData.js`**
- Add Friday grace period logic (show previous cycle totals Tue-Sat)
- Integrate approved leaves and training hours
- Color-coded entry types (work=blue, leave=green, training=orange)
- Add "Last Payment" summary during grace period
- Maintain existing pagination and 4-week cycle logic

---

## 👨‍💼 Phase 3: Admin Interface Enhancement

### 3.1 Admin Dashboard Tabs

**File: `app/admin/page.js`**
- Add tabbed interface:
  - "Work Hours" (existing functionality)
  - "Leave Requests" (pending approvals)
  - "Training Hours" (pending approvals)
  - "All Entries" (unified view)
- Enhance export to include filtered data only
- Maintain existing DateRangeFilter functionality

**New Components to create:**
- `components/AdminTabNavigation.js` (client component)
- `components/LeaveRequestsTable.js` (server component with client actions)
- `components/TrainingHoursTable.js` (server component with client actions)
- `components/ApprovalActions.js` (client component)
- `components/UnifiedDataView.js` (server component)

### 3.2 Individual User Admin Page

**File: `app/admin/[username]/page.js`**
- Same tabbed interface as main admin page
- User-specific data filtering
- Individual approval actions
- Enhanced export for single user

### 3.3 Approval Workflow Components

**Components to create:**
- `components/BulkApprovalActions.js` (client component)
- `components/ApprovalModal.js` (client component)
- `components/StatusBadge.js` (server component)
- `components/ApprovalHistory.js` (server component)

---

## 🛠️ Phase 4: Utility Functions & Logic

### 4.1 Enhanced Date Utilities

**File: `utils/dateUtils.js`**
- Add `isInGracePeriod()` function
- Add `getPaymentCycleId()` function
- Add `calculateLeaveDays()` function
- Add `isPaymentFriday()` function

**File: `utils/weekCycleUtils.js`**
- Add `getPreviousCycleTotal()` function
- Add `shouldShowPreviousCycle()` function
- Enhance existing cycle functions

### 4.2 New Utility Files

**File: `utils/leaveUtils.js`**
```javascript
// Leave calculation and validation utilities
- calculateLeaveDays(startDate, endDate)
- validateLeaveRequest(leaveData)
- checkLeaveConflicts(userId, startDate, endDate)
- getLeaveBalance(userId, leaveType)
```

**File: `utils/draftUtils.js`**
```javascript
// Draft management utilities
- validateDraftData(draftData)
- convertDraftToSubmission(draftData)
- bulkSubmitDrafts(draftIds)
```

### 4.3 Enhanced Export Utilities

**File: `utils/exportsToExcel.js`**
- Add multi-sheet export functionality
- Include leave and training data
- Add filtered export based on admin view
- Maintain existing export structure

---

## 🎨 Phase 5: UI/UX Design System

### 5.1 Design Tokens
- **Work Hours**: Blue theme (`bg-blue-50`, `text-blue-800`, `border-blue-200`)
- **Leave Requests**: Green theme (`bg-green-50`, `text-green-800`, `border-green-200`)
- **Training Hours**: Orange theme (`bg-orange-50`, `text-orange-800`, `border-orange-200`)
- **Drafts**: Gray theme (`bg-gray-50`, `text-gray-800`, `border-gray-200`)
- **Approved**: Success green (`bg-emerald-100`, `text-emerald-800`)
- **Pending**: Warning yellow (`bg-yellow-100`, `text-yellow-800`)
- **Rejected**: Error red (`bg-red-100`, `text-red-800`)

### 5.2 Component Styling Guidelines
- Maintain existing Tailwind CSS classes
- Use consistent spacing (`p-4`, `mb-4`, `gap-3`)
- Keep existing hover states and transitions
- Ensure mobile responsiveness (`sm:`, `md:`, `lg:` breakpoints)
- Use existing color palette (lime, emerald, slate)

---

## 📊 Phase 6: Data Flow & State Management

### 6.1 Server Components (Default)
- All data fetching components
- Static UI components
- Table displays
- Export functionality

### 6.2 Client Components (When Necessary)
- Form submissions
- Interactive buttons (approve/reject)
- Tab navigation
- Modal dialogs
- Real-time updates

### 6.3 Data Fetching Strategy
- Use existing MongoDB connection pattern
- Implement proper error handling
- Add loading states for client components
- Use Next.js revalidation for data updates

---

## 🔐 Phase 7: Security & Validation

### 7.1 API Security
- Maintain existing Kinde authentication
- Add role-based access control for admin routes
- Implement proper data validation
- Add rate limiting for submission endpoints

### 7.2 Data Validation
- Client-side form validation
- Server-side API validation
- Database schema validation
- File upload security (if needed)

---

## 📱 Phase 8: Mobile Responsiveness

### 8.1 Responsive Design Requirements
- Tab navigation works on mobile (horizontal scroll if needed)
- Forms are mobile-friendly
- Tables are horizontally scrollable
- Buttons are touch-friendly (min 44px)
- Text is readable on small screens

### 8.2 Mobile-Specific Features
- Swipe gestures for tabs (optional)
- Collapsible sections for better space usage
- Mobile-optimized date pickers
- Touch-friendly approval actions

---

## 🧪 Phase 9: Testing Strategy

### 9.1 Functionality Testing
- Draft save/submit workflow
- Leave approval process
- Training hour submission
- Friday grace period logic
- Export functionality
- Mobile responsiveness

### 9.2 Edge Cases
- Timezone handling
- Leap year calculations
- Concurrent approvals
- Large data exports
- Network failures

---

## 🚀 Phase 10: Deployment & Rollout

### 10.1 Database Migration
- Add new fields to existing collections
- Create new collections for leaves and training
- Ensure backward compatibility

### 10.2 Feature Rollout
- Deploy database changes first
- Deploy API routes
- Deploy UI enhancements
- Test in production environment

### 10.3 User Training
- Create user guide for new features
- Admin training for approval workflow
- Document new export functionality

---

## 📋 Implementation Checklist

### Database & API
- [ ] Create Leave.js model
- [ ] Create Training.js model
- [ ] Update Timesheet.js model
- [ ] Create leave API routes
- [ ] Create training API routes
- [ ] Create draft management APIs

### User Interface
- [ ] Add tab navigation to timesheet page
- [ ] Create LeaveForm component
- [ ] Create TrainingForm component
- [ ] Create DraftManager component
- [ ] Enhance TimesheetForm with draft functionality
- [ ] Update UserTimesheetData with grace period logic

### Admin Interface
- [ ] Add admin tab navigation
- [ ] Create LeaveRequestsTable component
- [ ] Create TrainingHoursTable component
- [ ] Create approval workflow components
- [ ] Enhance export functionality

### Utilities & Logic
- [ ] Enhance date utilities
- [ ] Create leave utilities
- [ ] Create draft utilities
- [ ] Update export utilities
- [ ] Add validation functions

### Testing & Deployment
- [ ] Test all new functionality
- [ ] Test mobile responsiveness
- [ ] Test edge cases
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 🎯 Success Metrics

- ✅ Users can submit leave requests and training hours
- ✅ Draft system prevents accidental submissions
- ✅ Admin can approve/reject requests efficiently
- ✅ Friday grace period shows correct payment totals
- ✅ Export includes all data types based on filters
- ✅ Mobile experience is smooth and intuitive
- ✅ Existing functionality remains unchanged
- ✅ Performance is maintained or improved

---

*This roadmap ensures a systematic approach to enhancing the Deer Park Timesheet application while maintaining code quality, user experience, and system reliability.*