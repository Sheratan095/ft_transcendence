import { isLoggedInClient, isLoggedInServerValidate, getAccessToken, clearTokens, fetchUserProfile } from '../../lib/auth';
import type { User } from '../../lib/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function updateProfile(formData: FormData): Promise<boolean> {
    const token = getAccessToken();
    console.log('Updating profile with data:', Array.from(formData.entries()));
    if (!token) return false;

    try {
        const response = await fetch('http://localhost:3000/users/update-user', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error updating profile:', error);
        return false;
    }
}

// Initialize profile page
document.addEventListener('DOMContentLoaded', async () => {
    const user = await fetchUserProfile();
    if (!user) return;

    console.log('Loaded user profile:', user);
    // Update UI with user data
    const avatarImg = document.getElementById('avatar') as HTMLImageElement;
    const usernameSpan = document.getElementById('username') as HTMLSpanElement;

    if (user.avatarUrl) {
        avatarImg.src = user.avatarUrl;
    }
    else
        avatarImg.src = '../../../assets/placeholder-avatar.jpg';
    usernameSpan.textContent = user.username;

    // Handle form submission
    const form = document.getElementById('profile-form') as HTMLFormElement;
    const resultMessage = document.getElementById('update-result') as HTMLDivElement;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
        submitButton.disabled = true;
        resultMessage.textContent = 'Updating profile...';
        
        try {
            const success = await updateProfile(formData);
            if (success) {
                resultMessage.textContent = 'Profile updated successfully!';
                resultMessage.className = 'mt-2 text-green-600';
                // Refresh the page after 1 second to show updated data
                setTimeout(() => window.location.reload(), 1000);
            } else {
                resultMessage.textContent = 'Failed to update profile. Please try again later.';
                resultMessage.className = 'mt-2 text-red-600';
                //setTimeout(() => resultMessage.textContent = '', 3000);
            }
        } catch (error) {
            resultMessage.textContent = 'An error occurred. Please try again.';
            resultMessage.className = 'mt-2 text-red-600';
        } finally {
            submitButton.disabled = false;
        }
    });

    // Handle avatar preview
    const avatarInput = document.getElementById('avatar-input') as HTMLInputElement;
    avatarInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    avatarImg.src = e.target.result as string;
                }
            };
            reader.readAsDataURL(file);
        }
    });
});