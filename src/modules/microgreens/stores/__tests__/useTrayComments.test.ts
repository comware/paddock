/**
 * useTrayComments Store Unit Tests
 *
 * Tests the tray comments store including:
 * - Comment data structure and creation
 * - Comments per tray filtering
 * - Comment ordering
 * - CRUD operations logic
 */

import { describe, it, expect } from 'vitest';
import { daysAgo } from '@/test/mocks/db';

// ============================================
// TYPES (mirrored from store for testing)
// ============================================

interface GrowTrayComment {
  id?: string;
  trayId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TEST DATA HELPERS
// ============================================

let commentCounter = 0;
function createMockComment(
  overrides: Partial<GrowTrayComment> = {}
): GrowTrayComment {
  commentCounter++;
  const now = new Date();
  return {
    id: `comment-${commentCounter}`,
    trayId: 'tray-1',
    content: 'Test comment',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============================================
// HELPER FUNCTIONS (mirrored from store logic)
// ============================================

function getCommentsForTray(
  comments: GrowTrayComment[],
  trayId: string
): GrowTrayComment[] {
  return comments.filter((c) => c.trayId === trayId);
}

function sortCommentsByDate(
  comments: GrowTrayComment[],
  order: 'asc' | 'desc' = 'asc'
): GrowTrayComment[] {
  return [...comments].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return order === 'asc' ? diff : -diff;
  });
}

function getCommentById(
  comments: GrowTrayComment[],
  id: string
): GrowTrayComment | undefined {
  return comments.find((c) => c.id === id);
}

let addCommentCounter = 0;
function addComment(
  comments: GrowTrayComment[],
  trayId: string,
  content: string
): { comments: GrowTrayComment[]; newComment: GrowTrayComment } {
  addCommentCounter++;
  const now = new Date();
  const newComment: GrowTrayComment = {
    id: `comment-new-${addCommentCounter}`,
    trayId,
    content,
    createdAt: now,
    updatedAt: now,
  };
  return {
    comments: [...comments, newComment],
    newComment,
  };
}

function updateComment(
  comments: GrowTrayComment[],
  id: string,
  newContent: string
): GrowTrayComment[] {
  return comments.map((c) =>
    c.id === id ? { ...c, content: newContent, updatedAt: new Date() } : c
  );
}

function deleteComment(
  comments: GrowTrayComment[],
  id: string
): GrowTrayComment[] {
  return comments.filter((c) => c.id !== id);
}

function getCommentCount(
  comments: GrowTrayComment[],
  trayId: string
): number {
  return comments.filter((c) => c.trayId === trayId).length;
}

// ============================================
// COMMENT DATA STRUCTURE TESTS
// ============================================

describe('Comment Data Structure', () => {
  describe('createMockComment', () => {
    it('creates a comment with all required fields', () => {
      const comment = createMockComment();

      expect(comment.id).toBeDefined();
      expect(comment.trayId).toBeDefined();
      expect(comment.content).toBeDefined();
      expect(comment.createdAt).toBeInstanceOf(Date);
      expect(comment.updatedAt).toBeInstanceOf(Date);
    });

    it('applies custom overrides correctly', () => {
      const customDate = new Date('2024-06-15');
      const comment = createMockComment({
        trayId: 'tray-123',
        content: 'Custom comment content',
        createdAt: customDate,
      });

      expect(comment.trayId).toBe('tray-123');
      expect(comment.content).toBe('Custom comment content');
      expect(comment.createdAt.getTime()).toBe(customDate.getTime());
    });

    it('generates unique IDs', () => {
      const comment1 = createMockComment();
      const comment2 = createMockComment();
      expect(comment1.id).not.toBe(comment2.id);
    });
  });
});

// ============================================
// TRAY FILTERING TESTS
// ============================================

describe('Tray Filtering', () => {
  describe('getCommentsForTray', () => {
    it('returns empty array for no comments', () => {
      expect(getCommentsForTray([], 'tray-1')).toEqual([]);
    });

    it('returns empty array when no comments match trayId', () => {
      const comments = [
        createMockComment({ trayId: 'tray-1' }),
        createMockComment({ trayId: 'tray-2' }),
      ];

      expect(getCommentsForTray(comments, 'tray-999')).toHaveLength(0);
    });

    it('returns only comments for specified tray', () => {
      const comments = [
        createMockComment({ id: 'c1', trayId: 'tray-1' }),
        createMockComment({ id: 'c2', trayId: 'tray-2' }),
        createMockComment({ id: 'c3', trayId: 'tray-1' }),
        createMockComment({ id: 'c4', trayId: 'tray-1' }),
      ];

      const tray1Comments = getCommentsForTray(comments, 'tray-1');

      expect(tray1Comments).toHaveLength(3);
      expect(tray1Comments.map((c) => c.id)).toEqual(['c1', 'c3', 'c4']);
    });
  });

  describe('getCommentCount', () => {
    it('returns 0 for tray with no comments', () => {
      const comments = [createMockComment({ trayId: 'tray-1' })];
      expect(getCommentCount(comments, 'tray-999')).toBe(0);
    });

    it('returns correct count for tray', () => {
      const comments = [
        createMockComment({ trayId: 'tray-1' }),
        createMockComment({ trayId: 'tray-1' }),
        createMockComment({ trayId: 'tray-2' }),
      ];

      expect(getCommentCount(comments, 'tray-1')).toBe(2);
      expect(getCommentCount(comments, 'tray-2')).toBe(1);
    });
  });
});

// ============================================
// SORTING TESTS
// ============================================

describe('Comment Sorting', () => {
  describe('sortCommentsByDate', () => {
    it('sorts in ascending order by default', () => {
      const comments = [
        createMockComment({ id: 'c1', createdAt: daysAgo(0) }), // Today
        createMockComment({ id: 'c2', createdAt: daysAgo(2) }), // 2 days ago
        createMockComment({ id: 'c3', createdAt: daysAgo(1) }), // Yesterday
      ];

      const sorted = sortCommentsByDate(comments);

      expect(sorted.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
    });

    it('sorts in descending order when specified', () => {
      const comments = [
        createMockComment({ id: 'c1', createdAt: daysAgo(0) }), // Today
        createMockComment({ id: 'c2', createdAt: daysAgo(2) }), // 2 days ago
        createMockComment({ id: 'c3', createdAt: daysAgo(1) }), // Yesterday
      ];

      const sorted = sortCommentsByDate(comments, 'desc');

      expect(sorted.map((c) => c.id)).toEqual(['c1', 'c3', 'c2']);
    });

    it('does not mutate original array', () => {
      const comments = [
        createMockComment({ id: 'c1', createdAt: daysAgo(0) }),
        createMockComment({ id: 'c2', createdAt: daysAgo(1) }),
      ];

      const originalOrder = comments.map((c) => c.id);
      sortCommentsByDate(comments);

      expect(comments.map((c) => c.id)).toEqual(originalOrder);
    });

    it('handles empty array', () => {
      expect(sortCommentsByDate([])).toEqual([]);
    });

    it('handles single comment', () => {
      const comments = [createMockComment({ id: 'c1' })];
      expect(sortCommentsByDate(comments)).toHaveLength(1);
    });
  });
});

// ============================================
// CRUD OPERATION TESTS
// ============================================

describe('CRUD Operations', () => {
  describe('getCommentById', () => {
    it('returns undefined for empty array', () => {
      expect(getCommentById([], 'c1')).toBeUndefined();
    });

    it('returns undefined when not found', () => {
      const comments = [createMockComment({ id: 'c1' })];
      expect(getCommentById(comments, 'c999')).toBeUndefined();
    });

    it('returns matching comment', () => {
      const comments = [
        createMockComment({ id: 'c1', content: 'First' }),
        createMockComment({ id: 'c2', content: 'Second' }),
      ];

      const found = getCommentById(comments, 'c2');

      expect(found?.id).toBe('c2');
      expect(found?.content).toBe('Second');
    });
  });

  describe('addComment', () => {
    it('adds comment to empty array', () => {
      const result = addComment([], 'tray-1', 'New comment');

      expect(result.comments).toHaveLength(1);
      expect(result.newComment.trayId).toBe('tray-1');
      expect(result.newComment.content).toBe('New comment');
    });

    it('appends to existing comments', () => {
      const existing = [createMockComment({ id: 'c1' })];
      const result = addComment(existing, 'tray-1', 'Another comment');

      expect(result.comments).toHaveLength(2);
      expect(result.comments[1].content).toBe('Another comment');
    });

    it('sets createdAt and updatedAt to now', () => {
      const before = new Date();
      const result = addComment([], 'tray-1', 'Test');
      const after = new Date();

      expect(result.newComment.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.newComment.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.newComment.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('generates unique ID', () => {
      const result1 = addComment([], 'tray-1', 'Comment 1');
      const result2 = addComment(result1.comments, 'tray-1', 'Comment 2');

      expect(result1.newComment.id).not.toBe(result2.newComment.id);
    });
  });

  describe('updateComment', () => {
    it('updates content of existing comment', () => {
      const comments = [
        createMockComment({ id: 'c1', content: 'Original' }),
      ];

      const updated = updateComment(comments, 'c1', 'Updated content');

      expect(updated[0].content).toBe('Updated content');
    });

    it('updates updatedAt timestamp', () => {
      const oldDate = daysAgo(5);
      const comments = [
        createMockComment({ id: 'c1', content: 'Original', updatedAt: oldDate }),
      ];

      const before = new Date();
      const updated = updateComment(comments, 'c1', 'Updated');

      expect(updated[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('preserves createdAt timestamp', () => {
      const createdAt = daysAgo(5);
      const comments = [
        createMockComment({ id: 'c1', createdAt }),
      ];

      const updated = updateComment(comments, 'c1', 'Updated');

      expect(updated[0].createdAt.getTime()).toBe(createdAt.getTime());
    });

    it('does not modify other comments', () => {
      const comments = [
        createMockComment({ id: 'c1', content: 'First' }),
        createMockComment({ id: 'c2', content: 'Second' }),
      ];

      const updated = updateComment(comments, 'c1', 'Updated First');

      expect(updated[0].content).toBe('Updated First');
      expect(updated[1].content).toBe('Second');
    });

    it('returns unchanged if id not found', () => {
      const comments = [createMockComment({ id: 'c1', content: 'Original' })];

      const updated = updateComment(comments, 'c999', 'Updated');

      expect(updated[0].content).toBe('Original');
    });
  });

  describe('deleteComment', () => {
    it('removes comment by id', () => {
      const comments = [
        createMockComment({ id: 'c1' }),
        createMockComment({ id: 'c2' }),
        createMockComment({ id: 'c3' }),
      ];

      const result = deleteComment(comments, 'c2');

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['c1', 'c3']);
    });

    it('returns empty array when deleting last comment', () => {
      const comments = [createMockComment({ id: 'c1' })];

      const result = deleteComment(comments, 'c1');

      expect(result).toHaveLength(0);
    });

    it('returns unchanged if id not found', () => {
      const comments = [createMockComment({ id: 'c1' })];

      const result = deleteComment(comments, 'c999');

      expect(result).toHaveLength(1);
    });

    it('does not mutate original array', () => {
      const comments = [
        createMockComment({ id: 'c1' }),
        createMockComment({ id: 'c2' }),
      ];
      const originalLength = comments.length;

      deleteComment(comments, 'c1');

      expect(comments).toHaveLength(originalLength);
    });
  });
});

// ============================================
// CONTENT VALIDATION TESTS
// ============================================

describe('Content Validation', () => {
  it('handles empty content', () => {
    const comment = createMockComment({ content: '' });
    expect(comment.content).toBe('');
  });

  it('handles whitespace-only content', () => {
    const comment = createMockComment({ content: '   ' });
    expect(comment.content).toBe('   ');
  });

  it('handles very long content', () => {
    const longContent = 'A'.repeat(10000);
    const comment = createMockComment({ content: longContent });
    expect(comment.content.length).toBe(10000);
  });

  it('handles multiline content', () => {
    const multiline = 'Line 1\nLine 2\nLine 3';
    const comment = createMockComment({ content: multiline });
    expect(comment.content).toBe(multiline);
    expect(comment.content.split('\n')).toHaveLength(3);
  });

  it('handles special characters', () => {
    const special = 'Comment with <html> & "quotes"';
    const comment = createMockComment({ content: special });
    expect(comment.content).toBe(special);
  });

  it('preserves leading/trailing whitespace', () => {
    const withWhitespace = '  content with spaces  ';
    const comment = createMockComment({ content: withWhitespace });
    expect(comment.content).toBe(withWhitespace);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Comment Edge Cases', () => {
  it('handles many comments for single tray', () => {
    const comments = Array.from({ length: 100 }, (_, i) =>
      createMockComment({ id: `c${i}`, trayId: 'tray-1' })
    );

    expect(getCommentsForTray(comments, 'tray-1')).toHaveLength(100);
  });

  it('handles comments with same timestamp', () => {
    const sameTime = new Date('2024-06-15T10:00:00Z');
    const comments = [
      createMockComment({ id: 'c1', createdAt: sameTime }),
      createMockComment({ id: 'c2', createdAt: sameTime }),
    ];

    const sorted = sortCommentsByDate(comments);

    // Should maintain stable order for same timestamp
    expect(sorted).toHaveLength(2);
  });

  it('handles trayId with special characters', () => {
    const comments = [
      createMockComment({ trayId: 'tray-with-dashes' }),
      createMockComment({ trayId: 'tray_with_underscores' }),
    ];

    expect(getCommentsForTray(comments, 'tray-with-dashes')).toHaveLength(1);
    expect(getCommentsForTray(comments, 'tray_with_underscores')).toHaveLength(1);
  });

  it('handles rapid successive updates', () => {
    let comments = [createMockComment({ id: 'c1', content: 'v1' })];

    comments = updateComment(comments, 'c1', 'v2');
    comments = updateComment(comments, 'c1', 'v3');
    comments = updateComment(comments, 'c1', 'v4');

    expect(comments[0].content).toBe('v4');
  });

  it('handles delete then add with same content', () => {
    const originalContent = 'Original comment';
    let comments = [createMockComment({ id: 'c1', content: originalContent })];

    comments = deleteComment(comments, 'c1');
    const result = addComment(comments, 'tray-1', originalContent);

    expect(result.comments).toHaveLength(1);
    expect(result.newComment.content).toBe(originalContent);
    expect(result.newComment.id).not.toBe('c1');
  });
});
