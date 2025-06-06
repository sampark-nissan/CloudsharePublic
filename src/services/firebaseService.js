import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {deleteFileFromCloudinary} from './cloudinaryService';

export const getActualStorageStats = async () => {
  try {
    const userId = auth().currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const userDoc = await firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return {totalFiles: 0, totalStorage: 0};
    }

    const data = userDoc.data();
    const files = data.image || [];

    const totalFiles = files.length;
    const totalStorage = files.reduce((sum, file) => sum + (file.size || 0), 0);

    return {totalFiles, totalStorage, storageLimit: 1 * 1024 * 1024 * 1024};
  } catch (error) {
    console.error('Error calculating storage stats:', error);
    throw error;
  }
};

// Gallery image/video functions
export const saveImageMetadata = async fileData => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userRef = firestore().collection('users').doc(userId);

    // Set createdAt manually
    const fileMetadata = {
      ...fileData,
      createdAt: new Date(), // Use local date OR serverTimestamp separately
    };

    await userRef.update({
      image: firestore.FieldValue.arrayUnion(fileMetadata),
    });

    return true;
  } catch (error) {
    console.error('Error saving image metadata:', error);
    throw error;
  }
};

export const getUserFiles = async () => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userDoc = await firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();

    return userData.image || [];
  } catch (error) {
    console.error('Error getting user files:', error);
    throw error;
  }
};

export const deleteFile = async filePId => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userRef = firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const files = userData.image || [];

    // Find the file to delete
    const fileIndex = files.findIndex(file => file.publicId === filePId);

    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    // Extract file details
    const fileToDelete = files[fileIndex];
    const resourceType = fileToDelete.type?.startsWith('video')
      ? 'video'
      : 'image';

    // Delete from Cloudinary
    const cloudok = await deleteFileFromCloudinary(fileToDelete.publicId, resourceType);

    if(!cloudok) throw new Error('cloudinary deletion problem in firestore');

    // Remove the file from the array
    const updatedFiles = [...files];
    updatedFiles.splice(fileIndex, 1);

    // Update the user document
    await userRef.update({
      image: updatedFiles,
    });

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

//Shared files functions
export const saveFileMetadata = async fileData => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userRef = firestore().collection('users').doc(userId);

    // Set createdAt manually
    const fileMetadata = {
      ...fileData,
      createdAt: new Date(), // Use local date OR serverTimestamp separately
    };

    await userRef.update({
      file: firestore.FieldValue.arrayUnion(fileMetadata),
    });

    return true;
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
};

export const getSharedFiles = async () => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userDoc = await firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();

    return userData.file || [];
  } catch (error) {
    console.error('Error getting user files:', error);
    throw error;
  }
};

export const createShareLink = async (fileId, options) => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const shareRef = firestore().collection('shares').doc();

    // Calculate expiration date
    let expiresAt = null;
    if (options.expiration !== 'never') {
      const now = new Date();

      switch (options.expiration) {
        case '1h':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '24h':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '3d':
          expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
          break;
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    await shareRef.set({
      fileId,
      userId,
      accessType: options.accessType,
      password: options.password || null,
      expiresAt: expiresAt ? firestore.Timestamp.fromDate(expiresAt) : null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      views: 0,
      downloads: 0,
    });

    return {
      id: shareRef.id,
      link: `https://cloudshare.example/s/${shareRef.id}`,
    };
  } catch (error) {
    console.error('Error creating share link:', error);
    throw error;
  }
};

export const deleteShare = async filePId => {
  try {
    const userId = auth().currentUser?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userRef = firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const files = userData.file || [];

    // Find the file to delete
    const fileIndex = files.findIndex(file => file.publicId === filePId);

    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    // Extract file details
    const fileToDelete = files[fileIndex];
    const resourceType = fileToDelete.type?.startsWith('video')
      ? 'video'
      : 'image';

    // Delete from Cloudinary
    const cloudok = await deleteFileFromCloudinary(fileToDelete.publicId, resourceType);

    if(!cloudok) throw new Error('cloudinary deletion problem in firestore');

    // Remove the file from the array
    const updatedFiles = [...files];
    updatedFiles.splice(fileIndex, 1);

    // Update the user document
    await userRef.update({
      file: updatedFiles,
    });

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const cleanupExpiredSharesGlobally = async () => { // Can be called on app start or periodically
  console.log("Running global cleanup of all expired shares...");
  try {
      const now = firestore.Timestamp.now();
      const expiredSharesSnapshot = await firestore()
          .collection('shares')
          .where('expiresAt', '<', now)
          .get();

      if (expiredSharesSnapshot.empty) {
          console.log("No expired shares found during global cleanup.");
          return { cleanedShares: 0, cleanedCloudinary: 0 };
      }

      let cleanedSharesCount = 0;
      let cleanedCloudinaryCount = 0;

      const batch = firestore().batch(); // Use batch for Firestore deletes
      const cloudinaryDeletePromises = [];

      expiredSharesSnapshot.forEach(doc => {
          const share = { id: doc.id, ...doc.data() };
          console.log(`Globally cleaning up expired share: ${share.id}, File: ${share.fileName}`);

          if (share.cloudinaryPublicId && share.cloudinaryResourceType) {
              cloudinaryDeletePromises.push(
                  deleteFileFromCloudinary(share.cloudinaryPublicId, share.cloudinaryResourceType)
                      .then(() => cleanedCloudinaryCount++)
                      .catch(e => console.error(`Global cleanup: Cloudinary delete failed for ${share.cloudinaryPublicId}`, e))
              );
          }
          batch.delete(firestore().collection('shares').doc(share.id));
          cleanedSharesCount++;
      });

      await Promise.allSettled(cloudinaryDeletePromises); // Wait for Cloudinary deletions
      await batch.commit(); // Commit Firestore deletions

      console.log(`Global cleanup: ${cleanedSharesCount} shares removed from Firestore, ${cleanedCloudinaryCount} assets attempted for Cloudinary deletion.`);
      return { cleanedShares: cleanedSharesCount, cleanedCloudinary: cleanedCloudinaryCount };
  } catch (error) {
      console.error("Error during global cleanup of expired shares:", error);
      throw error; // Or handle more gracefully
  }
};