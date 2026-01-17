import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  increment,
  deleteDoc
} from "firebase/firestore";
import { 
  ref, 
  push, 
  set, 
  onValue, 
  off, 
  serverTimestamp as rdbTimestamp,
  onDisconnect
} from "firebase/database";
import { db, rdb } from "./firebase";
import { Project, UserProfile, Comment, ChatRoom } from "../types";

// --- Users ---
export const saveUserProfile = async (user: UserProfile) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      // If user exists, be VERY CAREFUL about overwrites.
      const existing = snap.data() as UserProfile;
      const updates: any = { ...user };
      
      // FIX: If the DB has a photo, but the incoming 'user' object has no photo 
      // (or a generic one from basic Auth), DO NOT overwrite the DB photo.
      if (existing.photoURL && existing.photoURL.length > 0) {
        if (!user.photoURL) {
            delete updates.photoURL;
        }
        else if (user.photoURL !== existing.photoURL) {
            if (existing.photoURL.includes('cloudinary') && !user.photoURL.includes('cloudinary')) {
                delete updates.photoURL;
            }
        }
      }

      // Same logic for bio
      if (!user.bio && existing.bio) {
        delete updates.bio;
      }
      
      // Initialize stats if missing (Fixes Permission Denied on increment)
      if (existing.followers === undefined) updates.followers = 0;
      if (existing.following === undefined) updates.following = 0;

      await updateDoc(userRef, updates);
    } else {
      // New user, save as is but ensure stats are 0
      await setDoc(userRef, {
        ...user,
        followers: 0,
        following: 0
      });
    }
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() as UserProfile : null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
};

// --- Presence System (Online Status) ---
export const setupPresence = (uid: string) => {
  const userStatusDatabaseRef = ref(rdb, '/status/' + uid);
  const isOfflineForDatabase = {
    state: 'offline',
    last_changed: rdbTimestamp(),
  };
  const isOnlineForDatabase = {
    state: 'online',
    last_changed: rdbTimestamp(),
  };

  const connectedRef = ref(rdb, '.info/connected');
  
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }
    // If we are currently connected, set up the disconnect hook
    onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
      // And set state to online
      set(userStatusDatabaseRef, isOnlineForDatabase);
    });
  });
};

// --- Follow System ---
export const followUser = async (currentUid: string, targetUid: string) => {
  if (currentUid === targetUid) return;

  // 1. Update MY data (Highest priority - usually allowed)
  try {
    await setDoc(doc(db, "users", currentUid, "following", targetUid), { timestamp: Date.now() });
    await updateDoc(doc(db, "users", currentUid), { following: increment(1) });
  } catch (e) {
    console.error("Failed to update my following list:", e);
    throw e; // If I can't update my own data, fail the action
  }
  
  // 2. Update THEIR data (Lowest priority - might be blocked by rules)
  try {
    await setDoc(doc(db, "users", targetUid, "followers", currentUid), { timestamp: Date.now() });
    await updateDoc(doc(db, "users", targetUid), { followers: increment(1) });
  } catch (e) {
    console.warn("Could not update target user's followers count (Permission denied). This is expected if rules are strict.", e);
  }
};

export const unfollowUser = async (currentUid: string, targetUid: string) => {
  if (currentUid === targetUid) return;

  // 1. Update MY data
  try {
    await deleteDoc(doc(db, "users", currentUid, "following", targetUid));
    await updateDoc(doc(db, "users", currentUid), { following: increment(-1) });
  } catch (e) {
    console.error("Failed to update my following list:", e);
    throw e;
  }

  // 2. Update THEIR data
  try {
    await deleteDoc(doc(db, "users", targetUid, "followers", currentUid));
    await updateDoc(doc(db, "users", targetUid), { followers: increment(-1) });
  } catch (e) {
    console.warn("Could not update target user's followers count (Permission denied).", e);
  }
};

export const checkIsFollowing = async (currentUid: string, targetUid: string): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, "users", currentUid, "following", targetUid));
    return snap.exists();
  } catch (e) {
    console.warn("Check following failed:", e);
    return false;
  }
};

// --- Projects ---
export const createProject = async (project: Omit<Project, 'id'>) => {
  const docRef = await addDoc(collection(db, "projects"), project);
  return docRef.id;
};

export const updateProject = async (id: string, updates: Partial<Project>) => {
  try {
    const docRef = doc(db, "projects", id);
    await updateDoc(docRef, updates);
  } catch (e) {
    console.error("Error updating project:", e);
    throw e;
  }
};

export const getFeedProjects = async () => {
  try {
    const q = query(
      collection(db, "projects"), 
      where("isPublic", "==", true)
    );
    const snapshot = await getDocs(q);
    const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
    
    // Sort client-side
    return projects.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Error fetching feed:", e);
    return [];
  }
};

export const getUserProjects = async (userId: string, currentUserId?: string) => {
  try {
    let q;
    
    if (currentUserId === userId) {
       // Viewing own profile: Fetch everything
       q = query(collection(db, "projects"), where("userId", "==", userId));
    } else {
       // Viewing other's profile: Fetch only public
       q = query(
         collection(db, "projects"), 
         where("userId", "==", userId),
         where("isPublic", "==", true)
       );
    }

    const snapshot = await getDocs(q);
    const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));

    // Sort client-side
    return projects.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Error fetching user projects:", e);
    return [];
  }
};

export const deleteProject = async (id: string) => {
  await deleteDoc(doc(db, "projects", id));
};

export const likeProject = async (projectId: string, incrementVal: number) => {
  try {
    const ref = doc(db, "projects", projectId);
    await updateDoc(ref, {
      likes: increment(incrementVal)
    });
  } catch (e) {
    console.error("Like failed:", e);
  }
};

// --- Realtime Comments ---
export const addComment = async (projectId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => {
  const commentsRef = ref(rdb, `comments/${projectId}`);
  const newCommentRef = push(commentsRef);
  await set(newCommentRef, {
    ...comment,
    timestamp: Date.now()
  });
};

// --- Realtime Chat ---
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

export const sendMessage = async (chatId: string, senderId: string, text: string) => {
  const messagesRef = ref(rdb, `chats/${chatId}/messages`);
  const newMsgRef = push(messagesRef);
  
  await set(newMsgRef, {
    senderId,
    text,
    timestamp: Date.now()
  });

  const metaRef = ref(rdb, `chats/${chatId}/metadata`);
  await set(metaRef, {
    lastMessage: text,
    lastMessageTime: Date.now()
  });
};