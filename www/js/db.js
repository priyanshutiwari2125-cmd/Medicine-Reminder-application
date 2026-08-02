// Client-side LocalStorage Database Wrapper
(function(global) {
  const MEDICINES_KEY = 'medimind_medicines';
  const HISTORY_KEY = 'medimind_history';
  const USER_ID = 1; // Default Guest User ID

  // Helper functions
  function getList(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : [];
    } catch (e) {
      console.error('Error reading localStorage key ' + key, e);
      return [];
    }
  }

  function saveList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.error('Error writing localStorage key ' + key, e);
    }
  }

  // Pre-seed database with sample medicines if it's completely empty, to show standard behaviour on first run
  function initSeedData() {
    const medicines = getList(MEDICINES_KEY);
    if (medicines.length === 0) {
      const seedMedicines = [
        {
          MedicineId: 1,
          UserId: USER_ID,
          MedicineName: 'Multivitamin',
          Dosage: '1 Tablet',
          Time: '08:00',
          DaysOfWeek: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
          Ringtone: 'Chime',
          Notes: 'Take in the morning after breakfast'
        },
        {
          MedicineId: 2,
          UserId: USER_ID,
          MedicineName: 'Omega 3 Fish Oil',
          Dosage: '2 Capsules',
          Time: '13:00',
          DaysOfWeek: 'Monday,Wednesday,Friday',
          Ringtone: 'Pulse',
          Notes: 'Take with lunch'
        },
        {
          MedicineId: 3,
          UserId: USER_ID,
          MedicineName: 'Calcium Supplement',
          Dosage: '1 Tablet',
          Time: '20:30',
          DaysOfWeek: 'Tuesday,Thursday,Saturday',
          Ringtone: 'Digital',
          Notes: 'Take before sleeping'
        }
      ];
      saveList(MEDICINES_KEY, seedMedicines);
      console.log('Seeded database with default medicines.');
    }
  }

  // Database API
  const DB = {
    getMedicines() {
      return getList(MEDICINES_KEY).filter(m => m.UserId === USER_ID);
    },

    getMedicineById(id) {
      id = parseInt(id, 10);
      return getList(MEDICINES_KEY).find(m => m.MedicineId === id && m.UserId === USER_ID) || null;
    },

    addMedicine(med) {
      const medicines = getList(MEDICINES_KEY);
      
      // Auto-increment ID
      const maxId = medicines.reduce((max, m) => m.MedicineId > max ? m.MedicineId : max, 0);
      const newMed = {
        MedicineId: maxId + 1,
        UserId: USER_ID,
        MedicineName: (med.medicineName || '').trim(),
        Dosage: (med.dosage || '').trim(),
        Time: med.time,
        DaysOfWeek: med.daysOfWeek, // Comma-separated string of days
        Ringtone: med.ringtone || 'Chime',
        Notes: (med.notes || '').trim()
      };

      medicines.push(newMed);
      saveList(MEDICINES_KEY, medicines);
      return newMed;
    },

    updateMedicine(id, med) {
      id = parseInt(id, 10);
      const medicines = getList(MEDICINES_KEY);
      const index = medicines.findIndex(m => m.MedicineId === id && m.UserId === USER_ID);
      
      if (index !== -1) {
        medicines[index] = {
          ...medicines[index],
          MedicineName: (med.medicineName || '').trim(),
          Dosage: (med.dosage || '').trim(),
          Time: med.time,
          DaysOfWeek: med.daysOfWeek,
          Ringtone: med.ringtone || 'Chime',
          Notes: (med.notes || '').trim()
        };
        saveList(MEDICINES_KEY, medicines);
        return true;
      }
      return false;
    },

    deleteMedicine(id) {
      id = parseInt(id, 10);
      // Remove from medicines list
      let medicines = getList(MEDICINES_KEY);
      medicines = medicines.filter(m => !(m.MedicineId === id && m.UserId === USER_ID));
      saveList(MEDICINES_KEY, medicines);

      // Cascading delete: Remove history logs
      let history = getList(HISTORY_KEY);
      history = history.filter(h => !(h.MedicineId === id && h.UserId === USER_ID));
      saveList(HISTORY_KEY, history);
      return true;
    },

    getHistory(statusFilter) {
      const history = getList(HISTORY_KEY).filter(h => h.UserId === USER_ID);
      const medicines = getList(MEDICINES_KEY);
      const medicinesMap = {};
      medicines.forEach(m => {
        medicinesMap[m.MedicineId] = m;
      });

      // Join history with medicines
      const joined = history.map(h => {
        const med = medicinesMap[h.MedicineId];
        return {
          ...h,
          MedicineName: med ? med.MedicineName : 'Deleted Medicine',
          Dosage: med ? med.Dosage : 'N/A'
        };
      });

      // Sort by Date DESC, Time DESC
      joined.sort((a, b) => {
        if (a.Date !== b.Date) {
          return b.Date.localeCompare(a.Date);
        }
        return b.Time.localeCompare(a.Time);
      });

      if (statusFilter === 'Taken' || statusFilter === 'Missed') {
        return joined.filter(h => h.Status === statusFilter);
      }
      return joined;
    },

    logHistory(medicineId, date, status) {
      medicineId = parseInt(medicineId, 10);
      const history = getList(HISTORY_KEY);
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check if log already exists for this medicine and date
      const index = history.findIndex(h => h.MedicineId === medicineId && h.Date === date && h.UserId === USER_ID);

      if (index !== -1) {
        // Update status and time
        history[index].Status = status;
        history[index].Time = currentHHMM;
      } else {
        // Insert new log
        const maxId = history.reduce((max, h) => h.HistoryId > max ? h.HistoryId : max, 0);
        history.push({
          HistoryId: maxId + 1,
          MedicineId: medicineId,
          UserId: USER_ID,
          Date: date,
          Time: currentHHMM,
          Status: status
        });
      }

      saveList(HISTORY_KEY, history);
      return true;
    },

    getTodaySchedule(todayStr) {
      // Find what weekday name matches todayStr
      const dateParts = todayStr.split('-');
      const todayDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const weekdayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Monday"

      const medicines = this.getMedicines();
      const history = getList(HISTORY_KEY).filter(h => h.UserId === USER_ID && h.Date === todayStr);

      const historyMap = {};
      history.forEach(h => {
        historyMap[h.MedicineId] = h.Status;
      });

      const todaySchedule = [];
      medicines.forEach(m => {
        const scheduledDays = m.DaysOfWeek ? m.DaysOfWeek.split(',') : [];
        // Active today, and NOT already logged as Taken or Missed
        if (scheduledDays.includes(weekdayName) && !historyMap[m.MedicineId]) {
          todaySchedule.push(m);
        }
      });

      return todaySchedule;
    }
  };

  // Run initialization
  initSeedData();

  // Export DB globally
  global.DB = DB;

})(window);
