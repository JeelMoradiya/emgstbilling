import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const register = async (email, password, userData) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: userData.fullName });
      
      const profileData = {
        fullName: userData.fullName,
        email: userData.email,
        mobileNo: userData.mobileNo || '',
        address: userData.address || '',
        gstNo: userData.gstNo || '',
        gstOwnerName: userData.gstOwnerName || '',
        companyName: userData.companyName || '',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "users", user.uid), profileData);
      setUserProfile(profileData);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      return await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const changePassword = async (newPassword) => {
    try {
      setError(null);
      return await updatePassword(auth.currentUser, newPassword);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateUserProfile = async (userData) => {
    try {
      setError(null);
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, userData);
      
      if (userData.fullName) {
        await updateProfile(auth.currentUser, { displayName: userData.fullName });
      }
      
      const updatedProfile = await getDoc(userRef);
      setUserProfile(updatedProfile.data());
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      setError(null);
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
        return userSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError(error.message);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    register,
    login,
    logout,
    resetPassword,
    changePassword,
    updateUserProfile,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};