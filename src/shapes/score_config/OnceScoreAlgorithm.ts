import { QResult } from '@_linked/core/queries/SelectQuery';
import { objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../../ontologies/lincd-irlcg.js';
import { linkedShape } from '../../package.js';
import { ScoreConfiguration } from './ScoreConfiguration.js';
import { ActionOption } from '../ActionOption.js';
import type { ActionSubmissionResult } from '../ActionSubmission.js';
import { Action } from '../Action.js';

@linkedShape({
  description:
    'A scoring algorithm that awards the highest medal that the user has submitted points for at least once. Has ActionOption relationships for bronze, silver, and gold medals. (medal scoring, template-based, algorithm)',
})
export class OnceScoreAlgorithm extends ScoreConfiguration {
  static targetClass = irlcg.OnceScoreAlgorithm;

  @objectProperty({
    path: irlcg.bronzeTemplate,
    shape: ActionOption,
    maxCount: 1,
  })
  get bronzeTemplate(): ActionOption {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.silverTemplate,
    shape: ActionOption,
    maxCount: 1,
  })
  get silverTemplate(): ActionOption {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.goldTemplate,
    shape: ActionOption,
    maxCount: 1,
  })
  get goldTemplate(): ActionOption {
    return undefined as any;
  }

  static calculateTotalScore(
    action: QResult<Action>,
    userActionSubmissions: ActionSubmissionResult[],
    totalScore: number,
    medalTemplateIds: {
      gold: string;
      silver: string;
      bronze: string;
    }
  ) {
    //check the submitted actions
    //convert the actions to a medal based on the configured gold/silver/bronze templates
    //return the highest medal
    let medal = Math.max(
      ...userActionSubmissions.map((actionSubmission) => {
        const templateId = actionSubmission.option.id;
        if (templateId === medalTemplateIds.gold) {
          return 3;
        }
        if (templateId === medalTemplateIds.silver) {
          return 2;
        }
        if (templateId === medalTemplateIds.bronze) {
          return 1;
        }
        //for bonus actions or actions not marked with medals, return
        return 0;
      })
    );
    //if no medal was found, return 0
    return medal;
  }
}
