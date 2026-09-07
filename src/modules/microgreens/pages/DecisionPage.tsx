/**
 * DecisionPage - variety scorecard
 *
 * Named 'Week 6 decision' when Paddock was a six-week experiment. A grower six months
 * in has no week 6, and the label said nothing about what the page does.
 */

import { PageHeader } from '@/components/shared';
import { Scorecard } from '../components/Decision';

export function DecisionPage() {
  return (
    <>
      <PageHeader
        title="Variety scorecard"
        description="What each variety has actually returned, so the next sowing is an informed one."
      />
      <Scorecard />
    </>
  );
}
