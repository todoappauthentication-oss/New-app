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
  MoreHorizontal,
  Bookmark,
  X,
  Check,
  Upload,
  Globe,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Edit2
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
          <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm">
            <Play size={32} fill="white" className="text-white ml-1" />
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
            <Heart size={80} fill="white" className="text-white drop-shadow-lg" />
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black text-white">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center mt-10">
          <h1 className="text-4xl font-bold font-serif italic mb-2">AlightGram</h1>
        </div>

        <div className="space-y-3">
          {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error}</div>}
          
          <div className="space-y-2">
            {isSignUp && (
              <input 
                className="w-full bg-[#121212] border border-[#333] p-3 rounded text-white text-sm focus:border-gray-500 outline-none" 
                placeholder="Username" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
              />
            )}
            <input 
              className="w-full bg-[#121212] border border-[#333] p-3 rounded text-white text-sm focus:border-gray-500 outline-none" 
              placeholder="Email" 
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input 
              className="w-full bg-[#121212] border border-[#333] p-3 rounded text-white text-sm focus:border-gray-500 outline-none" 
              placeholder="Password" 
              type="password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button onClick={handleEmailAuth} className="w-full bg-[#0095F6] text-white font-semibold py-2 rounded hover:bg-[#1877F2] transition-colors text-sm">
            {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5"/> : (isSignUp ? "Sign Up" : "Log In")}
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-[#333]"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold">OR</span>
            <div className="flex-grow border-t border-[#333]"></div>
          </div>

          <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-2 text-[#0095F6] font-semibold text-sm hover:text-white transition-colors">
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            {isSignUp ? "Have an account?" : "Don't have an account?"} 
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#0095F6] ml-1 font-semibold">
              {isSignUp ? "Log In" : "Sign Up"}
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
    <div className="mb-6 border-b border-[#333] pb-4">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onUserClick(project.userId)}>
          <img src={project.authorPhoto || "https://via.placeholder.com/32"} className="w-8 h-8 rounded-full object-cover" />
          <span className="font-semibold text-sm">{project.authorName}</span>
        </div>
        <div className="flex gap-2 relative">
           {!project.isPublic && <Lock size={14} className="text-gray-500 self-center" />}
           <button onClick={() => setShowOptions(!showOptions)}>
             <MoreHorizontal size={20} className="text-white" />
           </button>
           
           {/* Action Menu */}
           {showOptions && isOwner && (
              <div className="absolute top-8 right-0 bg-[#262626] border border-[#333] rounded shadow-lg z-10 w-32 py-1">
                 <button onClick={() => { setShowOptions(false); onEdit(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#333] flex items-center gap-2">
                    <Edit2 size={14}/> Edit
                 </button>
                 <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#333] flex items-center gap-2">
                    <X size={14}/> Delete
                 </button>
              </div>
           )}
        </div>
      </div>

      {/* Media */}
      <div className="w-full aspect-square bg-[#121212] relative overflow-hidden">
        {project.videoUrl ? (
          <CustomVideoPlayer src={project.videoUrl} onDoubleTap={handleLike} />
        ) : (
          <div className="w-full h-full flex items-center justify-center cursor-pointer" onClick={onOpen}>
            <FileCode size={48} className="text-gray-600" />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-3 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => { setLiked(!liked); onLike(); }}>
            <Heart size={24} className={liked || project.likes > 0 ? "fill-red-500 text-red-500" : "text-white hover:text-gray-400"} />
          </button>
          <button onClick={onOpen}>
            <MessageCircle size={24} className="text-white hover:text-gray-400 -rotate-90" />
          </button>
          <Send size={24} className="text-white hover:text-gray-400" />
        </div>
        
        <div className="flex gap-4">
           {(project.isPublic || isOwner) && (
             <button onClick={() => navigator.clipboard.writeText(project.xmlContent)} className="text-xs font-mono border border-gray-600 rounded px-2 py-1 hover:bg-white hover:text-black transition-colors">
                Copy XML
             </button>
           )}
           <Bookmark size={24} className="text-white hover:text-gray-400" />
        </div>
      </div>

      {/* Likes & Caption */}
      <div className="px-3 py-1 space-y-1">
        <p className="font-semibold text-sm">{project.likes + (liked ? 1 : 0)} likes</p>
        <p className="text-sm">
          <span className="font-semibold mr-2 cursor-pointer" onClick={() => onUserClick(project.userId)}>{project.authorName}</span>
          {project.title}
          {project.tags?.map(t => <span key={t} className="text-blue-400 ml-1">#{t.replace('#','')}</span>)}
        </p>
        <p className="text-xs text-gray-500 uppercase mt-1">
          {new Date(project.createdAt).toLocaleDateString()}
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
    // PASS currentUser.uid to handle permissions properly!
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
        alert("Failed to upload image. Please try again.");
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
    } catch(e) {
      console.error("Follow toggle failed:", e);
      alert("Action failed. Please check Firebase Console Rules (see FIREBASE_RULES.md).");
    }
  };

  return (
    <div className="bg-black min-h-screen pb-20">
      <div className="h-12 border-b border-[#333] flex justify-between items-center px-4 sticky top-0 bg-black z-10">
        <div className="flex items-center gap-1 font-bold text-lg">
          <Lock size={14} /> {targetUser.displayName}
        </div>
        {isOwnProfile && (
           <div className="flex gap-4">
             <PlusSquare size={24} />
             <button onClick={onLogout}><LogOut size={24} /></button>
           </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
             <img src={targetUser.photoURL || "https://via.placeholder.com/80"} className="w-20 h-20 rounded-full object-cover border border-[#333]" />
             {isOwnProfile && (
                <button onClick={() => setIsEditing(!isEditing)} className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-black text-white">
                    <Plus size={12} />
                </button>
             )}
          </div>
          
          <div className="flex flex-1 justify-around text-center">
            <div>
              <div className="font-bold text-lg">{projects.length}</div>
              <div className="text-sm">Posts</div>
            </div>
            <div>
              <div className="font-bold text-lg">{targetUser.followers || 0}</div>
              <div className="text-sm">Followers</div>
            </div>
            <div>
              <div className="font-bold text-lg">{targetUser.following || 0}</div>
              <div className="text-sm">Following</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="font-bold">{targetUser.displayName}</div>
          <div className="text-sm whitespace-pre-wrap">{targetUser.bio || "Digital Creator | Alight Motion Editor"}</div>
        </div>

        {/* Action Buttons */}
        {isOwnProfile ? (
            isEditing ? (
               <div className="flex gap-2 mb-4 items-center">
                 <input type="file" onChange={e => e.target.files && setNewPhoto(e.target.files[0])} className="text-xs flex-1 text-gray-500" />
                 <button onClick={handleUpdatePic} disabled={uploading} className="bg-blue-500 text-white px-4 py-1 rounded text-sm font-semibold">
                    {uploading ? "Uploading..." : "Save"}
                 </button>
               </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="w-full bg-[#121212] py-1.5 rounded text-sm font-semibold border border-[#333] mb-6">
                Edit profile
              </button>
            )
        ) : (
            <div className="flex gap-2 mb-6">
                <button 
                  onClick={handleFollowToggle}
                  className={`flex-1 py-1.5 rounded text-sm font-semibold ${isFollowing ? 'bg-[#121212] border border-[#333] text-white' : 'bg-blue-500 text-white'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button 
                  onClick={() => onMessage(targetUser.uid, targetUser.displayName)}
                  className="flex-1 bg-[#121212] py-1.5 rounded text-sm font-semibold border border-[#333]"
                >
                  Message
                </button>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-[#333]">
           <button className="flex-1 py-3 border-b border-white flex justify-center"><div className="w-6 h-6 border border-white grid grid-cols-3 gap-[1px] p-[2px]"><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/><div className="bg-white"/></div></button>
           <button className="flex-1 py-3 flex justify-center text-gray-500"><div className="w-6 h-6 border border-gray-500 rounded flex items-center justify-center"><UserIcon size={14}/></div></button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-0.5">
          {projects.map(p => (
            <div key={p.id} onClick={() => onOpenProject(p)} className="aspect-square bg-[#121212] relative cursor-pointer overflow-hidden">
              {p.videoUrl ? <video src={p.videoUrl} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center"><FileCode className="text-gray-700"/></div>}
              {!p.isPublic && <div className="absolute top-1 right-1 bg-black/50 p-1 rounded-full"><Lock size={12}/></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Chat Room, Chat List ---
const ChatListView: React.FC<{ currentUser: UserProfile, onChatSelect: (uid: string, name: string) => void }> = ({ currentUser, onChatSelect }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Get Users
    getAllUsers().then(all => setUsers(all.filter(u => u.uid !== currentUser.uid)));

    // 2. Subscribe to Online Status of ALL users (simplification for this scale)
    const statusRef = ref(rdb, 'status');
    const listener = onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const statusMap: Record<string, boolean> = {};
            Object.keys(data).forEach(uid => {
                statusMap[uid] = data[uid].state === 'online';
            });
            setOnlineStatus(statusMap);
        }
    });

    return () => off(statusRef);
  }, [currentUser]);

  return (
    <div className="p-4 space-y-4">
      {/* Real Users */}
      {users.map(u => (
        <div key={u.uid} onClick={() => onChatSelect(u.uid, u.displayName)} className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
              <img src={u.photoURL || "https://via.placeholder.com/50"} className="w-12 h-12 rounded-full bg-gray-800 object-cover" />
              {onlineStatus[u.uid] && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />
              )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{u.displayName}</h3>
            <p className={`text-xs ${onlineStatus[u.uid] ? 'text-green-500 font-semibold' : 'text-gray-500'}`}>
                {onlineStatus[u.uid] ? 'Active now' : 'Offline'}
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
    
    try {
      await sendMessage(chatId, currentUser.uid, text);
    } catch (e) {
      console.error("Send failed", e);
      alert("Failed to send message. Please check your connection.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="h-12 flex items-center px-4 border-b border-[#333]">
        <button onClick={onBack}><ArrowLeft className="mr-4"/></button>
        <span className="font-bold flex items-center gap-2">
           {targetName}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(m => {
          const isMe = m.senderId === currentUser.uid;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#3797F0] text-white' : 'bg-[#262626] text-white'}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-black flex gap-2">
        <input 
          className="flex-1 bg-[#262626] rounded-full px-4 py-2 outline-none text-sm text-white"
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="text-[#3797F0] font-semibold text-sm p-2">Send</button>
      </div>
    </div>
  );
};

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
    reader.onload = (ev) => {
      if(ev.target?.result) setXml(ev.target.result as string);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!title || !xml) return alert("Title and XML required");
    setLoading(true);
    let vUrl = '';
    if (videoFile) {
      vUrl = await uploadToCloudinary(videoFile, 'My smallest server');
    }

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
    <div className="space-y-4">
      <div className="flex gap-4">
         <div className="w-24 h-24 bg-[#262626] flex items-center justify-center cursor-pointer relative" onClick={() => document.getElementById('v-upload')?.click()}>
            {videoFile ? <video src={URL.createObjectURL(videoFile)} className="w-full h-full object-cover"/> : <Plus/>}
            <input type="file" id="v-upload" className="hidden" accept="video/*" onChange={e => e.target.files && setVideoFile(e.target.files[0])} />
         </div>
         <div className="flex-1 space-y-2">
            <input className="w-full bg-transparent border-b border-[#333] p-2 outline-none" placeholder="Write a caption / title..." value={title} onChange={e => setTitle(e.target.value)} />
            <div className="flex gap-2">
               <button onClick={handleGenTags} className="text-xs text-blue-500">Auto Tags</button>
               {tags.map(t => <span key={t} className="text-xs text-gray-500">{t}</span>)}
            </div>
         </div>
      </div>
      
      <div>
         <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Project XML</span>
            <label className="text-xs bg-[#262626] border border-[#333] px-2 py-1 rounded cursor-pointer hover:bg-[#333]">
               <Upload size={12} className="inline mr-1" /> Upload .xml
               <input type="file" accept=".xml" className="hidden" onChange={handleXmlFileUpload} />
            </label>
         </div>
         <textarea className="w-full h-32 bg-[#262626] p-2 rounded text-xs font-mono" placeholder="Paste XML Code here..." value={xml} onChange={e => setXml(e.target.value)} />
      </div>

      <div className="flex justify-between items-center text-sm p-3 border-y border-[#333]">
         <div className="flex items-center gap-2">
            {isPublic ? <Globe size={18} /> : <Lock size={18} />}
            <span>{isPublic ? "Public Project" : "Private Project"}</span>
         </div>
         <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-blue-500' : 'bg-gray-600'}`} onClick={() => setIsPublic(!isPublic)}>
            <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${isPublic ? 'translate-x-4' : ''}`} />
         </div>
      </div>

      <button onClick={handleSave} className="w-full text-blue-500 font-bold py-2">{loading ? "Sharing..." : "Share"}</button>
    </div>
  );
};

const EditProjectView: React.FC<{ project: Project, onCancel: () => void, onSuccess: () => void }> = ({ project, onCancel, onSuccess }) => {
  const [title, setTitle] = useState(project.title);
  const [xml, setXml] = useState(project.xmlContent);
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await updateProject(project.id, {
      title,
      xmlContent: xml,
      isPublic
    });
    setLoading(false);
    onSuccess();
  };

  const handleXmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if(ev.target?.result) setXml(ev.target.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between mb-4">
         <h2 className="font-bold text-lg">Edit Info</h2>
         <button onClick={onCancel}><X/></button>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Title</label>
        <input className="w-full bg-[#262626] border border-[#333] p-2 rounded text-white" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
         <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">XML Content</span>
            <label className="text-xs bg-[#262626] border border-[#333] px-2 py-1 rounded cursor-pointer hover:bg-[#333]">
               <Upload size={12} className="inline mr-1" /> Replace .xml
               <input type="file" accept=".xml" className="hidden" onChange={handleXmlFileUpload} />
            </label>
         </div>
         <textarea className="w-full h-32 bg-[#262626] p-2 rounded text-xs font-mono" value={xml} onChange={e => setXml(e.target.value)} />
      </div>

      <div className="flex justify-between items-center text-sm p-3 border-y border-[#333]">
         <div className="flex items-center gap-2">
            {isPublic ? <Globe size={18} /> : <Lock size={18} />}
            <span>{isPublic ? "Public" : "Private"}</span>
         </div>
         <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-blue-500' : 'bg-gray-600'}`} onClick={() => setIsPublic(!isPublic)}>
            <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${isPublic ? 'translate-x-4' : ''}`} />
         </div>
      </div>

      <button onClick={handleSave} className="w-full bg-blue-500 text-white font-bold py-2 rounded">{loading ? "Saving..." : "Save Changes"}</button>
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
    <div className="bg-black min-h-screen pb-20">
       <div className="h-12 flex items-center px-4 border-b border-[#333] sticky top-0 bg-black z-20">
         <button onClick={onBack}><ArrowLeft className="mr-4"/></button>
         <span className="font-bold text-sm uppercase">Posts</span>
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
         <h3 className="font-bold mb-4">Comments</h3>
         <div className="space-y-4 mb-20">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                 <img src={c.userPhoto || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full" />
                 <div>
                    <p className="text-sm"><span className="font-semibold mr-2">{c.userName}</span>{c.text}</p>
                 </div>
              </div>
            ))}
         </div>
       </div>
       <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#333] p-3 flex gap-2 max-w-md mx-auto">
          <img src={currentUser.photoURL || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={`Add a comment as ${currentUser.displayName}...`} value={newComment} onChange={e => setNewComment(e.target.value)} />
          <button onClick={handleSendComment} className="text-blue-500 text-sm font-semibold">Post</button>
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
    <div className="pb-16 pt-2">
       <div className="px-4 mb-2">
         <div className="bg-[#262626] rounded-lg p-2 flex items-center gap-2 text-gray-400">
           <Search size={16} /> 
           <input 
             className="bg-transparent outline-none text-sm flex-1 text-white" 
             placeholder="Search" 
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
         </div>
       </div>

       {/* Tabs */}
       <div className="flex border-b border-[#333] mb-2 px-4 gap-6">
          <button 
            className={`py-2 text-sm font-semibold ${tab === 'projects' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}
            onClick={() => setTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`py-2 text-sm font-semibold ${tab === 'people' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}
            onClick={() => setTab('people')}
          >
            People
          </button>
       </div>

       {tab === 'projects' ? (
         <div className="grid grid-cols-3 gap-0.5">
           {filteredProjects.map(p => (
             <div key={p.id} onClick={() => onProjectSelect(p)} className="aspect-[4/5] bg-[#121212] relative cursor-pointer">
               {p.videoUrl ? <video src={p.videoUrl} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center"><FileCode className="text-gray-700"/></div>}
             </div>
           ))}
         </div>
       ) : (
         <div className="px-4 space-y-4 mt-4">
           {filteredUsers.map(u => (
             <div key={u.uid} onClick={() => onUserSelect(u.uid)} className="flex items-center gap-3 cursor-pointer">
               <img src={u.photoURL || "https://via.placeholder.com/50"} className="w-12 h-12 rounded-full bg-gray-800 object-cover" />
               <div>
                 <h3 className="font-semibold text-sm">{u.displayName}</h3>
                 <p className="text-xs text-gray-500">{u.followers || 0} followers</p>
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
  
  // Navigation State
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [editMode, setEditMode] = useState(false); // New state for editing
  
  // Content State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [chatTarget, setChatTarget] = useState<{uid: string, name: string} | null>(null);
  
  // "Viewed User" State (for visiting other profiles)
  const [viewedUser, setViewedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    const projs = await getFeedProjects();
    setProjects(projs);
  };

  // Data Fetching
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Fetch full profile from Firestore to get the correct photoURL (Cloudinary)
        let profile = await getUserProfile(fbUser.uid);
        
        if (!profile) {
            // New user, create basic profile
            profile = { 
                uid: fbUser.uid, 
                displayName: fbUser.displayName || 'User', 
                email: fbUser.email || '', 
                photoURL: fbUser.photoURL || '' 
            };
        }
        
        // Use the profile from DB, not just fbUser which might have stale/empty photo
        setCurrentUser(profile);
        setViewedUser(profile); 
        setView(ViewState.FEED);
        
        // Initialize Realtime Presence
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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#00D2BE]"/></div>;

  if (!currentUser || view === ViewState.AUTH) {
    return <AuthView onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto border-x border-[#333] relative">
      <AnimatePresence mode="wait">
        
        {view === ViewState.FEED && !editMode && (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="h-12 flex justify-between items-center px-4 sticky top-0 bg-black z-20 border-b border-[#333]">
              <h1 className="text-2xl font-serif italic tracking-wide">AlightGram</h1>
              <div className="flex gap-4">
                <Heart size={24} />
                <button onClick={() => setView(ViewState.CHAT_LIST)}>
                  <MessageCircle size={24} className="-rotate-12" />
                </button>
              </div>
            </div>

            <div className="pb-16 mt-4">
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
           <motion.div key="edit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 bg-black z-50 overflow-y-auto">
              <EditProjectView 
                 project={activeProject} 
                 onCancel={() => { setEditMode(false); setActiveProject(null); }} 
                 onSuccess={() => { setEditMode(false); setActiveProject(null); fetchFeed(); }} 
              />
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
           <div className="p-4">
             <div className="flex justify-between mb-4">
                <h2 className="font-bold text-lg">New Post</h2>
                <button onClick={() => setView(ViewState.FEED)}><X/></button>
             </div>
             <div className="h-[80vh] overflow-y-auto">
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
           <motion.div key="chatlist" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-0 bg-black z-30">
               <div className="h-12 flex items-center px-4 border-b border-[#333]">
                 <button onClick={() => setView(ViewState.FEED)}><ArrowLeft className="mr-4"/></button>
                 <span className="font-bold">{currentUser.displayName}</span>
               </div>
               <ChatListView currentUser={currentUser} onChatSelect={(uid, name) => { setChatTarget({uid, name}); setView(ViewState.CHAT_ROOM); }} />
           </motion.div>
        )}

        {view === ViewState.CHAT_ROOM && chatTarget && (
           <motion.div key="chatroom" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-0 bg-black z-40">
               <ChatRoomView currentUser={currentUser} targetUid={chatTarget.uid} targetName={chatTarget.name} onBack={() => setView(ViewState.CHAT_LIST)} />
           </motion.div>
        )}
        
        {view === ViewState.PROJECT_DETAILS && activeProject && !editMode && (
           <motion.div key="details" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.2, ease: "easeInOut" }} className="fixed inset-0 bg-black z-30 overflow-y-auto">
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

      {(view === ViewState.FEED || view === ViewState.SEARCH || view === ViewState.PROFILE) && !editMode && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-12 bg-black border-t border-[#333] flex items-center justify-around z-50">
           <button onClick={() => setView(ViewState.FEED)} className={view === ViewState.FEED ? "text-white" : "text-gray-500"}>
             <Home size={26} strokeWidth={view === ViewState.FEED ? 3 : 2} />
           </button>
           <button onClick={() => setView(ViewState.SEARCH)} className={view === ViewState.SEARCH ? "text-white" : "text-gray-500"}>
             <Search size={26} strokeWidth={view === ViewState.SEARCH ? 3 : 2} />
           </button>
           <button onClick={() => setView(ViewState.ADD_PROJECT)} className="text-white">
             <PlusSquare size={26} />
           </button>
           <button className="text-gray-500">
             <Video size={26} />
           </button>
           <button onClick={() => {
               setViewedUser(currentUser);
               setView(ViewState.PROFILE);
           }}>
             <img src={currentUser.photoURL || "https://via.placeholder.com/24"} className={`w-6 h-6 rounded-full border-2 ${view === ViewState.PROFILE && viewedUser?.uid === currentUser.uid ? "border-white" : "border-transparent"}`} />
           </button>
        </div>
      )}
    </div>
  );
}