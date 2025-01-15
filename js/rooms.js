document.addEventListener('DOMContentLoaded', () => {
    loadRooms();
});

let selectedRoom = null;

async function loadRooms() {
    try {
        const response = await axios.get('http://localhost:8080/rooms');
        if (response.status === 200) {
            displayRoomsByFloor(response.data);
        }
    } catch (error) {
        console.error('Error loading rooms: ', error)
    }
}

function displayRoomsByFloor(rooms) {
    const roomsByFloor = {};
    rooms.forEach(room => {
        const floor = room.Floor;
        if (!roomsByFloor[floor]){
            roomsByFloor[floor] = [];
        }
        roomsByFloor[floor].push(room);
    });

    Object.keys(roomsByFloor).forEach(floor => {
        const floorElement = document.getElementById(`floor-${floor}`);
        if (floorElement) {
            const roomGrid = floorElement.querySelector('.room-grid');
            if (roomGrid) {
                roomGrid.innerHTML = '';
                roomsByFloor[floor]
                    .sort((a, b) => a.Room.localeCompare(b.Room))
                    .forEach(room=> {
                        roomGrid.appendChild(createRoomCard(room));
                    });
            }
        }
    });
}

function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = `room-card ${getStatusClass(room.Status)} `;
    card.setAttribute('data-room-number', room.Room);
    card.setAttribute('data-status', room.Status);
    card.setAttribute('data-toggle', 'modal');

    if (room.Status === 1) {
        card.setAttribute('data-target', '#roomOptionsModal');
    }

    card.addEventListener('click', async() => {
        selectedRoom = room.Room;
        const modalTitle = document.getElementById('roomOptionsModalLabel');
        modalTitle.innerHTML = `
            <i class="fas fa-hotel me-2 mt-2 mr-2"></i>
            Room ${room.Room}
        `
        if (room.Status === 6) {
            const userConfirmed = confirm("Do you want to set the room to available?");
            if (userConfirmed) {
                await optionStatus(1)
            }
        }
    });

    const statusInfo = getStatusInfo(room.Status);

    card.innerHTML = `
        <div class="room-number">${room.Room}</div>
        <div class="card-bottom">
            <div class="row">
                <div class="status-icon status-badge status-${room.Status} ml-3 col-2">
                    <i class="${statusInfo.icon}"></i>
                </div>
                <div class="status-text col-9">${statusInfo.text}</div>
            </div>
        </div>
    `
    return card;
}

function getStatusClass(status) {
    const statusClasses = {
        1: 'available',
        2: 'full-night',
        3: 'day-caution',
        4: 'session',
        5: 'housekeeping',
        6: 'maintenance'
    };
    return statusClasses[status] || 'available';
}

function getStatusInfo(status) {
    const statusInfo = {
        1: {
            text: "Available",
            icon: 'fas fa-check-circle',
            price: null
        },
        2: {
            text: "Full Night",
            icon: 'fas fa-moon',
            price: '70,000 Ks'
        },
        3: {
            text: "Day Caution",
            icon: 'fas fa-sun',
            price: '40,000 Ks'
        },
        4: {
            text: "Session",
            icon: 'fas fa-clock',
            price: '28,000 Ks'
        },
        5: {
            text: "Housekeeping",
            icon: 'fas fa-broom',
            price: null
        },
        6: {
            text: "Maintenance",
            icon: 'fas fa-tools',
            price: null
        }
    }
    return statusInfo[status] || statusInfo[1];
}

async function fullNightForm() {
    if (!selectedRoom) {
        console.error('No room selected');
        return;
    }
    
    $('#roomOptionsModal').modal('hide');
    
    const modal = document.getElementById('fullNightModalLabel');
    modal.innerHTML = `
        <i class="fas fa-calendar-alt me-2 mt-2 mr-2"></i>
        ${selectedRoom} Check-in
    `;
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkoutInput = document.getElementById('FNCheckoutDate');
    const dayCountDisplay = document.getElementById('dayCountDisplay');
    const totalAmountDisplay = document.getElementById('dayTotalAmountDisplay');
    const extraBedCheckbox = document.getElementById('FNExtraBed');
    const fullNightForm = document.getElementById('fullNightForm');

    const todayStr = today.toISOString().split('T')[0];
    checkoutInput.min = todayStr;

    fullNightForm.reset();
    extraBedCheckbox.style.display = '';

    checkoutInput.value = tomorrow.toISOString().split('T')[0];

    function updateDaysAndAmount() {
        const checkoutDate = new Date(checkoutInput.value);
        const checkinDate = new Date(today);
        
        const diffTime = checkoutDate - checkinDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let roomPrice = 62000;
        if (extraBedCheckbox.checked) {
            roomPrice += 30000;
        }
        
        dayCountDisplay.textContent = String(diffDays);
        let totalAmount = diffDays * roomPrice;
        totalAmountDisplay.textContent = totalAmount.toLocaleString() + ' Ks';
    }

    checkoutInput.addEventListener('change', updateDaysAndAmount);
    extraBedCheckbox.addEventListener('change', updateDaysAndAmount);
    
    fullNightForm.onsubmit = async function(e) {
        e.preventDefault();

        if (!document.getElementById('FNPaid').checked) {
            alert('Please confirm that the full amount is paid.');
            return;
        }

        try {
            const checkoutDate = checkoutInput.value;
            const amountPaid = parseInt(totalAmountDisplay.textContent.replace(/[^0-9]/g, ''));

            const formData = {
                Name: document.getElementById('FNName').value,
                NationalID: document.getElementById('FNNationalId').value || null,
                Phone: document.getElementById('FNPhoneNumber').value || null,
                RoomType: 'FULL-NIGHT',
                RoomNumber: parseInt(selectedRoom),
                CheckinDate: new Date(today).toISOString(),
                CheckoutDate: new Date(checkoutDate).toISOString(),
                ExtraBed: extraBedCheckbox.checked,
                PaymentType: document.getElementById('FNPaymentType').value,
                AmountPaid: amountPaid > 0 ? amountPaid : null,
                ExtraCharges: 0,
                FoodCharges: 0,
                Paid: true
            };

            console.log('Creating full night check in: ', formData);

            const response = await axios.post('http://localhost:8080/create-guest', formData);
            if (response.status === 200) {
                await roomStatusClick(2, selectedRoom);
                await loadRooms();
                await loadDashboardStats();
                $('#fullNightModal').modal('hide');
                alert('Check-in successful!');
            }
        } catch (error) {
            console.error('Error creating guest: ', error);
            alert('Error checking-in the guest. Please try again');
        }
    };

    updateDaysAndAmount();
    
    $('#fullNightModal').on('hidden.bs.modal', function() {
        fullNightForm.reset();
        extraBedCheckbox.style.display = '';
    });
}

async function dayCautionForm() {
    if (!selectedRoom) {
        console.error('No room selected');
        return;
    }

    $('#roomOptionsModal').modal('hide');

    const modal = document.getElementById('dayCautionModalLabel');
    modal.innerHTML = `
        <i class="fas fa-calendar-alt me-2 mt-2 mr-2"></i>
        ${selectedRoom} Check-in
    `;

    const cautionTotalAmountDisplay = document.getElementById('cautionTotalAmountDisplay');
    const dayCautionForm = document.getElementById('dayCautionForm');

    dayCautionForm.reset();

    dayCautionForm.onsubmit = async function(e) {
        e.preventDefault();

        if (!document.getElementById('DCPaid').checked) {
            alert('Please confirm that the full amount is paid.');
            return;
        }

        try {
            const checkinDate = new Date();
            const checkoutDate = new Date(checkinDate);
            checkoutDate.setHours(checkoutDate.getHours() + 12);
            const amountPaid = parseInt(cautionTotalAmountDisplay.textContent.replace(/[^0-9]/g, ''));

            const formData = {
                Name: document.getElementById('DCName').value,
                NationalID: document.getElementById('DCNationalId').value || null,
                Phone: document.getElementById('DCPhoneNumber').value || null,
                RoomType: 'DAY-CAUTION',
                RoomNumber: parseInt(selectedRoom),
                CheckinDate: checkinDate.toISOString(),
                CheckoutDate: checkoutDate.toISOString(),
                ExtraBed: false,
                PaymentType: document.getElementById('DCPaymentType').value,
                AmountPaid: amountPaid > 0 ? amountPaid : null,
                ExtraCharges: 0,
                FoodCharges: 0,
                Paid: true
            };

            console.log('Creating day caution check in: ', formData);

            const response = await axios.post('http://localhost:8080/create-guest', formData);
            if (response.status === 200) {
                await roomStatusClick(3, selectedRoom);
                await loadRooms();
                await loadDashboardStats();
                $('#dayCautionModal').modal('hide');
                alert('Check-in successful!');
            }
        } catch (error) {
            console.error('Error creating guest: ', error);
            alert('Error checking-in the guest. Please try again');
        }
    };

    $('#dayCautionModal').on('hidden.bs.modal', function() {
        dayCautionForm.reset();
    });
}

async function sessionForm() {
    if (!selectedRoom) {
        console.error('No room selected');
        return;
    }

    $('#roomOptionsModal').modal('hide');

    const modal = document.getElementById('sessionModalLabel');
    modal.innerHTML = `
        <i class="fas fa-calendar-alt me-2 mt-2 mr-2"></i>
        ${selectedRoom} Check-in
    `;

    const sessionTotalAmountDisplay = document.getElementById('sessionTotalAmountDisplay');
    const sessionForm = document.getElementById('sessionForm');

    sessionForm.reset();

    sessionForm.onsubmit = async function(e) {
        e.preventDefault();

        if (!document.getElementById('SPaid').checked) {
            alert('Please confirm that the full amount is paid.');
            return;
        }

        try {
            const checkinDate = new Date();
            const checkoutDate = new Date(checkinDate);
            checkoutDate.setHours(checkoutDate.getHours() + 3);
            checkoutDate.setMinutes(checkoutDate.getMinutes() + 5);
            const amountPaid = parseInt(sessionTotalAmountDisplay.textContent.replace(/[^0-9]/g, ''));

            const formData = {
                Name: document.getElementById('SName').value,
                NationalID: document.getElementById('SNationalId').value || null,
                Phone: document.getElementById('SPhoneNumber').value || null,
                RoomType: 'SESSION',
                RoomNumber: parseInt(selectedRoom),
                CheckinDate: checkinDate.toISOString(),
                CheckoutDate: checkoutDate.toISOString(),
                ExtraBed: false,
                PaymentType: document.getElementById('SPaymentType').value,
                AmountPaid: amountPaid > 0 ? amountPaid : null,
                ExtraCharges: 0,
                FoodCharges: 0,
                Paid: true
            };

            console.log('Creating session check in: ', formData);

            const response = await axios.post('http://localhost:8080/create-guest', formData);
            if (response.status === 200) {
                await roomStatusClick(4, selectedRoom);
                await loadRooms();
                await loadDashboardStats();
                $('#sessionModal').modal('hide');
                alert('Check-in successful!');
            }
        } catch (error) {
            console.error('Error creating guest: ', error);
            alert('Error checking-in the guest. Please try again');
        }
    };

    $('#sessionModal').on('hidden.bs.modal', function() {
        sessionForm.reset();
    });
}

async function optionStatus(status) {
    if (!selectedRoom) {
        console.error('No room selected');
        return;
    }
    try {
        await roomStatusClick(status, selectedRoom);
        await loadRooms();
        await loadDashboardStats();
        $('#roomOptionsModal').modal('hide');
    } catch (error) {
        console.error('Error updating room status: ', error);
        alert('Error updating room status. Please try again.');
    }
}

async function roomStatusClick(status, roomNumber) {
    try {
        const response = await axios.put(`http://localhost:8080/rooms/${roomNumber}`, {status});
        console.log('Status Update Response: ', response.data)
        return response.data;
    } catch (error) {
        console.error('Error handling status click: ', error);
        alert('Error updating room status. Please try again.')
    }
}
