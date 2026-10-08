import React, { useEffect, useState } from 'react';
import style from './ImageUpload.module.css';
import { Shape } from '@_linked/core/shapes/Shape';
import { useAuth } from '@_linked/auth/hooks/useAuth';
import { Player } from '../../shapes/Player.js';
import { UserAccount } from '@linked.cm/profile/shapes/UserAccount';
import { useTranslate } from '@tolgee/react';
import { Server } from '@_linked/server-utils/utils/Server';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { getResizedImagePath } from '@_linked/server-utils/utils/ImageResize';
import cl from 'classnames';
import {
  generateUniqueFileName,
  replaceLocalhostWithSiteRoot,
  withRetry,
} from '../../utils/helper.js';
import { packageName } from '../../package.js';
import { LinkedStorage } from '@_linked/core/utils/LinkedStorage';
import {
  ActionTotal,
  type ActionTotalResult,
} from '../../shapes/ActionTotal.js';
import { JSONParser } from '@_linked/server-utils/utils/JSONParser';

declare var FileTransfer: any;
interface ImageUploadProps {
  uploadUrl: string;
  of: Shape;
  property: string;
  subPlayer: Player;
  limit?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  onCallback?: (actionTotal: ActionTotalResult) => void;
  isLoading?: boolean;
}
export function ImageUpload({
  uploadUrl,
  of,
  subPlayer,
  property,
  limit = 3,
  thumbnailWidth = 100,
  thumbnailHeight = 100,
  onCallback,
  isLoading = false,
}: ImageUploadProps) {
  const auth = useAuth<any, any>();
  const user = auth.user;
  const { t } = useTranslate();

  const [images, setImages] = useState<{ uri: string; contentUrl: string }[]>(
    []
  );
  const [uploading, setUploading] = useState<boolean>(false); // Upload state

  const getImages = async () => {
    const response = await Server.call(
      packageName,
      'getActionTotalImages',
      of.uri
    );
    setImages(response && response.length > 0 ? response : []);
  };

  useEffect(() => {
    if (of?.uri) {
      getImages();
    }
  }, [of?.uri]);

  const handleFileChange = async () => {
    if (images.length >= limit) {
      alert(`You can only upload up to ${limit} images.`);
      return;
    }

    try {
      const imageOptions = {
        quality: 90,
        allowEditing: false,
        width: 1024,
        resultType: Capacitor.isNativePlatform()
          ? CameraResultType.Uri
          : CameraResultType.DataUrl,
        source: Capacitor.isNativePlatform()
          ? CameraSource.Prompt
          : CameraSource.Photos,
      };

      const image = await Camera.getPhoto(imageOptions);
      if (image) {
        // upload the image to the server
        await uploadImage(image);
      }
    } catch (err) {
      console.warn('Error capturing image:', err);
    }
  };

  const onFileTransferUpload = async (
    file: Photo
  ): Promise<{ uri: string; contentUrl: string }> => {
    const fileTransfer = new FileTransfer();
    const token = await auth.getAccessToken();

    // generate a unique file name for the image
    // example: originalName.jpg -> originalName_1633024800000_abcd12.jpg
    const filename = generateUniqueFileName(
      file.path.substring(file.path.lastIndexOf('/') + 1)
    );

    const options = {
      fileKey: 'file',
      fileName: filename,
      mimeType: 'image/jpeg',
      chunkedMode: false,
      headers: {
        Authorization: 'Bearer ' + token,
      },
    };

    return new Promise<{ uri: string; contentUrl: string }>(
      (resolve, reject) => {
        fileTransfer.upload(
          file.path,
          encodeURI(uploadUrl),
          async (success) => {
            const response = JSON.parse(success.response);
            const parsed: any = await JSONParser.parseObject(response);

            const image = parsed.content?.images;
            const actionTotal = parsed.content?.actionTotal;

            if (!image) {
              reject(new Error('Image upload failed: No image in response'));
              return;
            }

            // extract image from response.images
            resolve({
              uri: image.uri,
              contentUrl: image.contentUrl,
            });

            // send the update actionTotal to the callback
            if (onCallback && actionTotal) {
              onCallback(actionTotal);
            }
          },
          (error) => {
            reject(new Error('Upload error: ' + JSON.stringify(error)));
          },
          options
        );
      }
    );
  };

  const uploadImage = async (file: Photo) => {
    setUploading(true);

    try {
      let newImage: { uri: string; contentUrl: string } | null = null;
      if (Capacitor.isNativePlatform()) {
        // use FileTransfer for native platforms
        newImage = await onFileTransferUpload(file);
      } else {
        // use fetch for web platforms
        const formData = new FormData();
        const blob = await fetch(file.dataUrl).then((res) => res.blob());

        // generate a unique filename
        const filename = `${user.identifier}_${Date.now()}.jpg`;
        formData.append('image', blob, filename);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const data = await response.json();
        const parsed: any = await JSONParser.parseObject(data);
        newImage = parsed.content.images;

        // send the update actionTotal to the callback
        if (onCallback && parsed.content.actionTotal) {
          onCallback(parsed.content?.actionTotal);
        }
      }

      if (!newImage) {
        alert(
          t(
            'imageUpload.uploadError',
            `Hmm, things are a little crowded right now. We were not able to upload the image. Please try again in a moment.`
          )
        );
        return;
      }

      // resize the image directly, so we use thumbnail image for the preview
      // const resizeImageSrc = imageSrc(newImage.contentUrl);

      setImages((prevImages) => {
        const updated = [
          ...prevImages,
          { uri: newImage.uri, contentUrl: newImage.contentUrl },
        ];

        return updated;
      });
    } catch (err) {
      console.warn('Error uploading image:', err);
      alert(
        t(
          'imageUpload.uploadError',
          `Hmm, things are a little crowded right now. We were not able to upload the image. Please try again in a moment.`
        )
      );
    } finally {
      setUploading(false);
    }
  };

  // delete the image from the server
  const handleDeleteImage = async (imageUri: string) => {
    try {
      const response = await withRetry(() =>
        Server.call(
          packageName,
          {
            method: 'deleteActionTotalImage',
            overwriteData: true,
          },
          of.uri,
          imageUri,
          subPlayer
        )
      );
      if (response) {
        // update the images state to remove the deleted image
        const updatedImages = images.filter((image) => image.uri !== imageUri);
        setImages(updatedImages);

        if (onCallback) {
          onCallback(response.actionTotal);
        }
      }
    } catch (err) {
      console.warn('Error deleting image:', err);
      alert(
        t(
          'imageUpload.uploadError',
          `Things are running a bit slow. We weren’t able to delete the image. Could you try again in a little while?`
        )
      );
    }
  };

  // crop the image based on the thumbnail size
  // this also fix android development path
  const imageSrc = (source: string) => {
    return getResizedImagePath(
      replaceLocalhostWithSiteRoot(source),
      thumbnailWidth ? thumbnailWidth * 2 : NaN,
      thumbnailHeight ? thumbnailHeight * 2 : thumbnailWidth ? NaN : 100
    );
  };

  return (
    <div className={style.root}>
      {images.map((image, index) => (
        <div
          key={index}
          className={style.item}
          style={{ width: thumbnailWidth, height: thumbnailHeight }}
        >
          <img src={imageSrc(image.contentUrl)} alt={`Uploaded ${index + 1}`} />
          <button
            className={style.delete}
            onClick={() => handleDeleteImage(image.uri)}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 15 15">
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M11.782 4.032a.575.575 0 1 0-.813-.814L7.5 6.687 4.032 3.218a.575.575 0 0 0-.814.814L6.687 7.5l-3.469 3.468a.575.575 0 0 0 .814.814L7.5 8.313l3.469 3.469a.575.575 0 0 0 .813-.814L8.313 7.5z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
      ))}
      {images.length < limit && (
        <div
          className={cl(style.item, style.addNew)}
          style={{ width: thumbnailWidth, height: thumbnailHeight }}
          onClick={handleFileChange}
        >
          {uploading || isLoading ? (
            <span className={cl(style.spinner, style.absCenter)}>...</span>
          ) : (
            <svg
              className={style.absCenter}
              viewBox="0 -960 960 960"
              height="48"
              width="48"
            >
              <path
                fill="currentColor"
                d="M450-450H200v-60h250v-250h60v250h250v60H510v250h-60v-250Z"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
