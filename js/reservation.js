let selectedReservationId = null;
let selectedReservation = null;


async function setSelectedReservation(reservationId) {
    selectedReservationId = reservationId;
    await fetchReservationDetails(reservationId);
    updateCheckInButton();
    console.log('Selected reservation: ', reservationId )
}

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

document.addEventListener('DOMContentLoaded', () => {
    const reservationModal = document.getElementById('reservationModal');
    const reservationForm = document.getElementById('reservationForm');

    const roomTypeSelect = document.getElementById('roomType');
    const checkinDateInput = document.getElementById('checkinDate');
    const checkoutDateInput = document.getElementById('checkoutDate');
    const guestCountInput = document.getElementById('guestCount');
    const roomCountInput = document.getElementById('roomCount');
    const extraBedCheckbox = document.getElementById('extraBed');
    const reservationDateFilter = document.getElementById('reservationDateFilter');
    const paymentTypeSelect = document.getElementById('payment');
    const amountPaidInput = document.getElementById('amountPaid');

    amountPaidInput.disabled = (paymentTypeSelect.value === 'NONE');

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
            PaymentType: document.getElementById('payment').value,
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

    paymentTypeSelect.addEventListener('change', function() {
       const selectedType = this.value;

       amountPaidInput.disabled = selectedType === 'NONE';

    });
});

// To find reservations on other dates
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

// To find reservations today
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

// Displaying the reservation cards for the selected date
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

async function updateCheckInButton() {
    const checkInButton = document.getElementById('checkInButton');
    
    if (!selectedReservation) {
        console.error('No reservation selected');
        return;
    }

    console.log('Selected room type:', selectedReservation.RoomType);

    checkInButton.onclick = null;

    switch(selectedReservation.RoomType) {
        case 'FULL-NIGHT':
            checkInButton.setAttribute('data-target', '#fullNightRModal');
            checkInButton.onclick = () => {
                $('#reservationOptionsModal').modal('hide');
                setTimeout(() => {
                    fullNightRForm();
                    $('#fullNightRModal').modal('show');
                }, 150);
            };
            break;
        case 'DAY-CAUTION':
            checkInButton.setAttribute('data-target', '#dayCautionRModal');
            checkInButton.onclick = () => {
                $('#reservationOptionsModal').modal('hide');
                setTimeout(() => {
                    dayCautionRForm();
                    $('#dayCautionRModal').modal('show');
                }, 150);
            };
            break;
        case 'SESSION':
            checkInButton.setAttribute('data-target', '#sessionRModal');
            checkInButton.onclick = () => {
                $('#reservationOptionsModal').modal('hide');
                setTimeout(() => {
                    sessionRForm();
                    $('#sessionRModal').modal('show');
                }, 150);
            };
            break;
        default:
            console.error('Unknown reservation type:', selectedReservation.RoomType);
    }
}

// Status Reservation Forms
async function fullNightRForm() {
    $('#reservationOptionsModal').modal('hide');

    const modal = document.getElementById('fullNightRModalLabel');
    modal.innerHTML = `
        <i class="fas fa-moon me-2 mt-2 mr-2"></i>
        Check-in | ${selectedReservation.Name}
    `;

    const nameInput = document.getElementById('RFNName');
    const nationalIdInput = document.getElementById('RFNNationalId');
    const phoneNumberInput = document.getElementById('RFNPhoneNumber');
    const checkoutRInput = document.getElementById('RFNCheckoutDate');
    const totalAmountDisplay = document.getElementById('RTotalAmountDisplay');
    const roomsCountDisplay = document.getElementById('roomsCountFNRDisplay');
    const amountPaidDisplay = document.getElementById('RAmountPaidDisplay');
    const roomNumbersContainer = document.getElementById('roomNumbersContainer');
    const dayCountDisplay = document.getElementById('dayRCountDisplay');

    amountPaidDisplay.textContent = (selectedReservation.AmountPaid || 0).toLocaleString() + ' Ks';

    nameInput.value = selectedReservation.Name;
    nationalIdInput.value = selectedReservation.NationalID || '';
    phoneNumberInput.value = selectedReservation.Phone || '';

    const today = formatDate(new Date());
    checkoutRInput.setAttribute("min", today);
    checkoutRInput.value = formatDate(selectedReservation.CheckoutDate);

    roomNumbersContainer.innerHTML = '';
    for (let i = 0; i < selectedReservation.RoomCount; i++) {
        const div = document.createElement('div');
        div.className = 'col-md-12 mb-3';
        div.innerHTML = `
            <div class="card mcc border-secondary">
                <div class="card-body">
                    <h6 class="card-title mb-3 text-white">Room ${i + 1}</h6>
                    <div class="mb-2">
                        <label for="RFNRoomNumber${i}" class="form-label text-white">Room Number</label>
                        <input type="text" class="form-control bg-dark text-light border-secondary room-number-input" 
                               id="RFNRoomNumber${i}" placeholder="Enter room number" required>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input extra-bed-checkbox" type="checkbox" id="RFNExtraBed${i}">
                        <label class="form-check-label text-white" for="RFNExtraBed${i}">
                            Extra Bed (+30,000 Ks)
                        </label>
                    </div>
                </div>
            </div>
        `;
        roomNumbersContainer.appendChild(div);
    }

    function updateDaysAndAmount() {
        const checkoutDate = new Date(checkoutRInput.value);
        const checkinDate = new Date(today);
        const diffTime = checkoutDate - checkinDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(diffDays.toLocaleString())
        dayCountDisplay.textContent = diffDays.toLocaleString();
        roomsCountDisplay.textContent = selectedReservation.RoomCount;

        const baseRoomPrice = 62000;
        const extraBedPrice = 30000;
        let totalAmount = 0;

        const extraBedCheckboxes = document.querySelectorAll('.extra-bed-checkbox');
        extraBedCheckboxes.forEach(checkbox => {
            let roomPrice = baseRoomPrice;
            if (checkbox.checked) {
                roomPrice += extraBedPrice;
            }
            totalAmount += roomPrice;
        });

        totalAmount = (totalAmount * diffDays) - (selectedReservation.AmountPaid || 0);
        totalAmountDisplay.textContent = totalAmount.toLocaleString() + ' Ks';
    }

    document.querySelectorAll('.extra-bed-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateDaysAndAmount);
    });

    checkoutRInput.addEventListener('change', updateDaysAndAmount);

    const fullNightForm = document.getElementById('fullNightRForm');
    fullNightForm.onsubmit = async function(e) {
        e.preventDefault();

        if (!document.getElementById('RFNPaid').checked) {
            alert('Please confirm that the full amount is paid.');
            return;
        }

        try {
            const checkoutDate = checkoutRInput.value;
            const roomInputs = document.querySelectorAll('.room-number-input');
            const extraBedCheckboxes = document.querySelectorAll('.extra-bed-checkbox');
            const roomConfigs = [];

            for (let i = 0; i < roomInputs.length; i++) {
                const roomNumber = roomInputs[i].value;
                if (!roomNumber) {
                    alert('Please fill in all room numbers');
                    return;
                }

                const isRoomAvailable = await statusCheckRoom(roomNumber);
                if (!isRoomAvailable) {
                    return;
                }

                roomConfigs.push({
                    number: parseInt(roomNumber),
                    hasExtraBed: extraBedCheckboxes[i].checked
                });
            }

            const totalPaid = parseInt(totalAmountDisplay.textContent.replace(/[^0-9]/g, '')) +
                (selectedReservation.AmountPaid || 0);
            const amountPerRoom = totalPaid / roomConfigs.length;

            for (const room of roomConfigs) {
                const formData = {
                    Name: nameInput.value,
                    NationalID: nationalIdInput.value || null,
                    Phone: phoneNumberInput.value || null,
                    RoomType: 'FULL-NIGHT',
                    RoomNumber: room.number,
                    CheckinDate: new Date().toISOString(),
                    CheckoutDate: new Date(checkoutDate).toISOString(),
                    ExtraBed: room.hasExtraBed,
                    PaymentType: document.getElementById('RFNPaymentType').value,
                    AmountPaid: amountPerRoom,
                    ExtraCharges: 0,
                    FoodCharges: 0,
                    Paid: true
                };

                console.log('Creating guest record for room:', room.number, formData);
                const response = await axios.post('http://localhost:8080/create-guest', formData);
                if (response.status === 200) {
                    await roomStatusClick(2, room.number);
                }
            }
            await axios.put(`http://localhost:8080/reservations/${selectedReservation.ID}`, {
                Status: "CHECKED-IN"
            });

            await loadTodayReservations();
            await loadRooms();
            await loadDashboardStats();
            $('#fullNightRModal').modal('hide');
            alert('Check-in successful!');
        } catch (error) {
            console.error('Error creating guest:', error);
            alert('Error checking-in the guest. Please try again');
        }
    };

    updateDaysAndAmount();

    const fullNightModal = $('#fullNightRModal');
    const reservationOptionsModal = $('#reservationOptionsModal');

    fullNightModal.on('show.bs.modal', function() {
        reservationOptionsModal.modal('hide');
    });

    fullNightModal.on('hidden.bs.modal', function(e) {
        reservationOptionsModal.modal('hide');
        fullNightForm.reset();
        roomNumbersContainer.innerHTML = '';
    });

    // Handle cancel button click
    fullNightModal.find('button[data-dismiss="modal"]').on('click', function() {
        // Set flag to prevent showing reservation options modal
        const event = $.Event('hidden.bs.modal');
        event.clickedCancel = true;
        fullNightModal.trigger(event);
    });
}

async function dayCautionRForm() {
    $('#reservationOptionsModal').modal('hide');

    const modal = document.getElementById('dayCautionRModalLabel');
    modal.innerHTML = `
        <i class="fas fa-sun me-2 mt-2 mr-2"></i>
        Check-in | ${selectedReservation.Name}
    `;

    const nameInput = document.getElementById('RDCName');
    const nationalIdInput = document.getElementById('RDCNationalId');
    const phoneNumberInput = document.getElementById('RDCPhoneNumber');
    const amountPaidDisplay = document.getElementById('RDCAmountPaidDisplay');
    const roomNumbersContainer = document.getElementById('roomNumbersDCContainer');

    amountPaidDisplay.textContent = (selectedReservation.AmountPaid || 0).toLocaleString() + ' Ks';

    nameInput.value = selectedReservation.Name;
    nationalIdInput.value = selectedReservation.NationalID || '';
    phoneNumberInput.value = selectedReservation.Phone || '';

    roomNumbersContainer.innerHTML = '';
    for (let i = 0; i < selectedReservation.RoomCount; i++) {
        const div = document.createElement('div');
        div.className = 'col-md-12 mb-3';
        div.innerHTML = `
            <div class="card mcc border-secondary">
                <div class="card-body">
                    <h6 class="card-title mb-3 text-white">Room ${i + 1}</h6>
                    <div class="mb-2">
                        <label for="RDCRoomNumber${i}" class="form-label text-white">Room Number</label>
                        <input type="text" class="form-control bg-dark text-light border-secondary room-number-input" 
                               id="RDCRoomNumber${i}" placeholder="Enter room number" required>
                    </div>
                </div>
            </div>
        `;
        roomNumbersContainer.appendChild(div);
    }

    document.getElementById('roomsCountDCRDisplay').textContent = selectedReservation.RoomCount;
    const baseAmount = 40000;
    const totalAmount = (baseAmount * selectedReservation.RoomCount) - (selectedReservation.AmountPaid || 0);
    document.getElementById('RDCTotalAmountDisplay').textContent = totalAmount.toLocaleString() + ' Ks';

    const dayCautionForm = document.getElementById('dayCautionRForm');
    dayCautionForm.onsubmit = async function(e) {
        e.preventDefault();

        if (!document.getElementById('RDCPaid').checked) {
            alert('Please confirm that the full amount is paid.');
            return;
        }

        try {
            const roomInputs = document.querySelectorAll('#roomNumbersDCContainer .room-number-input');
            const roomConfigs = [];

            for (let i = 0; i < roomInputs.length; i++) {
                const roomNumber = roomInputs[i].value;
                if (!roomNumber) {
                    alert('Please fill in all room numbers');
                    return;
                }

                const isRoomAvailable = await statusCheckRoom(roomNumber);
                if (!isRoomAvailable) {
                    return;
                }

                roomConfigs.push({
                    number: parseInt(roomNumber)
                });
            }

            const checkinTime = new Date();
            const checkoutTime = new Date(checkinTime.getTime() + (12 * 60 * 60 * 1000)); // Add 12 hours

            const totalPaid = baseAmount * roomConfigs.length;
            const amountPerRoom = totalPaid / roomConfigs.length;

            for (const room of roomConfigs) {
                const formData = {
                    Name: nameInput.value,
                    NationalID: nationalIdInput.value || null,
                    Phone: phoneNumberInput.value || null,
                    RoomType: 'DAY-CAUTION',
                    RoomNumber: room.number,
                    CheckinDate: checkinTime.toISOString(),
                    CheckoutDate: checkoutTime.toISOString(),
                    PaymentType: document.getElementById('RDCPaymentType').value,
                    AmountPaid: amountPerRoom,
                    ExtraCharges: 0,
                    FoodCharges: 0,
                    Paid: true
                };

                console.log('Creating guest record for room:', room.number, formData);
                const response = await axios.post('http://localhost:8080/create-guest', formData);
                if (response.status === 200) {
                    await roomStatusClick(3, room.number);
                }
            }

            await axios.put(`http://localhost:8080/reservations/${selectedReservation.ID}`, {
                Status: "CHECKED-IN"
            });

            await loadTodayReservations();
            await loadRooms();
            await loadDashboardStats();
            $('#dayCautionRModal').modal('hide');
            alert('Check-in successful!');
        } catch (error) {
            console.error('Error creating guest:', error);
            alert('Error checking-in the guest. Please try again');
        }
    };

    const dayCautionModal = $('#dayCautionRModal');
    const reservationOptionsModal = $('#reservationOptionsModal');

    dayCautionModal.on('show.bs.modal', function() {
        reservationOptionsModal.modal('hide');
    });

    dayCautionModal.on('hidden.bs.modal', function(e) {
        reservationOptionsModal.modal('hide');
        dayCautionForm.reset();
        roomNumbersContainer.innerHTML = '';
    });
}

async function sessionRForm() {
    $('#reservationOptionsModal').modal('hide');

    const modal = document.getElementById('sessionRModalLabel');
    modal.innerHTML = `
        <i class="fas fa-clock me-2 mt-2 mr-2"></i>
        Check-in | ${selectedReservation.Name}
    `;

    const nameInput = document.getElementById('RSName');
    const nationalIdInput = document.getElementById('RSNationalId');
    const phoneNumberInput = document.getElementById('RSPhoneNumber');
    const amountPaidDisplay = document.getElementById('RSAmountPaidDisplay');
    const roomNumbersContainer = document.getElementById('roomNumbersSContainer');

    amountPaidDisplay.textContent = (selectedReservation.AmountPaid || 0).toLocaleString() + ' Ks';

    nameInput.value = selectedReservation.Name;
    nationalIdInput.value = selectedReservation.NationalID || '';
    phoneNumberInput.value = selectedReservation.Phone || '';

    roomNumbersContainer.innerHTML = '';
    for (let i = 0; i < selectedReservation.RoomCount; i++) {
        const div = document.createElement('div');
        div.className = 'col-md-12 mb-3';
        div.innerHTML = `
            <div class="card mcc border-secondary">
                <div class="card-body">
                    <h6 class="card-title mb-3 text-white">Room ${i + 1}</h6>
                    <div class="mb-2">
                        <label for="RDCRoomNumber${i}" class="form-label text-white">Room Number</label>
                        <input type="text" class="form-control bg-dark text-light border-secondary room-number-input" 
                               id="RDCRoomNumber${i}" placeholder="Enter room number" required>
                    </div>
                </div>
            </div>
        `;
        roomNumbersContainer.appendChild(div);
    }

    document.getElementById('roomsCountSRDisplay').textContent = selectedReservation.RoomCount;
    const baseAmount = 40000;
    const totalAmount = (baseAmount * selectedReservation.RoomCount) - (selectedReservation.AmountPaid || 0);
    document.getElementById('RSTotalAmountDisplay').textContent = totalAmount.toLocaleString() + ' Ks';

    const sessionForm = document.getElementById('sessionRForm');
    sessionForm.onsubmit = async function(e) {
        e.preventDefault();

        if (!document.getElementById('RSPaid').checked) {
            alert('Please confirm that the full amount is paid.');
            return;
        }

        try {
            const roomInputs = document.querySelectorAll('#roomNumbersSContainer .room-number-input');
            const roomConfigs = [];

            for (let i = 0; i < roomInputs.length; i++) {
                const roomNumber = roomInputs[i].value;
                if (!roomNumber) {
                    alert('Please fill in all room numbers');
                    return;
                }

                const isRoomAvailable = await statusCheckRoom(roomNumber);
                if (!isRoomAvailable) {
                    return;
                }

                roomConfigs.push({
                    number: parseInt(roomNumber)
                });
            }

            const checkinTime = new Date();
            const checkoutTime = new Date(checkinTime.getTime() + (3 * 60 * 60 * 1000)); // Add 12 hours

            const totalPaid = baseAmount * roomConfigs.length;
            const amountPerRoom = totalPaid / roomConfigs.length;

            for (const room of roomConfigs) {
                const formData = {
                    Name: nameInput.value,
                    NationalID: nationalIdInput.value || null,
                    Phone: phoneNumberInput.value || null,
                    RoomType: 'SESSION',
                    RoomNumber: room.number,
                    CheckinDate: checkinTime.toISOString(),
                    CheckoutDate: checkoutTime.toISOString(),
                    PaymentType: document.getElementById('RDCPaymentType').value,
                    AmountPaid: amountPerRoom,
                    ExtraCharges: 0,
                    FoodCharges: 0,
                    Paid: true
                };

                console.log('Creating guest record for room:', room.number, formData);
                const response = await axios.post('http://localhost:8080/create-guest', formData);
                if (response.status === 200) {
                    await roomStatusClick(4, room.number);
                }
            }

            await axios.put(`http://localhost:8080/reservations/${selectedReservation.ID}`, {
                Status: "CHECKED-IN"
            });

            await loadTodayReservations();
            await loadRooms();
            await loadDashboardStats();
            $('#sessionRModal').modal('hide');
            alert('Check-in successful!');
        } catch (error) {
            console.error('Error creating guest:', error);
            alert('Error checking-in the guest. Please try again');
        }
    };

    const sessionModal = $('#sessionRModal');
    const reservationOptionsModal = $('#reservationOptionsModal');

    sessionModal.on('show.bs.modal', function() {
        reservationOptionsModal.modal('hide');
    });

    sessionModal.on('hidden.bs.modal', function(e) {
        reservationOptionsModal.modal('hide');
        sessionForm.reset();
        roomNumbersContainer.innerHTML = '';
    });
}

// Status check room utility class to get the room from the database
async function getRoom(Room) {
    try {
        const response = await axios.get(`http://localhost:8080/rooms/${Room}`);
        console.log('Room data:', response.data);
        if (!response.data) {
            throw new Error('Room not found');
        }
        return response.data;
    } catch (error) {
        console.error(`Error getting ${Room} status:`, error);
        throw error;
    }
}

async function statusCheckRoom(roomNumber) {
    try {
        const room = await getRoom(roomNumber);
        console.log('Checking room status:', room.Status);

        if (!room) {
            alert("Room not found");
            return false;
        }

        if ([2,3,4].includes(room.Status)) {
            alert(`Room ${roomNumber} is occupied`);
            return false;
        } else if (room.Status === 5) {
            alert(`Room ${roomNumber} is under housekeeping`);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking room status:', error);
        alert(`Error checking status for room ${roomNumber}`);
        return false;
    }
}

// Delete Reservation
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
            $('#reservationOptionsModal').modal('hide');

            const dateFilter = document.getElementById('reservationDateFilter');
            loadReservationsByDate(dateFilter.value);
        }
    } catch (error) {
        console.error('Error deleting reservation: ', error);
        alert(error.response || 'Failed to delete reservation');
    }
}

// View and Edit the reservation details
async function fetchReservationDetails(reservationId) {
    try {
        const response = await axios.get(`http://localhost:8080/reservations/${reservationId}`);
        if (response.data) {
            selectedReservation = response.data;
        }
    } catch(error) {
        console.error('Error fetching reservation details: ', error);
    }
}

async function showReservationDetails() {
    if (!selectedReservationId) {
        alert('No reservation selected');
        return;
    }
    $('#reservationOptionsModal').modal('hide');

    document.getElementById('reservationName').textContent = selectedReservation.Name;
    document.getElementById('reservationNID').textContent = selectedReservation.NationalID;
    document.getElementById('reservationPhone').textContent = selectedReservation.Phone;
    document.getElementById('reservationRoomType').textContent = formatRoomType(selectedReservation.RoomType);
    document.getElementById('reservationCheckinDate').textContent = new Date(selectedReservation.CheckinDate).toLocaleDateString();
    document.getElementById('reservationCheckoutDate').textContent = new Date(selectedReservation.CheckoutDate).toLocaleDateString();
    document.getElementById('reservationGuestCount').textContent = selectedReservation.GuestCount;
    document.getElementById('reservationRoomCount').textContent = selectedReservation.RoomCount;
    document.getElementById('reservationPaymentType').textContent = formatPaymentType(selectedReservation.PaymentType);
    document.getElementById('reservationAmountPaid').textContent = selectedReservation.AmountPaid !== null ? selectedReservation.AmountPaid + ' ks' : '0 ks';
    document.getElementById('reservationExtraBed').textContent = selectedReservation.ExtraBed ? 'Extra Bed' : '-';
    document.getElementById('reservationNotes').textContent = selectedReservation.Notes || '-';

    document.getElementById('editRExtraBed').checked = false;

    $('#reservationDetailsModal').modal('show');
}

function toggleEditMode(isEdit) {
    const viewElements = document.querySelectorAll('.view-mode');
    const editElements = document.querySelectorAll('.edit-mode');

    if (isEdit) {
        viewElements.forEach(element => element.classList.add('d-none'));
        editElements.forEach(element => element.classList.remove('d-none'));

        document.getElementById('editRName').value = selectedReservation.Name;
        document.getElementById('editRNID').value = selectedReservation.NationalID || '';
        document.getElementById('editRPhone').value = selectedReservation.Phone;
        document.getElementById('editRRoomType').value = selectedReservation.RoomType;
        document.getElementById('editRCheckin').value = formatDate(selectedReservation.CheckinDate);
        document.getElementById('editRCheckout').value = formatDate(selectedReservation.CheckoutDate);
        document.getElementById('editRGuestCount').value = selectedReservation.GuestCount;
        document.getElementById('editRRoomCount').value = selectedReservation.RoomCount;
        document.getElementById('editRPaymentType').value = selectedReservation.PaymentType;
        document.getElementById('editRAmountPaid').value = selectedReservation.AmountPaid;
        document.getElementById('editRExtraBed').checked = selectedReservation.ExtraBed === true;
        document.getElementById('editRNotes').value = selectedReservation.Notes;

        const today = formatDate(new Date());

        document.getElementById('editRCheckin').setAttribute('min', today);
        document.getElementById('editRCheckout').setAttribute('min', today);
    } else {
        viewElements.forEach(element => element.classList.remove('d-none'));
        editElements.forEach(element => element.classList.add('d-none'));
    }
}

async function saveReservation() {
    try {
        const updatedReservation = {
            ID: selectedReservation.ID,
            Name: document.getElementById('editRName').value,
            NationalID: document.getElementById('editRNID').value,
            Phone: document.getElementById('editRPhone').value,
            RoomType: document.getElementById('editRRoomType').value,
            CheckinDate: document.getElementById('editRCheckin').value + "T00:00:00Z",
            CheckoutDate: document.getElementById('editRCheckout').value + "T00:00:00Z",
            ReservationDate: selectedReservation.ReservationDate,
            GuestCount: parseInt(document.getElementById('editRGuestCount').value),
            RoomCount: parseInt(document.getElementById('editRRoomCount').value),
            PaymentType: document.getElementById('editRPaymentType').value,
            AmountPaid: parseInt(document.getElementById('editRAmountPaid').value),
            ExtraBed: document.getElementById('editRExtraBed').checked,
            Notes: document.getElementById('editRNotes').value,
            Status: selectedReservation.Status
        };
        console.log('Sending reservation: ', updatedReservation);

        const response = await axios.put(`http://localhost:8080/reservations/${selectedReservation.ID}`, updatedReservation);

        if (response.data) {
            selectedReservation = response.data;

            showGuestDetails();

            const dateFilter = document.getElementById('reservationDateFilter');
            await loadReservationsByDate(dateFilter.value);

            toggleEditMode(false);
        }

    } catch(error) {
        console.error('Error updating reservation: ', error);
        alert('Failed to update reservation. Please try again.');
    }
}

// Format
function formatRoomType(type) {
    const types = {
        'FULL-NIGHT': 'Full Night',
        'DAY-CAUTION': 'Day Caution',
        'SESSION': 'Session'
    };
    return types[type] || type;
}

function formatPaymentType(type) {
    const types = {
        'NONE': 'None',
        'KPAY': 'KPay',
        'AYAPAY': 'AyaPay',
        'WAVEPAY': 'WavePay',
        'CASH': 'Cash'
    };
    return types[type] || type;
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
