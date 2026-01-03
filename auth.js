// Authentication utilities for FinDash
class AuthManager {
    constructor() {
        // Load existing users or initialize admin account
        this.loadUsers();

        // Ensure admin account exists
        this.ensureAdminAccount();

        this.currentUser = JSON.parse(localStorage.getItem('findash_current_user') || 'null');
        console.log('AuthManager initialized', this.users, this.currentUser);
    }

    // Load users from localStorage
    loadUsers() {
        const usersData = localStorage.getItem('findash_users');
        this.users = usersData ? JSON.parse(usersData) : [];
    }

    // Initialize admin account (only when no users exist)
    initializeAdminAccount() {
        // Create admin account
        const adminUser = {
            id: 'admin_' + Date.now().toString(),
            email: 'ahmed399332@gmail.com',
            password: this.hashPassword('Ahmed248'),
            name: 'Ahmed-Hameed',
            createdAt: new Date().toISOString(),
            role: 'admin'
        };

        this.users = [adminUser]; // Set users array with only admin
        this.saveUsers();

        console.log('✅ Admin account created!');
        console.log('🛡️ Admin account created: Ahmed-Hameed');
        console.log('📧 Email: ahmed399332@gmail.com');
        console.log('🔑 Password: Ahmed248');
        console.log('👑 Role: Administrator');
    }

    // Ensure admin account exists (create if not found)
    ensureAdminAccount() {
        const adminExists = this.users.some(user => user.role === 'admin' || user.email === 'ahmed399332@gmail.com');

        if (!adminExists) {
            console.log('Admin account not found, creating...');
            const adminUser = {
                id: 'admin_' + Date.now().toString(),
                email: 'ahmed399332@gmail.com',
                password: this.hashPassword('Ahmed248'),
                name: 'Ahmed-Hameed',
                createdAt: new Date().toISOString(),
                role: 'admin'
            };

            this.users.push(adminUser);
            this.saveUsers();
            console.log('Admin account created');
        }
    }

    // Clear all localStorage data
    clearAllData() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('findash_') || key.startsWith('findash_user_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Sign up a new user
    signUp(email, password, name) {
        // Check if user already exists
        if (this.users.find(user => user.email === email)) {
            throw new Error('User already exists with this email');
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            email,
            password: this.hashPassword(password), // Simple hash for demo
            name,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();

        // Auto sign in
        this.signIn(email, password);
        return newUser;
    }

    // Sign in existing user
    signIn(email, password) {
        const user = this.users.find(user => user.email === email);
        if (!user || user.password !== this.hashPassword(password)) {
            throw new Error('Invalid email or password');
        }

        this.currentUser = {
            id: user.id,
            email: user.email,
            name: user.name
        };

        localStorage.setItem('findash_current_user', JSON.stringify(this.currentUser));
        return this.currentUser;
    }

    // Sign out current user
    signOut() {
        this.currentUser = null;
        localStorage.removeItem('findash_current_user');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get user-specific storage key
    getUserStorageKey(baseKey) {
        if (!this.currentUser) return null;
        return `findash_user_${this.currentUser.id}_${baseKey}`;
    }

    // Save data for current user
    saveUserData(key, data) {
        const storageKey = this.getUserStorageKey(key);
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
    }

    // Load data for current user
    loadUserData(key, defaultValue = null) {
        const storageKey = this.getUserStorageKey(key);
        if (storageKey) {
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : defaultValue;
        }
        return defaultValue;
    }

    // Check if current user is admin (first user created)
    isAdmin() {
        if (!this.currentUser) return false;
        // Check if user has admin role or is the first user
        const user = this.users.find(u => u.id === this.currentUser.id);
        return user && (user.role === 'admin' || (this.users.length > 0 && this.users[0].id === this.currentUser.id));
    }

    // Get all users (admin only)
    getAllUsers() {
        if (!this.isAdmin()) return [];
        return this.users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
        }));
    }

    // Delete all users except admin (admin only)
    clearAllUsersExceptAdmin() {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized access. Admin privileges required.');
        }

        // Find admin user
        const adminUser = this.users.find(user => user.role === 'admin' || user.email === 'ahmed399332@gmail.com');

        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        // Keep only admin user
        this.users = [adminUser];
        this.saveUsers();

        // Clear all user data except admin
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('findash_user_') && !key.includes(adminUser.id)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log('All users except admin have been deleted');
        return true;
    }
    deleteUserAccount(userId) {
        if (!this.isAdmin()) {
            throw new Error('Unauthorized access. Admin privileges required.');
        }

        if (userId === this.currentUser.id) {
            throw new Error('Cannot delete your own admin account');
        }

        // Check if this would leave no admins
        const remainingUsers = this.users.filter(user => user.id !== userId);
        const remainingAdmins = remainingUsers.filter(user => user.id === remainingUsers[0]?.id);

        if (remainingAdmins.length === 0) {
            throw new Error('Cannot delete the last admin account. Create another admin first.');
        }

        // Remove user from users list
        this.users = this.users.filter(user => user.id !== userId);
        this.saveUsers();

        // Clear all user data
        this.clearUserDataById(userId);

        return true;
    }

    // Clear all data for a specific user ID
    clearUserDataById(userId) {
        const userPrefix = `findash_user_${userId}_`;
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(userPrefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Delete current user's own account
    deleteOwnAccount() {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        const userId = this.currentUser.id;

        // Remove user from users list
        this.users = this.users.filter(user => user.id !== userId);
        this.saveUsers();

        // Clear all user data
        this.clearUserDataById(userId);

        // Sign out
        this.signOut();

        return true;
    }

    // Simple password hashing (for demo purposes only)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('findash_users', JSON.stringify(this.users));
    }

    // Redirect to dashboard if authenticated
    redirectToDashboard() {
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
    }

    // Redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
        }
    }
}

// Global auth instance
const auth = new AuthManager();