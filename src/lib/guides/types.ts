export interface GuideMetadata {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  daysToHarvest: number;
  blackoutDays: number;
  preSoak: boolean;
  file: string;
  status: string;
}

export interface GuideCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface GuideIndex {
  version: string;
  lastUpdated: string;
  categories: GuideCategory[];
  guides: GuideMetadata[];
}
