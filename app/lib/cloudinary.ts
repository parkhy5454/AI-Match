import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(
  file: Buffer,
  folder: string,
  options?: any
) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ai-match/${folder}`,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(file);
  });
}

export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

export function getImageUrl(
  publicId: string,
  options?: Record<string, any>
) {
  return cloudinary.url(publicId, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  });
}

export function getThumbnailUrl(
  publicId: string,
  size: 'small' | 'medium' | 'large'
) {
  const sizes: Record<string, [number, number]> = {
    small: [100, 100],
    medium: [300, 300],
    large: [800, 800],
  };

  const [width, height] = sizes[size];

  return cloudinary.url(publicId, {
    crop: 'fill',
    gravity: 'face',
    width,
    height,
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  });
}
