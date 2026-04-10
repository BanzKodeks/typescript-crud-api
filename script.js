// =============================================================================
// CONFIG
// =============================================================================

// The base URL of your TypeScript API backend
const API_BASE = 'http://localhost:4000';

// Stores the currently logged-in user's info (null if not logged in)
let currentUser = null;


// API HELPER
async function apiFetch(path, options = {}) {
    // Get the token from localStorage (saved during login)
    const token = localStorage.getItem('auth_token');

    const res = await fetch(API_BASE + path, {
        headers: {
            'Content-Type': 'application/json',
            // If a token exists, attach it as a Bearer token in the header
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        ...options,
    });

    // Try to parse the response as JSON
    const data = await res.json().catch(() => ({}));

    // If the response is an error (4xx or 5xx), throw it so catch() blocks handle it
    if (!res.ok) {
        throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
}


// ROUTING

function navigateTo(hash) {
    window.location.hash = hash;
}

function handleRouting() {
    const hash = window.location.hash || '#/';

    // Hide all pages first
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Routes that require being logged in
    const protectedRoutes = ['#/profile', '#/requests', '#/employees', '#/accounts', '#/departments'];
    // Routes only for logged-OUT users
    const publicOnlyRoutes = ['#/login', '#/register', '#/verify-email'];
    // Routes only for Admin users
    const adminRoutes = ['#/accounts', '#/departments', '#/employees'];

    // Redirect to login if trying to access a protected route without being logged in
    if (protectedRoutes.includes(hash) && !currentUser) {
        showToast('Access denied. Login required.', 'error');
        navigateTo('#/login');
        return;
    }

    // Redirect to home if a non-admin tries to access an admin route
    // Note: backend uses 'Admin' with a capital A
    if (adminRoutes.includes(hash) && (!currentUser || currentUser.role !== 'Admin')) {
        showToast('Access denied. Admin only.', 'error');
        navigateTo('#/');
        return;
    }

    // Redirect logged-in users away from login/register pages
    if (currentUser && publicOnlyRoutes.includes(hash)) {
        navigateTo('#/profile');
        return;
    }

    // Show the correct page based on the hash
    switch (hash) {
        case '#/':
            document.getElementById('homePage').classList.add('active');
            break;
        case '#/login':
            document.getElementById('loginPage').classList.add('active');
            break;
        case '#/register':
            document.getElementById('registerPage').classList.add('active');
            break;
        case '#/profile':
            document.getElementById('profilePage').classList.add('active');
            renderProfile();
            break;
        case '#/verify-email':
            document.getElementById('verify-email').classList.add('active');
            document.getElementById('verifyUserEmail').textContent =
                localStorage.getItem('unverified_email') || '';
            break;
        case '#/accounts':
            document.getElementById('accountsPage').classList.add('active');
            renderAccountsList();
            break;
        case '#/departments':
            document.getElementById('departmentsPage').classList.add('active');
            renderDepartmentsList();
            break;
        case '#/requests':
            document.getElementById('requestPage').classList.add('active');
            renderMyRequests();
            break;
        case '#/employees':
            document.getElementById('employeesPage').classList.add('active');
            renderEmployeesTable();
            break;
        default:
            document.getElementById('homePage').classList.add('active');
    }
}

// Re-run routing whenever the URL hash changes
window.addEventListener('hashchange', handleRouting);

// AUTH STATE
function setAuthState(isAuth, user = null) {
    if (isAuth) {
        currentUser = user;
        document.body.classList.remove('not-authenticated');
        document.body.classList.add('authenticated');

        // Show admin-only menu items if the user is an Admin
        if (user.role === 'Admin') {
            document.body.classList.add('is-admin');
        } else {
            document.body.classList.remove('is-admin');
        }

        // Show the user's first name in the navbar dropdown
        const navAdmin = document.getElementById('navAdmin');
        if (navAdmin) navAdmin.textContent = user.firstName || user.email;

    } else {
        currentUser = null;
        document.body.classList.remove('authenticated', 'is-admin');
        document.body.classList.add('not-authenticated');
    }
}

// Automatically log back in on page refresh using the stored JWT token
async function autoLogin() {
    const token  = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('auth_user_id');

    // If there's no saved token or user ID, do nothing
    if (!token || !userId) return;

    try {
        // Fetch the user's info from the API using the saved ID
        const user = await apiFetch(`/users/${userId}`);
        setAuthState(true, user);

        // If on a public-only page, redirect to profile
        const hash = window.location.hash;
        if (!hash || hash === '#/login' || hash === '#/register') {
            navigateTo('#/profile');
        }
    } catch {
        // Token is expired or invalid — clear everything and start fresh
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user_id');
    }
}


// REGISTER
document.getElementById('btnRegister').addEventListener('click', async function () {
    const title           = document.getElementById('Title').value.trim();
    const firstName       = document.getElementById('FirstName').value.trim();
    const lastName        = document.getElementById('LastName').value.trim();
    const email           = document.getElementById('Email').value.trim();
    const password        = document.getElementById('Password').value;
    const confirmPassword = document.getElementById('ConfirmPassword').value;

    const passwordInput = document.getElementById('Password');

    // Frontend validation
    if (!title || !firstName || !lastName || !email) {
        showToast('All fields are required.', 'error');
        return;
    }

    if (password.length < 6) {
        passwordInput.classList.add('is-invalid');
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }
    passwordInput.classList.remove('is-invalid');

    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    try {
        // Send registration data to the backend API
        await apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify({ title, firstName, lastName, email, password, confirmPassword }),
        });

        showToast('Account created! You can now log in.');
        localStorage.setItem('unverified_email', email);
        navigateTo('#/verify-email');
    } catch (err) {
        // Show whatever error message the backend returns (e.g. "Email already registered")
        showToast(err.message, 'error');
    }
});

// VERIFY EMAIL (simulated)
document.getElementById('btnVerifyEmail').addEventListener('click', function () {
    localStorage.removeItem('unverified_email');
    showToast('Verification noted! You may now log in.');
    navigateTo('#/login');
});


// LOGIN
document.getElementById('btnLogin').addEventListener('click', async function () {
    const email    = document.getElementById('LoginEmail').value.trim();
    const password = document.getElementById('LoginPassword').value;

    if (!email || !password) {
        showToast('Please enter your email and password.', 'error');
        return;
    }

    try {
        // Send credentials to the backend
        const user = await apiFetch('/users/authenticate', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        // Save the JWT token and user ID so we stay logged in on refresh
        localStorage.setItem('auth_token', user.token);
        localStorage.setItem('auth_user_id', user.id);

        setAuthState(true, user);
        showToast(`Welcome back, ${user.firstName}!`);
        navigateTo('#/profile');
    } catch (err) {
        showToast(err.message, 'error');
    }
});


// LOGOUT
document.getElementById('btnLogout').addEventListener('click', function () {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_id');
    setAuthState(false);
    navigateTo('#/');
});

// CANCEL BUTTONS

document.querySelector('.btnCancel').addEventListener('click', function () {
    navigateTo('#/');
});

document.querySelector('.btnCancelP').addEventListener('click', function () {
    navigateTo('#/profile');
});

document.getElementById('btnCancelAcc').addEventListener('click', function () {
    navigateTo('#/profile');
});

// Shows the logged-in user's information on the profile page.
function renderProfile() {
    if (!currentUser) return;

    document.querySelector('#profilePage h2').textContent =
        `${currentUser.firstName} ${currentUser.lastName}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileRole').textContent  = 'Role: ' + currentUser.role;

    // Re-attach the Edit button event (cloneNode prevents duplicate listeners)
    const editBtn  = document.querySelector('#profilePage .btn-profile button');
    const freshBtn = editBtn.cloneNode(true);
    editBtn.replaceWith(freshBtn);

    freshBtn.addEventListener('click', function () {
        showEditProfileModal();
    });
}

// Uses browser prompts to edit profile (simple approach for a student project)
function showEditProfileModal() {
    const newFirstName = prompt('First Name:', currentUser.firstName);
    if (newFirstName === null) return;

    const newLastName = prompt('Last Name:', currentUser.lastName);
    if (newLastName === null) return;

    const newTitle = prompt('Title:', currentUser.title);
    if (newTitle === null) return;

    // Send the updated info to PUT /users/:id
    apiFetch(`/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ firstName: newFirstName, lastName: newLastName, title: newTitle }),
    })
    .then(() => {
        // Update the local currentUser object so the page reflects immediately
        currentUser.firstName = newFirstName;
        currentUser.lastName  = newLastName;
        currentUser.title     = newTitle;
        renderProfile();
        showToast('Profile updated successfully.');
    })
    .catch(err => showToast(err.message, 'error'));
}

// ACCOUNTS (Admin only) — fully connected to MySQL via the API
// Fetch all users from GET /users and display them in the table
async function renderAccountsList() {
    const tbody = document.getElementById('accountsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>';

    try {
        const users = await apiFetch('/users');

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No accounts found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        users.forEach(user => {
            tbody.innerHTML += `
                <tr>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>✅</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary"
                            onclick="editAccount(${user.id})">Edit</button>
                        <button class="btn btn-sm btn-outline-warning"
                            onclick="resetPassword(${user.id})">Reset PW</button>
                        <button class="btn btn-sm btn-outline-danger"
                            onclick="deleteAccount(${user.id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

// Reset a user's password via PUT /users/:id
async function resetPassword(userId) {
    const newPassword = prompt('Enter new password (min 6 chars):');
    if (!newPassword || newPassword.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    try {
        await apiFetch(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ password: newPassword, confirmPassword: newPassword }),
        });
        showToast('Password reset successfully.');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Delete a user via DELETE /users/:id
async function deleteAccount(userId) {
    // Prevent deleting yourself
    if (currentUser && currentUser.id === userId) {
        showToast('You cannot delete your own account.', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
        await apiFetch(`/users/${userId}`, { method: 'DELETE' });
        showToast('Account deleted.');
        renderAccountsList(); // Refresh the table
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Tracks which user ID is being edited (null = creating a new one)
let editingAccountId = null;

// Load a user's data into the form for editing
async function editAccount(userId) {
    try {
        const user = await apiFetch(`/users/${userId}`);

        document.getElementById('Inp_AccFirstN').value   = user.firstName;
        document.getElementById('Inp_AccLastN').value    = user.lastName;
        document.getElementById('Inp_AccEmail').value    = user.email;
        document.getElementById('Inp_AccPass').value     = '';
        document.getElementById('Inp_AccRole').value     = user.role;
        document.getElementById('Inp_AccVerify').checked = true;

        editingAccountId = userId;
        showToast('Editing account: ' + user.email);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Clear the form and set to "create new" mode
document.querySelector('.btn_acc').addEventListener('click', function () {
    clearAccountForm();
    showToast('Fill the form below to create an account.');
});

document.getElementById('btnSaveAccount').addEventListener('click', saveAccount);

// Create or update a user depending on whether editingAccountId is set
async function saveAccount() {
    const firstName = document.getElementById('Inp_AccFirstN').value.trim();
    const lastName  = document.getElementById('Inp_AccLastN').value.trim();
    const email     = document.getElementById('Inp_AccEmail').value.trim();
    const password  = document.getElementById('Inp_AccPass').value.trim();
    const role      = document.getElementById('Inp_AccRole').value;

    if (!firstName || !lastName || !email) {
        showToast('First name, last name, and email are required.', 'error');
        return;
    }

    try {
        if (editingAccountId === null) {
            // CREATE new user — password is required
            if (!password || password.length < 6) {
                showToast('Password must be at least 6 characters.', 'error');
                return;
            }

            await apiFetch('/users', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Mr',   // default title for admin-created accounts
                    firstName, lastName, email, role,
                    password, confirmPassword: password,
                }),
            });
            showToast('Account created successfully.');

        } else {
            // UPDATE existing user
            const body = { firstName, lastName, email, role };

            // Only include password fields if admin typed a new password
            if (password) {
                if (password.length < 6) {
                    showToast('Password must be at least 6 characters.', 'error');
                    return;
                }
                body.password        = password;
                body.confirmPassword = password;
            }

            await apiFetch(`/users/${editingAccountId}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            showToast('Account updated.');
        }

        clearAccountForm();
        renderAccountsList(); // Refresh the table
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function clearAccountForm() {
    document.getElementById('Inp_AccFirstN').value   = '';
    document.getElementById('Inp_AccLastN').value    = '';
    document.getElementById('Inp_AccEmail').value    = '';
    document.getElementById('Inp_AccPass').value     = '';
    document.getElementById('Inp_AccRole').value     = 'User';
    document.getElementById('Inp_AccVerify').checked = false;
    editingAccountId = null;
}

// DEPARTMENTS — stored in localStorage
const DEPT_KEY = 'app_departments';

function getDepartments() {
    try { return JSON.parse(localStorage.getItem(DEPT_KEY)) || defaultDepartments(); }
    catch { return defaultDepartments(); }
}

function saveDepartments(depts) {
    localStorage.setItem(DEPT_KEY, JSON.stringify(depts));
}

function defaultDepartments() {
    return [
        { name: 'Engineering', description: 'Software development' },
        { name: 'HR',          description: 'Human resources' },
    ];
}

function renderDepartmentsList() {
    const tbody = document.getElementById('departmentsTableBody');
    const depts = getDepartments();
    tbody.innerHTML = '';

    if (depts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments yet.</td></tr>';
        return;
    }

    depts.forEach((dept, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td>
                    <button class="btn btn-outline-secondary btn-sm"
                        onclick="editDepartment(${index})">Edit</button>
                    <button class="btn btn-outline-danger btn-sm"
                        onclick="deleteDepartment(${index})">Delete</button>
                </td>
            </tr>
        `;
    });
}

function editDepartment(index) {
    const depts   = getDepartments();
    const dept    = depts[index];
    const newName = prompt('Edit Department Name:', dept.name);
    if (!newName) return;

    const newDesc = prompt('Edit Description:', dept.description);
    if (!newDesc) return;

    depts[index] = { name: newName, description: newDesc };
    saveDepartments(depts);
    renderDepartmentsList();
    showToast('Department updated.');
}

function deleteDepartment(index) {
    if (!confirm('Delete this department?')) return;

    const depts = getDepartments();
    depts.splice(index, 1);
    saveDepartments(depts);
    renderDepartmentsList();
    showToast('Department deleted.');
}

document.querySelector('.btn_dept').addEventListener('click', function () {
    const name = prompt('Enter Department Name:');
    if (!name) { showToast('Department name is required.', 'error'); return; }

    const description = prompt('Enter Description:');
    if (!description) { showToast('Description is required.', 'error'); return; }

    const depts = getDepartments();
    if (depts.find(d => d.name === name)) {
        showToast('Department already exists.', 'error');
        return;
    }

    depts.push({ name, description });
    saveDepartments(depts);
    renderDepartmentsList();
    showToast('Department added successfully.');
});


// EMPLOYEES — stored in localStorage
const EMP_KEY = 'app_employees';

function getEmployees() {
    try { return JSON.parse(localStorage.getItem(EMP_KEY)) || []; }
    catch { return []; }
}

function saveEmployees(emps) {
    localStorage.setItem(EMP_KEY, JSON.stringify(emps));
}

function clearEmployeeForm() {
    document.getElementById('Inp_EmpId').value   = '';
    document.getElementById('Inp_EmpEmail').value = '';
    document.getElementById('Inp_EmpPos').value   = '';
    document.getElementById('Inp_EmpDept').value  = '';
    document.getElementById('Inp_HireDate').value = '';
}

document.querySelector('.btn_emp').addEventListener('click', function () {
    clearEmployeeForm();
    showToast('Fill the form below to add an employee.');
});

async function renderEmployeesTable() {
    const tbody = document.getElementById('employeesTableBody');
    const emps  = getEmployees();
    tbody.innerHTML = '';

    if (emps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees yet.</td></tr>';
        return;
    }

    // Get the live user list from the API so names are always current
    let users = [];
    try { users = await apiFetch('/users'); } catch { /* if API is down, skip name lookup */ }

    emps.forEach((emp, index) => {
        // Try to find the matching user by email to show full name
        const match    = users.find(u => u.email === emp.email);
        const fullName = match ? `${match.firstName} ${match.lastName}` : emp.email;

        tbody.innerHTML += `
            <tr>
                <td>${emp.empId}</td>
                <td>${fullName}</td>
                <td>${emp.position}</td>
                <td>${emp.department}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm"
                        onclick="deleteEmployee(${index})">Delete</button>
                </td>
            </tr>
        `;
    });
}

function deleteEmployee(index) {
    if (!confirm('Delete this employee?')) return;

    const emps = getEmployees();
    emps.splice(index, 1);
    saveEmployees(emps);
    renderEmployeesTable();
    showToast('Employee deleted.');
}

document.querySelector('.btn-save-employee').addEventListener('click', async function () {
    const empId    = document.getElementById('Inp_EmpId').value.trim();
    const email    = document.getElementById('Inp_EmpEmail').value.trim();
    const position = document.getElementById('Inp_EmpPos').value.trim();
    const dept     = document.getElementById('Inp_EmpDept').value.trim();

    if (!empId || !email || !position || !dept) {
        showToast('All fields are required.', 'error');
        return;
    }

    // Check that the email belongs to a real registered user in the API
    let users = [];
    try { users = await apiFetch('/users'); } catch { /* skip check if API is unreachable */ }

    if (users.length > 0 && !users.find(u => u.email === email)) {
        showToast('No registered account matches this email.', 'error');
        return;
    }

    const emps = getEmployees();

    if (emps.find(e => e.empId === empId)) {
        showToast('Employee ID already exists.', 'error');
        return;
    }

    emps.push({ empId, email, position, department: dept });
    saveEmployees(emps);
    renderEmployeesTable();
    clearEmployeeForm();
    showToast('Employee added successfully.');
});


// REQUESTS — stored in localStorage
const REQ_KEY = 'app_requests';

function getRequests() {
    try { return JSON.parse(localStorage.getItem(REQ_KEY)) || []; }
    catch { return []; }
}

function saveRequests(reqs) {
    localStorage.setItem(REQ_KEY, JSON.stringify(reqs));
}

function renderMyRequests() {
    const tbody = document.getElementById('requestsTableBody');
    tbody.innerHTML = '';

    if (!currentUser) return;

    // Only show requests belonging to the logged-in user
    const myRequests = getRequests().filter(r => r.employeeEmail === currentUser.email);

    if (myRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No requests yet.</td></tr>';
        return;
    }

    myRequests.forEach(req => {
        const itemsText = req.items.map(i => `${i.name} (x${i.qty})`).join(', ');
        tbody.innerHTML += `
            <tr>
                <td>${req.date}</td>
                <td>${req.type}</td>
                <td>${itemsText}</td>
                <td>${req.status}</td>
            </tr>
        `;
    });
}

// Creates a row in the modal for entering an item name and quantity
function createItemRow(name = '', qty = '') {
    const div = document.createElement('div');
    div.classList.add('d-flex', 'mb-2');
    div.innerHTML = `
        <input type="text"   class="form-control me-2 item-name" placeholder="Item Name" value="${name}">
        <input type="number" class="form-control me-2 item-qty"  placeholder="Qty" style="width:80px" value="${qty}">
        <button type="button" class="btn btn-danger btn-sm remove-item">×</button>
    `;
    div.querySelector('.remove-item').addEventListener('click', () => div.remove());
    return div;
}

document.getElementById('btnAddItem').addEventListener('click', function () {
    document.getElementById('itemsContainer').appendChild(createItemRow());
});

// When the modal opens, reset it with one blank item row
document.getElementById('requestModal').addEventListener('shown.bs.modal', function () {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';
    container.appendChild(createItemRow());
});

document.getElementById('btnSubmitRequest').addEventListener('click', function () {
    const type      = document.getElementById('Inp_ReqType').value;
    const itemNames = document.querySelectorAll('.item-name');
    const itemQtys  = document.querySelectorAll('.item-qty');
    const items     = [];

    // Collect all item rows with valid name and quantity
    for (let i = 0; i < itemNames.length; i++) {
        const name = itemNames[i].value.trim();
        const qty  = parseInt(itemQtys[i].value);
        if (name && qty > 0) items.push({ name, qty });
    }

    if (items.length === 0) {
        showToast('Add at least one valid item.', 'error');
        return;
    }

    const reqs = getRequests();
    reqs.push({
        type,
        items,
        status: 'Pending',
        date:   new Date().toLocaleDateString(),
        employeeEmail: currentUser.email,
    });

    saveRequests(reqs);

    // Close the Bootstrap modal
    bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
    renderMyRequests();
    showToast('Request submitted successfully.');
});


// TOAST NOTIFICATION

function showToast(message, type = 'success') {
    const toastEl   = document.getElementById('appToast');
    const toastBody = document.getElementById('toastMessage');

    toastBody.textContent = message;

    if (type === 'error') {
        toastEl.classList.remove('bg-success');
        toastEl.classList.add('bg-danger', 'text-white');
    } else {
        toastEl.classList.remove('bg-danger');
        toastEl.classList.add('bg-success', 'text-white');
    }

    new bootstrap.Toast(toastEl).show();
}

autoLogin().then(() => handleRouting());