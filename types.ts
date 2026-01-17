export interface UserProfile {
  uid: string;
  displayName: string; // Used as Username
  email: string;
  photoURL?: string;
  bio?: string;
  followers?: number;
  following?: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
  
  // Ownership
  userId: string;
  authorName: string;
  authorPhoto?: string;
  
  // Privacy
  isPublic: boolean;
  
  // Stats
  likes: number; // Stored as counter
  
  // Content
  xmlContent: string;
  videoUrl?: string; 
  thumbnailUrl?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  participants: Record<string, boolean>; // {uid: true}
  lastMessage: string;
  lastMessageTime: number;
  participantDetails?: UserProfile[]; // Hydrated client side
}

export enum ViewState {
  AUTH = 'AUTH',
  FEED = 'FEED',
  SEARCH = 'SEARCH',
  ADD_PROJECT = 'ADD_PROJECT',
  PROFILE = 'PROFILE',
  PROJECT_DETAILS = 'PROJECT_DETAILS',
  CHAT_LIST = 'CHAT_LIST',
  CHAT_ROOM = 'CHAT_ROOM'
}