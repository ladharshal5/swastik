import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, orderBy, doc, deleteDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCX3TQ4-XNzvsXTkbJlVQ__qv2HOowXPds",
    authDomain: "testnew-3d902.firebaseapp.com",
    projectId: "testnew-3d902",
    storageBucket: "testnew-3d902.firebasestorage.app",
    messagingSenderId: "58901727172",
    appId: "1:58901727172:web:e1738ab817da2087b00691",
    measurementId: "G-D8XPFF4PBV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "inquiries";

// --- DOM ELEMENTS ---
const form = document.getElementById('inquiryForm');
const tableBody = document.getElementById('tableBody');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');
const toastContainer = document.getElementById('toast-container');

// Inputs
const nameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const msgInput = document.getElementById('message');

// Modal Elements
const deleteModal = document.getElementById('deleteModal');
const modalCancelBtn = document.getElementById('modalCancel');
const modalConfirmBtn = document.getElementById('modalConfirm');

// --- STATE MANAGEMENT ---
let isEditing = false;
let currentEditId = null;
let idToDelete = null; 

// --- REAL-TIME DATA LISTENER ---
const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    tableBody.innerHTML = ""; 

    if (snapshot.empty) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #888;">No records found.</td></tr>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 500;">${escapeHtml(data.name)}</td>
            <td>${escapeHtml(data.email)}</td>
            <td>${escapeHtml(data.message).substring(0, 30)}...</td>
            <td>
                <button class="action-btn edit-btn" data-id="${id}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="action-btn delete-btn" data-id="${id}">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach Listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => showDeleteModal(btn.getAttribute('data-id')));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => handleEdit(btn.getAttribute('data-id'), snapshot));
    });
});

// --- FORM SUBMISSION ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        message: msgInput.value,
        timestamp: new Date()
    };

    submitBtn.disabled = true;

    try {
        if (isEditing) {
            await updateDoc(doc(db, COLLECTION_NAME, currentEditId), formData);
            showToast("Inquiry updated successfully!", "success"); // TOAST
            resetFormState();
        } else {
            await addDoc(collection(db, COLLECTION_NAME), formData);
            showToast("Inquiry submitted successfully!", "success"); // TOAST
            form.reset();
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Operation failed. See console.", "error"); // TOAST
    } finally {
        submitBtn.disabled = false;
    }
});

// --- MODAL LOGIC (DELETE) ---
function showDeleteModal(id) {
    idToDelete = id;
    deleteModal.classList.add('show');
}

function hideDeleteModal() {
    deleteModal.classList.remove('show');
    idToDelete = null;
}

modalConfirmBtn.addEventListener('click', async () => {
    if (idToDelete) {
        try {
            modalConfirmBtn.innerText = "Deleting...";
            await deleteDoc(doc(db, COLLECTION_NAME, idToDelete));
            
            hideDeleteModal();
            showToast("Record deleted successfully", "success"); // TOAST
        } catch (error) {
            showToast("Error deleting: " + error.message, "error");
        } finally {
            modalConfirmBtn.innerText = "Yes, Delete";
        }
    }
});

modalCancelBtn.addEventListener('click', hideDeleteModal);
deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) hideDeleteModal();
});


// --- EDIT LOGIC ---
function handleEdit(id, snapshot) {
    const docSnap = snapshot.docs.find(doc => doc.id === id);
    if (!docSnap) return;
    
    const data = docSnap.data();

    nameInput.value = data.name;
    emailInput.value = data.email;
    phoneInput.value = data.phone;
    msgInput.value = data.message;

    isEditing = true;
    currentEditId = id;

    formTitle.innerText = "Edit Inquiry";
    submitBtn.innerText = "Update Entry";
    submitBtn.classList.add('update-mode');
    cancelBtn.style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

cancelBtn.addEventListener('click', resetFormState);

function resetFormState() {
    isEditing = false;
    currentEditId = null;
    form.reset();
    
    formTitle.innerText = "New Inquiry";
    submitBtn.innerText = "Submit Inquiry";
    submitBtn.classList.remove('update-mode');
    cancelBtn.style.display = "none";
}

// --- TOAST NOTIFICATION LOGIC ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Select Icon based on type
    const iconSVG = type === 'success' 
        ? `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>`
        : `<svg class="toast-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    toast.innerHTML = `
        ${iconSVG}
        <span class="toast-msg">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Trigger Animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        // Wait for CSS transition to finish before removing from DOM
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

// Helper
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}