        // Global variables
        let attendanceData =[];
        let isAdminLoggedIn = false;
        let currentStudent = JSON.parse(localStorage.getItem('currentStudent')) || null;
        let currentReportData = [];
        let currentPage = 1;
        let itemsPerPage = 10;
        let sortDirection = 'asc';
        let sortColumn = 'name';
        
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
        function init() {
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);
            setInterval(checkPrayerTime, 60000); // Check every minute
            generateSampleData(); // For demo purposes
            
            // Check if student is already logged in
            if (currentStudent) {
                showStudentSection();
            } else {
                showStudentLogin();
            }
            
            // Initial prayer card status update
            updatePrayerCardStatus();
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
            notification.className = 'fixed top-4 right-4 glass-card p-6 rounded-2xl shadow-2xl z-50 floating-notification max-w-sm';
            notification.innerHTML = `
                <div class="flex items-start">
                    <div class="icon-wrapper" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--success-500), var(--success-600)); margin-right: 16px; flex-shrink: 0;">
                        <i class="fas fa-mosque" style="color: white; font-size: 16px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--gray-800); margin: 0 0 4px 0;">Waktu Sholat!</p>
                        <p style="font-size: 14px; color: var(--gray-600); margin: 0;">Waktu ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} telah tiba!</p>
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
                    prayerCard.classList.add('cursor-pointer');
                    prayerCard.onclick = () => markAttendance(prayer);
                } else {
                    // Outside attendance window - disable card
                    prayerCard.classList.add('disabled');
                    prayerCard.classList.remove('cursor-pointer');
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
            message.className = 'fixed top-4 right-4 glass-card p-6 rounded-2xl shadow-2xl z-50 floating-notification max-w-sm';
            message.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="icon-wrapper" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--danger-500), #dc2626); margin-right: 16px; flex-shrink: 0;">
                        <i class="fas fa-clock" style="color: white; font-size: 16px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--gray-800); margin: 0 0 4px 0;">Waktu Absensi Berakhir!</p>
                        <p style="font-size: 14px; color: var(--gray-600); margin: 0 0 8px 0;">Absensi ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} sudah tidak tersedia</p>
                        <div class="badge badge-danger" style="font-size: 10px;">
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
        function studentLogin() {
            const name = document.getElementById('loginStudentName').value.trim();
            const studentClass = document.getElementById('loginStudentClass').value;
            
            if (!name || !studentClass) {
                alert('Mohon lengkapi nama dan kelas!');
                return;
            }
            
            currentStudent = { name: name, class: studentClass };
            localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
            
            showStudentSection();
            showWelcomeMessage();
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
            message.className = 'fixed top-4 right-4 glass-card p-6 rounded-2xl shadow-2xl z-50 floating-notification max-w-sm';
            message.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="icon-wrapper" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary-500), var(--primary-600)); margin-right: 16px; flex-shrink: 0;">
                        <i class="fas fa-user-graduate" style="color: white; font-size: 16px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--gray-800); margin: 0 0 4px 0;">Selamat Datang!</p>
                        <p style="font-size: 14px; color: var(--gray-600); margin: 0;">${currentStudent.name}, silakan lakukan absensi sholat</p>
                    </div>
                </div>
            `;
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.remove();
            }, 4000);
        }

        // Mark attendance for a prayer
        function markAttendance(prayer) {
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
            const attendanceRecord = {
                name: currentStudent.name,
                class: currentStudent.class,
                date: today,
                prayer: prayer,
                time: new Date().toLocaleTimeString('id-ID')
            };

            // Check if already marked for today
            const existingRecord = attendanceData.find(record => 
                record.name === currentStudent.name && 
                record.date === today && 
                record.prayer === prayer
            );

            if (existingRecord) {
                alert(`Anda sudah absen ${prayer} hari ini!`);
                return;
            }

            attendanceData.push(attendanceRecord);
            localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
            
            updateAttendanceStatus();
            showSuccessMessage(prayer);
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
                    statusElement.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 4px;"></i>Sudah Absen';
                    statusElement.className = 'badge badge-success';
                } else if (isTimeInWindow(currentTime, prayerData.startWindow, prayerData.endWindow)) {
                    statusElement.innerHTML = '<i class="fas fa-clock" style="margin-right: 4px;"></i>Bisa Absen Sekarang';
                    statusElement.className = 'badge badge-info';
                } else if (timeToMinutes(currentTime) < timeToMinutes(prayerData.startWindow)) {
                    statusElement.innerHTML = '<i class="fas fa-hourglass-start" style="margin-right: 4px;"></i>Belum Waktunya';
                    statusElement.className = 'badge badge-warning';
                } else {
                    statusElement.innerHTML = '<i class="fas fa-times-circle" style="margin-right: 4px;"></i>Waktu Habis';
                    statusElement.className = 'badge badge-danger';
                }
            });
        }

        // Show success message
        function showSuccessMessage(prayer) {
            const message = document.createElement('div');
            message.className = 'fixed top-4 right-4 glass-card p-6 rounded-2xl shadow-2xl z-50 floating-notification max-w-sm';
            message.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="icon-wrapper" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--success-500), var(--success-600)); margin-right: 16px; flex-shrink: 0;">
                        <i class="fas fa-check-circle" style="color: white; font-size: 16px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--gray-800); margin: 0 0 4px 0;">Absensi Berhasil!</p>
                        <p style="font-size: 14px; color: var(--gray-600); margin: 0;">Absensi ${prayer.charAt(0).toUpperCase() + prayer.slice(1)} telah dicatat</p>
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

        function adminLogin() {
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            
            if (username === 'guru' && password === 'Bismillah') {
                isAdminLoggedIn = true;
                closeAdminModal();
                showAdminSection();
                updateAdminStats();
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

        function updateAdminStats() {
            const today = new Date().toISOString().split('T')[0];
            const currentMonth = new Date().toISOString().slice(0, 7);
            
            const uniqueStudents = [...new Set(attendanceData.map(record => record.name))];
            const todayAttendance = attendanceData.filter(record => record.date === today);
            const monthlyAttendance = attendanceData.filter(record => record.date.startsWith(currentMonth));
            
            document.getElementById('totalStudents').textContent = uniqueStudents.length;
            document.getElementById('todayAttendance').textContent = todayAttendance.length;
            document.getElementById('monthlyAttendance').textContent = monthlyAttendance.length;
            
            const totalPossible = uniqueStudents.length * 5; // 5 prayers per day
            const percentage = totalPossible > 0 ? Math.round((todayAttendance.length / totalPossible) * 100) : 0;
            document.getElementById('attendancePercentage').textContent = percentage + '%';
        }

        function showDailyReport() {
            const today = new Date().toISOString().split('T')[0];
            const todayData = attendanceData.filter(record => record.date === today);
            currentReportData = processReportData(todayData);
            
            // Update button states
            updateButtonStates('daily');
            
            // Set filter date to today
            document.getElementById('filterDate').value = today;
            
            generateReportTable();
            updateReportSummary();
        }

        function showMonthlyReport() {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyData = attendanceData.filter(record => record.date.startsWith(currentMonth));
            currentReportData = processReportData(monthlyData);
            
            // Update button states
            updateButtonStates('monthly');
            
            // Clear date filter
            document.getElementById('filterDate').value = '';
            
            generateReportTable();
            updateReportSummary();
        }

        function showCustomDateReport() {
            const dateInput = document.getElementById('filterDate');
            if (!dateInput.value) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
            filterByDate();
        }

        function updateButtonStates(activeButton) {
            // Reset all buttons
            document.getElementById('dailyBtn').classList.remove('ring-2', 'ring-white');
            document.getElementById('monthlyBtn').classList.remove('ring-2', 'ring-white');
            
            // Highlight active button
            if (activeButton === 'daily') {
                document.getElementById('dailyBtn').classList.add('ring-2', 'ring-white');
            } else if (activeButton === 'monthly') {
                document.getElementById('monthlyBtn').classList.add('ring-2', 'ring-white');
            }
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
                    <td style="padding: 16px; font-size: 14px; color: var(--gray-700);">${globalIndex}</td>
                    <td style="padding: 16px; font-size: 14px; font-weight: 600; color: var(--gray-900);">${student.name}</td>
                    <td style="padding: 16px; font-size: 14px; color: var(--gray-700);">
                        <span class="badge badge-info">
                            ${student.class}
                        </span>
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        ${student.subuh > 0 ? 
                            `<div style="width: 24px; height: 24px; background: var(--success-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: var(--success-600); font-size: 12px;"></i></div>` : 
                            `<div style="width: 24px; height: 24px; background: var(--danger-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: var(--danger-600); font-size: 12px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        ${student.dzuhur > 0 ? 
                            `<div style="width: 24px; height: 24px; background: var(--success-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: var(--success-600); font-size: 12px;"></i></div>` : 
                            `<div style="width: 24px; height: 24px; background: var(--danger-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: var(--danger-600); font-size: 12px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        ${student.ashar > 0 ? 
                            `<div style="width: 24px; height: 24px; background: var(--success-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: var(--success-600); font-size: 12px;"></i></div>` : 
                            `<div style="width: 24px; height: 24px; background: var(--danger-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: var(--danger-600); font-size: 12px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        ${student.maghrib > 0 ? 
                            `<div style="width: 24px; height: 24px; background: var(--success-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: var(--success-600); font-size: 12px;"></i></div>` : 
                            `<div style="width: 24px; height: 24px; background: var(--danger-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: var(--danger-600); font-size: 12px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        ${student.isya > 0 ? 
                            `<div style="width: 24px; height: 24px; background: var(--success-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="color: var(--success-600); font-size: 12px;"></i></div>` : 
                            `<div style="width: 24px; height: 24px; background: var(--danger-50); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"><i class="fas fa-times" style="color: var(--danger-600); font-size: 12px;"></i></div>`
                        }
                    </td>
                    <td style="padding: 16px; font-weight: 600; text-align: center;">
                        <span class="badge ${total >= 4 ? 'badge-success' : total >= 2 ? 'badge-warning' : 'badge-danger'}">
                            ${total}/5
                        </span>
                    </td>
                    <td style="padding: 16px; text-align: center;">
                        <button onclick="viewStudentDetail('${student.name}')" class="btn btn-info btn-sm" style="margin-right: 8px;" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteStudentData('${student.name}')" class="btn btn-danger btn-sm" title="Hapus Data">
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

        function filterByDate() {
            const selectedDate = document.getElementById('filterDate').value;
            if (selectedDate) {
                const dateData = attendanceData.filter(record => record.date === selectedDate);
                currentReportData = processReportData(dateData);
                updateButtonStates('');
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
                pageBtn.className = `btn btn-sm ${
                    i === currentPage 
                        ? 'btn-primary' 
                        : 'btn-secondary'
                }`;
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

        function viewStudentDetail(studentName) {
            const studentData = attendanceData.filter(record => record.name === studentName);
            const student = currentReportData.find(s => s.name === studentName);
            
            if (!student) return;
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div>
                            <h3 class="gradient-text" style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">${student.name}</h3>
                            <p style="margin: 0; color: var(--gray-600); font-size: 16px; font-weight: 500;">${student.class}</p>
                        </div>
                        <button onclick="this.closest('.modal').remove()" class="btn btn-secondary btn-sm">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-5 mb-6">
                        <div class="stat-card" style="padding: 16px; background: ${student.subuh > 0 ? 'var(--success-50)' : 'var(--danger-50)'};">
                            <div style="font-size: 24px; font-weight: 700; color: ${student.subuh > 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${student.subuh}</div>
                            <div style="font-size: 12px; color: var(--gray-600); font-weight: 600; text-transform: uppercase;">Subuh</div>
                        </div>
                        <div class="stat-card" style="padding: 16px; background: ${student.dzuhur > 0 ? 'var(--success-50)' : 'var(--danger-50)'};">
                            <div style="font-size: 24px; font-weight: 700; color: ${student.dzuhur > 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${student.dzuhur}</div>
                            <div style="font-size: 12px; color: var(--gray-600); font-weight: 600; text-transform: uppercase;">Dzuhur</div>
                        </div>
                        <div class="stat-card" style="padding: 16px; background: ${student.ashar > 0 ? 'var(--success-50)' : 'var(--danger-50)'};">
                            <div style="font-size: 24px; font-weight: 700; color: ${student.ashar > 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${student.ashar}</div>
                            <div style="font-size: 12px; color: var(--gray-600); font-weight: 600; text-transform: uppercase;">Ashar</div>
                        </div>
                        <div class="stat-card" style="padding: 16px; background: ${student.maghrib > 0 ? 'var(--success-50)' : 'var(--danger-50)'};">
                            <div style="font-size: 24px; font-weight: 700; color: ${student.maghrib > 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${student.maghrib}</div>
                            <div style="font-size: 12px; color: var(--gray-600); font-weight: 600; text-transform: uppercase;">Maghrib</div>
                        </div>
                        <div class="stat-card" style="padding: 16px; background: ${student.isya > 0 ? 'var(--success-50)' : 'var(--danger-50)'};">
                            <div style="font-size: 24px; font-weight: 700; color: ${student.isya > 0 ? 'var(--success-600)' : 'var(--danger-600)'};">${student.isya}</div>
                            <div style="font-size: 12px; color: var(--gray-600); font-weight: 600; text-transform: uppercase;">Isya</div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="font-weight: 600; color: var(--gray-800); margin: 0 0 16px 0;">Riwayat Absensi:</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${studentData.length > 0 ? studentData.map(record => `
                                <div class="card" style="padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-weight: 600; color: var(--gray-800);">${record.prayer.charAt(0).toUpperCase() + record.prayer.slice(1)}</span>
                                        <span style="font-size: 14px; color: var(--gray-600); margin-left: 12px;">${new Date(record.date).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <span class="badge badge-info">${record.time}</span>
                                </div>
                            `).join('') : '<p style="text-align: center; color: var(--gray-500); padding: 32px;">Belum ada data absensi</p>'}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function deleteStudentData(studentName) {
            if (confirm(`Apakah Anda yakin ingin menghapus semua data absensi untuk ${studentName}?`)) {
                attendanceData = attendanceData.filter(record => record.name !== studentName);
                localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
                
                // Refresh current report
                if (document.getElementById('filterDate').value) {
                    filterByDate();
                } else {
                    showMonthlyReport();
                }
                
                updateAdminStats();
                showSuccessNotification('Data siswa berhasil dihapus');
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

        function clearAllData() {
            if (confirm('Apakah Anda yakin ingin menghapus SEMUA data absensi? Tindakan ini tidak dapat dibatalkan!')) {
                if (confirm('Konfirmasi sekali lagi: Hapus semua data absensi?')) {
                    attendanceData = [];
                    localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
                    currentReportData = [];
                    generateReportTable();
                    updateReportSummary();
                    updateAdminStats();
                    showSuccessNotification('Semua data berhasil dihapus');
                }
            }
        }

        function showSuccessNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 glass-card p-6 rounded-2xl shadow-2xl z-50 floating-notification max-w-sm';
            notification.innerHTML = `
                <div style="display: flex; align-items: flex-start;">
                    <div class="icon-wrapper" style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--success-500), var(--success-600)); margin-right: 16px; flex-shrink: 0;">
                        <i class="fas fa-check" style="color: white; font-size: 16px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--gray-800); margin: 0 0 4px 0;">Berhasil!</p>
                        <p style="font-size: 14px; color: var(--gray-600); margin: 0;">${message}</p>
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
                        body { font-family: 'Inter', Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { margin: 0; color: #333; font-size: 28px; font-weight: 700; }
                        .header p { margin: 5px 0; color: #666; font-size: 16px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
                        th { background-color: #f8f9fa; font-weight: 600; color: #374151; }
                        .present { color: #16a34a; font-weight: 600; }
                        .absent { color: #dc2626; font-weight: 600; }
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
