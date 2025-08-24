        // Global variables
        let attendanceData = [];
        let isAdminLoggedIn = false;
        let currentStudent = JSON.parse(localStorage.getItem('currentStudent')) || null;
        let currentReportData = [];
        let currentPage = 1;
        let itemsPerPage = 10;
        let sortDirection = 'asc';
        let sortColumn = 'name';
        let db = null;

        // IndexedDB Database Management
        class AttendanceDB {
            constructor() {
                this.dbName = 'AttendanceDB';
                this.version = 1;
                this.db = null;
            }

            async init() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.version);
                    
                    request.onerror = () => {
                        console.error('Database error:', request.error);
                        this.updateDBStatus('error', 'Database Error');
                        reject(request.error);
                    };
                    
                    request.onsuccess = () => {
                        this.db = request.result;
                        console.log('Database opened successfully');
                        this.updateDBStatus('connected', 'Database Connected');
                        resolve(this.db);
                    };
                    
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        
                        // Create attendance store
                        if (!db.objectStoreNames.contains('attendance')) {
                            const attendanceStore = db.createObjectStore('attendance', { 
                                keyPath: 'id', 
                                autoIncrement: true 
                            });
                            
                            // Create indexes for efficient querying
                            attendanceStore.createIndex('name', 'name', { unique: false });
                            attendanceStore.createIndex('class', 'class', { unique: false });
                            attendanceStore.createIndex('date', 'date', { unique: false });
                            attendanceStore.createIndex('prayer', 'prayer', { unique: false });
                            attendanceStore.createIndex('nameDate', ['name', 'date'], { unique: false });
                            attendanceStore.createIndex('nameDatePrayer', ['name', 'date', 'prayer'], { unique: true });
                        }
                        
                        // Create students store
                        if (!db.objectStoreNames.contains('students')) {
                            const studentsStore = db.createObjectStore('students', { 
                                keyPath: 'id', 
                                autoIncrement: true 
                            });
                            studentsStore.createIndex('name', 'name', { unique: false });
                            studentsStore.createIndex('class', 'class', { unique: false });
                            studentsStore.createIndex('nameClass', ['name', 'class'], { unique: true });
                        }
                        
                        console.log('Database schema created');
                        this.updateDBStatus('connected', 'Database Initialized');
                    };
                });
            }

            updateDBStatus(status, message) {
                const statusElement = document.getElementById('dbStatus');
                if (statusElement) {
                    statusElement.className = `db-status db-${status}`;
                    statusElement.innerHTML = `<i class="fas fa-database"></i> ${message}`;
                }
            }

            async addAttendance(attendanceRecord) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readwrite');
                    const store = transaction.objectStore('attendance');
                    
                    // Add timestamp and unique ID
                    attendanceRecord.timestamp = new Date().toISOString();
                    attendanceRecord.id = Date.now() + Math.random();
                    
                    const request = store.add(attendanceRecord);
                    
                    request.onsuccess = () => {
                        console.log('Attendance record added:', attendanceRecord);
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        console.error('Error adding attendance:', request.error);
                        reject(request.error);
                    };
                });
            }

            async getAllAttendance() {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readonly');
                    const store = transaction.objectStore('attendance');
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async getAttendanceByDate(date) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readonly');
                    const store = transaction.objectStore('attendance');
                    const index = store.index('date');
                    const request = index.getAll(date);
                    
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async getAttendanceByStudent(studentName) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readonly');
                    const store = transaction.objectStore('attendance');
                    const index = store.index('name');
                    const request = index.getAll(studentName);
                    
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async checkDuplicateAttendance(name, date, prayer) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readonly');
                    const store = transaction.objectStore('attendance');
                    const index = store.index('nameDatePrayer');
                    const request = index.get([name, date, prayer]);
                    
                    request.onsuccess = () => {
                        resolve(request.result !== undefined);
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async addStudent(student) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['students'], 'readwrite');
                    const store = transaction.objectStore('students');
                    
                    student.registeredAt = new Date().toISOString();
                    
                    const request = store.add(student);
                    
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        // If student already exists, just resolve
                        if (request.error.name === 'ConstraintError') {
                            resolve(null);
                        } else {
                            reject(request.error);
                        }
                    };
                });
            }

            async getAllStudents() {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['students'], 'readonly');
                    const store = transaction.objectStore('students');
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async deleteAllAttendance() {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readwrite');
                    const store = transaction.objectStore('attendance');
                    const request = store.clear();
                    
                    request.onsuccess = () => {
                        resolve();
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async deleteStudentAttendance(studentName) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['attendance'], 'readwrite');
                    const store = transaction.objectStore('attendance');
                    const index = store.index('name');
                    const request = index.openCursor(studentName);
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }

            async getAttendanceStats() {
                const allAttendance = await this.getAllAttendance();
                const today = new Date().toISOString().split('T')[0];
                const currentMonth = new Date().toISOString().slice(0, 7);
                
                const todayAttendance = allAttendance.filter(record => record.date === today);
                const monthlyAttendance = allAttendance.filter(record => record.date.startsWith(currentMonth));
                const uniqueStudents = [...new Set(allAttendance.map(record => record.name))];
                
                return {
                    totalStudents: uniqueStudents.length,
                    todayAttendance: todayAttendance.length,
                    monthlyAttendance: monthlyAttendance.length,
                    allAttendance: allAttendance
                };
            }

            async exportDatabase() {
                const allAttendance = await this.getAllAttendance();
                const allStudents = await this.getAllStudents();
                
                return {
                    attendance: allAttendance,
                    students: allStudents,
                    exportDate: new Date().toISOString(),
                    version: this.version
                };
            }
        }

        // Initialize database
        const attendanceDB = new AttendanceDB();
        
        // Prayer times with attendance windows (in 24-hour format)
        const prayerTimes = {
            subuh: {
                time: '04:30',
                startWindow: '04:00',
                endWindow: '06:00'
            },
            dzuhur: {
                time: '11:45',
                startWindow: '11:30',
                endWindow: '13:00'
            },
            ashar: {
                time: '15:15',
                startWindow: '15:00',
                endWindow: '16:30'
            },
            maghrib: {
                time: '17:45',
                startWindow: '17:30',
                endWindow: '19:00'
            },
            isya: {
                time: '19:00',
                startWindow: '18:45',
                endWindow: '21:00'
            }
        };

        // Initialize the application
        async function init() {
            try {
                // Initialize database
                await attendanceDB.init();
                
                // Load attendance data from database
                await loadAttendanceData();
                
                updateCurrentTime();
                setInterval(updateCurrentTime, 1000);
                setInterval(checkPrayerTime, 60000); // Check every minute
                
                // Check if student is already logged in
                if (currentStudent) {
                    showStudentSection();
                } else {
                    showStudentLogin();
                }
                
                // Initial prayer card status update
                updatePrayerCardStatus();
                
                console.log('Application initialized successfully');
            } catch (error) {
                console.error('Failed to initialize application:', error);
                attendanceDB.updateDBStatus('error', 'Initialization Failed');
            }
        }

        // Load attendance data from database
        async function loadAttendanceData() {
            try {
                attendanceData = await attendanceDB.getAllAttendance();
                console.log('Loaded attendance data:', attendanceData.length, 'records');
            } catch (error) {
                console.error('Failed to load attendance data:', error);
                attendanceData = [];
            }
        }

        // Update current time display
        function updateCurrentTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('currentTime').textContent = timeString;
        }

        // Check if it's prayer time and play adzan
        function checkPrayerTime() {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            Object.keys(prayerTimes).forEach(prayer => {
                if (currentTime === prayerTimes[prayer].time) {
                    playAdzan();
                    highlightCurrentPrayer(prayer);
                    showPrayerNotification(prayer);
                }
            });
            
            // Update prayer card status based on time windows
            updatePrayerCardStatus();
        }

        // Play adzan audio
        function playAdzan() {
            const audio = document.getElementById('adzanAudio');
            // Note: In a real implementation, you would need to provide the adzan.mp3 file
            // For demo purposes, we'll show an alert
            alert('🕌 Waktu Sholat Telah Tiba! 🕌');
            // audio.play().catch(e => console.log('Audio play failed:', e));
        }

        // Highlight current prayer time
        function highlightCurrentPrayer(prayer) {
            // Remove previous highlights
            document.querySelectorAll('.prayer-time-active').forEach(el => {
                el.classList.remove('prayer-time-active');
            });
            
            // Add highlight to current prayer
            const prayerElement = document.getElementById(prayer + '-time');
            if (prayerElement) {
                prayerElement.classList.add('prayer-time-active');
            }
        }

        // Show prayer notification
        function showPrayerNotification(prayer) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="floating-icon" style="width: 50px; height: 50px; background: linear-gradient(135deg, #2ecc71, #27ae60); margin-right: 20px; flex-shrink: 0;">
                        <i class="fas fa-mosque" style="color: white; font-size: 20px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; font-size: 18px;">Waktu Sholat!</p>
                        <p style="font-size: 16px; color: #7f8c8d; margin: 0;">Waktu ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} telah tiba!</p>
                    </div>
                </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        // Update prayer card status based on time windows
        function updatePrayerCardStatus() {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            Object.keys(prayerTimes).forEach(prayer => {
                const prayerCard = document.querySelector(`[onclick="markAttendance('${prayer}')"]`);
                const prayerData = prayerTimes[prayer];
                
                if (isTimeInWindow(currentTime, prayerData.startWindow, prayerData.endWindow)) {
                    // Within attendance window - enable card
                    prayerCard.classList.remove('disabled');
                    prayerCard.onclick = () => markAttendance(prayer);
                } else {
                    // Outside attendance window - disable card
                    prayerCard.classList.add('disabled');
                    prayerCard.onclick = () => showTimeWindowMessage(prayer);
                }
            });
        }

        // Check if current time is within attendance window
        function isTimeInWindow(currentTime, startWindow, endWindow) {
            const current = timeToMinutes(currentTime);
            const start = timeToMinutes(startWindow);
            const end = timeToMinutes(endWindow);
            
            return current >= start && current <= end;
        }

        // Convert time string to minutes for comparison
        function timeToMinutes(timeString) {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
        }

        // Show message when trying to attend outside time window
        function showTimeWindowMessage(prayer) {
            const prayerData = prayerTimes[prayer];
            const message = document.createElement('div');
            message.className = 'notification';
            message.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="floating-icon" style="width: 50px; height: 50px; background: linear-gradient(135deg, #e74c3c, #c0392b); margin-right: 20px; flex-shrink: 0;">
                        <i class="fas fa-clock" style="color: white; font-size: 20px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; font-size: 18px;">Waktu Absensi Berakhir!</p>
                        <p style="font-size: 16px; color: #7f8c8d; margin: 0 0 10px 0;">Absensi ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} sudah tidak tersedia</p>
                        <div class="status-danger" style="font-size: 12px;">
                            Waktu: ${prayerData.startWindow} - ${prayerData.endWindow}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.remove();
            }, 4000);
        }

        // Student login functions
        async function studentLogin() {
            const name = document.getElementById('loginStudentName').value.trim();
            const studentClass = document.getElementById('loginStudentClass').value;
            
            if (!name || !studentClass) {
                alert('Mohon lengkapi nama dan kelas!');
                return;
            }
            
            try {
                // Add student to database
                await attendanceDB.addStudent({ name: name, class: studentClass });
                
                currentStudent = { name: name, class: studentClass };
                localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
                
                showStudentSection();
                showWelcomeMessage();
            } catch (error) {
                console.error('Error during student login:', error);
                alert('Terjadi kesalahan saat login. Silakan coba lagi.');
            }
        }
        
        function studentLogout() {
            currentStudent = null;
            localStorage.removeItem('currentStudent');
            showStudentLogin();
        }
        
        function showStudentLogin() {
            document.getElementById('studentLoginSection').classList.remove('hidden');
            document.getElementById('studentSection').classList.add('hidden');
            document.getElementById('adminSection').classList.add('hidden');
        }
        
        function showStudentSection() {
            document.getElementById('studentLoginSection').classList.add('hidden');
            document.getElementById('studentSection').classList.remove('hidden');
            document.getElementById('adminSection').classList.add('hidden');
            
            // Update display with current student info
            document.getElementById('displayStudentName').textContent = currentStudent.name;
            document.getElementById('displayStudentClass').textContent = currentStudent.class;
            
            updateAttendanceStatus();
        }
        
        function showWelcomeMessage() {
            const message = document.createElement('div');
            message.className = 'notification';
            message.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="floating-icon" style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); margin-right: 20px; flex-shrink: 0;">
                        <i class="fas fa-user-graduate" style="color: white; font-size: 20px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; font-size: 18px;">Selamat Datang!</p>
                        <p style="font-size: 16px; color: #7f8c8d; margin: 0;">${currentStudent.name}, silakan lakukan absensi sholat</p>
                    </div>
                </div>
            `;
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.remove();
            }, 4000);
        }

        // Mark attendance for a prayer
        async function markAttendance(prayer) {
            if (!currentStudent) {
                alert('Silakan login terlebih dahulu!');
                return;
            }

            // Check if current time is within attendance window
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            const prayerData = prayerTimes[prayer];
            
            if (!isTimeInWindow(currentTime, prayerData.startWindow, prayerData.endWindow)) {
                showTimeWindowMessage(prayer);
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            
            try {
                // Check if already marked for today using database
                const isDuplicate = await attendanceDB.checkDuplicateAttendance(currentStudent.name, today, prayer);
                
                if (isDuplicate) {
                    alert(`Anda sudah absen ${prayer} hari ini!`);
                    return;
                }

                const attendanceRecord = {
                    name: currentStudent.name,
                    class: currentStudent.class,
                    date: today,
                    prayer: prayer,
                    time: new Date().toLocaleTimeString('id-ID')
                };

                // Save to database
                await attendanceDB.addAttendance(attendanceRecord);
                
                // Reload attendance data
                await loadAttendanceData();
                
                updateAttendanceStatus();
                showSuccessMessage(prayer);
                
                console.log('Attendance marked successfully:', attendanceRecord);
            } catch (error) {
                console.error('Error marking attendance:', error);
                alert('Terjadi kesalahan saat menyimpan absensi. Silakan coba lagi.');
            }
        }

        // Update attendance status display
        function updateAttendanceStatus() {
            if (!currentStudent) return;
            
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            
            ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].forEach(prayer => {
                const statusElement = document.getElementById(prayer + '-status');
                const prayerData = prayerTimes[prayer];
                const isMarked = attendanceData.some(record => 
                    record.name === currentStudent.name && 
                    record.date === today && 
                    record.prayer === prayer
                );
                
                if (isMarked) {
                    statusElement.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 5px;"></i>Sudah Absen';
                    statusElement.className = 'status-badge status-success';
                } else if (isTimeInWindow(currentTime, prayerData.startWindow, prayerData.endWindow)) {
                    statusElement.innerHTML = '<i class="fas fa-clock" style="margin-right: 5px;"></i>Bisa Absen Sekarang';
                    statusElement.className = 'status-badge status-info';
                } else if (timeToMinutes(currentTime) < timeToMinutes(prayerData.startWindow)) {
                    statusElement.innerHTML = '<i class="fas fa-hourglass-start" style="margin-right: 5px;"></i>Belum Waktunya';
                    statusElement.className = 'status-badge status-warning';
                } else {
                    statusElement.innerHTML = '<i class="fas fa-times-circle" style="margin-right: 5px;"></i>Waktu Habis';
                    statusElement.className = 'status-badge status-danger';
                }
            });
        }

        // Show success message
        function showSuccessMessage(prayer) {
            const message = document.createElement('div');
            message.className = 'notification';
            message.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="floating-icon" style="width: 50px; height: 50px; background: linear-gradient(135deg, #2ecc71, #27ae60); margin-right: 20px; flex-shrink: 0;">
                        <i class="fas fa-check-circle" style="color: white; font-size: 20px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; font-size: 18px;">Absensi Berhasil!</p>
                        <p style="font-size: 16px; color: #7f8c8d; margin: 0;">Absensi ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} telah dicatat ke database</p>
                    </div>
                </div>
            `;
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.remove();
            }, 3000);
        }

        // Admin functions
        function showAdminLogin() {
            document.getElementById('adminModal').classList.remove('hidden');
            document.getElementById('adminModal').classList.add('flex');
        }

        function closeAdminModal() {
            document.getElementById('adminModal').classList.add('hidden');
            document.getElementById('adminModal').classList.remove('flex');
            document.getElementById('adminUsername').value = '';
            document.getElementById('adminPassword').value = '';
        }

        async function adminLogin() {
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            
            if (username === 'admin' && password === 'admin') {
                isAdminLoggedIn = true;
                closeAdminModal();
                showAdminSection();
                await updateAdminStats();
            } else {
                alert('Username atau password salah!');
            }
        }

        function showAdminSection() {
            document.getElementById('studentLoginSection').classList.add('hidden');
            document.getElementById('studentSection').classList.add('hidden');
            document.getElementById('adminSection').classList.remove('hidden');
            showDailyReport();
        }

        function logout() {
            isAdminLoggedIn = false;
            document.getElementById('adminSection').classList.add('hidden');
            
            // Return to appropriate section based on student login status
            if (currentStudent) {
                showStudentSection();
            } else {
                showStudentLogin();
            }
        }

        async function updateAdminStats() {
            try {
                const stats = await attendanceDB.getAttendanceStats();
                
                document.getElementById('totalStudents').textContent = stats.totalStudents;
                document.getElementById('todayAttendance').textContent = stats.todayAttendance;
                document.getElementById('monthlyAttendance').textContent = stats.monthlyAttendance;
                
                const totalPossible = stats.totalStudents * 5; // 5 prayers per day
                const percentage = totalPossible > 0 ? Math.round((stats.todayAttendance / totalPossible) * 100) : 0;
                document.getElementById('attendancePercentage').textContent = percentage + '%';
            } catch (error) {
                console.error('Error updating admin stats:', error);
            }
        }

        async function showDailyReport() {
            const today = new Date().toISOString().split('T')[0];
            try {
                const todayData = await attendanceDB.getAttendanceByDate(today);
                currentReportData = processReportData(todayData);
                
                // Set filter date to today
                document.getElementById('filterDate').value = today;
                
                generateReportTable();
                updateReportSummary();
            } catch (error) {
                console.error('Error showing daily report:', error);
            }
        }

        async function showMonthlyReport() {
            const currentMonth = new Date().toISOString().slice(0, 7);
            try {
                const allData = await attendanceDB.getAllAttendance();
                const monthlyData = allData.filter(record => record.date.startsWith(currentMonth));
                currentReportData = processReportData(monthlyData);
                
                // Clear date filter
                document.getElementById('filterDate').value = '';
                
                generateReportTable();
                updateReportSummary();
            } catch (error) {
                console.error('Error showing monthly report:', error);
            }
        }

        function showCustomDateReport() {
            const dateInput = document.getElementById('filterDate');
            if (!dateInput.value) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
            filterByDate();
        }

        function processReportData(data) {
            const studentSummary = {};
            
            // Get all unique students from attendance data
            const allStudents = [...new Set(attendanceData.map(record => `${record.name}|${record.class}`))];
            
            // Initialize all students with zero attendance
            allStudents.forEach(studentKey => {
                const [name, studentClass] = studentKey.split('|');
                studentSummary[name] = {
                    name: name,
                    class: studentClass,
                    subuh: 0,
                    dzuhur: 0,
                    ashar: 0,
                    maghrib: 0,
                    isya: 0
                };
            });
            
            // Count attendance from filtered data
            data.forEach(record => {
                if (studentSummary[record.name]) {
                    studentSummary[record.name][record.prayer]++;
                }
            });
            
            return Object.values(studentSummary);
        }

        function generateReportTable() {
            const tbody = document.getElementById('reportTableBody');
            tbody.innerHTML = '';
            
            // Apply filters and sorting
            let filteredData = applyFilters(currentReportData);
            filteredData = applySorting(filteredData);
            
            // Pagination
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedData = filteredData.slice(startIndex, endIndex);
            
            paginatedData.forEach((student, index) => {
                const total = student.subuh + student.dzuhur + student.ashar + student.maghrib + student.isya;
                const globalIndex = startIndex + index + 1;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 20px; font-size: 16px; color: #7f8c8d; font-weight: 600;">${globalIndex}</td>
                    <td style="padding: 20px; font-size: 16px; font-weight: 700; color: #2c3e50;">${student.name}</td>
                    <td style="padding: 20px; font-size: 16px; color: #7f8c8d;">
                        <span class="status-info">
                            ${student.class}
                        </span>
                    </td>
                    <td style="padding: 20px; text-align: center;">
                        ${student.subuh > 0 ? 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #2ecc71, #27ae60); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: white; font-size: 14px;"></i></div>` : 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: white; font-size: 14px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 20px; text-align: center;">
                        ${student.dzuhur > 0 ? 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #2ecc71, #27ae60); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: white; font-size: 14px;"></i></div>` : 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: white; font-size: 14px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 20px; text-align: center;">
                        ${student.ashar > 0 ? 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #2ecc71, #27ae60); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: white; font-size: 14px;"></i></div>` : 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: white; font-size: 14px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 20px; text-align: center;">
                        ${student.maghrib > 0 ? 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #2ecc71, #27ae60); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: white; font-size: 14px;"></i></div>` : 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: white; font-size: 14px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 20px; text-align: center;">
                        ${student.isya > 0 ? 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #2ecc71, #27ae60); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: white; font-size: 14px;"></i></div>` : 
                            `<div style="width: 30px; height: 30px; background: linear-gradient(135deg, #e74c3c, #c0392b); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: white; font-size: 14px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 20px; font-weight: 700; text-align: center;">
                        <span class="status-badge ${total >= 4 ? 'status-success' : total >= 2 ? 'status-warning' : 'status-danger'}">
                            ${total}/5
                        </span>
                    </td>
                    <td style="padding: 20px; text-align: center;">
                        <button onclick="viewStudentDetail('${student.name}')" class="modern-btn" style="padding: 8px 12px; margin-right: 10px;" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteStudentData('${student.name}')" class="modern-btn" style="padding: 8px 12px;" title="Hapus Data">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            updatePagination(filteredData.length);
        }

        function applyFilters(data) {
            const searchTerm = document.getElementById('searchStudent').value.toLowerCase();
            const classFilter = document.getElementById('filterClass').value;
            
            return data.filter(student => {
                const matchesSearch = student.name.toLowerCase().includes(searchTerm) || 
                                    student.class.toLowerCase().includes(searchTerm);
                const matchesClass = !classFilter || student.class === classFilter;
                
                return matchesSearch && matchesClass;
            });
        }

        function applySorting(data) {
            return data.sort((a, b) => {
                let aValue, bValue;
                
                switch (sortColumn) {
                    case 'name':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'class':
                        aValue = a.class;
                        bValue = b.class;
                        break;
                    case 'total':
                        aValue = a.subuh + a.dzuhur + a.ashar + a.maghrib + a.isya;
                        bValue = b.subuh + b.dzuhur + b.ashar + b.maghrib + b.isya;
                        break;
                    default:
                        return 0;
                }
                
                if (sortDirection === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });
        }

        function updateReportSummary() {
            const summary = {
                subuh: 0,
                dzuhur: 0,
                ashar: 0,
                maghrib: 0,
                isya: 0
            };
            
            currentReportData.forEach(student => {
                summary.subuh += student.subuh > 0 ? 1 : 0;
                summary.dzuhur += student.dzuhur > 0 ? 1 : 0;
                summary.ashar += student.ashar > 0 ? 1 : 0;
                summary.maghrib += student.maghrib > 0 ? 1 : 0;
                summary.isya += student.isya > 0 ? 1 : 0;
            });
            
            document.getElementById('summarySubuh').textContent = summary.subuh;
            document.getElementById('summaryDzuhur').textContent = summary.dzuhur;
            document.getElementById('summaryAshar').textContent = summary.ashar;
            document.getElementById('summaryMaghrib').textContent = summary.maghrib;
            document.getElementById('summaryIsya').textContent = summary.isya;
        }

        function filterTable() {
            currentPage = 1;
            generateReportTable();
        }

        async function filterByDate() {
            const selectedDate = document.getElementById('filterDate').value;
            if (selectedDate) {
                try {
                    const dateData = await attendanceDB.getAttendanceByDate(selectedDate);
                    currentReportData = processReportData(dateData);
                } catch (error) {
                    console.error('Error filtering by date:', error);
                    currentReportData = [];
                }
            } else {
                showMonthlyReport();
                return;
            }
            
            currentPage = 1;
            generateReportTable();
            updateReportSummary();
        }

        function sortTable(column) {
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            
            generateReportTable();
        }

        function updatePagination(totalItems) {
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startItem = (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, totalItems);
            
            document.getElementById('showingStart').textContent = totalItems > 0 ? startItem : 0;
            document.getElementById('showingEnd').textContent = endItem;
            document.getElementById('totalRecords').textContent = totalItems;
            
            // Update navigation buttons
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
            
            // Generate page numbers
            const pageNumbers = document.getElementById('pageNumbers');
            pageNumbers.innerHTML = '';
            
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'modern-btn';
                pageBtn.style.padding = '8px 12px';
                pageBtn.style.opacity = i === currentPage ? '1' : '0.7';
                pageBtn.textContent = i;
                pageBtn.onclick = () => goToPage(i);
                pageNumbers.appendChild(pageBtn);
            }
        }

        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                generateReportTable();
            }
        }

        function nextPage() {
            const totalPages = Math.ceil(applyFilters(currentReportData).length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                generateReportTable();
            }
        }

        function goToPage(page) {
            currentPage = page;
            generateReportTable();
        }

        async function viewStudentDetail(studentName) {
            try {
                const studentData = await attendanceDB.getAttendanceByStudent(studentName);
                const student = currentReportData.find(s => s.name === studentName);
                
                if (!student) return;
                
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 700px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                            <div>
                                <h3 class="modern-title" style="margin: 0 0 10px 0; font-size: 32px;">${student.name}</h3>
                                <p style="margin: 0; color: #7f8c8d; font-size: 18px; font-weight: 600;">${student.class}</p>
                            </div>
                            <button onclick="this.closest('.modal').remove()" class="modern-btn" style="padding: 10px 15px;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="grid grid-5 mb-6">
                            <div class="stats-card" style="padding: 20px; background: ${student.subuh > 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};">
                                <div class="stats-number" style="color: ${student.subuh > 0 ? '#27ae60' : '#c0392b'};">${student.subuh}</div>
                                <div style="font-size: 14px; color: #7f8c8d; font-weight: 600; text-transform: uppercase;">Subuh</div>
                            </div>
                            <div class="stats-card" style="padding: 20px; background: ${student.dzuhur > 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};">
                                <div class="stats-number" style="color: ${student.dzuhur > 0 ? '#27ae60' : '#c0392b'};">${student.dzuhur}</div>
                                <div style="font-size: 14px; color: #7f8c8d; font-weight: 600; text-transform: uppercase;">Dzuhur</div>
                            </div>
                            <div class="stats-card" style="padding: 20px; background: ${student.ashar > 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};">
                                <div class="stats-number" style="color: ${student.ashar > 0 ? '#27ae60' : '#c0392b'};">${student.ashar}</div>
                                <div style="font-size: 14px; color: #7f8c8d; font-weight: 600; text-transform: uppercase;">Ashar</div>
                            </div>
                            <div class="stats-card" style="padding: 20px; background: ${student.maghrib > 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};">
                                <div class="stats-number" style="color: ${student.maghrib > 0 ? '#27ae60' : '#c0392b'};">${student.maghrib}</div>
                                <div style="font-size: 14px; color: #7f8c8d; font-weight: 600; text-transform: uppercase;">Maghrib</div>
                            </div>
                            <div class="stats-card" style="padding: 20px; background: ${student.isya > 0 ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};">
                                <div class="stats-number" style="color: ${student.isya > 0 ? '#27ae60' : '#c0392b'};">${student.isya}</div>
                                <div style="font-size: 14px; color: #7f8c8d; font-weight: 600; text-transform: uppercase;">Isya</div>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="modern-title" style="margin: 0 0 20px 0; font-size: 24px;">Riwayat Absensi:</h4>
                            <div style="max-height: 350px; overflow-y: auto;">
                                ${studentData.length > 0 ? studentData.map(record => `
                                    <div class="modern-card" style="padding: 20px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <span style="font-weight: 700; color: #2c3e50; font-size: 18px;">${record.prayer.charAt(0).toUpperCase() + record.prayer.slice(1)}</span>
                                            <span style="font-size: 16px; color: #7f8c8d; margin-left: 15px;">${new Date(record.date).toLocaleDateString('id-ID')}</span>
                                        </div>
                                        <span class="status-info">${record.time}</span>
                                    </div>
                                `).join('') : '<p style="text-align: center; color: #7f8c8d; padding: 40px; font-size: 18px;">Belum ada data absensi</p>'}
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch (error) {
                console.error('Error viewing student detail:', error);
                alert('Terjadi kesalahan saat memuat detail siswa.');
            }
        }

        async function deleteStudentData(studentName) {
            if (confirm(`Apakah Anda yakin ingin menghapus semua data absensi untuk ${studentName}?`)) {
                try {
                    await attendanceDB.deleteStudentAttendance(studentName);
                    
                    // Reload attendance data
                    await loadAttendanceData();
                    
                    // Refresh current report
                    if (document.getElementById('filterDate').value) {
                        filterByDate();
                    } else {
                        showMonthlyReport();
                    }
                    
                    await updateAdminStats();
                    showSuccessNotification('Data siswa berhasil dihapus dari database');
                } catch (error) {
                    console.error('Error deleting student data:', error);
                    alert('Terjadi kesalahan saat menghapus data siswa.');
                }
            }
        }

        function exportToCSV() {
            const filteredData = applyFilters(currentReportData);
            
            if (filteredData.length === 0) {
                alert('Tidak ada data untuk diekspor');
                return;
            }
            
            const headers = ['No', 'Nama', 'Kelas', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya', 'Total'];
            const csvContent = [
                headers.join(','),
                ...filteredData.map((student, index) => {
                    const total = student.subuh + student.dzuhur + student.ashar + student.maghrib + student.isya;
                    return [
                        index + 1,
                        `"${student.name}"`,
                        `"${student.class}"`,
                        student.subuh > 0 ? 'Hadir' : 'Tidak Hadir',
                        student.dzuhur > 0 ? 'Hadir' : 'Tidak Hadir',
                        student.ashar > 0 ? 'Hadir' : 'Tidak Hadir',
                        student.maghrib > 0 ? 'Hadir' : 'Tidak Hadir',
                        student.isya > 0 ? 'Hadir' : 'Tidak Hadir',
                        `${total}/5`
                    ].join(',');
                })
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `absensi-sholat-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccessNotification('Data berhasil diekspor ke CSV');
        }

        async function clearAllData() {
            if (confirm('Apakah Anda yakin ingin menghapus SEMUA data absensi dari database? Tindakan ini tidak dapat dibatalkan!')) {
                if (confirm('Konfirmasi sekali lagi: Hapus semua data absensi dari database?')) {
                    try {
                        await attendanceDB.deleteAllAttendance();
                        
                        // Reload attendance data
                        await loadAttendanceData();
                        
                        currentReportData = [];
                        generateReportTable();
                        updateReportSummary();
                        await updateAdminStats();
                        showSuccessNotification('Semua data berhasil dihapus dari database');
                    } catch (error) {
                        console.error('Error clearing all data:', error);
                        alert('Terjadi kesalahan saat menghapus data.');
                    }
                }
            }
        }

        async function backupDatabase() {
            try {
                const backupData = await attendanceDB.exportDatabase();
                
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
                    type: 'application/json' 
                });
                
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `backup-absensi-${new Date().toISOString().split('T')[0]}.json`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showSuccessNotification('Backup database berhasil diunduh');
            } catch (error) {
                console.error('Error backing up database:', error);
                alert('Terjadi kesalahan saat membuat backup database.');
            }
        }

        function showSuccessNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="floating-icon" style="width: 50px; height: 50px; background: linear-gradient(135deg, #2ecc71, #27ae60); margin-right: 20px; flex-shrink: 0;">
                        <i class="fas fa-check" style="color: white; font-size: 20px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; font-size: 18px;">Berhasil!</p>
                        <p style="font-size: 16px; color: #7f8c8d; margin: 0;">${message}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        function printReport() {
            const printWindow = window.open('', '_blank');
            const filteredData = applyFilters(currentReportData);
            
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Laporan Absensi Sholat</title>
                    <style>
                        body { font-family: 'Poppins', Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { margin: 0; color: #2c3e50; font-size: 32px; font-weight: 800; }
                        .header p { margin: 5px 0; color: #7f8c8d; font-size: 18px; font-weight: 500; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 15px; text-align: center; }
                        th { background: #007bff; color: white; font-weight: 700; }
                        .present { color: #27ae60; font-weight: 700; }
                        .absent { color: #c0392b; font-weight: 700; }
                        .footer { margin-top: 30px; text-align: right; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Laporan Absensi Sholat</h1>
                        <p>SMA Taman Siswa Genteng Kulon, Banyuwangi</p>
                        <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Nama</th>
                                <th>Kelas</th>
                                <th>Subuh</th>
                                <th>Dzuhur</th>
                                <th>Ashar</th>
                                <th>Maghrib</th>
                                <th>Isya</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.map((student, index) => {
                                const total = student.subuh + student.dzuhur + student.ashar + student.maghrib + student.isya;
                                return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${student.name}</td>
                                        <td>${student.class}</td>
                                        <td class="${student.subuh > 0 ? 'present' : 'absent'}">${student.subuh > 0 ? '✓' : '✗'}</td>
                                        <td class="${student.dzuhur > 0 ? 'present' : 'absent'}">${student.dzuhur > 0 ? '✓' : '✗'}</td>
                                        <td class="${student.ashar > 0 ? 'present' : 'absent'}">${student.ashar > 0 ? '✓' : '✗'}</td>
                                        <td class="${student.maghrib > 0 ? 'present' : 'absent'}">${student.maghrib > 0 ? '✓' : '✗'}</td>
                                        <td class="${student.isya > 0 ? 'present' : 'absent'}">${student.isya > 0 ? '✓' : '✗'}</td>
                                        <td><strong>${total}/5</strong></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
                        <p>Data dari Database Browser</p>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }

        // Initialize the application when page loads
        document.addEventListener('DOMContentLoaded', init);
