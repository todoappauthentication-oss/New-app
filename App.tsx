import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ArrowLeft, 
  Copy, 
  FileCode, 
  Video, 
  Loader2,
  Home,
  MessageCircle,
  User as UserIcon,
  Heart,
  Lock,
  LogOut,
  Send,
  Search,
  PlusSquare,
  MoreVertical, // Changed to Vertical for AM style
  Bookmark,
  X,
  Check,
  Upload,
  Globe,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Edit2,
  Zap, // For "Effects" or "Tutorials" icon
  Layers // For "Projects" icon look
} from 'lucide-react';

import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import { ref, onValue, off } from "firebase/database";
import { auth, googleProvider, rdb } from './services/firebase';

import { Project, ViewState, UserProfile, Comment, ChatMessage } from './types';
import { generateSmartTags } from './services/geminiService';
import { uploadToCloudinary } from './services/cloudinaryService';
import { 
  createProject, 
  updateProject,
  getFeedProjects, 
  getUserProjects, 
  saveUserProfile, 
  getUserProfile, 
  getAllUsers, 
  addComment, 
  likeProject, 
  getChatId,
  sendMessage,
  followUser,
  unfollowUser,
  checkIsFollowing,
  setupPresence
} from './services/dbService';

// --- Components ---

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// --- Custom Video Player ---
const CustomVideoPlayer: React.FC<{ src: string, onDoubleTap: () => void }> = ({ src, onDoubleTap }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
    onDoubleTap();
  };

  return (
    <div 
      className="w-full h-full relative bg-black cursor-pointer group"
      onDoubleClick={handleDoubleTap}
      onClick={togglePlay}
    >
      <video 
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted={isMuted}
      />
      
      {/* Center Play Button Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-am-surface/80 p-4 rounded-full backdrop-blur-sm border border-am-teal/20">
            <Play size={32} className="text-am-teal ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Heart Animation Overlay */}
      <AnimatePresence>
        {showHeart && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart size={80} fill="#00D2BE" className="text-am-teal drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Control */}
      <div 
        onClick={toggleMute}
        className="absolute bottom-3 right-3 bg-black/60 p-1.5 rounded-full text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </div>
    </div>
  );
};

// --- Auth Component ---
const AuthView: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await saveUserProfile({
        uid: res.user.uid,
        displayName: res.user.displayName || 'User',
        email: res.user.email || '',
        photoURL: res.user.photoURL || '',
      });
      onLogin();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    setError('');
    
    if (isSignUp && !username.trim()) {
      setError("Username is required for sign up");
      setLoading(false);
      return;
    }

    try {
      let userCred;
      if (isSignUp) {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      
      await saveUserProfile({
        uid: userCred.user.uid,
        displayName: isSignUp ? username : (userCred.user.displayName || email.split('@')[0]),
        email: userCred.user.email || '',
        photoURL: '', 
      });
      onLogin();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-am-bg text-white">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center mt-10">
          <div className="w-20 h-20 bg-am-surface rounded-2xl mx-auto mb-4 flex items-center justify-center border border-am-teal shadow-[0_0_15px_rgba(0,210,190,0.3)]">
             <div className="w-10 h-10 border-4 border-am-teal rounded-tr-xl rounded-bl-xl rotate-45"></div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Alight<span className="text-am-teal">Gram</span></h1>
          <p className="text-am-subtext text-sm mt-2">Motion Creative Community</p>
        </div>

        <div className="space-y-3">
          {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error}</div>}
          
          <div className="space-y-2">
            {isSignUp && (
              <input 
                className="w-full bg-am-surface border border-am-gray p-3 rounded-lg text-white text-sm focus:border-am-teal outline-none transition-colors" 
                placeholder="Username" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
              />
            )}
            <input 
              className="w-full bg-am-surface border border-am-gray p-3 rounded-lg text-white text-sm focus:border-am-teal outline-none transition-colors" 
              placeholder="Email" 
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input 
              className="w-full bg-am-surface border border-am-gray p-3 rounded-lg text-white text-sm focus:border-am-teal outline-none transition-colors" 
              placeholder="Password" 
              type="password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button onClick={handleEmailAuth} className="w-full bg-am-teal text-black font-bold py-3 rounded-lg hover:bg-am-tealDark transition-colors text-sm shadow-lg">
            {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5"/> : (isSignUp ? "Create Account" : "Sign In")}
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-am-gray"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase">or</span>
            <div className="flex-grow border-t border-am-gray"></div>
          </div>

          <button onClick={handleGoogle} className="w-full bg-am-surface border border-am-gray flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg hover:bg-[#252525] transition-colors text-sm">
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            {isSignUp ? "Already have an account?" : "New to AlightGram?"} 
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-am-teal ml-1 font-bold hover:underline">
              {isSignUp ? "Sign In" : "Create Account"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Post Component ---
const PostItem: React.FC<{ 
  project: Project, 
  currentUser: UserProfile, 
  onOpen: () => void, 
  onLike: () => void,
  onUserClick: (uid: string) => void,
  onEdit: () => void
}> = ({ project, currentUser, onOpen, onLike, onUserClick, onEdit }) => {
  const [liked, setLiked] = useState(false); 
  const [showOptions, setShowOptions] = useState(false);
  const isOwner = currentUser.uid === project.userId;

  const handleLike = () => {
     setLiked(true);
     onLike();
  };
  
  return (
    <div className="mb-4 bg-am-surface border-y border-am-gray/30 pb-3">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(project.userId)}>
          <img src={project.authorPhoto || "https://via.placeholder.com/32"} className="w-9 h-9 rounded-full object-cover border border-am-gray" />
          <div>
            <span className="font-bold text-sm block leading-tight">{project.authorName}</span>
            <span className="text-xs text-am-subtext">{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2 relative">
           {!project.isPublic && <Lock size={14} className="text-gray-500 self-center" />}
           <button onClick={() => setShowOptions(!showOptions)} className="p-1">
             <MoreVertical size={20} className="text-white" />
           </button>
           
           {/* Action Menu */}
           {showOptions && isOwner && (
              <div className="absolute top-8 right-0 bg-[#252525] border border-am-gray rounded-lg shadow-xl z-10 w-36 py-1 overflow-hidden">
                 <button onClick={() => { setShowOptions(false); onEdit(); }} className="w-full text-left px-4 py-3 text-sm hover:bg-am-gray flex items-center gap-2">
                    <Edit2 size={14} className="text-am-teal"/> Edit Post
                 </button>
                 <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-am-gray flex items-center gap-2 border-t border-am-gray/50">
                    <X size={14}/> Delete
                 </button>
              </div>
           )}
        </div>
      </div>

      {/* Media */}
      <div className="w-full aspect-square bg-[#000] relative overflow-hidden">
        {project.videoUrl ? (
          <CustomVideoPlayer src={project.videoUrl} onDoubleTap={handleLike} />
        ) : (
          <div className="w-full h-full flex items-center justify-center cursor-pointer bg-[#151515]" onClick={onOpen}>
            <div className="flex flex-col items-center gap-2">
                <FileCode size={48} className="text-am-teal opacity-50" />
                <span className="text-xs text-gray-500 font-mono">XML PRESET</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <button onClick={() => { setLiked(!liked); onLike(); }} className="transition-transform active:scale-90">
            <Heart size={26} className={liked || project.likes > 0 ? "fill-am-teal text-am-teal" : "text-white hover:text-am-teal transition-colors"} />
          </button>
          <button onClick={onOpen}>
            <MessageCircle size={26} className="text-white hover:text-am-teal transition-colors -rotate-90" />
          </button>
          <button>
            <Send size={26} className="text-white hover:text-am-teal transition-colors" />
          </button>
        </div>
        
        <div className="flex gap-4">
           {(project.isPublic || isOwner) && (
             <button onClick={() => navigator.clipboard.writeText(project.xmlContent)} className="text-xs font-bold text-am-teal bg-am-teal/10 border border-am-teal/50 rounded px-3 py-1.5 hover:bg-am-teal hover:text-black transition-colors">
                COPY XML
             </button>
           )}
        </div>
      </div>

      {/* Likes & Caption */}
      <div className="px-4 py-2 space-y-1">
        <p className="font-bold text-sm text-white">{project.likes + (liked ? 1 : 0)} likes</p>
        <p className="text-sm text-gray-200">
          <span className="font-bold mr-2 text-white cursor-pointer" onClick={() => onUserClick(project.userId)}>{project.authorName}</span>
          {project.title}
          <div className="mt-1">
            {project.tags?.map(t => <span key={t} className="text-am-teal text-xs mr-2 font-medium">#{t.replace('#','')}</span>)}
          </div>
        </p>
      </div>
    </div>
  );
};

// --- Profile View ---
const ProfileView: React.FC<{ 
  targetUser: UserProfile,
  currentUser: UserProfile, 
  onLogout: () => void,
  onOpenProject: (p: Project) => void,
  onMessage: (uid: string, name: string) => void,
  onUpdateProfile: (u: UserProfile) => void
}> = ({ targetUser, currentUser, onLogout, onOpenProject, onMessage, onUpdateProfile }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const isOwnProfile = targetUser.uid === currentUser.uid;

  useEffect(() => {
    getUserProjects(targetUser.uid, currentUser.uid).then(setProjects);
    if (!isOwnProfile) {
      checkIsFollowing(currentUser.uid, targetUser.uid).then(setIsFollowing);
    }
  }, [targetUser.uid, currentUser.uid, isOwnProfile]);

  const handleUpdatePic = async () => {
    if (!newPhoto) return;
    setUploading(true);
    try {
        const url = await uploadToCloudinary(newPhoto, 'My smallest server');
        const updatedUser = { ...currentUser, photoURL: url };
        await saveUserProfile(updatedUser);
        onUpdateProfile(updatedUser); 
        setIsEditing(false);
        setNewPhoto(null);
    } catch (e) {
        alert("Failed");
    } finally {
        setUploading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, targetUser.uid);
        setIsFollowing(false);
      } else {
        await followUser(currentUser.uid, targetUser.uid);
        setIsFollowing(true);
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="bg-am-bg min-h-screen pb-24">
      {/* Profile Header */}
      <div className="h-14 border-b border-am-gray flex justify-between items-center px-4 sticky top-0 bg-am-surface/95 backdrop-blur z-10">
        <div className="font-bold text-lg flex items-center gap-2">
          {targetUser.displayName} 
          {isOwnProfile && <div className="w-2 h-2 rounded-full bg-am-teal animate-pulse" />}
        </div>
        {isOwnProfile && (
           <div className="flex gap-4 items-center">
             <button onClick={onLogout}><LogOut size={22} className="text-gray-400 hover:text-white" /></button>
           </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-6 mb-6">
          <div className="relative group">
             <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-am-teal to-transparent">
               <img src={targetUser.photoURL || "https://via.placeholder.com/80"} className="w-full h-full rounded-full object-cover border-2 border-black" />
             </div>
             {isOwnProfile && (
                <button onClick={() => setIsEditing(!isEditing)} className="absolute bottom-0 right-0 bg-am-surface text-am-teal rounded-full p-1.5 border border-am-gray shadow-md">
                    <Plus size={14} />
                </button>
             )}
          </div>
          
          <div className="flex flex-1 justify-around text-center">
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white">{projects.length}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white">{targetUser.followers || 0}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white">{targetUser.following || 0}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Following</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-lg text-white">{targetUser.displayName}</h2>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mt-1">{targetUser.bio || "Motion Graphics Designer | XML Creator"}</div>
        </div>

        {/* Buttons */}
        {isOwnProfile ? (
            isEditing ? (
               <div className="flex gap-2 mb-6 items-center p-2 bg-am-surface rounded-lg border border-am-gray">
                 <input type="file" onChange={e => e.target.files && setNewPhoto(e.target.files[0])} className="text-xs flex-1 text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:bg-am-teal file:text-black file:font-bold" />
                 <button onClick={handleUpdatePic} disabled={uploading} className="bg-am-teal text-black px-4 py-1.5 rounded-md text-sm font-bold">
                    {uploading ? "..." : "Save"}
                 </button>
               </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="w-full bg-am-surface text-white py-2 rounded-md text-sm font-semibold border border-am-gray hover:bg-[#2a2a2a] transition-colors mb-6">
                Edit Profile
              </button>
            )
        ) : (
            <div className="flex gap-3 mb-6">
                <button 
                  onClick={handleFollowToggle}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${isFollowing ? 'bg-am-surface border border-am-gray text-white' : 'bg-am-teal text-black'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button 
                  onClick={() => onMessage(targetUser.uid, targetUser.displayName)}
                  className="flex-1 bg-am-surface py-2 rounded-md text-sm font-semibold border border-am-gray text-white hover:bg-[#2a2a2a]"
                >
                  Message
                </button>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-am-gray">
           <button className="flex-1 py-3 border-b-2 border-white flex justify-center text-white"><Layers size={20}/></button>
           <button className="flex-1 py-3 flex justify-center text-gray-600"><Bookmark size={20}/></button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-[1px]">
          {projects.map(p => (
            <div key={p.id} onClick={() => onOpenProject(p)} className="aspect-square bg-am-surface relative cursor-pointer overflow-hidden border border-black/20 hover:opacity-90 transition-opacity">
              {p.videoUrl ? <video src={p.videoUrl} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center"><FileCode className="text-am-teal"/></div>}
              {!p.isPublic && <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full backdrop-blur-sm"><Lock size={10} className="text-white"/></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Chat View Components ---
// (Keeping mostly same structure, just updating colors)
const ChatListView: React.FC<{ currentUser: UserProfile, onChatSelect: (uid: string, name: string) => void }> = ({ currentUser, onChatSelect }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getAllUsers().then(all => setUsers(all.filter(u => u.uid !== currentUser.uid)));
    const statusRef = ref(rdb, 'status');
    const listener = onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const statusMap: Record<string, boolean> = {};
            Object.keys(data).forEach(uid => statusMap[uid] = data[uid].state === 'online');
            setOnlineStatus(statusMap);
        }
    });
    return () => off(statusRef);
  }, [currentUser]);

  return (
    <div className="p-4 space-y-4">
      {users.map(u => (
        <div key={u.uid} onClick={() => onChatSelect(u.uid, u.displayName)} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-am-surface rounded-lg transition-colors">
          <div className="relative">
              <img src={u.photoURL || "https://via.placeholder.com/50"} className="w-12 h-12 rounded-full bg-am-surface object-cover border border-am-gray" />
              {onlineStatus[u.uid] && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-am-teal border-2 border-black rounded-full" />
              )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{u.displayName}</h3>
            <p className={`text-xs ${onlineStatus[u.uid] ? 'text-am-teal font-medium' : 'text-gray-500'}`}>
                {onlineStatus[u.uid] ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const ChatRoomView: React.FC<{ currentUser: UserProfile, targetUid: string, targetName: string, onBack: () => void }> = ({ currentUser, targetUid, targetName, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chatId = getChatId(currentUser.uid, targetUid);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(rdb, `chats/${chatId}/messages`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMessages(Object.keys(data).map(key => ({ id: key, ...data[key] })));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
    return () => off(messagesRef);
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    try { await sendMessage(chatId, currentUser.uid, text); } catch (e) { alert("Failed"); }
  };

  return (
    <div className="flex flex-col h-full bg-am-bg">
      <div className="h-14 flex items-center px-4 border-b border-am-gray bg-am-surface">
        <button onClick={onBack}><ArrowLeft className="mr-4 text-white"/></button>
        <span className="font-bold flex items-center gap-2 text-white">
           {targetName}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => {
          const isMe = m.senderId === currentUser.uid;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-am-teal text-black font-medium' : 'bg-am-surface text-white border border-am-gray'}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-am-surface flex gap-2 border-t border-am-gray">
        <input 
          className="flex-1 bg-black rounded-full px-5 py-2.5 outline-none text-sm text-white border border-am-gray focus:border-am-teal transition-colors"
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="bg-am-teal text-black rounded-full p-2.5 font-bold hover:bg-am-tealDark transition-colors">
            <Send size={18} />
        </button>
      </div>
    </div>
  );
};

// --- Add Project / Editor View ---
const AddProjectView: React.FC<{ user: UserProfile, onCancel: () => void, onSuccess?: () => void }> = ({ user, onCancel, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [xml, setXml] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const handleGenTags = async () => {
    setTags(await generateSmartTags(title, xml));
  };

  const handleXmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if(ev.target?.result) setXml(ev.target.result as string); };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!title || !xml) return alert("Title and XML required");
    setLoading(true);
    let vUrl = '';
    if (videoFile) vUrl = await uploadToCloudinary(videoFile, 'My smallest server');
    
    await createProject({
      title,
      xmlContent: xml,
      videoUrl: vUrl,
      userId: user.uid,
      authorName: user.displayName,
      authorPhoto: user.photoURL,
      isPublic,
      likes: 0,
      tags,
      createdAt: Date.now()
    });
    setLoading(false);
    if(onSuccess) onSuccess();
    onCancel();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
         <div className="w-28 h-28 bg-am-surface border border-am-gray rounded-lg flex items-center justify-center cursor-pointer relative overflow-hidden group" onClick={() => document.getElementById('v-upload')?.click()}>
            {videoFile ? <video src={URL.createObjectURL(videoFile)} className="w-full h-full object-cover"/> : (
                <div className="flex flex-col items-center gap-1">
                    <div className="bg-am-teal p-2 rounded-full text-black"><Plus size={20}/></div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Video</span>
                </div>
            )}
            <input type="file" id="v-upload" className="hidden" accept="video/*" onChange={e => e.target.files && setVideoFile(e.target.files[0])} />
         </div>
         <div className="flex-1 space-y-3 pt-2">
            <input className="w-full bg-transparent border-b border-am-gray p-2 outline-none text-white font-medium focus:border-am-teal transition-colors" placeholder="Project Name..." value={title} onChange={e => setTitle(e.target.value)} />
            <div className="flex gap-2 flex-wrap">
               <button onClick={handleGenTags} className="text-xs bg-am-teal/20 text-am-teal px-2 py-1 rounded border border-am-teal/30 hover:bg-am-teal/30">Auto Tags</button>
               {tags.map(t => <span key={t} className="text-xs text-gray-400 bg-am-surface px-2 py-1 rounded">{t}</span>)}
            </div>
         </div>
      </div>
      
      <div className="bg-am-surface p-3 rounded-lg border border-am-gray">
         <div className="flex justify-between items-center mb-2 border-b border-am-gray/50 pb-2">
            <span className="text-xs font-bold text-gray-300 uppercase">XML Configuration</span>
            <label className="text-xs bg-[#252525] border border-am-gray px-2 py-1 rounded cursor-pointer hover:bg-am-gray text-am-teal font-bold">
               <Upload size={12} className="inline mr-1" /> Import .xml
               <input type="file" accept=".xml" className="hidden" onChange={handleXmlFileUpload} />
            </label>
         </div>
         <textarea className="w-full h-40 bg-black/50 p-2 rounded text-[10px] font-mono text-am-teal border border-am-gray/30 focus:border-am-teal/50 outline-none xml-scroll" placeholder="<data>...</data>" value={xml} onChange={e => setXml(e.target.value)} />
      </div>

      <div className="flex justify-between items-center text-sm p-4 bg-am-surface rounded-lg border border-am-gray">
         <div className="flex items-center gap-2 font-medium">
            {isPublic ? <Globe size={18} className="text-am-teal" /> : <Lock size={18} className="text-gray-400" />}
            <span>{isPublic ? "Public Project" : "Private Project"}</span>
         </div>
         <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-am-teal' : 'bg-gray-700'}`} onClick={() => setIsPublic(!isPublic)}>
            <div className={`w-4 h-4 bg-white rounded-full transform transition-transform shadow-md ${isPublic ? 'translate-x-4' : ''}`} />
         </div>
      </div>

      <button onClick={handleSave} className="w-full bg-am-teal text-black font-bold py-3 rounded-lg shadow-lg hover:bg-am-tealDark transition-colors flex items-center justify-center gap-2">
          {loading ? "Processing..." : "Publish Project"}
      </button>
    </div>
  );
};

const EditProjectView: React.FC<{ project: Project, onCancel: () => void, onSuccess: () => void }> = ({ project, onCancel, onSuccess }) => {
    // Reusing AddProject styling logic essentially
  const [title, setTitle] = useState(project.title);
  const [xml, setXml] = useState(project.xmlContent);
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await updateProject(project.id, { title, xmlContent: xml, isPublic });
    setLoading(false);
    onSuccess();
  };

  const handleXmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if(ev.target?.result) setXml(ev.target.result as string); };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between mb-4">
         <h2 className="font-bold text-lg">Edit Info</h2>
         <button onClick={onCancel}><X className="text-gray-400"/></button>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase">Project Title</label>
        <input className="w-full bg-am-surface border border-am-gray p-3 rounded text-white focus:border-am-teal outline-none" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
         <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase">XML Data</label>
            <label className="text-xs text-am-teal cursor-pointer font-bold">Import File <input type="file" accept=".xml" className="hidden" onChange={handleXmlFileUpload} /></label>
         </div>
         <textarea className="w-full h-32 bg-am-surface border border-am-gray p-2 rounded text-xs font-mono text-am-teal" value={xml} onChange={e => setXml(e.target.value)} />
      </div>

      <div className="flex justify-between items-center text-sm p-3 border-y border-am-gray">
         <div className="flex items-center gap-2">
            {isPublic ? <Globe size={18} /> : <Lock size={18} />}
            <span>{isPublic ? "Public" : "Private"}</span>
         </div>
         <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-am-teal' : 'bg-gray-600'}`} onClick={() => setIsPublic(!isPublic)}>
            <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${isPublic ? 'translate-x-4' : ''}`} />
         </div>
      </div>

      <button onClick={handleSave} className="w-full bg-am-teal text-black font-bold py-3 rounded">{loading ? "Saving..." : "Save Changes"}</button>
    </div>
  );
};

const ProjectDetailsView: React.FC<{ 
  project: Project, 
  currentUser: UserProfile, 
  onBack: () => void, 
  onUserClick: (uid: string) => void,
  onEdit: () => void
}> = ({ project, currentUser, onBack, onUserClick, onEdit }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const commentsRef = ref(rdb, `comments/${project.id}`);
    onValue(commentsRef, (snap) => {
      const data = snap.val();
      if (data) setComments(Object.keys(data).map(k => ({ id: k, ...data[k] })));
    });
  }, [project.id]);

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    await addComment(project.id, {
      userId: currentUser.uid,
      userName: currentUser.displayName,
      userPhoto: currentUser.photoURL,
      text: newComment
    });
    setNewComment('');
  };

  return (
    <div className="bg-am-bg min-h-screen pb-20">
       <div className="h-14 flex items-center px-4 border-b border-am-gray sticky top-0 bg-am-surface/95 backdrop-blur z-20">
         <button onClick={onBack}><ArrowLeft className="mr-4 text-white"/></button>
         <span className="font-bold text-sm uppercase text-white tracking-widest">Post Details</span>
       </div>
       <PostItem 
         project={project} 
         currentUser={currentUser} 
         onOpen={() => {}} 
         onLike={() => likeProject(project.id, 1)} 
         onUserClick={onUserClick} 
         onEdit={onEdit}
       />
       <div className="px-4">
         <h3 className="font-bold mb-4 text-am-teal text-sm uppercase tracking-wide">Comments</h3>
         <div className="space-y-4 mb-20">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 bg-am-surface p-3 rounded-lg border border-am-gray/50">
                 <img src={c.userPhoto || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full border border-gray-600" />
                 <div>
                    <p className="text-sm"><span className="font-bold mr-2 text-white">{c.userName}</span><span className="text-gray-300">{c.text}</span></p>
                 </div>
              </div>
            ))}
         </div>
       </div>
       <div className="fixed bottom-0 left-0 right-0 bg-am-surface border-t border-am-gray p-3 flex gap-2 max-w-md mx-auto z-30">
          <img src={currentUser.photoURL || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full border border-gray-500" />
          <input className="flex-1 bg-black outline-none text-sm px-3 rounded-full border border-am-gray focus:border-am-teal" placeholder={`Add a comment...`} value={newComment} onChange={e => setNewComment(e.target.value)} />
          <button onClick={handleSendComment} className="text-am-teal text-sm font-bold uppercase px-2">Post</button>
       </div>
    </div>
  );
};

// --- Search View with Users ---
const SearchView: React.FC<{ 
  projects: Project[], 
  onProjectSelect: (p: Project) => void,
  onUserSelect: (uid: string) => void
}> = ({ projects, onProjectSelect, onUserSelect }) => {
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<'projects' | 'people'>('projects');

  useEffect(() => {
    getAllUsers().then(setAllUsers);
  }, []);

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase()) || 
    p.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredUsers = allUsers.filter(u => 
    u.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pb-24 pt-2">
       <div className="px-4 mb-4 sticky top-2 z-10">
         <div className="bg-am-surface rounded-xl p-2.5 flex items-center gap-2 text-gray-400 border border-am-gray shadow-md">
           <Search size={18} /> 
           <input 
             className="bg-transparent outline-none text-sm flex-1 text-white font-medium placeholder-gray-500" 
             placeholder="Search tags, users, projects..." 
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
         </div>
       </div>

       {/* Tabs */}
       <div className="flex border-b border-am-gray mb-2 px-4 gap-6">
          <button 
            className={`py-2 text-sm font-bold uppercase tracking-wide transition-colors ${tab === 'projects' ? 'text-am-teal border-b-2 border-am-teal' : 'text-gray-500 hover:text-white'}`}
            onClick={() => setTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`py-2 text-sm font-bold uppercase tracking-wide transition-colors ${tab === 'people' ? 'text-am-teal border-b-2 border-am-teal' : 'text-gray-500 hover:text-white'}`}
            onClick={() => setTab('people')}
          >
            Creators
          </button>
       </div>

       {tab === 'projects' ? (
         <div className="grid grid-cols-2 gap-2 px-2">
           {filteredProjects.map(p => (
             <div key={p.id} onClick={() => onProjectSelect(p)} className="aspect-[16/9] bg-am-surface relative cursor-pointer rounded-lg overflow-hidden border border-am-gray hover:border-am-teal transition-colors group">
               {p.videoUrl ? (
                   <video src={p.videoUrl} className="w-full h-full object-cover" />
               ) : (
                   <div className="flex h-full flex-col items-center justify-center bg-[#181818]">
                       <FileCode className="text-am-teal mb-2 group-hover:scale-110 transition-transform"/>
                       <span className="text-[10px] text-gray-400 font-mono">{p.title.substring(0,10)}..</span>
                   </div>
               )}
               <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                  <p className="text-xs font-bold truncate text-white">{p.title}</p>
               </div>
             </div>
           ))}
         </div>
       ) : (
         <div className="px-4 space-y-3 mt-4">
           {filteredUsers.map(u => (
             <div key={u.uid} onClick={() => onUserSelect(u.uid)} className="flex items-center gap-3 cursor-pointer bg-am-surface p-2 rounded-lg border border-am-gray hover:border-am-teal transition-colors">
               <img src={u.photoURL || "https://via.placeholder.com/50"} className="w-10 h-10 rounded-full bg-black object-cover" />
               <div>
                 <h3 className="font-bold text-sm text-white">{u.displayName}</h3>
                 <p className="text-xs text-am-teal">{u.followers || 0} followers</p>
               </div>
             </div>
           ))}
         </div>
       )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [editMode, setEditMode] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [chatTarget, setChatTarget] = useState<{uid: string, name: string} | null>(null);
  const [viewedUser, setViewedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    const projs = await getFeedProjects();
    setProjects(projs);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profile = await getUserProfile(fbUser.uid);
        if (!profile) {
            profile = { 
                uid: fbUser.uid, 
                displayName: fbUser.displayName || 'User', 
                email: fbUser.email || '', 
                photoURL: fbUser.photoURL || '' 
            };
        }
        setCurrentUser(profile);
        setViewedUser(profile); 
        setView(ViewState.FEED);
        setupPresence(fbUser.uid);
        await fetchFeed();
      } else {
        setCurrentUser(null);
        setView(ViewState.AUTH);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUserClick = async (uid: string) => {
    setLoading(true);
    const profile = await getUserProfile(uid);
    if (profile) {
      setViewedUser(profile);
      setView(ViewState.PROFILE);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-am-bg flex items-center justify-center"><Loader2 className="animate-spin text-am-teal w-10 h-10"/></div>;

  if (!currentUser || view === ViewState.AUTH) {
    return <AuthView onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-am-bg text-white font-sans max-w-md mx-auto border-x border-am-gray relative shadow-2xl">
      <AnimatePresence mode="wait">
        
        {view === ViewState.FEED && !editMode && (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="h-14 flex justify-between items-center px-4 sticky top-0 bg-am-bg/95 backdrop-blur z-20 border-b border-am-gray/50">
              <h1 className="text-xl font-extrabold italic tracking-tighter text-white">Alight<span className="text-am-teal">Gram</span></h1>
              <div className="flex gap-5">
                <button onClick={() => setView(ViewState.CHAT_LIST)}>
                  <MessageCircle size={24} className="text-white hover:text-am-teal transition-colors" />
                </button>
              </div>
            </div>

            <div className="pb-24 mt-0">
              {projects.map(p => (
                <PostItem 
                  key={p.id} 
                  project={p} 
                  currentUser={currentUser} 
                  onOpen={() => { setActiveProject(p); setView(ViewState.PROJECT_DETAILS); }}
                  onLike={() => likeProject(p.id, 1)}
                  onUserClick={handleUserClick}
                  onEdit={() => { setActiveProject(p); setEditMode(true); }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Edit Modal Overlay */}
        {editMode && activeProject && (
           <motion.div key="edit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-black/90 z-50 overflow-y-auto flex items-center justify-center p-4">
              <div className="bg-am-surface w-full max-w-sm rounded-xl border border-am-gray shadow-2xl overflow-hidden">
                <EditProjectView 
                   project={activeProject} 
                   onCancel={() => { setEditMode(false); setActiveProject(null); }} 
                   onSuccess={() => { setEditMode(false); setActiveProject(null); fetchFeed(); }} 
                />
              </div>
           </motion.div>
        )}

        {view === ViewState.SEARCH && (
           <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
             <SearchView 
                projects={projects} 
                onProjectSelect={(p) => { setActiveProject(p); setView(ViewState.PROJECT_DETAILS); }}
                onUserSelect={handleUserClick}
             />
           </motion.div>
        )}

        {view === ViewState.ADD_PROJECT && (
           <div className="p-5 min-h-screen bg-am-bg">
             <div className="flex justify-between mb-6 items-center">
                <h2 className="font-bold text-xl flex items-center gap-2"><PlusSquare className="text-am-teal"/> New Project</h2>
                <button onClick={() => setView(ViewState.FEED)} className="bg-am-surface p-1 rounded-full"><X size={20}/></button>
             </div>
             <div className="h-[80vh] overflow-y-auto pb-20">
                <AddProjectView 
                  user={currentUser} 
                  onCancel={() => setView(ViewState.FEED)} 
                  onSuccess={() => { fetchFeed(); setView(ViewState.FEED); }} 
                /> 
             </div>
           </div>
        )}

        {view === ViewState.PROFILE && viewedUser && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <ProfileView 
              targetUser={viewedUser}
              currentUser={currentUser}
              onLogout={() => signOut(auth)} 
              onOpenProject={(p) => { setActiveProject(p); setView(ViewState.PROJECT_DETAILS); }}
              onMessage={(uid, name) => {
                setChatTarget({uid, name});
                setView(ViewState.CHAT_ROOM);
              }}
              onUpdateProfile={(u) => {
                  setCurrentUser(u);
                  setViewedUser(u);
              }}
            />
          </motion.div>
        )}

        {view === ViewState.CHAT_LIST && (
           <motion.div key="chatlist" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-0 bg-am-bg z-30">
               <div className="h-14 flex items-center px-4 border-b border-am-gray bg-am-surface">
                 <button onClick={() => setView(ViewState.FEED)}><ArrowLeft className="mr-4 text-white"/></button>
                 <span className="font-bold text-white text-lg">Messages</span>
               </div>
               <ChatListView currentUser={currentUser} onChatSelect={(uid, name) => { setChatTarget({uid, name}); setView(ViewState.CHAT_ROOM); }} />
           </motion.div>
        )}

        {view === ViewState.CHAT_ROOM && chatTarget && (
           <motion.div key="chatroom" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-0 bg-am-bg z-40">
               <ChatRoomView currentUser={currentUser} targetUid={chatTarget.uid} targetName={chatTarget.name} onBack={() => setView(ViewState.CHAT_LIST)} />
           </motion.div>
        )}
        
        {view === ViewState.PROJECT_DETAILS && activeProject && !editMode && (
           <motion.div key="details" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-0 bg-am-bg z-30 overflow-y-auto">
              <ProjectDetailsView 
                project={activeProject} 
                currentUser={currentUser} 
                onBack={() => setView(ViewState.FEED)} 
                onUserClick={handleUserClick} 
                onEdit={() => setEditMode(true)}
              />
           </motion.div>
        )}

      </AnimatePresence>

      {/* Alight Motion Style Bottom Navigation */}
      {(view === ViewState.FEED || view === ViewState.SEARCH || view === ViewState.PROFILE) && !editMode && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[60px] bg-am-surface border-t border-am-gray flex items-center justify-around z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
           <button onClick={() => setView(ViewState.FEED)} className="flex flex-col items-center gap-1 w-12">
             <Home size={22} className={view === ViewState.FEED ? "text-am-teal" : "text-gray-500"} strokeWidth={view === ViewState.FEED ? 3 : 2} />
             <span className={`text-[10px] font-bold ${view === ViewState.FEED ? "text-am-teal" : "text-gray-500"}`}>Home</span>
           </button>
           
           <button onClick={() => setView(ViewState.SEARCH)} className="flex flex-col items-center gap-1 w-12">
             <Search size={22} className={view === ViewState.SEARCH ? "text-am-teal" : "text-gray-500"} strokeWidth={view === ViewState.SEARCH ? 3 : 2} />
             <span className={`text-[10px] font-bold ${view === ViewState.SEARCH ? "text-am-teal" : "text-gray-500"}`}>Find</span>
           </button>
           
           {/* Center FAB */}
           <button onClick={() => setView(ViewState.ADD_PROJECT)} className="-mt-8 bg-am-teal p-3.5 rounded-2xl shadow-[0_0_15px_rgba(0,210,190,0.4)] hover:scale-105 transition-transform border-4 border-am-bg">
             <Plus size={28} className="text-black" strokeWidth={3} />
           </button>
           
           <button className="flex flex-col items-center gap-1 w-12">
             <Zap size={22} className="text-gray-500" />
             <span className="text-[10px] font-bold text-gray-500">Learn</span>
           </button>
           
           <button onClick={() => {
               setViewedUser(currentUser);
               setView(ViewState.PROFILE);
           }} className="flex flex-col items-center gap-1 w-12">
             <div className={`p-[1px] rounded-full ${view === ViewState.PROFILE && viewedUser?.uid === currentUser.uid ? "border border-am-teal" : "border border-transparent"}`}>
                <img src={currentUser.photoURL || "https://via.placeholder.com/24"} className="w-5 h-5 rounded-full" />
             </div>
             <span className={`text-[10px] font-bold ${view === ViewState.PROFILE && viewedUser?.uid === currentUser.uid ? "text-am-teal" : "text-gray-500"}`}>Me</span>
           </button>
        </div>
      )}
    </div>
  );
}