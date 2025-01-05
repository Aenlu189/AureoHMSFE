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