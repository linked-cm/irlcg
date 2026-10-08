import React from 'react';
import style from './ShowMeeting.module.css';
import { linkedComponent } from '../package.js';
import { Meeting } from '../shapes/Meeting.js';

//TODO: replace SHAPE with an actual Shape class
export const ShowMeeting = linkedComponent(
  Meeting.select((meeting) => ({
    name: meeting.name,
    startDate: meeting.startDate,
  })),
  ({ name, startDate }) => {
    return (
      <div className={style.Content}>
        <>
          <div className={style.TopicName}>
            <h3>{name}</h3>
          </div>
          <div className={style.DateTime}>
            <h4>{startDate.toString()}</h4>
          </div>
        </>
      </div>
    );
  }
);

//register all components in this file
// registerPackageModule(module);
