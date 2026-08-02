const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireAuth } = require('../middleware/auth');

// Get active date boundaries
const getLocalDateString = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

// Main dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const today = getLocalDateString(0);
    const selectedDate = req.query.date || today;

    // Fetch user's medicines
    const allMedicines = await dbAll(
      'SELECT * FROM Medicines WHERE UserId = ? ORDER BY Time ASC',
      [req.session.userId]
    );

    // Fetch user's history for the selected date
    const historyLogs = await dbAll(
      'SELECT * FROM History WHERE UserId = ? AND Date = ?',
      [req.session.userId, selectedDate]
    );

    // Create a map of medicine history statuses
    const historyMap = {};
    historyLogs.forEach(log => {
      historyMap[log.MedicineId] = log.Status;
    });

    const activeMedicines = [];
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Get selected date's weekday name
    const dateParts = selectedDate.split('-');
    const selDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const weekdayName = selDate.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Monday"

    allMedicines.forEach(med => {
      const scheduledDays = med.DaysOfWeek ? med.DaysOfWeek.split(',') : [];

      // Check if medicine is active on selectedDate's weekday
      if (scheduledDays.includes(weekdayName)) {
        let status = 'Pending'; // Default
        const loggedStatus = historyMap[med.MedicineId];

        if (loggedStatus) {
          status = loggedStatus;
        } else {
          // If unlogged and selectedDate is in the past, or if today and time has passed
          if (selectedDate < today) {
            status = 'Missed'; // Unlogged past medicines are missed
          } else if (selectedDate === today) {
            if (med.Time < currentHHMM) {
              status = 'Pending'; // Overdue but pending action
            } else {
              status = 'Upcoming';
            }
          } else {
            status = 'Upcoming'; // Future date
          }
        }

        activeMedicines.push({
          ...med,
          status,
          isLogged: !!loggedStatus
        });
      }
    });

    // Calculate statistics
    const totalCount = activeMedicines.length;
    const takenCount = activeMedicines.filter(m => m.status === 'Taken').length;
    const missedCount = activeMedicines.filter(m => m.status === 'Missed').length;
    const pendingCount = activeMedicines.filter(m => m.status === 'Pending').length;
    
    const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

    // Generate Monday to Sunday days for the current week
    const calendarDays = [];
    const todayDate = new Date();
    const currentDayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    for (let i = 0; i < 7; i++) {
      const offset = i - daysSinceMonday;
      const dateStr = getLocalDateString(offset);
      const d = new Date();
      d.setDate(d.getDate() + offset);
      
      calendarDays.push({
        dateString: dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: dateStr === today
      });
    }

    res.render('dashboard', {
      activePage: 'dashboard',
      selectedDate,
      today,
      activeMedicines,
      stats: {
        totalCount,
        takenCount,
        missedCount,
        pendingCount,
        progressPercent
      },
      calendarDays
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Log medicine status (Taken/Missed)
router.post('/history/log', requireAuth, async (req, res) => {
  const { medicineId, date, status } = req.body;

  if (!medicineId || !date || !status) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    // Verify medicine belongs to user
    const medicine = await dbGet(
      'SELECT * FROM Medicines WHERE MedicineId = ? AND UserId = ?',
      [medicineId, req.session.userId]
    );

    if (!medicine) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if entry already exists in history
    const existingLog = await dbGet(
      'SELECT * FROM History WHERE MedicineId = ? AND Date = ?',
      [medicineId, date]
    );

    if (existingLog) {
      // Update
      await dbRun(
        'UPDATE History SET Status = ?, Time = ? WHERE HistoryId = ?',
        [status, currentHHMM, existingLog.HistoryId]
      );
    } else {
      // Insert
      await dbRun(
        'INSERT INTO History (MedicineId, UserId, Date, Time, Status) VALUES (?, ?, ?, ?, ?)',
        [medicineId, req.session.userId, date, currentHHMM, status]
      );
    }

    // Return response based on request type
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.json({ success: true });
    } else {
      res.redirect(`/?date=${date}`);
    }

  } catch (error) {
    console.error('Error logging history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// JSON API endpoint to fetch schedule for client-side alarm alarms
router.get('/api/today-schedule', requireAuth, async (req, res) => {
  try {
    const today = getLocalDateString(0);
    const medicines = await dbAll(
      'SELECT * FROM Medicines WHERE UserId = ?',
      [req.session.userId]
    );

    const historyLogs = await dbAll(
      'SELECT * FROM History WHERE UserId = ? AND Date = ?',
      [req.session.userId, today]
    );

    const historyMap = {};
    historyLogs.forEach(log => {
      historyMap[log.MedicineId] = log.Status;
    });

    const todaysSchedule = [];

    // Get today's weekday name
    const dateParts = today.split('-');
    const todayDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const todayWeekday = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

    medicines.forEach(med => {
      const scheduledDays = med.DaysOfWeek ? med.DaysOfWeek.split(',') : [];

      // Active today and NOT already logged as Taken or Missed
      if (scheduledDays.includes(todayWeekday) && !historyMap[med.MedicineId]) {
        todaysSchedule.push(med);
      }
    });

    res.json(todaysSchedule);
  } catch (error) {
    console.error('API schedule fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
