const express = require('express');
const router = express.Router();
const { dbAll } = require('../database');
const { requireAuth } = require('../middleware/auth');

// View history logs
router.get('/', requireAuth, async (req, res) => {
  try {
    const statusFilter = req.query.status || '';
    
    let query = `
      SELECT h.*, m.MedicineName, m.Dosage 
      FROM History h
      JOIN Medicines m ON h.MedicineId = m.MedicineId
      WHERE h.UserId = ?
    `;
    const params = [req.session.userId];

    if (statusFilter && (statusFilter === 'Taken' || statusFilter === 'Missed')) {
      query += ' AND h.Status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY h.Date DESC, h.Time DESC';

    const logs = await dbAll(query, params);

    // Calculate aggregate metrics
    const allLogs = await dbAll(
      'SELECT Status, COUNT(*) as count FROM History WHERE UserId = ? GROUP BY Status',
      [req.session.userId]
    );

    let totalTaken = 0;
    let totalMissed = 0;

    allLogs.forEach(row => {
      if (row.Status === 'Taken') totalTaken = row.count;
      if (row.Status === 'Missed') totalMissed = row.count;
    });

    const totalLogs = totalTaken + totalMissed;
    const adherenceRate = totalLogs > 0 ? Math.round((totalTaken / totalLogs) * 100) : 0;

    res.render('history', {
      logs,
      activePage: 'history',
      statusFilter,
      stats: {
        totalTaken,
        totalMissed,
        totalLogs,
        adherenceRate
      }
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.redirect('/');
  }
});

module.exports = router;
