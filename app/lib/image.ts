import sharp from 'sharp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export async function optimizeImage(
  buffer: Buffer,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error('Image optimization error:', error);
    throw new Error('Failed to optimize image');
  }
}

export async function generateThumbnail(
  buffer: Buffer,
  size: 'small' | 'medium' | 'large'
): Promise<Buffer> {
  const sizes: Record<string, number> = {
    small: 100,
    medium: 300,
    large: 800,
  };

  const dimension = sizes[size];

  try {
    return await sharp(buffer)
      .resize(dimension, dimension, {
        fit: 'cover',
      })
      .webp({ quality: 75 })
      .toBuffer();
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw new Error('Failed to generate thumbnail');
  }
}

export async function removeExifData(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).withMetadata(false).toBuffer();
  } catch (error) {
    console.error('EXIF removal error:', error);
    throw new Error('Failed to remove EXIF data');
  }
}

export async function getImageDimensions(
  buffer: Buffer
): Promise<ImageDimensions> {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.error('Image dimension error:', error);
    throw new Error('Failed to get image dimensions');
  }
}

export async function validateImage(buffer: Buffer): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const dimensions = await getImageDimensions(buffer);

    // Minimum resolution: 800x600
    if (dimensions.width < 800 || dimensions.height < 600) {
      return {
        isValid: false,
        error: 'Image resolution too low (minimum 800x600)',
      };
    }

    // Maximum file size: 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit',
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate image',
    };
  }
}
