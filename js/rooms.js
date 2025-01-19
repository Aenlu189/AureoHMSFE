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
    } else if ([2,3,4].includes(room.Status)) {
        card.setAttribute('data-target', '#occupiedOptionsModal');
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
        const modal = document.getElementById('occupiedOptionsModalLabel');
        modal.innerHTML = `
        <i class="fas fa-user me-2 mt-2 mr-2"></i>
        ${selectedRoom} Options
        `;
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
            price: '62,000 Ks'
        },
        3: {
            text: "Day Caution",
            icon: 'fas fa-sun',
            price: '40,000 Ks'
        },
        4: {
            text: "Session",
            icon: 'fas fa-clock',
            price: '40,000 Ks'
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

async function occupiedOptions(option) {
    $('#occupiedOptionsModal').modal('hide');

    if (option === 1) {
        showGuestDetails(selectedRoom);
    } else if (option === 2) {
        extendStay(selectedRoom);
    } else if (option === 3) {
        foodOrder(selectedRoom);
    }
}

async function showGuestDetails(roomNumber) {
    const modalLabel = document.getElementById('guestDetailsModalLabel');
    modalLabel.innerHTML = `
        <i class="fas fa-user me-2 mt-2 mr-2"></i>
        ${selectedRoom} Guest Details
    `;
    try {
        // Get the active guest for this room
        const guestResponse = await axios.get(`http://localhost:8080/guests/current/${roomNumber}`);
        const guest = guestResponse.data;

        console.log('Guest Data:', guest);

        if (!guest || guest.Status !== 'ACTIVE') {
            alert('No active guest found in this room');
            return;
        }

        // Display guest information
        document.getElementById('guestName').textContent = guest.Name || 'N/A';
        document.getElementById('guestNationalID').textContent = guest.NationalID || 'N/A';
        document.getElementById('guestPhone').textContent = guest.Phone || 'N/A';
        document.getElementById('guestRoomType').textContent = formatRoomType(guest.RoomType) || 'N/A';
        document.getElementById('guestRoomNumber').textContent = guest.RoomNumber || 'N/A';
        document.getElementById('guestCheckin').textContent = guest.CheckinDate ? new Date(guest.CheckinDate).toLocaleString() : 'N/A';
        document.getElementById('guestCheckout').textContent = guest.CheckoutDate ? new Date(guest.CheckoutDate).toLocaleString() : 'N/A';

        // Get food orders for this guest
        const foodResponse = await axios.get(`http://localhost:8080/food/orders/${roomNumber}`);
        const foodOrders = foodResponse.data;

        const foodOrderHistory = document.getElementById('foodOrderHistory');
        if (foodOrders && foodOrders.length > 0) {
            const currentGuestOrders = foodOrders.filter(order => order.GuestID === guest.ID);
            
            if (currentGuestOrders.length === 0) {
                foodOrderHistory.innerHTML = '<div class="text-center text-muted">No food orders found for this guest</div>';
                return;
            }

            let foodOrdersHTML = '';
            currentGuestOrders.forEach(order => {
                foodOrdersHTML += `
                    <div class="food-order-item mb-3">
                        <div class="d-flex justify-content-between">
                            <span>${order.FoodName}</span>
                            <span class="text-primary">${order.Quantity}x</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="priceColor">Price:</span>
                            <span class="text-primary">${order.Price.toLocaleString()} Ks</span>
                        </div>
                    </div>
                `;
            });
            foodOrderHistory.innerHTML = foodOrdersHTML;
        } else {
            foodOrderHistory.innerHTML = '<div class="text-center text-muted">No food orders found</div>';
        }

        document.getElementById('roomCharges').textContent = (guest.AmountPaid - guest.ExtraCharges - guest.FoodCharges).toLocaleString() + ' Ks';
        document.getElementById('extraCharges').textContent = (guest.ExtraCharges || 0).toLocaleString() + ' Ks';
        document.getElementById('foodChargesDetails').textContent = guest.FoodCharges.toLocaleString() + ' Ks';
        document.getElementById('gAmountPaid').textContent = (guest.AmountPaid || 0).toLocaleString() + ' Ks';
        document.getElementById('paymentType').textContent = formatPaymentType(guest.PaymentType) || 'N/A';
        document.getElementById('paymentStatus').textContent = guest.Paid ? 'Paid' : 'Pending';

        const totalAmount = calculateTotalAmount(guest);
        document.getElementById('gAmountDue').textContent = totalAmount.toLocaleString() + ' Ks';

        $('#guestDetailsModal').modal('show');
    } catch (error) {
        console.error('Error fetching guest details:', error);
        alert('Failed to fetch guest details');
    }
}

async function updateGuestFoodPrice(guestId, roomNumber) {
    try {
        if (!guestId) {
            console.error('Guest ID is missing');
            return;
        }

        // Get current guest to ensure they are active
        const guestResponse = await axios.get(`http://localhost:8080/guests/current/${roomNumber}`);
        const currentGuest = guestResponse.data;
        
        if (!currentGuest || currentGuest.Status !== 'ACTIVE') {
            console.error('Guest is not active');
            return;
        }

        const foodOrdersResponse = await axios.get(`http://localhost:8080/food/orders/${roomNumber}`);
        const foodOrders = foodOrdersResponse.data;
        console.log('All food orders:', foodOrders);
        
        const guestOrders = foodOrders.filter(order => order.GuestID === parseInt(guestId));
        console.log('Guest orders:', guestOrders);
        console.log('Guest ID being checked:', guestId);
        
        const totalFoodPrice = guestOrders.reduce((total, order) => {
            console.log('Current order:', order);
            console.log('Current total:', total);
            console.log('Order price:', order.Price);
            return total + order.Price;
        }, 0);
        console.log('Final total food price:', totalFoodPrice);
        
        const response = await axios.put(`http://localhost:8080/guests/foodPrice/${guestId}`, {
            FoodCharges: totalFoodPrice,
        });

        if (response.data && response.data.guest) {
            return response.data.guest.FoodCharges;
        }
        return totalFoodPrice;
    } catch (error) {
        console.error('Error updating guest food price:', error);
        throw error;
    }
}

document.getElementById('foodOrderForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    if (selectedItems.size === 0) {
        alert('Please select at least one item');
        return;
    }

    try {
        const guestResponse = await axios.get(`http://localhost:8080/guests/current/${selectedRoom}`);
        const guest = guestResponse.data;

        if (!guest || guest.Status !== 'ACTIVE') {
            throw new Error('No active guest found in this room');
        }

        if (!guest.ID) {
            throw new Error('Invalid guest ID');
        }

        for (const [foodName, item] of selectedItems) {
            const orderData = {
                GuestID: guest.ID,
                RoomID: parseInt(selectedRoom),
                FoodName: foodName,
                Quantity: item.quantity,
                Price: item.price * item.quantity,
                OrderTime: new Date().toISOString(),
            };

            const response = await axios.post('http://localhost:8080/food/order', orderData);
            if (!response.data) {
                throw new Error('Failed to create food order');
            }
        }

        await updateGuestFoodPrice(guest.ID, selectedRoom);
        console.log('Updated food price for guest:', guest.ID);

        alert('Food order placed successfully!');
        $('#foodOrderModal').modal('hide');

        selectedItems.clear();
        updateSelectedItemsList();

        if ($('#guestDetailsModal').is(':visible')) {
            showGuestDetails(selectedRoom);
        }
    } catch (error) {
        console.error('Error placing food order:', error);
        alert(error.message || 'Failed to place food order');
    }
});

async function foodOrder(roomNumber) {
    const modalLabel = document.getElementById('foodOrderModalLabel');
    modalLabel.innerHTML = `
        <i class="fas fa-burger me-2 mt-2 mr-2"></i>
        ${selectedRoom} Food Order
    `;
    try {
        const response = await axios.get(`http://localhost:8080/guests/current/${roomNumber}`);
        const guest = response.data;

        if (!guest || guest.Status !== 'ACTIVE') {
            alert('No active guest found in this room');
            return;
        }

        loadMenuItems();
        $('#foodOrderModal').modal('show');
    } catch (error) {
        console.error('Error loading guest details:', error);
        alert('Failed to load guest details');
    }
}

async function loadMenuItems() {
    try {
        const response = await axios.get('http://localhost:8080/food/menus');
        const menuItems = response.data;

        const menuItemsList = document.getElementById('menuItemsList');
        menuItemsList.innerHTML = '';

        menuItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-center';
            itemElement.innerHTML = `
                <div>
                    <h6 class="mb-0">${item.FoodName}</h6>
                    <small class="text-primary">${parseInt(item.FoodPrice).toLocaleString()} Ks</small>
                </div>
                </div>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="event.preventDefault(); addMenuItem('${item.FoodName}', ${item.FoodPrice})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;

            menuItemsList.appendChild(itemElement);
        });
    } catch (error) {
        console.error('Error loading menu items:', error);
        alert('Failed to load menu items');
    }
}

const selectedItems = new Map();

function addMenuItem(foodName, price) {
    const currentQuantity = selectedItems.get(foodName)?.quantity || 0;
    selectedItems.set(foodName, {
        quantity: currentQuantity + 1,
        price: price
    });
    updateSelectedItemsList();
}

function removeMenuItem(foodName) {
    const item = selectedItems.get(foodName);
    if (item && item.quantity > 1) {
        selectedItems.set(foodName, {
            quantity: item.quantity - 1,
            price: item.price
        });
    } else {
        selectedItems.delete(foodName);
    }
    updateSelectedItemsList();
}

function updateSelectedItemsList() {
    const selectedItemsList = document.getElementById('selectedItems');
    const totalAmountElement = document.getElementById('totalAmountFood');
    const noItemsMessage = document.getElementById('noItemsMessage');

    selectedItemsList.innerHTML = '';
    let totalAmount = 0;

    if (selectedItems.size === 0) {
        selectedItemsList.innerHTML = `
            <div id="noItemsMessage" class="text-center text-muted py-4">
                No items selected
            </div>
        `;
    } else {
        selectedItems.forEach((item, foodName) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-center';
            itemElement.innerHTML = `
                <div>
                    <h6 class="mb-0">${foodName}</h6>
                    <small class="text-primary">${(item.price * item.quantity).toLocaleString()} Ks</small>
                </div>
                <div class="d-flex align-items-center">
                    <span class="badge bg-primary mr-2">${item.quantity}x</span>
                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="event.preventDefault(); removeMenuItem('${foodName}')">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            `;
            selectedItemsList.appendChild(itemElement);
            totalAmount += item.price * item.quantity;
        });
    }
    
    totalAmountElement.textContent = `${totalAmount.toLocaleString()} Ks`;
}

async function extendStay(roomNumber) {
    const modalLabel = document.getElementById('extendStayModalLabel');
    modalLabel.innerHTML = `
        <i class="fas fa-user me-2 mt-2 mr-2"></i>
        ${selectedRoom} Extend Stay
    `;
    try {
        const response = await axios.get(`http://localhost:8080/guests/current/${roomNumber}`);
        const guest = response.data;

        console.log('Guest Data:', guest);

        if (!guest) {
            console.error('Guest not found');
            return;
        }

        document.getElementById('ESName').textContent = guest.Name || 'N/A';
        document.getElementById('ESRoomType').textContent = formatRoomType(guest.RoomType) || 'N/A';
        document.getElementById('ESCheckinDate').textContent = ((guest.RoomType === "FULL-NIGHT") && guest.CheckinDate) ? new Date(guest.CheckinDate).toLocaleDateString() : new Date(guest.CheckinDate).toLocaleString();
        document.getElementById('ESCheckoutDate').textContent = ((guest.RoomType === "FULL-NIGHT") && guest.CheckoutDate) ? new Date(guest.CheckoutDate).toLocaleDateString() : new Date(guest.CheckoutDate).toLocaleString();
        document.getElementById('ESTotalAmountPaid').textContent = (guest.AmountPaid || 0).toLocaleString() + ' Ks';

        const extendStayForm = document.getElementById('extendStayForm');

        const stayDependentCard1 = document.getElementById('stayDependentCard1');
        const stayDependentCard2 = document.getElementById('stayDependentCard2');

        if (guest.RoomType === "DAY-CAUTION") {
            stayDependentCard1.innerHTML = `
            <div class="card-body">
                <div class="row mb-1">
                    <div class="col-md-6">
                        <label for="ESDCHours" class="form-label text-white">Additional Hours</label>
                        <input type="number" class="form-control bg-dark text-light border-secondary" id="ESDCHours" min="1" max="12" value="1">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-white">Update</label>
                        <p class="detailOutput bg-dark view-mode" id="ESDCAddDayCaution"></p>
                    </div>
                </div>
            </div>                                    
            `
            stayDependentCard2.innerHTML = `
                <div class="card-body">
                     <div class="col-md-12">
                          <div class="d-flex justify-content-between mb-2">
                               <span class="text-white" id="ESDCBasePrice">Rate per Hour :</span>
                               <span id="ESDCBasePriceDisplay" class="fw-bold text-primary">10,000</span>
                          </div>
                          <div class="d-flex justify-content-between roomCount">
                               <span class="text-white" id="ESDCHours">Hours :</span>
                               <span id="ESDCHoursCountDisplay" class="fw-bold text-primary">1</span>
                          </div>
                          <div class="d-flex justify-content-between">
                               <h5 class="text-white" id="ESDCAdditionalCharge">Additional Charge :</h5>
                               <h5 id="ESDCAddChargeDisplay" class="fw-bold text-primary">10,000 Ks</h5>
                          </div>
                          <br>
                          <div class="card bg-dark border-secondary pt-1 br-12">
                               <input type="checkbox" class="form-check-input ml-2 h-50 w-50" id="ESDCPaid" name="paid" value="yes">
                               <label for="ESDCPaid" class="form-check-label text-white ml-5 width">I confirm the full amount is paid.</label>
                          </div>
                     </div>
                </div>               
            `;

            const hoursInput = document.getElementById('ESDCHours');
            const hoursDisplay = document.getElementById('ESDCHoursCountDisplay');
            const chargeDisplay = document.getElementById('ESDCAddChargeDisplay');
            const addSession = document.getElementById('ESDCAddDayCaution');

            function updateDayCautionDetails() {
                const hours = parseInt(hoursInput.value) || 1;
                const charge = hours * 10000;

                hoursDisplay.textContent = hours.toLocaleString();
                chargeDisplay.textContent = charge.toLocaleString() + ' Ks';

                const checkoutDate = new Date(guest.CheckoutDate);
                const newCheckoutDate = new Date(checkoutDate);
                newCheckoutDate.setHours(newCheckoutDate.getHours() + hours);
                addSession.textContent = newCheckoutDate.toLocaleString();

                return { hours, charge, newCheckoutDate };
            }

            hoursInput.addEventListener('input', updateDayCautionDetails);

            extendStayForm.onsubmit = async function(e){
                e.preventDefault();

                if (!document.getElementById('ESDCPaid').checked){
                    alert('Please confirm the full amount is paid.');
                    return;
                }

                try {
                    const { charge, newCheckoutDate } = updateDayCautionDetails();
                    const formData = {
                        CheckoutDate: newCheckoutDate,
                        AmountPaid: guest.AmountPaid + charge,
                    }

                    console.log("update: ", formData)

                    const response = await axios.put(`http://localhost:8080/guests/${guest.ID}`, formData);
                    if (response.status === 200) {
                        alert('Room has been extended.');
                        $('#extendStayModal').modal('hide');
                        loadRooms();
                    }
                } catch(error) {
                    console.log('Error occurred while extending: '+ error);
                    alert('Error: ' + error);
                }
            }
        } else if (guest.RoomType === 'SESSION') {
            stayDependentCard1.innerHTML = `
                <div class="card-body">
                    <div class="row mb-1">
                        <div class="col-md-6">
                            <label for="ESSHours" class="form-label text-white">Additional Hours</label>
                            <input type="number" class="form-control bg-dark text-light border-secondary" id="ESSHours" min="1" max="12" value="1">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-white">Update</label>
                            <p class="detailOutput bg-dark view-mode" id="ESSAddSession"></p>
                        </div>
                </div>                               
            `;
            stayDependentCard2.innerHTML = `
                      <div class="card-body">
                     <div class="col-md-12">
                          <div class="d-flex justify-content-between mb-2">
                               <span class="text-white" id="ESSBasePrice">Rate per Hour :</span>
                               <span id="ESSBasePriceDisplay" class="fw-bold text-primary">10,000</span>
                          </div>
                          <div class="d-flex justify-content-between roomCount">
                               <span class="text-white" id="ESDCHours">Hours :</span>
                               <span id="ESSHoursCountDisplay" class="fw-bold text-primary">1</span>
                          </div>
                          <div class="d-flex justify-content-between">
                               <h5 class="text-white" id="ESSAdditionalCharge">Additional Charge :</h5>
                               <h5 id="ESSAddChargeDisplay" class="fw-bold text-primary">10,000 Ks</h5>
                          </div>
                          <br>
                          <div class="card bg-dark border-secondary pt-1 br-12">
                               <input type="checkbox" class="form-check-input ml-2 h-50 w-50" id="ESSPaid" name="paid" value="yes">
                               <label for="ESSPaid" class="form-check-label text-white ml-5 width">I confirm the full amount is paid.</label>
                          </div>
                     </div>
                </div>         
            `;

            const hoursInput = document.getElementById('ESSHours');
            const hoursDisplay = document.getElementById('ESSHoursCountDisplay');
            const chargeDisplay = document.getElementById('ESSAddChargeDisplay');
            const addSession = document.getElementById('ESSAddSession');

            function updateSessionDetails() {
                const hours = parseInt(hoursInput.value) || 1;
                const charge = hours * 10000;

                hoursDisplay.textContent = hours;
                chargeDisplay.textContent = charge.toLocaleString() + ' Ks';

                const checkoutDate = new Date(guest.CheckoutDate);
                const newCheckoutDate = new Date(checkoutDate);
                newCheckoutDate.setHours(newCheckoutDate.getHours() + hours);
                addSession.textContent = newCheckoutDate.toLocaleString();

                return { hours, charge, newCheckoutDate };
            }

            hoursInput.addEventListener('input', updateSessionDetails);

            extendStayForm.onsubmit = async function(e){
                e.preventDefault();

                if (!document.getElementById('ESSPaid').checked){
                    alert('Please confirm the full amount is paid.');
                    return;
                }

                try {
                    const { charge, newCheckoutDate } = updateSessionDetails();
                    const formData = {
                        CheckoutDate: newCheckoutDate,
                        AmountPaid: guest.AmountPaid + charge,
                    }

                    console.log("update: ", formData)

                    const response = await axios.put(`http://localhost:8080/guests/${guest.ID}`, formData);
                    if (response.status === 200) {
                        alert('Room has been extended.');
                        $('#extendStayModal').modal('hide');
                        loadRooms();
                    }
                } catch(error) {
                    console.log('Error occurred while extending: '+ error);
                    alert('Error: ' + error);
                }
            }
        } else {
            stayDependentCard1.innerHTML = `
            <div class="card-body">
                <div class="mb-3">
                    <label for="ESNewCheckoutDate" class="form-label text-white">New Check-Out Date</label>
                    <input type="date" class="form-control bg-dark text-light border-secondary" id="ESNewCheckoutDate">
                </div>
                <div class="form-check">
                    <input class="form-check-input extra-bed-checkbox" type="checkbox" id="ESExtraBed">
                    <label for="ESExtraBed" class="form-check-label text-white ml-5 width">Extra Bed (+30,000 Ks)</label>
                </div>
            </div>
            `;

            stayDependentCard2.innerHTML = `
                <div class="card-body">
                    <div class="col-md-12">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="text-white" id="ESBasePrice">Base Price :</span>
                            <span id="ESBasePriceDisplay" class="fw-bold text-primary">1</span>
                        </div>
                        <div class="d-flex justify-content-between roomCount">
                            <span class="text-white" id="ESDaysCount">Additional Days :</span>
                            <span id="ESDaysCountDisplay" class="fw-bold text-primary">1</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <h5 class="text-white" id="ESAddCharge">Additional Charge :</h5>
                            <h5 id="ESAddChargeDisplay" class="fw-bold text-primary">62,000 Ks</h5>
                        </div>
                        <br>
                        <div class="card bg-dark border-secondary pt-1 br-12">
                            <input type="checkbox" class="form-check-input ml-2 h-50 w-50" id="ESPaid" name="paid" value="yes">
                            <label for="ESPaid" class="form-check-label text-white ml-5 width">I confirm the full amount is paid.</label>
                         </div>
                    </div>
                </div>
            `

            const checkoutDateInput = document.getElementById('ESNewCheckoutDate');
            const dayCountDisplay = document.getElementById('ESDaysCountDisplay');
            const totalAmountDisplay = document.getElementById('ESAddChargeDisplay');
            const extraBedCheckbox = document.getElementById('ESExtraBed');

            const tomorrow = new Date(guest.CheckoutDate);
            tomorrow.setDate(tomorrow.getDate() + 1);

            checkoutDateInput.min = formatDate(tomorrow);
            checkoutDateInput.value = formatDate(tomorrow);

            let currentTotalAmount = 0;

            function updateDaysAndAmount() {
                const checkoutDate = new Date(checkoutDateInput.value);
                const checkinDate = new Date(guest.CheckoutDate);

                const diffTime = checkoutDate - checkinDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let roomPrice = 62000;
                if (extraBedCheckbox.checked) {
                    roomPrice += 30000;
                }

                dayCountDisplay.textContent = String(diffDays);
                currentTotalAmount = diffDays * roomPrice;
                totalAmountDisplay.textContent = currentTotalAmount.toLocaleString() + ' Ks';
            }

            updateDaysAndAmount();

            checkoutDateInput.addEventListener('change', updateDaysAndAmount);
            extraBedCheckbox.addEventListener('change', updateDaysAndAmount);

            const roomCharges = calculateRoomCharges(guest);
            document.getElementById('ESBasePriceDisplay').textContent = roomCharges.toLocaleString() + ' Ks';

            extendStayForm.onsubmit = async function(e) {
                e.preventDefault();

                if (!document.getElementById('ESPaid').checked) {
                    alert("Please confirm the full amount is paid.");
                    return;
                }

                try {
                    const formData = {
                        CheckoutDate: checkoutDateInput.value + 'T00:00:00Z',
                        AmountPaid: (guest.AmountPaid + currentTotalAmount),
                    }

                    console.log("update: ", formData)

                    const response = await axios.put(`http://localhost:8080/guests/${guest.ID}`, formData);
                    if (response.status === 200) {
                        alert('Room has been extended.');
                        $('#extendStayModal').modal('hide');
                        loadRooms();
                    }
                } catch (error) {
                    console.log('Error occurred while extending: '+ error);
                    alert('Error: ' + error);
                }
            }
        }

        $('#extendStayModal').modal('show');

    } catch (error) {
        console.error('Error fetching guest details:', error);
        alert('Failed to fetch guest details');
    }
}

function calculateRoomCharges(guest) {
    const baseRate = {
        'FULL-NIGHT': 62000,
        'DAY-CAUTION': 40000,
        'SESSION': 40000
    };

    const rate = baseRate[guest.RoomType];
    const extraBedCharge = guest.ExtraBed ? 30000 : 0;

    return rate + extraBedCharge;
}

function calculateTotalAmount(guest) {
    const extraCharges = guest.ExtraCharges || 0;
    const foodCharges = guest.FoodCharges || 0;
    const amountPaid = guest.AmountPaid || 0;

    return (extraCharges + foodCharges + amountPaid) - amountPaid;
}

function formatDate(date) {
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return '';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatRoomType(roomType) {
    switch (roomType) {
        case 'FULL-NIGHT':
            return 'Full Night';
        case 'DAY-CAUTION':
            return 'Day Caution';
        case 'SESSION':
            return 'Session';
        default:
            return 'Unknown';
    }
}

function formatPaymentType(paymentType) {
    switch (paymentType) {
        case 'CASH':
            return 'Cash';
        case 'KPAY':
            return 'KPay';
        case 'AYAPAY':
            return 'AYA Pay';
        case 'WAVEPAY':
            return 'Wave Pay';
        default:
            return 'Unknown';
    }
}
