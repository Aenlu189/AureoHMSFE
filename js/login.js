function tpVisibility() {
    const passwordInput = document.getElementById("passwordForm");
    const icon = document.getElementById("showLoginPassword");

    if (passwordInput.type == "password") {
        passwordInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        passwordInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }

}