import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  ArrowLeft, 
  Copy, 
  FileCode, 
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
  MoreVertical,
  Bookmark,
  X,
  Upload,
  Globe,
  Play,
  Volume2,
  VolumeX,
  Edit2,
  Zap, 
  Layers,
  ChevronRight
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

// --- Animations ---
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const slideUpVariants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { y: "100%", transition: { duration: 0.3, ease: "anticipate" } }
};

const slideRightVariants = {
  initial: { x: "100%" },
  animate: { x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { x: "100%", transition: { duration: 0.3 } }
};

const scaleTap = { scale: 0.95 };

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
      className="w-full h-full relative bg-black cursor-pointer group rounded-lg overflow-hidden"
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-am-surface/80 p-4 rounded-full backdrop-blur-md border border-am-teal/20 shadow-lg"
          >
            <Play size={28} className="text-am-teal ml-1" fill="currentColor" />
          </motion.div>
        </div>
      )}

      {/* Heart Animation Overlay */}
      <AnimatePresence>
        {showHeart && (
          <motion.div 
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart size={80} fill="#00D2BE" className="text-am-teal drop-shadow-[0_0_15px_rgba(0,210,190,0.6)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Control */}
      <motion.button 
        whileTap={scaleTap}
        onClick={toggleMute}
        className="absolute bottom-3 right-3 bg-black/40 p-2 rounded-full text-white backdrop-blur-md border border-white/10"
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </motion.button>
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-am-bg text-white relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-am-teal/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        <div className="text-center mt-6">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="w-24 h-24 bg-gradient-to-tr from-[#1E1E1E] to-[#252525] rounded-3xl mx-auto mb-6 flex items-center justify-center border border-am-teal/30 shadow-glow"
          >
             <div className="w-12 h-12 border-[5px] border-am-teal rounded-tr-xl rounded-bl-xl rotate-45 shadow-[0_0_10px_rgba(0,210,190,0.5)]"></div>
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter">Alight<span className="text-am-teal">Gram</span></h1>
          <p className="text-am-subtext text-sm mt-2 font-medium tracking-wide">Motion Creative Community</p>
        </div>

        <motion.div 
          className="space-y-4 bg-am-surface/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {error && <div className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}
          
          <div className="space-y-3">
            <AnimatePresence>
            {isSignUp && (
              <motion.input 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full bg-black/40 border border-am-gray p-4 rounded-xl text-white text-sm focus:border-am-teal focus:ring-1 focus:ring-am-teal/50 outline-none transition-all" 
                placeholder="Username" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
              />
            )}
            </AnimatePresence>
            <input 
              className="w-full bg-black/40 border border-am-gray p-4 rounded-xl text-white text-sm focus:border-am-teal focus:ring-1 focus:ring-am-teal/50 outline-none transition-all" 
              placeholder="Email" 
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input 
              className="w-full bg-black/40 border border-am-gray p-4 rounded-xl text-white text-sm focus:border-am-teal focus:ring-1 focus:ring-am-teal/50 outline-none transition-all" 
              placeholder="Password" 
              type="password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <motion.button 
            whileTap={scaleTap}
            onClick={handleEmailAuth} 
            className="w-full bg-am-teal text-black font-bold py-4 rounded-xl hover:bg-am-tealDark transition-colors text-sm shadow-glow-sm flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5"/> : (isSignUp ? "Create Account" : "Sign In")}
          </motion.button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-am-gray"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] font-bold uppercase tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-am-gray"></div>
          </div>

          <motion.button 
            whileTap={scaleTap}
            onClick={handleGoogle} 
            className="w-full bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-white font-medium py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            <GoogleIcon /> <span className="text-sm">Google</span>
          </motion.button>
        </motion.div>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            {isSignUp ? "Already have an account?" : "New to AlightGram?"} 
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-am-teal ml-1.5 font-bold hover:underline">
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className="mb-6 bg-am-surface rounded-2xl border border-white/5 overflow-hidden shadow-md mx-2"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(project.userId)}>
          <div className="p-[1px] rounded-full bg-gradient-to-tr from-am-teal to-transparent">
             <img src={project.authorPhoto || "https://via.placeholder.com/32"} className="w-9 h-9 rounded-full object-cover border border-black bg-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight text-white">{project.authorName}</span>
            <span className="text-[10px] text-gray-400 font-medium">XML Creator</span>
          </div>
        </div>
        <div className="flex gap-2 relative">
           {!project.isPublic && <Lock size={14} className="text-gray-500 self-center" />}
           <button onClick={() => setShowOptions(!showOptions)} className="p-2 text-gray-400 hover:text-white transition-colors">
             <MoreVertical size={18} />
           </button>
           
           {/* Action Menu */}
           <AnimatePresence>
           {showOptions && isOwner && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-10 right-0 bg-[#252525] border border-am-gray rounded-xl shadow-2xl z-20 w-36 py-1 overflow-hidden origin-top-right"
              >
                 <button onClick={() => { setShowOptions(false); onEdit(); }} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-2 text-gray-200">
                    <Edit2 size={14} /> Edit
                 </button>
                 <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/5">
                    <X size={14}/> Delete
                 </button>
              </motion.div>
           )}
           </AnimatePresence>
        </div>
      </div>

      {/* Media */}
      <div className="w-full aspect-square bg-[#0a0a0a] relative overflow-hidden group">
        {project.videoUrl ? (
          <CustomVideoPlayer src={project.videoUrl} onDoubleTap={handleLike} />
        ) : (
          <div className="w-full h-full flex items-center justify-center cursor-pointer bg-gradient-to-br from-[#151515] to-[#0a0a0a]" onClick={onOpen}>
            <motion.div 
               whileHover={{ scale: 1.05 }}
               className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm"
            >
                <FileCode size={40} className="text-am-teal opacity-80" />
                <span className="text-xs text-gray-400 font-mono tracking-widest border border-am-teal/20 px-2 py-0.5 rounded text-am-teal/80">XML PRESET</span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-3 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <motion.button 
            whileTap={{ scale: 0.8 }} 
            onClick={() => { setLiked(!liked); onLike(); }}
            className="focus:outline-none"
          >
            <Heart size={26} className={liked || project.likes > 0 ? "fill-am-teal text-am-teal drop-shadow-[0_0_8px_rgba(0,210,190,0.5)]" : "text-white hover:text-am-teal transition-colors"} strokeWidth={1.5} />
          </motion.button>
          <motion.button whileTap={scaleTap} onClick={onOpen}>
            <MessageCircle size={26} className="text-white hover:text-am-teal transition-colors -rotate-90" strokeWidth={1.5} />
          </motion.button>
          <motion.button whileTap={scaleTap}>
            <Send size={26} className="text-white hover:text-am-teal transition-colors" strokeWidth={1.5} />
          </motion.button>
        </div>
        
        <div className="flex gap-4">
           {(project.isPublic || isOwner) && (
             <motion.button 
                whileTap={scaleTap}
                onClick={() => navigator.clipboard.writeText(project.xmlContent)} 
                className="text-[10px] font-bold text-black bg-am-teal rounded px-3 py-1.5 hover:bg-am-tealDark transition-colors flex items-center gap-1 shadow-glow-sm"
             >
                <Copy size={12}/> COPY XML
             </motion.button>
           )}
        </div>
      </div>

      {/* Likes & Caption */}
      <div className="px-4 py-3 space-y-1.5 pb-4">
        <p className="font-bold text-sm text-white tracking-wide">{project.likes + (liked ? 1 : 0)} likes</p>
        <div className="text-sm text-gray-300 leading-snug">
          <span className="font-bold mr-2 text-white cursor-pointer hover:underline" onClick={() => onUserClick(project.userId)}>{project.authorName}</span>
          {project.title}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
            {project.tags?.map(t => (
              <span key={t} className="text-[10px] text-am-teal bg-am-teal/10 px-2 py-0.5 rounded font-medium border border-am-teal/20">
                #{t.replace('#','')}
              </span>
            ))}
          </div>
        <p onClick={onOpen} className="text-xs text-gray-500 cursor-pointer pt-1 hover:text-gray-400">View all comments</p>
        <p className="text-[10px] text-gray-600 uppercase font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
      </div>
    </motion.div>
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
      <div className="h-14 border-b border-white/5 flex justify-between items-center px-4 sticky top-0 bg-am-bg/80 backdrop-blur-md z-20">
        <div className="font-bold text-lg flex items-center gap-2">
          {targetUser.displayName} 
          {isOwnProfile && <div className="w-1.5 h-1.5 rounded-full bg-am-teal shadow-glow" />}
        </div>
        {isOwnProfile && (
           <div className="flex gap-4 items-center">
             <button onClick={onLogout}><LogOut size={20} className="text-gray-400 hover:text-red-400 transition-colors" /></button>
           </div>
        )}
      </div>

      <motion.div 
        variants={pageVariants}
        initial="initial" animate="animate" exit="exit"
        className="p-5"
      >
        <div className="flex items-center gap-6 mb-6">
          <div className="relative group">
             <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-am-teal to-transparent shadow-glow-sm">
               <img src={targetUser.photoURL || "https://via.placeholder.com/80"} className="w-full h-full rounded-full object-cover border-2 border-am-bg" />
             </div>
             {isOwnProfile && (
                <motion.button whileTap={scaleTap} onClick={() => setIsEditing(!isEditing)} className="absolute bottom-1 right-1 bg-am-surface text-am-teal rounded-full p-1.5 border border-am-gray shadow-md">
                    <Plus size={16} />
                </motion.button>
             )}
          </div>
          
          <div className="flex flex-1 justify-around text-center">
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white">{projects.length}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Posts</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white">{targetUser.followers || 0}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white">{targetUser.following || 0}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Following</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-lg text-white flex items-center gap-1">{targetUser.displayName} 
             <span className="text-am-teal"><Zap size={14} fill="currentColor"/></span>
          </h2>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mt-1 font-light">{targetUser.bio || "Motion Graphics Designer | XML Creator"}</div>
        </div>

        {/* Buttons */}
        {isOwnProfile ? (
            isEditing ? (
               <div className="flex gap-2 mb-6 items-center p-2 bg-am-surface rounded-xl border border-am-gray">
                 <input type="file" onChange={e => e.target.files && setNewPhoto(e.target.files[0])} className="text-xs flex-1 text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-am-teal file:text-black file:font-bold" />
                 <button onClick={handleUpdatePic} disabled={uploading} className="bg-am-teal text-black px-4 py-1.5 rounded-lg text-sm font-bold">
                    {uploading ? <Loader2 className="animate-spin w-4 h-4"/> : "Save"}
                 </button>
               </div>
            ) : (
              <motion.button whileTap={scaleTap} onClick={() => setIsEditing(true)} className="w-full bg-white/5 text-white py-2.5 rounded-lg text-sm font-semibold border border-white/10 hover:bg-white/10 transition-colors mb-6">
                Edit Profile
              </motion.button>
            )
        ) : (
            <div className="flex gap-3 mb-6">
                <motion.button 
                  whileTap={scaleTap}
                  onClick={handleFollowToggle}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${isFollowing ? 'bg-white/5 border border-white/10 text-white' : 'bg-am-teal text-black shadow-glow-sm'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </motion.button>
                <motion.button 
                  whileTap={scaleTap}
                  onClick={() => onMessage(targetUser.uid, targetUser.displayName)}
                  className="flex-1 bg-white/5 py-2.5 rounded-lg text-sm font-semibold border border-white/10 text-white hover:bg-white/10"
                >
                  Message
                </motion.button>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-white/10 mb-0.5">
           <button className="flex-1 py-3 border-b-2 border-white flex justify-center text-white"><Layers size={20}/></button>
           <button className="flex-1 py-3 flex justify-center text-gray-600 hover:text-gray-400 transition-colors"><Bookmark size={20}/></button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-0.5">
          {projects.map((p, i) => (
            <motion.div 
               key={p.id} 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
               onClick={() => onOpenProject(p)} 
               className="aspect-square bg-am-surface relative cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
            >
              {p.videoUrl ? <video src={p.videoUrl} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center bg-[#111]"><FileCode className="text-am-teal opacity-50"/></div>}
              {!p.isPublic && <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full backdrop-blur-sm"><Lock size={10} className="text-white"/></div>}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// --- Chat View Components ---
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
    <div className="p-4 space-y-3">
      {users.map((u, i) => (
        <motion.div 
           key={u.uid} 
           initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
           onClick={() => onChatSelect(u.uid, u.displayName)} 
           className="flex items-center gap-4 cursor-pointer p-3 bg-am-surface hover:bg-white/5 rounded-2xl border border-white/5 transition-colors"
        >
          <div className="relative">
              <img src={u.photoURL || "https://via.placeholder.com/50"} className="w-12 h-12 rounded-full bg-black object-cover border border-white/10" />
              {onlineStatus[u.uid] && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-am-teal border-2 border-am-surface rounded-full shadow-glow-sm" />
              )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-white">{u.displayName}</h3>
            <p className={`text-xs ${onlineStatus[u.uid] ? 'text-am-teal font-medium' : 'text-gray-500'}`}>
                {onlineStatus[u.uid] ? 'Online' : 'Offline'}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-600" />
        </motion.div>
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
      <div className="h-16 flex items-center px-4 border-b border-white/5 bg-am-surface/90 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowLeft className="text-white" size={20}/></button>
        <div className="ml-2 font-bold flex flex-col">
           <span className="text-sm text-white">{targetName}</span>
           <span className="text-[10px] text-am-teal">Active now</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080808]">
        {messages.map((m, i) => {
          const isMe = m.senderId === currentUser.uid;
          return (
            <motion.div 
               key={m.id} 
               initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
               className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-am-teal text-black font-semibold rounded-br-none' : 'bg-am-surface text-white border border-white/10 rounded-bl-none'}`}>
                {m.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 bg-am-surface flex gap-3 border-t border-white/5 items-center pb-6">
        <input 
          className="flex-1 bg-black/40 rounded-full px-5 py-3 outline-none text-sm text-white border border-white/10 focus:border-am-teal/50 transition-colors placeholder-gray-600"
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <motion.button whileTap={scaleTap} onClick={handleSend} className="bg-am-teal text-black rounded-full p-3 font-bold shadow-glow-sm">
            <Send size={18} />
        </motion.button>
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
         <motion.div 
            whileTap={scaleTap}
            className="w-28 h-36 bg-am-surface border border-white/10 rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden group shadow-lg" 
            onClick={() => document.getElementById('v-upload')?.click()}
         >
            {videoFile ? <video src={URL.createObjectURL(videoFile)} className="w-full h-full object-cover"/> : (
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-am-teal/20 p-3 rounded-full text-am-teal"><Plus size={24}/></div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Preview</span>
                </div>
            )}
            <input type="file" id="v-upload" className="hidden" accept="video/*" onChange={e => e.target.files && setVideoFile(e.target.files[0])} />
         </motion.div>
         <div className="flex-1 space-y-4 pt-2">
            <input className="w-full bg-transparent border-b border-am-gray p-2 outline-none text-white font-bold text-lg focus:border-am-teal transition-colors placeholder-gray-600" placeholder="Project Name..." value={title} onChange={e => setTitle(e.target.value)} />
            <div className="flex gap-2 flex-wrap">
               <motion.button whileTap={scaleTap} onClick={handleGenTags} className="text-[10px] bg-am-teal text-black px-2 py-1 rounded font-bold hover:bg-am-tealDark">Auto Tags ✨</motion.button>
               {tags.map(t => <span key={t} className="text-[10px] text-gray-300 bg-white/5 border border-white/10 px-2 py-1 rounded">{t}</span>)}
            </div>
         </div>
      </div>
      
      <div className="bg-[#0a0a0a] p-3 rounded-xl border border-white/10 shadow-inner">
         <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">XML Configuration</span>
            <label className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 text-am-teal font-bold flex items-center gap-1 transition-colors">
               <Upload size={10} /> Import .xml
               <input type="file" accept=".xml" className="hidden" onChange={handleXmlFileUpload} />
            </label>
         </div>
         <textarea className="w-full h-48 bg-transparent p-2 rounded text-[10px] font-mono text-am-teal/80 outline-none xml-scroll resize-none" placeholder="<data>...</data>" value={xml} onChange={e => setXml(e.target.value)} />
      </div>

      <div className="flex justify-between items-center text-sm p-4 bg-am-surface rounded-xl border border-white/5">
         <div className="flex items-center gap-3 font-medium text-gray-300">
            {isPublic ? <Globe size={18} className="text-am-teal" /> : <Lock size={18} className="text-gray-500" />}
            <span>{isPublic ? "Public Project" : "Private Project"}</span>
         </div>
         <div className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-am-teal' : 'bg-gray-800'}`} onClick={() => setIsPublic(!isPublic)}>
            <motion.div 
               layout 
               className="w-5 h-5 bg-white rounded-full shadow-md" 
               animate={{ x: isPublic ? 20 : 0 }}
            />
         </div>
      </div>

      <motion.button 
        whileTap={scaleTap}
        onClick={handleSave} 
        className="w-full bg-am-teal text-black font-bold py-4 rounded-xl shadow-glow hover:bg-am-tealDark transition-colors flex items-center justify-center gap-2 text-sm"
      >
          {loading ? <Loader2 className="animate-spin" /> : "Publish Project"}
      </motion.button>
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
    <div className="p-6 space-y-6 bg-am-surface h-full">
      <div className="flex justify-between mb-4 items-center">
         <h2 className="font-bold text-lg text-white">Edit Info</h2>
         <button onClick={onCancel} className="p-1 rounded-full bg-white/5"><X size={18} className="text-gray-400"/></button>
      </div>
      
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Project Title</label>
        <input className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white focus:border-am-teal outline-none transition-colors" value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
         <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">XML Data</label>
            <label className="text-[10px] text-am-teal cursor-pointer font-bold hover:underline">Import File <input type="file" accept=".xml" className="hidden" onChange={handleXmlFileUpload} /></label>
         </div>
         <textarea className="w-full h-32 bg-black/40 border border-white/10 p-3 rounded-lg text-[10px] font-mono text-am-teal focus:border-am-teal outline-none" value={xml} onChange={e => setXml(e.target.value)} />
      </div>

      <div className="flex justify-between items-center text-sm p-4 bg-black/20 rounded-xl border border-white/5">
         <div className="flex items-center gap-3">
            {isPublic ? <Globe size={18} className="text-am-teal"/> : <Lock size={18} className="text-gray-400"/>}
            <span className="text-gray-300">{isPublic ? "Public" : "Private"}</span>
         </div>
         <div className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-am-teal' : 'bg-gray-800'}`} onClick={() => setIsPublic(!isPublic)}>
            <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-md" animate={{ x: isPublic ? 20 : 0 }} />
         </div>
      </div>

      <motion.button whileTap={scaleTap} onClick={handleSave} className="w-full bg-am-teal text-black font-bold py-3.5 rounded-xl shadow-glow-sm">{loading ? "Saving..." : "Save Changes"}</motion.button>
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
       <div className="h-14 flex items-center px-4 border-b border-white/5 sticky top-0 bg-am-surface/90 backdrop-blur-md z-20">
         <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="text-white" size={20}/></button>
         <span className="font-bold text-sm uppercase text-white tracking-widest ml-2">Post Details</span>
       </div>
       <div className="pt-2">
           <PostItem 
             project={project} 
             currentUser={currentUser} 
             onOpen={() => {}} 
             onLike={() => likeProject(project.id, 1)} 
             onUserClick={onUserClick} 
             onEdit={onEdit}
           />
       </div>
       <div className="px-4 mt-6">
         <h3 className="font-bold mb-4 text-am-teal text-xs uppercase tracking-widest flex items-center gap-2">Comments <span className="bg-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">{comments.length}</span></h3>
         <div className="space-y-4 mb-20">
            {comments.map((c, i) => (
              <motion.div 
                 key={c.id} 
                 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                 className="flex gap-3 items-start"
              >
                 <img src={c.userPhoto || "https://via.placeholder.com/30"} className="w-8 h-8 rounded-full border border-white/10 mt-1" />
                 <div className="bg-am-surface p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl border border-white/5 flex-1">
                    <p className="text-sm"><span className="font-bold mr-2 text-white block text-xs mb-0.5">{c.userName}</span><span className="text-gray-300 font-light">{c.text}</span></p>
                 </div>
              </motion.div>
            ))}
            {comments.length === 0 && <div className="text-center text-gray-600 text-sm py-8 italic">No comments yet. Be the first!</div>}
         </div>
       </div>
       <div className="fixed bottom-0 left-0 right-0 bg-am-surface border-t border-white/5 p-3 flex gap-3 max-w-md mx-auto z-30 backdrop-blur-md pb-6">
          <img src={currentUser.photoURL || "https://via.placeholder.com/30"} className="w-9 h-9 rounded-full border border-gray-500" />
          <div className="flex-1 relative">
              <input className="w-full bg-black/40 outline-none text-sm px-4 py-2.5 rounded-full border border-white/10 focus:border-am-teal pr-10" placeholder={`Add a comment...`} value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendComment()} />
              <button onClick={handleSendComment} className="absolute right-2 top-1.5 text-am-teal p-1 rounded-full hover:bg-am-teal/10">
                  <Send size={16} />
              </button>
          </div>
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
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="pb-24 pt-2">
       <div className="px-4 mb-4 sticky top-2 z-10">
         <div className="bg-am-surface/90 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 text-gray-400 border border-white/10 shadow-lg">
           <Search size={18} /> 
           <input 
             className="bg-transparent outline-none text-sm flex-1 text-white font-medium placeholder-gray-500" 
             placeholder="Search tags, users, projects..." 
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
           {query && <X size={16} onClick={() => setQuery('')} />}
         </div>
       </div>

       {/* Tabs */}
       <div className="flex border-b border-white/10 mb-4 px-4 gap-8">
          <button 
            className={`py-3 text-sm font-bold uppercase tracking-widest transition-colors relative ${tab === 'projects' ? 'text-am-teal' : 'text-gray-600 hover:text-white'}`}
            onClick={() => setTab('projects')}
          >
            Projects
            {tab === 'projects' && <motion.div layoutId="searchTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-am-teal shadow-glow" />}
          </button>
          <button 
            className={`py-3 text-sm font-bold uppercase tracking-widest transition-colors relative ${tab === 'people' ? 'text-am-teal' : 'text-gray-600 hover:text-white'}`}
            onClick={() => setTab('people')}
          >
            Creators
            {tab === 'people' && <motion.div layoutId="searchTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-am-teal shadow-glow" />}
          </button>
       </div>

       {tab === 'projects' ? (
         <div className="grid grid-cols-2 gap-2 px-2">
           {filteredProjects.map((p, i) => (
             <motion.div 
               key={p.id} 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
               onClick={() => onProjectSelect(p)} 
               className="aspect-[16/9] bg-am-surface relative cursor-pointer rounded-xl overflow-hidden border border-white/10 hover:border-am-teal/50 transition-colors group"
             >
               {p.videoUrl ? (
                   <video src={p.videoUrl} className="w-full h-full object-cover" />
               ) : (
                   <div className="flex h-full flex-col items-center justify-center bg-[#181818]">
                       <FileCode className="text-am-teal mb-2 group-hover:scale-110 transition-transform opacity-70"/>
                       <span className="text-[10px] text-gray-500 font-mono tracking-wider">{p.title.substring(0,10)}..</span>
                   </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-xs font-bold truncate text-white">{p.title}</p>
                  <p className="text-[10px] text-am-teal">@{p.authorName}</p>
               </div>
             </motion.div>
           ))}
         </div>
       ) : (
         <div className="px-4 space-y-3 mt-4">
           {filteredUsers.map((u, i) => (
             <motion.div 
               key={u.uid} 
               initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
               onClick={() => onUserSelect(u.uid)} 
               className="flex items-center gap-3 cursor-pointer bg-am-surface p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
             >
               <img src={u.photoURL || "https://via.placeholder.com/50"} className="w-10 h-10 rounded-full bg-black object-cover border border-white/10" />
               <div>
                 <h3 className="font-bold text-sm text-white">{u.displayName}</h3>
                 <p className="text-xs text-am-teal">{u.followers || 0} followers</p>
               </div>
             </motion.div>
           ))}
         </div>
       )}
    </motion.div>
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
    <div className="min-h-screen bg-am-bg text-white font-sans max-w-md mx-auto border-x border-am-gray/30 relative shadow-2xl overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        
        {view === ViewState.FEED && !editMode && (
          <motion.div 
            key="feed" 
            variants={pageVariants}
            initial="initial" animate="animate" exit="exit"
          >
            <div className="h-14 flex justify-between items-center px-4 sticky top-0 bg-am-bg/80 backdrop-blur-md z-20 border-b border-white/5">
              <h1 className="text-xl font-black italic tracking-tighter text-white select-none cursor-pointer">Alight<span className="text-am-teal drop-shadow-glow-sm">Gram</span></h1>
              <div className="flex gap-5">
                <motion.button whileTap={scaleTap} onClick={() => setView(ViewState.CHAT_LIST)} className="relative">
                  <MessageCircle size={24} className="text-white hover:text-am-teal transition-colors" />
                  {/* Badge example */}
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-am-teal rounded-full border-2 border-am-bg"></span>
                </motion.button>
              </div>
            </div>

            <div className="pb-24 pt-2">
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
           <motion.div 
             key="edit" 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex items-center justify-center p-4 backdrop-blur-sm"
           >
              <motion.div 
                initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
                className="bg-am-surface w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
              >
                <EditProjectView 
                   project={activeProject} 
                   onCancel={() => { setEditMode(false); setActiveProject(null); }} 
                   onSuccess={() => { setEditMode(false); setActiveProject(null); fetchFeed(); }} 
                />
              </motion.div>
           </motion.div>
        )}

        {view === ViewState.SEARCH && (
             <SearchView 
                key="search"
                projects={projects} 
                onProjectSelect={(p) => { setActiveProject(p); setView(ViewState.PROJECT_DETAILS); }}
                onUserSelect={handleUserClick}
             />
        )}

        {view === ViewState.ADD_PROJECT && (
           <motion.div key="addproject" variants={slideUpVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 z-40 bg-am-bg">
             <div className="p-5 min-h-screen bg-am-bg">
               <div className="flex justify-between mb-8 items-center">
                  <h2 className="font-bold text-2xl flex items-center gap-2"><PlusSquare className="text-am-teal" size={28}/> New Project</h2>
                  <motion.button whileTap={scaleTap} onClick={() => setView(ViewState.FEED)} className="bg-am-surface p-2 rounded-full border border-white/10 text-gray-400 hover:text-white"><X size={20}/></motion.button>
               </div>
               <div className="h-[80vh] overflow-y-auto pb-20 no-scrollbar">
                  <AddProjectView 
                    user={currentUser} 
                    onCancel={() => setView(ViewState.FEED)} 
                    onSuccess={() => { fetchFeed(); setView(ViewState.FEED); }} 
                  /> 
               </div>
             </div>
           </motion.div>
        )}

        {view === ViewState.PROFILE && viewedUser && (
            <ProfileView 
              key="profile"
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
        )}

        {view === ViewState.CHAT_LIST && (
           <motion.div key="chatlist" variants={slideRightVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 bg-am-bg z-30">
               <div className="h-16 flex items-center px-4 border-b border-white/5 bg-am-surface/90 backdrop-blur-md">
                 <button onClick={() => setView(ViewState.FEED)} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowLeft className="text-white"/></button>
                 <span className="font-bold text-white text-lg ml-2">Messages</span>
               </div>
               <ChatListView currentUser={currentUser} onChatSelect={(uid, name) => { setChatTarget({uid, name}); setView(ViewState.CHAT_ROOM); }} />
           </motion.div>
        )}

        {view === ViewState.CHAT_ROOM && chatTarget && (
           <motion.div key="chatroom" variants={slideRightVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 bg-am-bg z-40">
               <ChatRoomView currentUser={currentUser} targetUid={chatTarget.uid} targetName={chatTarget.name} onBack={() => setView(ViewState.CHAT_LIST)} />
           </motion.div>
        )}
        
        {view === ViewState.PROJECT_DETAILS && activeProject && !editMode && (
           <motion.div key="details" variants={slideRightVariants} initial="initial" animate="animate" exit="exit" className="fixed inset-0 bg-am-bg z-30 overflow-y-auto">
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
        <div className="fixed bottom-6 left-4 right-4 h-[65px] bg-am-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-around z-50 shadow-2xl">
           <motion.button whileTap={scaleTap} onClick={() => setView(ViewState.FEED)} className="flex flex-col items-center justify-center w-12 h-12 relative">
             <Home size={24} className={view === ViewState.FEED ? "text-am-teal drop-shadow-glow-sm" : "text-gray-500"} strokeWidth={view === ViewState.FEED ? 2.5 : 2} />
             {view === ViewState.FEED && <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-am-teal rounded-full shadow-glow" />}
           </motion.button>
           
           <motion.button whileTap={scaleTap} onClick={() => setView(ViewState.SEARCH)} className="flex flex-col items-center justify-center w-12 h-12 relative">
             <Search size={24} className={view === ViewState.SEARCH ? "text-am-teal drop-shadow-glow-sm" : "text-gray-500"} strokeWidth={view === ViewState.SEARCH ? 2.5 : 2} />
             {view === ViewState.SEARCH && <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-am-teal rounded-full shadow-glow" />}
           </motion.button>
           
           {/* Center FAB */}
           <motion.button 
             whileTap={{ scale: 0.9 }}
             onClick={() => setView(ViewState.ADD_PROJECT)} 
             className="-mt-12 bg-am-teal p-3.5 rounded-2xl shadow-[0_8px_25px_rgba(0,210,190,0.5)] border-4 border-am-bg relative group"
           >
             <div className="absolute inset-0 bg-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <Plus size={28} className="text-black relative z-10" strokeWidth={3} />
           </motion.button>
           
           <motion.button whileTap={scaleTap} className="flex flex-col items-center justify-center w-12 h-12">
             <Zap size={24} className="text-gray-500" />
           </motion.button>
           
           <motion.button whileTap={scaleTap} onClick={() => {
               setViewedUser(currentUser);
               setView(ViewState.PROFILE);
           }} className="flex flex-col items-center justify-center w-12 h-12 relative">
             <div className={`p-[1.5px] rounded-full transition-all ${view === ViewState.PROFILE && viewedUser?.uid === currentUser.uid ? "bg-gradient-to-tr from-am-teal to-transparent shadow-glow-sm" : "bg-transparent"}`}>
                <img src={currentUser.photoURL || "https://via.placeholder.com/24"} className="w-6 h-6 rounded-full border border-black bg-black object-cover" />
             </div>
             {view === ViewState.PROFILE && viewedUser?.uid === currentUser.uid && <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-am-teal rounded-full shadow-glow" />}
           </motion.button>
        </div>
      )}
    </div>
  );
}