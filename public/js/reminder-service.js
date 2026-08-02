// Client-side Alarm & Reminder Service
(function() {
  let activeAlarmInterval = null;
  let audioCtx = null;
  let alarmBufferSource = null;
  let isAlarmPlaying = false;
  let triggeredMedIds = new Set(); // Store meds already alarmed this session to prevent double triggers
  let currentlyAlarmingMed = null;

  // DOM Elements
  const alarmOverlay = document.getElementById('alarmOverlay');
  const alarmMedName = document.getElementById('alarmMedName');
  const alarmMedDosage = document.getElementById('alarmMedDosage');
  const alarmBtnTaken = document.getElementById('alarmBtnTaken');
  const alarmBtnMissed = document.getElementById('alarmBtnMissed');

  // Initialize Web Audio API to play the configured ringtone
  const playSynthesizedAlarm = (ringtoneName) => {
    try {
      if (isAlarmPlaying) return;
      isAlarmPlaying = true;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      if (ringtoneName === 'Digital') {
        // Digital High-Pitch Beeps
        activeAlarmInterval = setInterval(() => {
          if (!audioCtx) return;
          const playBeep = (delay) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + delay);
            osc.type = 'square';
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + delay + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.12);
            osc.start(audioCtx.currentTime + delay);
            osc.stop(audioCtx.currentTime + delay + 0.12);
          };
          playBeep(0);
          playBeep(0.2);
        }, 1200);
      } else if (ringtoneName === 'Pulse') {
        // Soft Pulsing Hum
        activeAlarmInterval = setInterval(() => {
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(220, audioCtx.currentTime);
          osc.type = 'triangle';
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);
        }, 1000);
      } else {
        // Default: Chime (Medical Chord)
        let noteIndex = 0;
        activeAlarmInterval = setInterval(() => {
          if (!audioCtx) return;

          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chords
          osc.frequency.setValueAtTime(frequencies[noteIndex % 3], audioCtx.currentTime);
          osc.type = 'sine';

          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

          osc.start();
          osc.stop(audioCtx.currentTime + 0.8);
          
          noteIndex++;
        }, 1000);
      }

    } catch (e) {
      console.error('Failed to play alarm sound:', e);
    }
  };

  const stopSynthesizedAlarm = () => {
    isAlarmPlaying = false;
    if (activeAlarmInterval) {
      clearInterval(activeAlarmInterval);
      activeAlarmInterval = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  };

  // Speak reminder details using Web Speech API
  const speakReminder = (name, dosage) => {
    if ('speechSynthesis' in window) {
      // Cancel previous speech
      window.speechSynthesis.cancel();
      
      const text = `Attention. It is time to take your medicine: ${name}. Your dosage is ${dosage}. Please record your status.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Poll server for today's schedule
  const checkReminders = async () => {
    try {
      const response = await fetch('/api/today-schedule');
      if (!response.ok) return;

      const schedule = await response.json();
      
      // Get current local time
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Find if any active medicine is due right now
      for (const med of schedule) {
        if (triggeredMedIds.has(med.MedicineId)) {
          continue; // Already triggered this session
        }

        // Trigger alarm if current time matches or has passed the scheduled reminder time
        if (currentHHMM >= med.Time) {
          triggerAlarm(med);
          break; // Trigger one alarm at a time
        }
      }
    } catch (err) {
      console.error('Error fetching today schedule:', err);
    }
  };

  // Show alarm modal, speak medication, and play chime
  const triggerAlarm = (med) => {
    currentlyAlarmingMed = med;
    triggeredMedIds.add(med.MedicineId);

    // Update overlay text
    alarmMedName.textContent = med.MedicineName;
    alarmMedDosage.textContent = med.Dosage;

    // Display overlay
    alarmOverlay.classList.add('active');

    // Trigger sounds/speech
    playSynthesizedAlarm(med.Ringtone || 'Chime');
    speakReminder(med.MedicineName, med.Dosage);

    // Trigger HTML5 Desktop Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification("Medication Reminder!", {
          body: `${med.MedicineName} - ${med.Dosage} is due now.`,
          tag: 'med-reminder-' + med.MedicineId,
          requireInteraction: true
        });

        notification.onclick = function() {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.error('Failed to trigger desktop notification:', err);
      }
    }
  };

  // Handle logging status from alarm overlay
  const logMedicineStatus = async (status) => {
    if (!currentlyAlarmingMed) return;

    const medId = currentlyAlarmingMed.MedicineId;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch('/history/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          medicineId: medId,
          date: todayStr,
          status: status
        })
      });

      if (response.ok) {
        // Stop sound and close modal
        dismissAlarm();
        
        // Refresh the page to update progress bar and status tags
        window.location.reload();
      } else {
        alert('Failed to log medicine status. Please try again.');
      }
    } catch (err) {
      console.error('Error posting log:', err);
      alert('Network error. Failed to log medicine status.');
    }
  };

  const dismissAlarm = () => {
    stopSynthesizedAlarm();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    alarmOverlay.classList.remove('active');
    currentlyAlarmingMed = null;
  };

  // Bind alarm buttons
  if (alarmBtnTaken && alarmBtnMissed) {
    alarmBtnTaken.addEventListener('click', () => logMedicineStatus('Taken'));
    alarmBtnMissed.addEventListener('click', () => logMedicineStatus('Missed'));
  }

  // Request permission for native system notifications on load
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  };

  // Register Service Worker for PWA application capabilities
  const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('Service Worker registered successfully:', reg.scope))
          .catch(err => console.error('Service Worker registration failed:', err));
      });
    }
  };

  // Initialize notifications, service workers, and schedule checks
  requestNotificationPermission();
  registerServiceWorker();
  checkReminders();
  setInterval(checkReminders, 10000);
})();
