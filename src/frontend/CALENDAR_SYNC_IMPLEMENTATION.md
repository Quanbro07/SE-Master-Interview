# Calendar Sync Implementation - Complete Guide

## Overview
Calendar synchronization has been successfully implemented to enable interviewers to set, store, and reload their availability schedules across sessions. The system now persists free time and blocked time periods, automatically loading them on login.

## What Changed

### 1. Auth Flow Enhancement (src/frontend/app/auth/callback/page.jsx)

**New Function: `loadAndCacheSchedule()`**
```javascript
const loadAndCacheSchedule = useCallback(async (token) => {
  // Fetches schedule from backend and caches in localStorage
  // Fails silently - doesn't block login flow
  // Stored at: localStorage.interviewerSchedule
}, []);
```

**Modified Function: `checkInterviewerProfileAndProceed()`**
- Now calls `loadAndCacheSchedule()` for interviewer role
- Ensures schedule is fetched and cached immediately after successful login
- Enables offline access to cached schedule data

**Flow:**
1. User logs in → Token stored in localStorage
2. Backend login call succeeds
3. If user is Interviewer → `loadAndCacheSchedule()` triggered
4. Schedule fetched from `/api/v1/schedule/get` and cached
5. User redirected to dashboard with schedule already loaded

### 2. Calendar UI Enhancement (src/frontend/app/component/RCalendar/RCalendar.jsx)

**New State:**
```javascript
const [blockedSlots, setBlockedSlots] = useState(new Set());
// Tracks which hour slots are blocked (red, disabled)
```

**New Function: `isSlotBlocked()`**
```javascript
const isSlotBlocked = (date, hour) => {
  const dateStr = format(date, "yyyy-MM-dd");
  return blockedSlots.has(`${dateStr}-${hour}`);
};
// Check if a slot is blocked (unavailable)
```

**New Function: `loadBlockedSchedules()`**
- Fetches blocked schedules from backend
- Parses overlapping blocks for the visible week
- Populates `blockedSlots` Set with blocked hour slots
- Called each time week changes
- Fails silently if backend doesn't return blocked schedules

**Enhanced Schedule Loading:**
- Now attempts to load from `localStorage.interviewerSchedule` first
- Falls back to API fetch if not cached
- Updates cache after fetching fresh data
- Calls `loadBlockedSchedules()` to fetch blocked periods

**UI Rendering Updates:**
- Added `is-blocked` class to blocked slots
- Blocked slots are disabled (`disabled` attribute)
- Shown in red with reduced opacity
- Cannot be clicked/edited

### 3. Visual Styling (src/frontend/app/component/RCalendar/RCalendar.css)

**Blocked Slot Styling:**
```css
.slot-cell.is-blocked {
  background: #ef4444;          /* Red color */
  opacity: 0.7;                 /* Semi-transparent */
  cursor: not-allowed;          /* Blocked cursor */
}
.slot-cell.is-blocked:hover {
  filter: brightness(0.95);     /* Slightly darker on hover */
}
```

**Slot States Summary:**
- **Green with glow**: Free time selected (can edit)
- **Red with reduced opacity**: Blocked time (cannot edit)
- **Gray**: Unselected free time (can select)
- **Grayed out**: Calendar in view-only mode

## How It Works

### Schedule Loading Process
```
1. User logs in
   ↓
2. Auth callback: loadAndCacheSchedule() called
   ↓
3. Backend: GET /api/v1/schedule/get
   ↓
4. Cache: localStorage.interviewerSchedule = response
   ↓
5. User navigated to dashboard
   ↓
6. Calendar component mounts
   ↓
7. Load schedule: localStorage first, then API
   ↓
8. Display free time slots + blocked time slots
```

### Blocked Schedule Application
```
1. Calendar visible week changes
   ↓
2. loadBlockedSchedules() called
   ↓
3. Iterate through each hour in week
   ↓
4. Check if hour overlaps with any blocked period
   ↓
5. If overlaps: add to blockedSlots Set
   ↓
6. Re-render calendar with blocked visual
```

## Testing Guide

### Test 1: Schedule Persistence on Login
**Steps:**
1. Open http://localhost:3000
2. Log in as an interviewer
3. Navigate to calendar
4. Set some availability (e.g., Monday 9-5, Wednesday 10-2)
5. Click "Save Schedule"
6. Refresh the page or logout/login
7. **Expected:** Calendar shows saved availability

**Verification:**
- Check localStorage: Open DevTools → Storage → localStorage → look for `interviewerSchedule`
- Should contain JSON with saved schedule data

### Test 2: Blocked Time Display
**Steps:**
1. Log in as interviewer
2. Go to calendar
3. Click "Block Time" button
4. Set a blocked period (e.g., today 2-4 PM)
5. Submit the form
6. **Expected:** Calendar shows red/blocked slots for that time period

**Verification:**
- Blocked slots should be visibly red
- Clicking a blocked slot should do nothing
- Tooltip/aria-label should indicate "blocked"

### Test 3: Cross-Session Persistence
**Steps:**
1. Log in → Set availability + block times → Logout
2. Log in again (new session)
3. Check calendar
4. **Expected:** All previously set availability and blocks appear

**Verification:**
- No need to re-set anything
- Data loads automatically on login

### Test 4: Profile Reset
**Steps:**
1. Complete Test 1 & 2
2. Go to profile page
3. Click "Reset Profile" or similar
4. Log in again
5. **Expected:** Schedule still persists OR resets depending on backend behavior

**Note:** This depends on backend profile reset implementation. Current implementation caches schedule in localStorage, so it will persist unless user clears cache.

## API Endpoints Used

### Backend Endpoints
```
GET /api/v1/schedule/get?dateInWeek=YYYY-MM-DD
- Fetches recurring weekly availability for the week containing the date
- Response: { schedules: ScheduleDTO[] }
- Optional: blockedSchedules: BlockedScheduleDTO[] (if backend returns it)

POST /api/v1/schedule/update
- Updates recurring weekly availability
- Body: { schedules: ScheduleDTO[] }
- Each schedule has day_of_week (2-8) and schedule_times (start/end times)

POST /api/v1/schedule/add-blocked-schedule
- Blocks a specific time period
- Body: { startTime, endTime, purpose, note }
```

## Data Format

### Available Schedule (Green Slots)
```json
{
  "schedules": [
    {
      "day_of_week": 2,  // Monday (2-8 range)
      "schedule_times": [
        {
          "start_time": "09:00:00",
          "end_time": "17:00:00"
        }
      ]
    }
  ]
}
```

### Blocked Schedule (Red Slots)
```json
{
  "startTime": "2024-12-23T14:00:00",
  "endTime": "2024-12-23T16:00:00",
  "purpose": "PERSONAL",
  "note": "Doctor appointment"
}
```

## Troubleshooting

### Schedule Not Loading
1. **Check localStorage:** DevTools → Storage → localStorage → look for `interviewerSchedule`
2. **Check network tab:** Verify `/api/v1/schedule/get` returns 200 status
3. **Check console:** Look for error messages or warnings
4. **Try refresh:** Page refresh may trigger reload from API
5. **Clear cache:** localStorage.removeItem('interviewerSchedule') then refresh

### Blocked Slots Not Showing
1. **Verify backend:** POST `/api/v1/schedule/add-blocked-schedule` returns 200
2. **Check date format:** Ensure dates are in `YYYY-MM-DD` format
3. **Reload calendar:** Change week, then return to original week
4. **Check overlap logic:** Verify blocked period actually overlaps with calendar hours (8 AM - 8 PM)

### Slots Can't Be Edited
1. **Check editing mode:** Look for "Edit" button status
2. **Check blocked state:** Red slots cannot be edited (by design)
3. **Clear selection:** Click "Clear Selection" button if available
4. **Refresh page:** Complete page reload

## Browser DevTools Debugging

### Check Cached Schedule
```javascript
// In browser console:
localStorage.getItem('interviewerSchedule') // View cached data
localStorage.removeItem('interviewerSchedule') // Clear cache
```

### Test API Directly
```javascript
// In browser console:
fetch('http://localhost:8080/api/v1/schedule/get', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
}).then(r => r.json()).then(d => console.log(d))
```

## Performance Considerations

- **Cache Strategy:** Schedule cached in localStorage to reduce API calls
- **Block Detection:** O(n*m) where n=blocks, m=hours in week (max 7*14 = 98 operations)
- **Lazy Loading:** Blocked schedules only loaded when week changes
- **Error Resilience:** Failed schedule load doesn't crash calendar

## Future Enhancements

1. **Real-time Sync:** Implement WebSocket for live updates across devices
2. **Conflict Detection:** Warn when block overlaps with scheduled availability
3. **Recurring Blocks:** Support repeating blocked periods (monthly, etc.)
4. **Export/Import:** Allow interviewers to backup and restore schedules
5. **Analytics:** Track availability patterns and interview distributions
6. **Notifications:** Alert interviewers of schedule conflicts or changes
7. **Mobile Optimization:** Touch-friendly interface for mobile devices
8. **Timezone Support:** Handle different timezones for international interviewers

## Summary

The calendar sync system is now fully implemented with:
✅ Automatic schedule loading on login via `loadAndCacheSchedule()`
✅ Persistent caching in localStorage
✅ Visual distinction between free time and blocked time
✅ Error resilience with graceful fallbacks
✅ Ready for user testing and verification

All services are deployed and healthy. Test the implementation using the guide above.
