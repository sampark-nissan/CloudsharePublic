import {Platform} from 'react-native';
import RNFetchBlob from 'react-native-blob-util';
import sha1 from 'js-sha1';
import {Cloudinary} from 'cloudinary-react-native';

const CLOUDINARY_URL = 'cloudinary_key';
const UPLOAD_PRESET = 'cloudinary_upload_preset_name'; 
const CLOUD_NAME = 'cloudinary_cloud_name';
const CLOUDINARY_API_SECRET = 'cloudinary_api_secret';
const CLOUDINARY_API_KEY = 'cloudinary_api_key';

export const uploadToCloudinary = async (  uri,  fileType,  options = {folder: 'uploads'},) => 
{
  try {
    // Prepare the file for upload
    const localUri = uri;

    // Get the file info
    const fileInfo = await RNFetchBlob.fs.stat(localUri);

    if (!fileInfo) {
      throw new Error('File does not exist');
    }

    // Create form data for upload
    const formData = new FormData();

    // Add file
    const fileExtension = localUri.split('.').pop();
    const fileName = localUri.split('/').pop();

    const file = {
      uri:
        Platform.OS === 'android' ? localUri : localUri.replace('file://', ''),
      type: fileType, // ✅ use passed type
      name: fileName,
    };

    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', options.folder);

    // Upload to Cloudinary
    const response = await fetch(`${CLOUDINARY_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        ...data,
        public_id: data.public_id,
      };
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const deleteFileFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = sha1(stringToSign);

    console.log('Deleting from Cloudinary:', {
      publicId,
      resourceType,
      timestamp,
      signature,
    });

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Cloudinary delete result:', result);

    if (response.ok && result.result === 'ok') {
      return true;
    } else {
      throw new Error(result.error?.message || 'Cloudinary delete failed');
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export const applyCloudinaryTransformation = (publicId, transformation) => {
  const baseTransformations = 'f_auto,q_auto';

  return `https://res.cloudinary.com/db5lbzfjv/image/upload/${transformation}/${publicId}`;
};

// AI Transformations
export const removeBackground = publicId => {
  // Ensure the transformation is correct based on Cloudinary docs
  return applyCloudinaryTransformation(publicId, 'e_background_removal'); // Often just e_bgremoval
};

export const autoEnhance = publicId => {
  // Ensure the transformation is correct based on Cloudinary docs
  return applyCloudinaryTransformation(publicId, 'e_enhance'); // Often just e_improve
};

export const applyArtisticFilter = (publicId, filter) => {
  return applyCloudinaryTransformation(publicId, `e_art:${filter}`);
};

export const autoCrop = (publicId, promptfirst, promptsecond ) => {
  console.log(promptfirst,promptsecond);
  return applyCloudinaryTransformation(publicId, `c_auto,g_auto,h_${promptfirst},w_${promptsecond}`);
};

// Generative fill
export const generativeFill = (publicId, aspectRatio, prompt = '') => {
  const transformation = `ar_${aspectRatio},c_fill,g_auto`;
  return applyCloudinaryTransformation(publicId, transformation);
};

// Generative Remove
export const generativeRemove = (publicId, prompt) => {
  const encodedPrompt = encodeURIComponent(prompt);
  const transformation = `e_gen_remove:prompt_${encodedPrompt}`;
  return applyCloudinaryTransformation(publicId, transformation);
};

// Generative Replace
export const generativeReplace = (
  publicId,
  objectToReplacePrompt,
  replacementPrompt,
) => {
  // prompts should be URL-encoded
  const encodedObjectPrompt = encodeURIComponent(objectToReplacePrompt);
  const encodedReplacementPrompt = encodeURIComponent(replacementPrompt);
  const transformation = `e_gen_replace:from_${encodedObjectPrompt};to_${encodedReplacementPrompt}`;
  return applyCloudinaryTransformation(publicId, transformation);
};

// Generative Recolor(not working)
export const generativeRecolor = (
  publicId,
  objectToRecolorPrompt,
  targetColorPrompt,
) => {
  // prompts should be URL-encoded
  const encodedObjectPrompt = encodeURIComponent(objectToRecolorPrompt);
  const encodedTargetColorPrompt = encodeURIComponent(targetColorPrompt);
  const transformation = `e_gen_recolor:prompt_(${encodedObjectPrompt});to-color_${encodedTargetColorPrompt};multiple_true`;
  return applyCloudinaryTransformation(publicId, transformation);
};

//Content Extraction
export const generativeContent = (publicId, prompt) => {
  const encodedPrompt = encodeURIComponent(prompt);
  const transformation = `e_extract:prompt_(${encodedPrompt});multiple_true`;
  return applyCloudinaryTransformation(publicId, transformation);
};
