/**
 * Preparing guide markdown for display in a modal.
 */

/**
 * Removes the H1 that opens a guide file.
 *
 * Every guide begins with its own name as a top-level heading, which is right for the file
 * on disk and wrong in the modal, where the same name is already in the header directly
 * above. Stripping it here rather than editing 150-odd markdown files keeps the files
 * readable on their own - they are still documents with titles - and keeps the fix in the
 * one place that has the duplicate.
 *
 * Only a heading that opens the document is removed. A `#` further down belongs to the
 * content, and a table row containing a hash is not a heading at all.
 */
export function stripLeadingHeading(markdown: string): string {
  return markdown.replace(/^\s*#[^\n#][^\n]*\n+/, '');
}
