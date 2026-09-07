/**
 * Renders a guide's markdown inside a modal.
 *
 * Two things this does that a bare ReactMarkdown does not.
 *
 * It shifts every heading down one level. A guide is written as a standalone document -
 * `##` for its sections, `###` for their parts - but inside a modal the dialog's own title
 * is already an <h2>, so those sections arrived as siblings of the title rather than as its
 * children. Nothing was skipped, so it was not a violation, but a screen reader user
 * navigating by heading got "Cabbage", "Quick Facts" and "Overview" as peers, which is not
 * the shape of the document. Shifted, the title is the parent it looks like.
 *
 * And it holds the prose styling in one place. The same forty-word class string was written
 * out identically in all three guide modals, which is three chances to change two of them.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stripLeadingHeading } from '@/lib/guides/guideContent';

// h2 -> h3 and h3 -> h4, so the sizes still descend after the shift. The h2 rules stay for
// the rare guide that opens at that level.
const PROSE = [
  'prose prose-sm prose-slate dark:prose-invert max-w-none',
  'prose-headings:font-semibold',
  'prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2',
  'prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2',
  'prose-h4:text-sm',
  'prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm',
  'prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1',
].join(' ');

const HEADINGS = {
  h1: (props: React.ComponentPropsWithoutRef<'h2'>) => <h2 {...props} />,
  h2: (props: React.ComponentPropsWithoutRef<'h3'>) => <h3 {...props} />,
  h3: (props: React.ComponentPropsWithoutRef<'h4'>) => <h4 {...props} />,
  h4: (props: React.ComponentPropsWithoutRef<'h5'>) => <h5 {...props} />,
};

export function GuideMarkdown({ content }: { content: string }) {
  return (
    <article className={PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={HEADINGS}>
        {stripLeadingHeading(content)}
      </ReactMarkdown>
    </article>
  );
}
