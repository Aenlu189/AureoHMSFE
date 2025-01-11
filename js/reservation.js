function getRoomType(roomType) {
    switch(roomType) {
        case 'FULL-NIGHT':
            return 'fas fa-moon';
        case 'DAY-CAUTION':
            return 'fas fa-sun';
        case 'SESSION':
            return 'fas fa-clock';
        default:
            return 'fas fa-bed';
    }
}

function formatDate(date) {
    const d = new Date(date);
    
    const year = d.getFullYear();
    let month = d.getMonth() + 1;
    let day = d.getDate();
    
    if (month < 10) {
        month = "0" + month;
    }
    
    if (day < 10) {
        day = "0" + day;
    }
    
    return year + "-" + month + "-" + day;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date)/1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';

    return Math.floor(seconds) + ' seconds ago';
}

document.addEventListener('DOMContentLoaded', function() {
    const reservationModal = document.getElementById('reservationModal');
    const reservationForm = document.getElementById('reservationForm');
    
    const roomTypeSelect = document.getElementById('roomType');
    const checkinDateInput = document.getElementById('checkinDate');
    const checkoutDateInput = document.getElementById('checkoutDate');
    const guestCountInput = document.getElementById('guestCount');
    const roomCountInput = document.getElementById('roomCount');
    const extraBedCheckbox = document.getElementById('extraBed');
    const reservationDateFilter = document.getElementById('reservationDateFilter');

    const today = formatDate(new Date());
    checkinDateInput.setAttribute("min", today);
    checkoutDateInput.setAttribute("min", today);

    reservationDateFilter.value = new Date().toISOString().split('T')[0];
    
    reservationDateFilter.addEventListener('change', function() {
        loadReservationsByDate(this.value);
    });

    loadTodayReservations();

    reservationForm.addEventListener('submit', async function(e){
        e.preventDefault();

        const checkinDate = document.getElementById('checkinDate').value;
        const checkoutDate = document.getElementById('checkoutDate').value;

        if (!checkinDate || !checkoutDate) {
            alert("Please select both check-in and check-out date");
            return;
        }

        const formData = {
            Name: document.getElementById('name').value,
            NationalID: document.getElementById('nationalId').value || null,
            Phone: document.getElementById('phoneNumber').value,
            RoomType: document.getElementById('roomType').value,
            GuestCount: parseInt(document.getElementById('guestCount').value) || 1,
            RoomCount: parseInt(document.getElementById('roomCount').value) || 1,
            CheckinDate: checkinDate + "T00:00:00Z",
            CheckoutDate: checkoutDate + "T00:00:00Z",
            ReservationDate: new Date().toISOString().split('T')[0] + "T00:00:00Z",
            Status: "CONFIRMED",
            ExtraBed: document.getElementById('extraBed').checked,
            AmountPaid: parseInt(document.getElementById('amountPaid').value),
            Notes: document.getElementById('notes').value || null,
        };

        try {
            console.log('Sending reservation data', formData);
            const response = await axios.post('http://localhost:8080/create-reservation', formData, {
               headers: {
                   'Content-Type': 'application/json',
               },
            });

            console.log('Response: ', response.status, response.data);

            if (response.data && response.data.message) {
                alert(response.data.message);
            } else {
                alert(`Reservation for ${formData.Name} has been created successfully.`);
            }

            $(reservationModal).modal('hide');
            reservationForm.reset();

            const dateFilter = document.getElementById('reservationDateFilter');
            if (dateFilter && dateFilter.value) {
                loadReservationsByDate(dateFilter.value);
            } else {
                loadTodayReservations();
            }
        } catch (error) {
            console.error('Error: ', error);
            alert(error.message || 'Failed to create reservation');
        }
    });

    reservationModal.addEventListener('show.bs.modal', function(event) {
        const button = event.relatedTarget;
        const roomNumber = button.getAttribute('data-room-number');
        document.getElementById('reservationRoomNumber').textContent = roomNumber;

        const now = new Date();
        checkinDateInput.value = formatDate(now);
        checkinDateInput.setAttribute("min", formatDate(now));

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkoutDateInput.value = formatDate(tomorrow);
        checkoutDateInput.setAttribute("min", formatDate(now));

        guestCountInput.value = "1";
        roomCountInput.value = "1";
        roomTypeSelect.value = "FULL-NIGHT";
        extraBedCheckbox.value = false;
        
    });

    reservationModal.addEventListener('hidden.bs.modal', function() {
        reservationForm.reset();
        checkoutDateInput.disabled = false;
        extraBedCheckbox.style.display = 'none';
    });

    roomTypeSelect.addEventListener('change', function() {
        const selectedType = this.value;
        const checkinDate = new Date(checkinDateInput.value);

        if (selectedType === 'DAY-CAUTION' || selectedType === 'SESSION') {
            checkoutDateInput.value = checkinDateInput.value;
            checkoutDateInput.disabled = true;
        } else {
            checkoutDateInput.disabled = false;
            const nextDay = new Date(checkinDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutDateInput.setAttribute("min", formatDate(nextDay));
            checkoutDateInput.value = formatDate(nextDay);
        }
    });
    
    checkinDateInput.addEventListener('change', function() {
        const selectedType = roomTypeSelect.value;
        const selectedDate = new Date(this.value);
        if (selectedType === 'DAY-CAUTION' || selectedType === 'SESSION') {
            checkoutDateInput.value = this.value;
        } else {
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutDateInput.setAttribute("min", formatDate(nextDay));
            
            if (new Date(checkoutDateInput.value) < nextDay) {
                checkoutDateInput.value = formatDate(nextDay);
            }
        }
    });
});

async function loadReservationsByDate(date) {
    try {
        console.log('Loading reservations for date:', date);
        const response = await axios.get(`http://localhost:8080/reservations/date/${date}`);
        if (response.data) {
            displayReservations(response.data);
        } else {
            displayReservations([]);
        }
    } catch (error) {
        console.error('Error loading reservations: ', error);
        displayReservations([]);
    }
}

async function loadTodayReservations() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const dateFilter = document.getElementById('reservationDateFilter');
        dateFilter.value = today;
        
        const response = await axios.get(`http://localhost:8080/reservations/date/${today}`);
        if (response.data) {
            displayReservations(response.data);
        }
    } catch (error) {
        console.error('Error loading reservations: ', error);
        displayReservations([]);
    }
}

function displayReservations(reservations) {
    const reservationsContainer = document.getElementById('reservationsContainer');
    const activeReservations = reservations.filter(reservation => reservation.Status !== 'CHECKED-IN');

    if (!reservations || reservations.length === 0 || activeReservations.length===0){
        reservationsContainer.innerHTML = `
            <div class="no-reservation-icon">
                <i class="fas fa-calendar-times"></i>
            </div>
            <div class="no-reservation">
                <h5>No Reservations for Today</h5>
                <p>New Reservations will appear here</p>
            </div>
        `;
        return;
    }

    // Sort by date
    activeReservations.sort(function(a, b) {
        const dateA = new Date(a.CheckinDate);
        const dateB = new Date(b.CheckinDate);

        return dateA - dateB;
    });

    reservationsContainer.innerHTML = activeReservations.map(reservation => `
        <div class="reservation-item" data-toggle="modal" data-target="#reservationOptionsModal" onclick="setSelectedReservation(${reservation.ID})">
            <div class="reservation-icon ${reservation.RoomType.toLowerCase()}">
                <i class="fas ${getRoomType(reservation.RoomType)}"></i>
            </div>
            <div class="reservation-details">
                <h5>${reservation.Name} <p>${reservation.Phone}</p></h5>
                <div class="row">
                    <div class="col">
                        <p>Check-in : ${new Date(reservation.CheckinDate).toLocaleDateString()}</p>
                        <p>Check-out: ${new Date(reservation.CheckoutDate).toLocaleDateString()}</p>
                    </div>
                    <div class="col">
                        <p>Rooms: ${reservation.RoomCount}</p>
                        <p>Add-on: ${reservation.ExtraBed ? 'Extra Bed' : 'None'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

let selectedReservationId = null;

function setSelectedReservation(reservationId) {
    selectedReservationId = reservationId;
    console.log('Selected reservation: ', reservationId )
}

async function deleteReservation() {
    if (!selectedReservationId) {
        alert('No reservation selected');
        return;
    }
    
    if (!confirm('Permanently delete this reservation?')){
        return;
    }
    
    try {
        const response = await axios.delete(`http://localhost:8080/reservations/${selectedReservationId}`);
        if (response.data && response.data.message) {
            alert(response.data.message);
            $('#reservationOptionsModal').modal('hide');
            
            const dateFilter = document.getElementById('reservationDateFilter');
            loadReservationsByDate(dateFilter.value);
        }
    } catch (error) {
        console.error('Error deleting reservation: ', error);
        alert(error.response || 'Failed to delete reservation');
    } 
}
