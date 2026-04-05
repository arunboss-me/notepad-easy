export type NoteCategory = 'Work' | 'Personal' | 'Ideas' | 'General';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  color?: string;
  isPinned: boolean;
  isLocked: boolean;
  password?: string;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  images?: string[]; // base64 or URLs
}

export type SortOption = 'updated' | 'created' | 'title' | 'pinned';
