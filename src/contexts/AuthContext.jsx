import { createContext, useContext, useState, useEffect } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    onAuthStateChanged,
    deleteUser,
    signInWithPopup,
    GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const SECRET_KEY =  'your-secret-key';
    const googleProvider = new GoogleAuthProvider();

    const generateToken = (userId, role) => {
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            userId,
            role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        };
        const encodedHeader = btoa(JSON.stringify(header)).replace(/=+$/, '');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/=+$/, '');
        const signature = CryptoJS.HmacSHA256(`${encodedHeader}.${encodedPayload}`, SECRET_KEY).toString(CryptoJS.enc.Base64).replace(/=+$/, '');
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    };

    const verifyToken = (token) => {
        try {
            const decoded = jwtDecode(token);
            const [header, payload, signature] = token.split('.');
            const expectedSignature = CryptoJS.HmacSHA256(`${header}.${payload}`, SECRET_KEY).toString(CryptoJS.enc.Base64).replace(/=+$/, '');
            if (signature === expectedSignature && decoded.exp > Math.floor(Date.now() / 1000)) {
                return decoded;
            }
            return null;
        } catch (err) {
            return null;
        }
    };

    const register = async (email, password, userData, role = 'user') => {
        try {
            setError(null);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: userData.fullName });
            
            const profileData = {
                fullName: userData.fullName,
                email: userData.email,
                mobileNo: userData.mobileNo || '',
                address: userData.address || {},
                gstNo: userData.gstNo || '',
                gstOwnerName: userData.gstOwnerName || '',
                companyName: userData.companyName || '',
                role: role,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            await setDoc(doc(db, "users", user.uid), profileData);
            const token = generateToken(user.uid, role);
            localStorage.setItem('authToken', token);
            setUserProfile(profileData);
            setUserRole(role);
            return user;
        } catch (error) {
            setError(error.message);
            throw new Error(`Registration failed: ${error.message}`);
        }
    };

    const login = async (email, password, rememberMe) => {
        try {
            setError(null);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const profileData = userDoc.data();
                const token = generateToken(user.uid, profileData.role);
                
                if (rememberMe) {
                    Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'Strict' });
                } else {
                    localStorage.setItem('authToken', token);
                }
                
                setUserProfile(profileData);
                setUserRole(profileData.role);
                return userCredential;
            }
            throw new Error('User profile not found');
        } catch (error) {
            setError(error.message);
            throw new Error(`Login failed: ${error.message}`);
        }
    };

    const loginWithGoogle = async () => {
        try {
            setError(null);
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (!userDoc.exists()) {
                const profileData = {
                    fullName: user.displayName || '',
                    email: user.email || '',
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await setDoc(doc(db, "users", user.uid), profileData);
            }
            
            const profileData = (await getDoc(doc(db, "users", user.uid))).data();
            const token = generateToken(user.uid, profileData.role);
            Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'Strict' });
            setUserProfile(profileData);
            setUserRole(profileData.role);
            return result;
        } catch (error) {
            setError(error.message);
            throw new Error(`Google login failed: ${error.message}`);
        }
    };

    const logout = async () => {
        try {
            setError(null);
            await signOut(auth);
            localStorage.removeItem('authToken');
            Cookies.remove('authToken');
            setUserProfile(null);
            setUserRole(null);
        } catch (error) {
            setError(error.message);
            throw new Error(`Logout failed: ${error.message}`);
        }
    };

    const resetPassword = async (email) => {
        try {
            setError(null);
            await sendPasswordResetEmail(auth, email);
            return true;
        } catch (error) {
            setError(error.message);
            throw new Error(`Password reset failed: ${error.message}`);
        }
    };

    const changePassword = async (newPassword) => {
        try {
            setError(null);
            await updatePassword(auth.currentUser, newPassword);
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, { updatedAt: new Date().toISOString() });
            return true;
        } catch (error) {
            setError(error.message);
            throw new Error(`Password change failed: ${error.message}`);
        }
    };

    const updateUserProfile = async (userData) => {
        try {
            setError(null);
            const userRef = doc(db, "users", auth.currentUser.uid);
            const updatedData = {
                ...userData,
                updatedAt: new Date().toISOString()
            };
            await updateDoc(userRef, updatedData);
            
            if (userData.fullName) {
                await updateProfile(auth.currentUser, { displayName: userData.fullName });
            }
            
            const updatedProfile = await getDoc(userRef);
            setUserProfile(updatedProfile.data());
            return true;
        } catch (error) {
            setError(error.message);
            throw new Error(`Profile update failed: ${error.message}`);
        }
    };

    const deleteAccount = async () => {
        try {
            setError(null);
            const user = auth.currentUser;
            const userRef = doc(db, "users", user.uid);
            await deleteDoc(userRef);
            await deleteUser(user);
            localStorage.removeItem('authToken');
            Cookies.remove('authToken');
            setUserProfile(null);
            setUserRole(null);
            setCurrentUser(null);
            return true;
        } catch (error) {
            setError(error.message);
            throw new Error(`Account deletion failed: ${error.message}`);
        }
    };

    const fetchUserProfile = async (userId) => {
        try {
            setError(null);
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const profileData = userSnap.data();
                setUserProfile(profileData);
                setUserRole(profileData.role);
                return profileData;
            }
            return null;
        } catch (error) {
            setError(error.message);
            return null;
        }
    };

    const getAllUsers = async () => {
        try {
            if (userRole !== 'admin') throw new Error('Unauthorized access');
            const usersCollection = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollection);
            return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            setError(error.message);
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    };

    const updateUserRole = async (userId, newRole) => {
        try {
            if (userRole !== 'admin') throw new Error('Unauthorized access');
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { 
                role: newRole,
                updatedAt: new Date().toISOString()
            });
            if (currentUser.uid === userId) {
                setUserRole(newRole);
                const token = generateToken(userId, newRole);
                localStorage.setItem('authToken', token);
                Cookies.set('authToken', token);
            }
            return true;
        } catch (error) {
            setError(error.message);
            throw new Error(`Role update failed: ${error.message}`);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const token = Cookies.get('authToken') || localStorage.getItem('authToken');
                if (token) {
                    const decoded = verifyToken(token);
                    if (decoded && decoded.userId === user.uid) {
                        await fetchUserProfile(user.uid);
                    } else {
                        await logout();
                    }
                } else {
                    await fetchUserProfile(user.uid);
                }
            } else {
                setUserProfile(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        currentUser,
        userProfile,
        userRole,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        changePassword,
        updateUserProfile,
        deleteAccount,
        getAllUsers,
        updateUserRole,
        loading,
        error,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};