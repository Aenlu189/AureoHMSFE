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

async function checkSession() {
    try {
        const response = await axios.get('http://localhost:8080/check-session', {
            withCredentials: true
        });

        if (response.status === 200) {
            console.log('In session');
        }
    } catch(error) {
        console.log('Not logged in');
    }
}

document.addEventListener('DOMContentLoaded', checkSession)

const loginForm = document.querySelector('.loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('userForm').value;
    const password = document.getElementById('passwordForm').value;

    try {
        const response = await axios.post('http://localhost:8080/login', 
            {username, password},
            {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json'
                }
            },
        );

        if (response.status === 200) {
            sessionStorage.setItem('username', username);
            window.location.href="dashboard.html";
        }
    } catch (error) {
        console.error('Login failed', error);
        if (error.response) {
            alert(error.response.data.message || 'Login failed');
        } else {
            alert('An error occurred during login. Please try again.')
        }
    }
});