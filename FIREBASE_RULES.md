# Firebase Security Rules

To fix the "Missing or insufficient permissions" errors, copy these rules into your Firebase Console.

## 1. Cloud Firestore Rules
**Go to:** Build -> Firestore Database -> Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // -- Helper Functions --
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // -- User Profiles --
    match /users/{userId} {
      // 1. Anyone can read user profiles
      allow read: if true;
      
      // 2. Users can create/edit their OWN profile
      allow create, update: if isOwner(userId);
      
      // 3. SPECIAL RULE: Allow other users to update the 'followers' count
      // We check if only 'followers' is being modified.
      // We also handle the case where 'followers' might not exist yet (treat as 0).
      allow update: if isSignedIn() 
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['followers'])
                    && (
                      (resource.data.keys().hasAny(['followers']) 
                       && (request.resource.data.followers == resource.data.followers + 1 || request.resource.data.followers == resource.data.followers - 1))
                      ||
                      (!resource.data.keys().hasAny(['followers']) && request.resource.data.followers == 1)
                    );

      // -- Subcollections --
      
      // My "Following" List: Only I can read/write who I follow
      match /following/{targetId} {
        allow read, write: if isOwner(userId);
      }
      
      // My "Followers" List: 
      // People need to be able to write their ID here when they follow me.
      match /followers/{followerId} {
        allow read: if true;
        // Allow write if the person writing is adding THEMSELVES as a follower
        allow write: if isSignedIn() && request.auth.uid == followerId;
      }
    }

    // -- Projects --
    match /projects/{projectId} {
      // Read: Public if isPublic=true, OR if I am the owner
      allow read: if resource.data.isPublic == true || (isSignedIn() && resource.data.userId == request.auth.uid);
      
      // Create: If I am logged in and marking myself as author
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      
      // Update/Delete: Only if I own the project
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
      
      // SPECIAL RULE: Allow anyone to 'Like' (increment likes count)
      allow update: if isSignedIn() 
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes']);
    }
  }
}
```

## 2. Realtime Database Rules
**Go to:** Build -> Realtime Database -> Rules

Make sure you select the correct database instance (likely the Asia one if you changed the code).

```json
{
  "rules": {
    "chats": {
      "$chatId": {
        // Only allow read/write if the chat ID contains the user's UID.
        ".read": "auth != null && $chatId.contains(auth.uid)",
        ".write": "auth != null && $chatId.contains(auth.uid)"
      }
    },
    "comments": {
      "$projectId": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "status": {
      ".read": "auth != null",
      "$uid": {
        // Users can only write their own status
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```