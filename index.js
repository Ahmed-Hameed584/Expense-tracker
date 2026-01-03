// Extracted from index.html

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
    // Reset flip card to front
    document.getElementById('auth-flip-card').classList.remove('flipped');
    // Clear form and errors
    const forms = ['signin-form', 'signup-form'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.reset();
        const error = document.getElementById(formId.replace('-form', '-error'));
        if (error) error.style.display = 'none';
    });
}

function toggleMobileMenu() {
    document.getElementById('nav-links').classList.toggle('show');
}

function flipToSignup() {
    document.getElementById('auth-flip-card').classList.add('flipped');
}

function flipToSignin() {
    document.getElementById('auth-flip-card').classList.remove('flipped');
}

// Forgot Password Functions
function showForgotPassword() {
    closeModal('auth-modal');
    openModal('forgot-password-modal');
    // Reset to step 1
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-step-3').style.display = 'none';
    // Clear forms
    document.getElementById('forgot-email-form').reset();
    document.getElementById('forgot-code-form').reset();
    document.getElementById('forgot-email-error').style.display = 'none';
    document.getElementById('forgot-code-error').style.display = 'none';
}

function backToEmailStep() {
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-step-3').style.display = 'none';
}

// Update navigation buttons
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelector('.nav-links');

    if (auth.isAuthenticated()) {
        // Show authenticated user navigation
        const user = auth.getCurrentUser();
        navLinks.innerHTML = `
            <li><a href="pricing.html">Pricing</a></li>
            <li><a href="about.html">About</a></li>
            <li><a href="dashboard.html">Dashboard</a></li>
            <li><a href="#" onclick="logout()" style="color: #d44d4d;">Logout</a></li>
        `;
    }
    // For guest users, the inline onclick handlers in HTML will work

    // Add form event listeners after DOM is loaded
    setupFormHandlers();
});

function logout() {
    auth.signOut();

    // Update navigation immediately to guest mode
    const navLinks = document.querySelector('.nav-links');
    navLinks.innerHTML = `
        <li><a href="pricing.html">Pricing</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="#" onclick="openModal('auth-modal'); flipToSignin();">Sign In</a></li>
        <li><a href="#" onclick="openModal('auth-modal'); flipToSignup();" class="btn-primary" style="padding: 10px 20px; font-size: 14px;">Sign Up</a></li>
    `;
}

function setupFormHandlers() {
    // Form handlers
    document.getElementById('signin-form').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Sign in form submitted');
        console.log('Auth object:', typeof auth, auth);

        const submitBtn = this.querySelector('.btn-primary-modal');
        const originalText = submitBtn.textContent;

        // Show loading state
        submitBtn.textContent = 'Signing In...';
        submitBtn.disabled = true;

        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        const errorDiv = document.getElementById('signin-error');

        console.log('Attempting sign in with:', email, password);

        if (typeof auth === 'undefined') {
            console.error('Auth object not found!');
            errorDiv.textContent = 'Authentication system not loaded. Please refresh the page.';
            errorDiv.style.display = 'block';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        try {
            auth.signIn(email, password);
            // Success animation
            submitBtn.textContent = 'Success! ✓';
            submitBtn.style.background = 'linear-gradient(135deg, #4fd1c5, #38b2ac)';
            setTimeout(() => {
                closeModal('auth-modal');
                window.location.href = 'dashboard.html';
            }, 800);
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    document.getElementById('signup-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('.btn-primary-modal');
        const originalText = submitBtn.textContent;

        // Show loading state
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const errorDiv = document.getElementById('signup-error');

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        try {
            auth.signUp(email, password, name);
            // Success animation
            submitBtn.textContent = 'Account Created! ✓';
            setTimeout(() => {
                closeModal('auth-modal');
                window.location.href = 'dashboard.html';
            }, 800);
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Forgot Password Form Handlers
document.getElementById('forgot-email-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('.btn-primary-modal');
    const originalText = submitBtn.textContent;

    // Show loading state
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const email = document.getElementById('forgot-email').value;
    const errorDiv = document.getElementById('forgot-email-error');

    // Check if user exists
    const users = auth.users || [];
    const user = users.find(u => u.email === email);

    if (!user) {
        errorDiv.textContent = 'No account found with this email address';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

    // Generate a simple reset code (in a real app, this would be sent via email)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('password_reset_code', resetCode);
    localStorage.setItem('password_reset_email', email);
    localStorage.setItem('password_reset_time', Date.now().toString());

    // Show success and move to step 2
    document.getElementById('reset-email-display').textContent = email;
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';

    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    // Show a message that the code was "sent"
    alert(`Reset code sent! For demo purposes, your reset code is: ${resetCode}\n\nIn a real application, this would be sent to your email.`);
});

document.getElementById('forgot-code-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('.btn-primary-modal');
    const originalText = submitBtn.textContent;

    // Show loading state
    submitBtn.textContent = 'Resetting...';
    submitBtn.disabled = true;

    const resetCode = document.getElementById('reset-code').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const errorDiv = document.getElementById('forgot-code-error');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters long';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

    // Check reset code
    const storedCode = localStorage.getItem('password_reset_code');
    const storedEmail = localStorage.getItem('password_reset_email');
    const resetTime = localStorage.getItem('password_reset_time');

    if (!storedCode || !storedEmail || !resetTime) {
        errorDiv.textContent = 'Reset session expired. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

    // Check if code is expired (15 minutes)
    if (Date.now() - parseInt(resetTime) > 15 * 60 * 1000) {
        errorDiv.textContent = 'Reset code has expired. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        localStorage.removeItem('password_reset_code');
        localStorage.removeItem('password_reset_email');
        localStorage.removeItem('password_reset_time');
        return;
    }

    if (resetCode !== storedCode) {
        errorDiv.textContent = 'Invalid reset code';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }

    // Update password
    const users = auth.users || [];
    const userIndex = users.findIndex(u => u.email === storedEmail);
    if (userIndex !== -1) {
        users[userIndex].password = auth.hashPassword(newPassword);
        auth.saveUsers();

        // Clear reset data
        localStorage.removeItem('password_reset_code');
        localStorage.removeItem('password_reset_email');
        localStorage.removeItem('password_reset_time');

        // Show success
        document.getElementById('forgot-step-2').style.display = 'none';
        document.getElementById('forgot-step-3').style.display = 'block';

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    } else {
        errorDiv.textContent = 'User not found';
        errorDiv.style.display = 'block';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});