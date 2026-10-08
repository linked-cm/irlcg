import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Event, type EventResult } from './Event.js';

export class EventProvider extends ShapeProvider {
  public shape = Event;

  /**
   * Get a single Event by ID or identifier.
   * Searches by both identifier and internal ID to find matching events.
   *
   * @param eventId - ID or identifier of the event (number or string)
   * @returns Event with full details (identifier, name, description, dates, actions, image, eventLogo) or undefined if not found
   */
  async getOne(eventId: number | string) {
    let existingEvent = await Event.select((e) => {
      return [
        e.identifier,
        e.name,
        e.alternateName,
        e.description,
        e.startDate,
        e.endDate,
        e.actions.select((a) => {
          return [a.name, a.identifier];
        }),
        e.image.select((img) => {
          return [img.contentUrl];
        }),
        e.eventLogo.select((img) => {
          return [img.contentUrl];
        }),
        e.showPeacegameLogo,
        e.pinned,
        e.purpleTheme,
        e.route,
      ];
    })
      .where((e) => {
        return e.identifier.equals(eventId.toString()).or(
          e.equals({
            id: eventId.toString(),
          })
        );
      })
      .one();

    if (!existingEvent) {
      console.log('Event not found');
      return;
    }

    return existingEvent;
  }

  /**
   * Get gameboard configuration for a specific event.
   * Retrieves the event logo and peacegame logo display settings.
   *
   * @param eventId - The event ID (URI string)
   * @returns Object containing showPeacegameLogo flag and eventLogo image, or defaults if event not found
   */
  async findGameboard(eventId: string): Promise<{
    showPeacegameLogo: boolean;
    eventLogo: QResult<
      ImageObject & {
        contentUrl: string;
      }
    > | null;
  }> {
    const event = await Event.select((e) => {
      return [
        e.showPeacegameLogo,
        e.eventLogo.select((img) => {
          return [img.contentUrl];
        }),
      ];
    })
      .where((e) => {
        return e.equals({
          id: eventId,
        });
      })
      .one();

    if (!event) {
      return {
        showPeacegameLogo: false,
        eventLogo: null,
      };
    }
    return {
      showPeacegameLogo: event.showPeacegameLogo,
      eventLogo: event.eventLogo,
    };
  }

  /**
   * Get all events (no date filtering).
   *
   * @returns Array of all events with id, identifier, name, description, and image
   */
  getAll() {
    return this.fetchEventsForList().then((events) =>
      events.sort((a, b) => Number(b.pinned) - Number(a.pinned))
    );
  }

  /**
   * Get active events only.
   * Returns only events that have both startDate and endDate and are currently active
   * (start date <= today <= end date). Events without dates are excluded.
   * Results are read fresh so admin pin/theme changes appear immediately.
   *
   * @returns Array of active events with id, identifier, name, description, and image
   */
  async getActive() {
    const events = await this.fetchEventsForList();
    const now = new Date().toISOString().split('T')[0];

    // Keep this uncached so an admin's pin/theme changes are visible on the
    // next quick-event load across every production worker.
    return events
      .filter((e) => {
        const startDate = e.startDate ? new Date(e.startDate) : null;
        const endDate = e.endDate ? new Date(e.endDate) : null;

        if (!startDate || !endDate) return false;
        return (
          startDate.toISOString().split('T')[0] <= now &&
          endDate.toISOString().split('T')[0] >= now
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }

  private async fetchEventsForList() {
    const events = await Event.select((e) => {
      return [
        e.identifier,
        e.name,
        e.alternateName,
        e.startDate,
        e.endDate,
        e.image.select((img) => {
          return [img.contentUrl];
        }),
        e.defaultTeam.select((t) => [t.identifier]),
        e.pinned,
        e.purpleTheme,
        e.route,
      ];
    });

    return events.map((event) => ({
      identifier: event.identifier,
      id: event.id,
      name: event.name,
      description: event.alternateName,
      image: event.image,
      defaultTeam: event.defaultTeam,
      startDate: event.startDate,
      endDate: event.endDate,
      pinned: event.pinned ?? false,
      purpleTheme: event.purpleTheme ?? false,
      route: event.route || undefined,
    }));
  }
}
