function tpVisibility() {
    const passwordInput = document.getElementById("passwordForm");
    const icon = document.getElementById("showLoginPassword");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        passwordInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

const loginForm = document.querySelector('.loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('userForm').value;
    const password = document.getElementById('passwordForm').value;

    try {
        const response = await fetch('http://localhost:8080/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        });

        const data = await response.json();

        if (response.status === 200) {
            console.log('Login successful:', data);
            alert('Welcome '+username);
            window.location.href = "dashboard.html";
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error during login: ', error);
        alert('An error occurred during login. Please try again.');
    }
});

const adminForm = document.querySelector('.adminForm');
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('userForm').value;
    const password = document.getElementById('adminPasswordForm');

    try {
        const response = await fetch('http://localhost:8080/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        });

        const data = await response.json();

        if (response.status === 200) {
            console.log('Login successful', data);
            alert('Welcome'+username);
            window.location.href = 'settings.html';
        } else {
            alert(data.message);
        }
    } catch(error) {
        console.error('Error during login: ', error);
        alert('An error occurred during login. Please try again.');
    }
});

const forgotPasswordForm = document.querySelector('.fpForm');
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('emailForm').value;

    try {
        const response = await fetch('http://localhost:8080/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({email})
        });

        const data = await response.json();

        if (response.status === 200) {
            console.log("Successfully sent the email", data);
            alert("Password has been sent to your email");
            window.location.href = "login.html";
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error during sending email: ', error);
        alert('An error occurred during sending email. Please try again.')
    }
});