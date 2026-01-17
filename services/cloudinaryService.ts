const CLOUD_NAME = 'dj5hhott5'; // Provided by user
const API_KEY = '678265544699348'; // Provided by user

export const uploadToCloudinary = async (file: File, uploadPreset: string = 'My smallest server'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  // Ensure the preset is exactly as requested, spaces included
  formData.append('upload_preset', uploadPreset); 
  formData.append('api_key', API_KEY);
  formData.append('tags', 'alightgram_upload');

  // Determine resource type based on file mime type
  const resourceType = file.type.startsWith('image/') ? 'image' : 'video';

  console.log(`Starting upload to Cloudinary... Type: ${resourceType}, Preset: ${uploadPreset}`);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary Error Details:', errorData);
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload Successful:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Failed:', error);
    throw error;
  }
};