import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Initialize state from secure storage
    const [userData, setUserData] = useState(secureStorage.get()?.userData || null);
    const [selectedImages, setSelectedImages] = useState(secureStorage.get()?.selectedImages || {});

    // When userData changes, restore selected images from requested images
    useEffect(() => {
        if (userData?.requestedImages) {
            setSelectedImages(userData.requestedImages);
        } else {
            setSelectedImages({});
        }
    }, [userData]);

    // Persist state changes to secure storage
    useEffect(() => {
        if (userData || Object.keys(selectedImages).length > 0) {
            secureStorage.set({ userData, selectedImages });
        } else {
            secureStorage.clear();
        }
    }, [userData, selectedImages]);

    const login = (data) => {
        setUserData(data);
    };

    const logout = () => {
        setUserData(null);
        setSelectedImages({});
        secureStorage.clear();
    };

    // Simple setter for selected images
    const updateSelectedImages = (newImages) => {
        setSelectedImages(newImages);
    };

    const getAvailableSlots = () => {
        return 3 - Object.keys(selectedImages).length;
    };

    // Update both userData and selectedImages after successful request
    const updateUserAfterRequest = (newUserData) => {
        setUserData(newUserData);
        if (newUserData.requestedImages) {
            setSelectedImages(newUserData.requestedImages);
        }
    };

    return (
        <AuthContext.Provider value={{
            userData,
            selectedImages,
            login,
            logout,
            updateSelectedImages,
            getAvailableSlots,
            updateUserAfterRequest
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// Enhanced storage with encryption
const secureStorage = {
    get: () => {
        try {
            const encrypted = sessionStorage.getItem('_auth');
            if (!encrypted) return null;
            const decrypted = cipher.decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch {
            return null;
        }
    },

    set: (data) => {
        try {
            const encrypted = cipher.encrypt(JSON.stringify(data));
            sessionStorage.setItem('_auth', encrypted);
        } catch { } // Fail silently
    },

    clear: () => {
        try {
            sessionStorage.removeItem('_auth');
        } catch { }
    }
};

// Simple encryption/decryption functions with persistent key
const cipher = {
    // Use a persistent key that remains same for the session
    key: (() => {
        let key = sessionStorage.getItem('_k');
        if (!key) {
            key = Math.random().toString(36).slice(2) + Date.now().toString(36);
            sessionStorage.setItem('_k', key);
        }
        return key;
    })(),

    encrypt: (text) => {
        if (!text) return '';
        const textToChars = text => text.split('').map(c => c.charCodeAt(0));
        const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
        const applySaltToChar = code => textToChars(cipher.key).reduce((a, b) => a ^ b, code);

        return text
            .split('')
            .map(textToChars)
            .map(applySaltToChar)
            .map(byteHex)
            .join('');
    },

    decrypt: (encoded) => {
        if (!encoded) return null;
        const textToChars = text => text.split('').map(c => c.charCodeAt(0));
        const applySaltToChar = code => textToChars(cipher.key).reduce((a, b) => a ^ b, code);

        return encoded
            .match(/.{1,2}/g)
            .map(hex => parseInt(hex, 16))
            .map(applySaltToChar)
            .map(charCode => String.fromCharCode(charCode))
            .join('');
    }
};

export const useAuth = () => useContext(AuthContext);