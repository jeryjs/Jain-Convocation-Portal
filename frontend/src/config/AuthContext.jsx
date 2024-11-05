import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [userData, setUserData] = useState(null);
    const [selectedImages, setSelectedImages] = useState({});
    
    // When userData changes, restore selected images from requested images
    useEffect(() => {
        if (userData?.requestedImages) {
            setSelectedImages(userData.requestedImages);
        } else {
            setSelectedImages({});
        }
    }, [userData]);

    const login = (data) => {
        setUserData(data);
    };

    const logout = () => {
        setUserData(null);
        setSelectedImages({});
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

export const useAuth = () => useContext(AuthContext);