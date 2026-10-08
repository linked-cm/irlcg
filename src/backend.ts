//import your providers here (providers only run in the backend)
export * from './shapes/ActionDebriefProvider.js';
export * from './shapes/AudioHistoryProvider.js';
export * from './shapes/ActionPlanProvider.js';
export * from './shapes/EventTeamProvider.js';
export * from './shapes/GameActionProvider.js';
export * from './shapes/MeetingProvider.js';
export * from './shapes/PeaceGameDebriefProvider.js';
export * from './shapes/PlayerProvider.js';
export * from './shapes/ResourceProvider.js';
export * from './shapes/TeamProvider.js';
export * from './shapes/TopicProvider.js';
export * from './shapes/TopicScoreProvider.js';
export * from './shapes/ActionSubmissionProvider.js';
export * from './shapes/ActionTotalProvider.js';
export * from './shapes/ActionProvider.js';
export * from './shapes/EventProvider.js';
import formidable, { File as FormidablesFile } from 'formidable';
import { Auth } from '@_linked/auth/utils/auth';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { BackendProvider } from '@_linked/server-utils/utils/BackendProvider';
import { uploadSingleFileFromFormData } from '@_linked/server-utils/utils/Upload';
import { GameActionProvider } from './shapes/GameActionProvider.js';
import { Player } from './shapes/Player.js';
import { ActionTotal } from './shapes/ActionTotal.js';

export default class IrlcgBackend extends BackendProvider {
  // upload image to topic score on event action
  async uploadImage() {
    const form = formidable({});

    return new Promise((resolve, reject) => {
      // check query parameters
      const uri = this.request.query.topicScore;
      const subPlayerUri = this.request.query.subPlayer;

      const auth = this.request.linkedAuth?.userAccount;
      if (!auth) {
        return Auth.enforceSignedIn();
      }

      let user: Player;
      if (!subPlayerUri) {
        user = auth.userAccount.accountOf as Player;
      } else {
        user = new Player({ id: subPlayerUri });
      }

      form.parse(this.request, async (err, fields, files) => {
        if (err) {
          console.error('Error parsing form data:', err);
          reject(err);
        }

        // console.log(`files: `, JSON.stringify(files));
        // upload from ios:
        // files:  {"file":[{"size":403096,"filepath":"/var/folders/j0/qqb55mqs6h7fs76x2x5bp6r40000gn/T/x5mjbwtntqtgt0rpe0w9kiszb","newFilename":"x5mjbwtntqtgt0rpe0w9kiszb","mimetype":"image/jpeg","mtime":"2025-05-14T12:26:17.780Z","originalFilename":"photo-5.jpg"}]}
        // from web:
        // files:  {"image":[{"size":1247723,"filepath":"/var/folders/j0/qqb55mqs6h7fs76x2x5bp6r40000gn/T/syowtpxrl5ayutap3jyfb0grc","newFilename":"syowtpxrl5ayutap3jyfb0grc","mimetype":"image/jpeg","mtime":"2025-05-14T12:34:33.833Z","originalFilename":"1179_1747226073720.jpg"}]}

        try {
          // check if the file provided
          let file: FormidablesFile;
          if (files?.file) {
            file = Array.isArray(files.file) ? files.file[0] : files.file;
          } else if (files?.image) {
            file = Array.isArray(files.image) ? files.image[0] : files.image;
          }

          if (!file) {
            throw new Error('No file uploaded');
          }

          // check size of the file, max 20mb
          const fileSize = file.size;
          if (fileSize > 20 * 1024 * 1024) {
            throw new Error('Your file is too large. Maximum size is 20MB.');
          }

          // convert the image to jpg to make sure the image support on all platforms
          // because some of the format are not support cross platforms
          // example: heic or heif not working on chrome
          // const imageBuffer = await sharp(file.filepath)
          //   .jpeg({ quality: 90 })
          //   .toBuffer();

          // const publicUrl = await uploadSingleFileFromBuffer({
          //   buffer: imageBuffer,
          //   fileName: file.originalFilename,
          //   allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'heif', 'heic'],
          // });

          // upload the original image directly to the storage
          const publicUrl = await uploadSingleFileFromFormData({
            file: file,
            allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'heif', 'heic'],
          });

          // save the image metadata
          const image = await ImageObject.create({ contentUrl: publicUrl });

          // update the topic with the uploaded image
          await ActionTotal.update({ images: { add: [{ id: image.id }] } }).for(
            { id: uri }
          );

          // get the action linked to this actionTotal
          const actionTotal = await ActionTotal.select((at) => at.action)
            .for({ id: uri })
            .one();

          const submitAction: any =
            await this.callOtherProvider<GameActionProvider>(
              GameActionProvider
            ).submit({ id: actionTotal.action.id }, new Map(), false, {
              id: user.id,
            });

          const response = {
            images: {
              uri: image.id,
              contentUrl: image.contentUrl,
            },
            actionTotal: submitAction.actionTotal,
          };

          resolve(response);
        } catch (err) {
          console.warn('Error uploading image:', err);
          reject(err);
        }
      });
    });
  }

  // get the image from the topic score, use on event action
  async getActionTotalImages(uri: string) {
    if (!uri) {
      throw new Error('Missing required query parameters: topic or property');
    }

    // get the images by topic score uri
    const actionTotal = await ActionTotal.select((at) => [at.images.contentUrl])
      .for({ id: uri })
      .one();
    if (!actionTotal) {
      throw new Error(`ActionTotal not found for URI: ${uri}`);
    }

    // get the image from the topic
    const images = actionTotal.images.map((image) => {
      return {
        uri: image.id,
        contentUrl: image.contentUrl,
      };
    });

    return images;
  }

  // delete the image from the topic score, use on event action
  async deleteActionTotalImage(
    uri: string,
    imageUri: string,
    subPlayer: Player
  ) {
    if (!uri || !imageUri) {
      throw new Error('Missing required query parameters');
    }

    // remove the image from the actionTotal
    await ActionTotal.update({ images: { remove: [{ id: imageUri }] } }).for({
      id: uri,
    });

    // get the updated actionTotal with action and images
    const actionTotal = await ActionTotal.select((at) => [
      at.action,
      at.images.contentUrl,
    ])
      .for({ id: uri })
      .one();
    if (!actionTotal) {
      throw new Error(`Not found for URI: ${uri}`);
    }

    const submitAction: any = await this.callOtherProvider<GameActionProvider>(
      GameActionProvider
    ).submit({ id: actionTotal.action.id }, new Map(), false, {
      id: subPlayer.id,
    });

    return {
      images: actionTotal.images,
      actionTotal: submitAction.actionTotal,
    };
  }
}
