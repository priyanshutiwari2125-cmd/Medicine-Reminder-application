const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireAuth } = require('../middleware/auth');

// List all medicines
router.get('/', requireAuth, async (req, res) => {
  try {
    const medicines = await dbAll(
      'SELECT * FROM Medicines WHERE UserId = ? ORDER BY Time ASC',
      [req.session.userId]
    );
    res.render('medicines/index', { medicines, activePage: 'medicines' });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.redirect('/');
  }
});

// Add medicine view
router.get('/add', requireAuth, (req, res) => {
  res.render('medicines/add', { error: null, activePage: 'medicines' });
});

// Add medicine action
router.post('/add', requireAuth, async (req, res) => {
  const { medicineName, dosage, time, daysOfWeek, ringtone, notes } = req.body;

  // Process daysOfWeek checkbox array/string robustly
  let daysOfWeekStr = '';
  if (Array.isArray(daysOfWeek)) {
    daysOfWeekStr = daysOfWeek.join(',');
  } else if (typeof daysOfWeek === 'string') {
    daysOfWeekStr = daysOfWeek;
  }

  if (!medicineName || !dosage || !time || !daysOfWeekStr) {
    return res.render('medicines/add', { 
      error: 'Medicine Name, Dosage, Reminder Time, and Scheduled Days are required.',
      activePage: 'medicines'
    });
  }

  try {
    await dbRun(
      `INSERT INTO Medicines (UserId, MedicineName, Dosage, Time, DaysOfWeek, Ringtone, Notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        medicineName.trim(),
        dosage.trim(),
        time, // Stored as HH:MM
        daysOfWeekStr,
        ringtone || 'Chime',
        notes ? notes.trim() : ''
      ]
    );
    res.redirect('/medicines');
  } catch (error) {
    console.error('Error adding medicine:', error);
    res.render('medicines/add', { 
      error: 'An error occurred while adding the medicine.',
      activePage: 'medicines'
    });
  }
});

// Edit medicine view
router.get('/edit/:id', requireAuth, async (req, res) => {
  try {
    const medicine = await dbGet(
      'SELECT * FROM Medicines WHERE MedicineId = ? AND UserId = ?',
      [req.params.id, req.session.userId]
    );

    if (!medicine) {
      return res.redirect('/medicines');
    }

    res.render('medicines/edit', { medicine, error: null, activePage: 'medicines' });
  } catch (error) {
    console.error('Error fetching medicine for edit:', error);
    res.redirect('/medicines');
  }
});

// Edit medicine action
router.post('/edit/:id', requireAuth, async (req, res) => {
  const { medicineName, dosage, time, daysOfWeek, ringtone, notes } = req.body;
  const medicineId = req.params.id;

  // Process daysOfWeek checkbox array/string robustly
  let daysOfWeekStr = '';
  if (Array.isArray(daysOfWeek)) {
    daysOfWeekStr = daysOfWeek.join(',');
  } else if (typeof daysOfWeek === 'string') {
    daysOfWeekStr = daysOfWeek;
  }

  try {
    // Verify ownership
    const medicine = await dbGet(
      'SELECT * FROM Medicines WHERE MedicineId = ? AND UserId = ?',
      [medicineId, req.session.userId]
    );

    if (!medicine) {
      return res.redirect('/medicines');
    }

    if (!medicineName || !dosage || !time || !daysOfWeekStr) {
      return res.render('medicines/edit', { 
        medicine: { ...medicine, MedicineName: medicineName, Dosage: dosage, Time: time, DaysOfWeek: daysOfWeekStr, Ringtone: ringtone, Notes: notes },
        error: 'Medicine Name, Dosage, Reminder Time, and Scheduled Days are required.',
        activePage: 'medicines'
      });
    }

    await dbRun(
      `UPDATE Medicines 
       SET MedicineName = ?, Dosage = ?, Time = ?, DaysOfWeek = ?, Ringtone = ?, Notes = ? 
       WHERE MedicineId = ? AND UserId = ?`,
      [
        medicineName.trim(),
        dosage.trim(),
        time,
        daysOfWeekStr,
        ringtone || 'Chime',
        notes ? notes.trim() : '',
        medicineId,
        req.session.userId
      ]
    );

    res.redirect('/medicines');
  } catch (error) {
    console.error('Error updating medicine:', error);
    const medicine = await dbGet(
      'SELECT * FROM Medicines WHERE MedicineId = ? AND UserId = ?',
      [medicineId, req.session.userId]
    );
    res.render('medicines/edit', { 
      medicine, 
      error: 'An error occurred while updating the medicine.',
      activePage: 'medicines'
    });
  }
});

// Delete medicine action
router.post('/delete/:id', requireAuth, async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM Medicines WHERE MedicineId = ? AND UserId = ?',
      [req.params.id, req.session.userId]
    );
    res.redirect('/medicines');
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.redirect('/medicines');
  }
});

module.exports = router;
