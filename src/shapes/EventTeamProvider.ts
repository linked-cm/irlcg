import { Auth } from '@_linked/auth/utils/auth';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { getNewIncrementalId } from '@_linked/schema/utils/Identifier';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { uploadSingleFileFromBuffer } from '@_linked/server-utils/utils/Upload';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { UserAccount } from '@linked.cm/profile/shapes/UserAccount';
import sharp from 'sharp';
import { cached } from '../utils/cached.js';
import { EventTeam } from './EventTeam.js';
import { Team } from './Team.js';
import { Action } from './Action.js';

export class EventTeamProvider extends ShapeProvider {
  public shape = EventTeam;

  /**
   * Get EventTeam by ID or identifier
   *
   * @param teamId ID or identifier of the event team
   * @returns EventTeam or undefined if not found
   */
  async getEventTeamById(teamId: number | string) {
    // try to find by identifier first
    let existingTeam = await EventTeam.select((t) => {
      return [
        t.identifier,
        t.name,
        t.alternateName,
        t.description,
        t.startDate,
        t.endDate,
        t.actions.select((a) => {
          return [a.name, a.identifier];
        }),
        (t.image as any).select((img) => {
          return [img.contentUrl];
        }),
      ];
    })
      .where((t) => {
        return t.identifier.equals(teamId.toString()).or(
          t.equals({
            id: teamId.toString(),
          })
        );
      })
      .one();

    if (!existingTeam) {
      console.log('Team not found');
      return;
    }

    return existingTeam;
  }

  async getEventGameboard(teamId: string): Promise<{
    showPeacegameLogo: boolean;
    eventLogo: QResult<
      ImageObject & {
        contentUrl: string;
      }
    > | null;
  }> {
    const eventTeam = await EventTeam.select((t) => {
      return [
        t.showPeacegameLogo,
        t.eventLogo.select((img) => {
          return [img.contentUrl];
        }),
      ];
    })
      .where((t) => {
        return t.equals({
          id: teamId,
        });
      })
      .one();

    if (!eventTeam) {
      return {
        showPeacegameLogo: false,
        eventLogo: null,
      };
    }
    return {
      showPeacegameLogo: eventTeam.showPeacegameLogo,
      eventLogo: eventTeam.eventLogo,
    };
  }

  async createEventTeam(
    name: string,
    subtitle: string,
    description: string,
    closingMessage: string,
    startDate: Date,
    endDate: Date,
    image: { dataUrl: string; format: string },
    showPeacegameLogo?: boolean,
    eventLogo?: { dataUrl: string; format: string },
    customIdentifier?: string,
    actionIdentifiers?: string
  ) {
    const auth = this.request.linkedAuth;
    if (!auth || !auth.userAccount) {
      console.warn('Must be logged in to create a event team');
      return Auth.enforceSignedIn();
    }
    const account = auth.userAccount;
    const user = auth.user;
    const admin = process.env.ADMIN_EMAIL;

    // get admin account
    const adminAccount = await UserAccount.select((a) => {
      return [a.email];
    })
      .where((a) => {
        return a.equals(account);
      })
      .one();

    if (!adminAccount) {
      console.error('Admin account not found, cannot create event team');
      return {
        error: 'Admin account not found, cannot create event team',
      };
    }

    if (admin !== adminAccount.email) {
      return {
        error: 'Only admins can create event teams',
      };
    }

    // process team image
    let imageObj = null;
    if (image && image.dataUrl) {
      try {
        imageObj = await this.processImage(image, name, 'team');
      } catch (err) {
        console.error('Error uploading image for event team:', err);
        return {
          error: 'Error uploading image for event team',
        };
      }
    }

    // process event logo image
    let eventLogoObj = null;
    if (eventLogo && eventLogo.dataUrl) {
      try {
        eventLogoObj = await this.processImage(eventLogo, name, 'eventlogo');
      } catch (err) {
        console.error('Error uploading event logo image:', err);
        return {
          error: 'Error uploading event logo image',
        };
      }
    }

    // create a new team
    let newId: string;
    if (customIdentifier && customIdentifier.trim()) {
      // get existing team with same identifier
      const existingTeam = await EventTeam.select((t) => {
        return [t.identifier];
      })
        .where((t) => {
          return t.identifier.equals(customIdentifier.trim());
        })
        .one();

      // check if custom identifier already exists
      if (existingTeam) {
        return {
          error: `Team with identifier "${customIdentifier.trim()}" already exists`,
        };
      }
      newId = customIdentifier.trim();
    } else {
      newId = (await getNewIncrementalId(Team)).toString();
    }

    // prepare actions to add if provided
    let actionsToAdd = [];
    if (actionIdentifiers && actionIdentifiers.trim()) {
      const identifiers = actionIdentifiers
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      // validate actions exist and collect them
      for (const identifier of identifiers) {
        const actionId = process.env.DATA_ROOT + '/' + identifier;

        // check if action exists using LINCD query
        const action = await Action.select((a) => [a.id])
          .where((a) => {
            return a.equals({
              id: actionId,
            });
          })
          .one();

        if (action) {
          actionsToAdd.push({ id: actionId });
        } else {
          console.warn(
            `Action with identifier "${identifier}" not found at ${actionId}`
          );
        }
      }
    }

    const eventTeam = await EventTeam.create({
      __id: process.env.DATA_ROOT + '/event-teams/' + newId,
      identifier: newId,
      teamLeader: user,
      members: {
        add: user,
      },
      name: name,
      alternateName: subtitle,
      description: description,
      startDate: new Date(startDate + 'T00:00:00Z'),
      endDate: new Date(endDate + 'T00:00:00Z'),
      showPeacegameLogo: showPeacegameLogo || false,
      image: imageObj ? imageObj : undefined,
      eventLogo: eventLogoObj ? eventLogoObj : undefined,
      actions:
        actionsToAdd.length > 0
          ? {
              add: actionsToAdd,
            }
          : undefined,
    });

    // check event if not created properly
    if (!eventTeam) {
      return {
        error: 'Error creating event team',
      };
    }

    return { user, team: eventTeam };
  }

  /**
   * Upload image currently for event team
   *
   * @param imageData
   * @param teamName
   * @param imageType
   * @returns
   */
  private async processImage(
    imageData: { dataUrl: string; format: string },
    teamName: string,
    imageType: 'team' | 'eventlogo'
  ): Promise<QResult<ImageObject>> {
    // decode the base64 image data
    const base64Data = imageData.dataUrl.replace(
      /^data:image\/\w+;base64,/,
      ''
    );
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // get the image metadata to check the dimensions
    const metadata = await sharp(imageBuffer).metadata();

    // compress the image if the width is greater than 1200px resize to 1200px
    let compressedImageBuffer: Buffer;
    if (metadata.width > 1200) {
      compressedImageBuffer = await sharp(imageBuffer)
        .resize({ width: 1200 }) // max width 1200px
        .toFormat('jpeg')
        .jpeg({ quality: 85 })
        .toBuffer();
    } else {
      compressedImageBuffer = await sharp(imageBuffer)
        .toFormat('jpeg')
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    // generate a unique filename for the image with timestamp and format
    // e.g. eventlogo_Team_Name_1633024800000.jpeg
    const filename =
      imageType === 'eventlogo'
        ? `eventlogo_${teamName.replace(/\s+/g, '_')}_${Date.now()}.jpeg`
        : `${teamName.replace(/\s+/g, '_')}_${Date.now()}.jpeg`;

    // upload the compressed image using uploadSingleFileFromBuffer
    const publicUrl = await uploadSingleFileFromBuffer({
      buffer: compressedImageBuffer,
      fileName: filename,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      addSuffix: 'compressed',
    });

    const image = await ImageObject.create({
      contentUrl: publicUrl,
    });

    return image;
  }

  getAllEventTeams() {
    return cached(
      async () => {
        const now = new Date().toISOString().split('T')[0];
        const teams = await EventTeam.select((t) => {
          return [
            t.identifier,
            t.name,
            t.alternateName,
            t.startDate,
            t.endDate,
            (t.image as any).select((img) => {
              return [img.contentUrl];
            }),
          ];
        });

        if (teams.length === 0) {
          return [];
        }

        const activeTeams = teams.filter((t: any) => {
          const startDate = t.startDate ? new Date(t.startDate) : null;
          const endDate = t.endDate ? new Date(t.endDate) : null;

          return (
            (!startDate || startDate.toISOString().split('T')[0] <= now) &&
            (!endDate || endDate.toISOString().split('T')[0] >= now)
          );
        });

        return activeTeams.map((team: any) => {
          return {
            id: team.identifier,
            uri: team.id, // team.id contains the URI from the query
            name: team.name,
            description: team.alternateName,
            image: team.image,
          };
        });
      },
      ['getAllEventTeams'],
      4 * 60 * 60 * 1000
    );
  }
}
