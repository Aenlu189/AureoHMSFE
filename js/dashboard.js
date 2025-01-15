async function initialiseDashboard() {
    try {
        const response = await axios.get('http://localhost:8080/check-session', {
            withCredentials: true,
        });

        if (response.status === 200) {
            console.log(response.data.message);
        }

        if (response.status !== 200) {
            window.location.replace('login.html');
            return;
        }
        updateDate();
        await loadDashboardStats();

        const username = sessionStorage.getItem('username');
        if (username) {
            const userElement = document.querySelector('.user-box');
            userElement.innerHTML = `
            <i class="fas fa-user user-icon">
            </i>${username}
            `;
        }

        const logoutButton = document.querySelector('.logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', logout);
        }
        setInterval(loadDashboardStats, 30000);
    } catch (error) {
        console.error("Dashboard initialisation failed", error);
        window.location.replace('login.html');
    }
}

function reload() {
    window.location.reload();
}

function updateDate() {
    const dayElement = document.getElementById('day');
    const fullDateElement = document.getElementById('full-date');
    const today = new Date();
    
    const day = today.toLocaleDateString('en-GB', {
        weekday: 'short'
    });
    
    const fullDate = today.toLocaleDateString('en-GB', {
       day: '2-digit',
       month: '2-digit',
       year: '2-digit' 
    });
    
    dayElement.textContent = day;
    fullDateElement.textContent = fullDate;
}

async function loadDashboardStats() {
    try {
        const response = await axios.get('http://localhost:8080/stats', {
            withCredentials: true
        });
        
        if (response.status === 200) {
            const stats = response.data;
            
            document.querySelector('[data-stat="available"] .stat-value').textContent = 
                `${stats.availableRooms}/${stats.totalRooms}`;
            document.querySelector('[data-stat="full-night"] .stat-value').textContent = 
                stats.fullNight;
            document.querySelector('[data-stat="day-caution"] .stat-value').textContent = 
                stats.dayCaution;
            document.querySelector('[data-stat="session"] .stat-value').textContent = 
                stats.session;
            document.querySelector('[data-stat="housekeeping"] .stat-value').textContent = 
                stats.housekeeping;
            document.querySelector('[data-stat="maintenance"] .stat-value').textContent = 
                stats.maintenance;
        }
    } catch(error) {
        if (error.response) {
            console.error("Error loading stats: ", error.response);
        } else {
            console.error("Error loading stats: ", error.message);
        }
    }
}

async function logout() {
    try {
        const response = await axios.post('http://localhost:8080/logout', {}, {
            withCredentials: true
        });
        
        if (response.status === 200) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.replace('login.html');
        }
    } catch (error) {
        console.error('Logout failed: ', error);
        sessionStorage.clear();
        window.location.replace('login.html');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initialiseDashboard();
})
